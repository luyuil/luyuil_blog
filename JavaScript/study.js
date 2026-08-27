/* ================= 学习笔记窗口 =================
 *
 * 实现思路：
 * 1. 网页出于安全限制，不能直接读硬盘路径（比如 D:\Obsidain\...）。
 *    所以第一次打开时，让用户用浏览器的“文件夹选择器”选一次
 *    学习笔记所在的文件夹，浏览器会把这次授权记下来（存进 IndexedDB）。
 *    之后每次打开窗口，自动读取文件夹里的最新内容。
 * 2. 左侧是文件夹树（子文件夹可展开），右侧显示选中的 Markdown 笔记。
 * 3. 你在 Obsidian 里写好保存后，博客这边点“刷新”或重新打开窗口
 *    就能看到最新内容；窗口开着时也会每 8 秒自动检查当前笔记有没有更新。
 * 4. 支持 Obsidian 语法：![[图片]] 会显示图片，[[笔记名]] 可以直接点击跳转。
 *
 * 注意：这个方案只能在你自己电脑的 Chrome / Edge 上使用；
 * 部署到公网后，访客无法读取你电脑上的文件夹（这是浏览器安全机制）。
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const studyApp = document.getElementById('study-app');
    if (!studyApp) return;

    const treeBox = document.getElementById('study-tree');
    const noteBox = document.getElementById('study-note');
    const refreshBtn = document.getElementById('study-refresh');
    const switchBtn = document.getElementById('study-switch');

    // ================= 状态 =================
    let rootHandle = null;          // 选中的根文件夹句柄
    let currentNote = null;         // 当前打开的笔记 { handle, path, name }
    let noteLastModified = null;    // 当前笔记的最后修改时间（用于自动刷新）
    let pollTimer = null;           // 自动刷新定时器

    const handleByPath = new Map(); // 路径 -> 文件夹/文件句柄（展开时缓存）
    const nameIndex = new Map();    // 笔记名(小写) -> { path, handle }（支持 [[双链]]）
    const imageIndex = new Map();   // 图片名(小写) -> { path, handle }（支持 ![[图片]]）

    let publicMode = false;         // 公开模式：直接从博客仓库的 notes/ 读取（访客可见）
    let publicIndex = { files: [] };// 仓库里 notes/index.json 的文件索引

    const isNoteFile = (name) => /\.(md|markdown|txt)$/i.test(name);
    const isImageFile = (name) => /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);

    // ================= 工具函数 =================
    const pathKey = (arr) => JSON.stringify(arr);

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function ensureMarked() {
        if (window.marked) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Markdown 解析库加载失败'));
            document.head.appendChild(script);
        });
    }

    // ================= IndexedDB：记住文件夹授权 =================
    const DB_NAME = 'luyuil-study';
    const DB_STORE = 'kv';
    const DB_KEY = 'root-handle';
    let dbPromise = null;

    function openDB() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return dbPromise;
    }

    function idbGet() {
        return openDB().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readonly');
            const rq = tx.objectStore(DB_STORE).get(DB_KEY);
            rq.onsuccess = () => resolve(rq.result || null);
            rq.onerror = () => reject(rq.error);
        }));
    }

    function idbSet(handle) {
        return openDB().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, 'readwrite');
            tx.objectStore(DB_STORE).put(handle, DB_KEY);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        }));
    }

    // ================= 文件夹读取 =================
    function listDir(dirHandle) {
        return (async () => {
            const items = [];
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    items.push({ name: entry.name, kind: 'dir', handle: entry });
                } else if (isNoteFile(entry.name)) {
                    items.push({ name: entry.name, kind: 'file', handle: entry });
                }
            }
            // 文件夹在前，文件在后；中文按拼音排序
            items.sort((a, b) => {
                if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
                return a.name.localeCompare(b.name, 'zh-CN');
            });
            return items;
        })();
    }

    // 递归扫描整个根目录，建立“笔记名/图片名 -> 位置”索引（用于双链和图片）
    function buildIndex(dirHandle, prefix) {
        return (async () => {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    await buildIndex(entry, prefix.concat(entry.name));
                } else if (isNoteFile(entry.name)) {
                    const info = {
                        path: prefix.concat(entry.name),
                        handle: entry
                    };
                    // Obsidian 双链 [[笔记名]] 不带扩展名，所以两种名字都登记
                    nameIndex.set(entry.name.toLowerCase(), info);
                    nameIndex.set(entry.name.replace(/\.(md|markdown|txt)$/i, '').toLowerCase(), info);
                } else if (isImageFile(entry.name)) {
                    imageIndex.set(entry.name.toLowerCase(), {
                        path: prefix.concat(entry.name),
                        handle: entry
                    });
                }
            }
        })();
    }

    async function resolveHandle(pathArr) {
        let cur = rootHandle;
        for (let i = 0; i < pathArr.length; i++) {
            const name = pathArr[i];
            cur = (i === pathArr.length - 1)
                ? await cur.getFileHandle(name)
                : await cur.getDirectoryHandle(name);
        }
        return cur;
    }

    async function hasFile(pathArr) {
        try { await resolveHandle(pathArr); return true; } catch (e) { return false; }
    }

    // ================= 左侧文件树 =================
    function renderNode(item, pathArr) {
        handleByPath.set(pathKey(pathArr), item.handle);

        const node = document.createElement('div');
        node.className = 'study-node';

        const row = document.createElement('div');
        row.className = 'study-node-row' + (item.kind === 'file' ? ' study-file-row' : '');
        row.title = item.name;
        if (item.kind === 'file') row.dataset.path = pathKey(pathArr);

        const caret = document.createElement('span');
        caret.className = 'study-caret';
        caret.textContent = item.kind === 'dir' ? '▶' : '';

        const name = document.createElement('span');
        name.className = 'study-node-name';
        name.textContent = (item.kind === 'dir' ? '📁 ' : '📄 ') + item.name;

        row.appendChild(caret);
        row.appendChild(name);
        node.appendChild(row);

        if (item.kind === 'dir') {
            const childrenBox = document.createElement('div');
            childrenBox.className = 'study-children';
            node.appendChild(childrenBox);

            let loaded = false;
            row.addEventListener('click', async () => {
                if (node.classList.contains('open')) {
                    node.classList.remove('open');
                    return;
                }
                node.classList.add('open');
                if (!loaded) {
                    try {
                        const dirHandle = handleByPath.get(pathKey(pathArr));
                        const kids = await listDir(dirHandle);
                        kids.forEach(k => childrenBox.appendChild(renderNode(k, pathArr.concat(k.name))));
                        loaded = true;
                    } catch (e) {
                        console.error('读取文件夹失败:', e);
                    }
                }
            });
        } else {
            row.addEventListener('click', () => openNote(item.handle, pathArr, item.name));
        }
        return node;
    }

    function renderTopLevel() {
        treeBox.innerHTML = '';
        return listDir(rootHandle).then(items => {
            items.forEach(item => treeBox.appendChild(renderNode(item, [item.name])));
        });
    }

    async function loadTree() {
        if (!rootHandle) return;
        nameIndex.clear();
        imageIndex.clear();
        handleByPath.clear();
        try { await buildIndex(rootHandle, []); } catch (e) { console.error(e); }
        await renderTopLevel();
    }

    // ================= 右侧笔记内容 =================
    function renderMarkdown(raw) {
        return ensureMarked().then(() => {
            let text = raw;
            // Obsidian 图片：![[图片.png|说明]] -> ![图片.png](图片.png)
            text = text.replace(/!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g, (m, name) => {
                const n = name.trim();
                return '![' + n + '](' + n + ')';
            });
            // Obsidian 双链：[[笔记名]] -> 内部链接
            text = text.replace(/\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g, (m, name) => {
                const n = name.trim();
                return '[' + n + '](obsidian-note://' + encodeURIComponent(n) + ')';
            });
            return marked.parse(text);
        });
    }

    function openNote(handle, pathArr, displayName) {
        currentNote = { handle, path: pathArr, name: displayName };
        noteLastModified = null;

        // 高亮左侧选中的文件
        treeBox.querySelectorAll('.study-file-row.study-active').forEach(el => {
            el.classList.remove('study-active');
        });
        const activeRow = treeBox.querySelector('.study-file-row[data-path="' + CSS.escape(pathKey(pathArr)) + '"]');
        if (activeRow) activeRow.classList.add('study-active');

        noteBox.innerHTML = '<div class="study-loading">读取中…</div>';

        return (async () => {
            try {
                const file = await handle.getFile();
                noteLastModified = file.lastModified || Date.now();
                const raw = await file.text();
                const html = await renderMarkdown(raw);

                noteBox.innerHTML = '';

                const title = document.createElement('div');
                title.className = 'study-note-title';
                title.textContent = displayName.replace(/\.(md|markdown|txt)$/i, '');

                const pathEl = document.createElement('div');
                pathEl.className = 'study-note-path';
                pathEl.textContent = pathArr.join(' / ');

                const body = document.createElement('div');
                body.className = 'study-note-body';
                body.innerHTML = html;
                bindNoteLinks(body);

                noteBox.appendChild(title);
                noteBox.appendChild(pathEl);
                noteBox.appendChild(body);

                // 把笔记里的图片读出来显示（相对路径 / Obsidian 嵌入）
                await resolveImages(body, pathArr.slice(0, -1));
                noteBox.scrollTop = 0;
            } catch (e) {
                console.error('读取笔记失败:', e);
                noteBox.innerHTML = '<div class="study-loading">读取失败：' + escapeHtml(e.message || e) + '</div>';
            }
        })();
    }

    // [[笔记名]] 点击跳转
    function bindNoteLinks(body) {
        body.querySelectorAll('a[href^="obsidian-note://"]').forEach(a => {
            a.addEventListener('click', async (e) => {
                e.preventDefault();
                const name = decodeURIComponent(a.getAttribute('href').replace('obsidian-note://', ''));
                const found = nameIndex.get(name.toLowerCase());
                if (found) {
                    openNote(found.handle, found.path, found.path[found.path.length - 1]);
                } else {
                    noteBox.innerHTML = '<div class="study-loading">没有找到笔记：' + escapeHtml(name) + '</div>';
                }
            });
        });
    }

    // 把笔记里的图片文件读出来，转成临时 URL 显示
    async function resolveImages(body, noteDir) {
        const imgs = Array.from(body.querySelectorAll('img'));
        for (const img of imgs) {
            let src = img.getAttribute('src') || '';
            if (/^(data:|https?:|blob:)/i.test(src)) continue;

            // Markdown 解析库会把中文文件名转成百分号编码，先解码再匹配真实文件名
            try { src = decodeURIComponent(src); } catch (e) { /* 保留原样 */ }

            const parts = src.replace(/^\.?\//, '').split('/').filter(Boolean);
            let targetPath = null;

            if (parts.length > 1) {
                targetPath = noteDir.concat(parts);
            } else {
                const localPath = noteDir.concat(parts);
                if (await hasFile(localPath)) {
                    targetPath = localPath;
                } else {
                    const found = imageIndex.get(parts[0].toLowerCase());
                    if (found) targetPath = found.path;
                }
            }
            if (!targetPath) continue;

            try {
                const fileHandle = await resolveHandle(targetPath);
                const file = await fileHandle.getFile();
                const buf = await file.arrayBuffer();
                const type = file.type || 'image/png';
                img.src = URL.createObjectURL(new Blob([buf], { type }));
            } catch (e) {
                // 图片找不到就保留原样
            }
        }
    }

    // ================= 连接 / 授权 / 切换文件夹 =================
    function showConnect(message) {
        treeBox.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'study-connect';

        const btn = document.createElement('button');
        btn.className = 'study-connect-btn';
        btn.textContent = rootHandle ? '🔓 授权访问学习笔记文件夹' : '📂 连接 Obsidian 学习笔记文件夹';
        btn.addEventListener('click', connectFolder);

        const hint = document.createElement('div');
        hint.className = 'study-hint';
        hint.textContent = message || '选择 D:\\Obsidain\\_Note\\Obsidian Note\\学习笔记 这个文件夹。\n建议用 Chrome 或 Edge 打开，并通过 Live Server 访问。';

        wrap.appendChild(btn);
        wrap.appendChild(hint);
        treeBox.appendChild(wrap);
    }

    async function connectFolder() {
        if (!window.showDirectoryPicker) {
            showConnect('当前浏览器不支持读取文件夹，请改用 Chrome 或 Edge。');
            return;
        }
        try {
            if (rootHandle) {
                const perm = await rootHandle.requestPermission({ mode: 'read' });
                if (perm === 'granted') {
                    await loadTree();
                    return;
                }
            }
            const handle = await window.showDirectoryPicker({ mode: 'read', id: 'luyuil-study-notes' });
            rootHandle = handle;
            try { await idbSet(handle); } catch (e) { /* 存失败不影响本次使用 */ }
            await loadTree();
        } catch (e) {
            if (e && e.name === 'AbortError') return; // 用户取消了选择
            console.error('连接文件夹失败:', e);
            showConnect('连接失败：' + escapeHtml(e.message || e));
        }
    }

    async function switchFolder() {
        if (!window.showDirectoryPicker) {
            showConnect('当前浏览器不支持读取文件夹，请改用 Chrome 或 Edge。');
            return;
        }
        try {
            const handle = await window.showDirectoryPicker({ mode: 'read', id: 'luyuil-study-notes' });
            rootHandle = handle;
            currentNote = null;
            try { await idbSet(handle); } catch (e) { /* 忽略 */ }
            await loadTree();
        } catch (e) {
            if (e && e.name === 'AbortError') return;
            console.error('切换文件夹失败:', e);
        }
    }

    // ================= 公开模式：从博客仓库读取笔记 =================
    async function tryEnterPublicMode() {
        try {
            const res = await fetch('./notes/index.json', { cache: 'no-store' });
            if (!res.ok) return false;
            publicIndex = await res.json();
            publicMode = true;
            switchBtn.style.display = 'none'; // 公开模式下不需要“更换文件夹”
            return true;
        } catch (e) {
            return false;
        }
    }

    function buildPublicTree() {
        const root = { name: '', kind: 'dir', children: [] };
        const dirMap = { '': root };
        (publicIndex.files || []).forEach(f => {
            const parts = f.split('/');
            const name = parts.pop();
            let cur = root;
            let curPath = '';
            for (const part of parts) {
                curPath = curPath ? curPath + '/' + part : part;
                if (!dirMap[curPath]) {
                    const d = { name: part, kind: 'dir', children: [] };
                    dirMap[curPath] = d;
                    cur.children.push(d);
                }
                cur = dirMap[curPath];
            }
            if (isNoteFile(name)) {
                cur.children.push({ name, kind: 'file', path: f });
            }
        });
        const sortNodes = (n) => {
            n.children.sort((a, b) => {
                if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
                return a.name.localeCompare(b.name, 'zh-CN');
            });
            n.children.forEach(c => { if (c.kind === 'dir') sortNodes(c); });
        };
        sortNodes(root);
        return root.children;
    }

    function renderPublicNode(node, pathArr) {
        const el = document.createElement('div');
        el.className = 'study-node';

        const row = document.createElement('div');
        row.className = 'study-node-row' + (node.kind === 'file' ? ' study-file-row' : '');
        row.title = node.name;
        if (node.kind === 'file') row.dataset.path = pathKey(pathArr.concat(node.name));

        const caret = document.createElement('span');
        caret.className = 'study-caret';
        caret.textContent = node.kind === 'dir' ? '▶' : '';

        const name = document.createElement('span');
        name.className = 'study-node-name';
        name.textContent = (node.kind === 'dir' ? '📁 ' : '📄 ') + node.name;

        row.appendChild(caret);
        row.appendChild(name);
        el.appendChild(row);

        if (node.kind === 'dir') {
            const childrenBox = document.createElement('div');
            childrenBox.className = 'study-children';
            el.appendChild(childrenBox);
            node.children.forEach(c => childrenBox.appendChild(renderPublicNode(c, pathArr.concat(node.name))));
            row.addEventListener('click', () => el.classList.toggle('open'));
        } else {
            row.addEventListener('click', () => openPublicNote(node.path, node.name, pathArr.concat(node.name)));
        }
        return el;
    }

    function buildPublicNameIndex() {
        nameIndex.clear();
        (publicIndex.files || []).forEach(f => {
            if (!isNoteFile(f)) return;
            const base = f.split('/').pop();
            const info = { path: f, name: base };
            nameIndex.set(base.toLowerCase(), info);
            nameIndex.set(base.replace(/\.(md|markdown|txt)$/i, '').toLowerCase(), info);
        });
    }

    function loadPublicTree() {
        buildPublicNameIndex();
        treeBox.innerHTML = '';
        const roots = buildPublicTree();
        roots.forEach(r => treeBox.appendChild(renderPublicNode(r, [])));
    }

    async function openPublicNote(repoPath, displayName, pathArr) {
        currentNote = { path: repoPath, name: displayName, public: true };

        treeBox.querySelectorAll('.study-file-row.study-active').forEach(el => el.classList.remove('study-active'));
        const activeRow = treeBox.querySelector('.study-file-row[data-path="' + CSS.escape(pathKey(pathArr)) + '"]');
        if (activeRow) activeRow.classList.add('study-active');

        noteBox.innerHTML = '<div class="study-loading">读取中…</div>';

        try {
            const res = await fetch('./notes/' + repoPath);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const raw = await res.text();
            const html = await renderMarkdown(raw);

            noteBox.innerHTML = '';

            const title = document.createElement('div');
            title.className = 'study-note-title';
            title.textContent = displayName.replace(/\.(md|markdown|txt)$/i, '');

            const pathEl = document.createElement('div');
            pathEl.className = 'study-note-path';
            pathEl.textContent = repoPath;

            const body = document.createElement('div');
            body.className = 'study-note-body';
            body.innerHTML = html;
            bindPublicLinks(body);

            noteBox.appendChild(title);
            noteBox.appendChild(pathEl);
            noteBox.appendChild(body);

            resolvePublicImages(body, repoPath.split('/').slice(0, -1));
            noteBox.scrollTop = 0;
        } catch (e) {
            console.error('读取笔记失败:', e);
            noteBox.innerHTML = '<div class="study-loading">读取失败：' + escapeHtml(e.message || e) + '</div>';
        }
    }

    function bindPublicLinks(body) {
        body.querySelectorAll('a[href^="obsidian-note://"]').forEach(a => {
            a.addEventListener('click', async (e) => {
                e.preventDefault();
                const name = decodeURIComponent(a.getAttribute('href').replace('obsidian-note://', ''));
                const found = nameIndex.get(name.toLowerCase());
                if (found) {
                    openPublicNote(found.path, found.name, found.path.split('/'));
                } else {
                    noteBox.innerHTML = '<div class="study-loading">没有找到笔记：' + escapeHtml(name) + '</div>';
                }
            });
        });
    }

    function resolvePublicImages(body, noteDir) {
        body.querySelectorAll('img').forEach(img => {
            let src = img.getAttribute('src') || '';
            if (/^(data:|https?:|blob:)/i.test(src)) return;
            try { src = decodeURIComponent(src); } catch (e) { /* 保留原样 */ }

            const parts = src.replace(/^\.?\//, '').split('/').filter(Boolean);
            if (!parts.length) return;

            let target = null;
            if (parts.length > 1) {
                target = noteDir.concat(parts).join('/');
            } else {
                const local = noteDir.concat(parts).join('/');
                if (publicIndex.files.indexOf(local) !== -1) {
                    target = local;
                } else {
                    const hit = (publicIndex.files || []).find(f => f.split('/').pop().toLowerCase() === parts[0].toLowerCase());
                    if (hit) target = hit;
                }
            }
            if (target && publicIndex.files.indexOf(target) !== -1) {
                img.src = './notes/' + target;
            }
        });
    }

    // ================= 打开窗口时初始化 =================
    async function initStudy() {
        switchBtn.style.display = '';
        if (await tryEnterPublicMode()) {
            loadPublicTree();
            return;
        }
        if (!window.showDirectoryPicker) {
            showConnect('当前浏览器不支持读取文件夹，请改用 Chrome 或 Edge。');
            return;
        }
        if (rootHandle) {
            await loadTree();
            startPolling();
            return;
        }

        let handle = null;
        try { handle = await idbGet(); } catch (e) { /* 忽略 */ }

        if (!handle) {
            showConnect();
            return;
        }

        rootHandle = handle;
        try {
            const perm = await rootHandle.queryPermission({ mode: 'read' });
            if (perm === 'granted') {
                await loadTree();
                startPolling();
            } else {
                showConnect('博客已经记住你的笔记文件夹，但浏览器需要你点一下按钮授权才能读取。');
            }
        } catch (e) {
            showConnect('读取文件夹授权失败，请重新连接。');
        }
    }

    // ================= 自动跟随 Obsidian 更新 =================
    function startPolling() {
        if (pollTimer) return;
        pollTimer = setInterval(async () => {
            if (document.hidden || !currentNote) return;
            try {
                const file = await currentNote.handle.getFile();
                if (noteLastModified != null && file.lastModified && file.lastModified !== noteLastModified) {
                    openNote(currentNote.handle, currentNote.path, currentNote.name);
                }
            } catch (e) { /* 忽略 */ }
        }, 8000);
    }

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    // ================= 事件绑定 =================
    refreshBtn.addEventListener('click', async () => {
        if (publicMode) {
            try {
                const res = await fetch('./notes/index.json', { cache: 'no-store' });
                if (res.ok) publicIndex = await res.json();
            } catch (e) { /* 忽略 */ }
            loadPublicTree();
            if (currentNote && currentNote.public) {
                openPublicNote(currentNote.path, currentNote.name, currentNote.path.split('/'));
            }
            return;
        }
        await loadTree();
        if (currentNote) {
            try {
                const handle = await resolveHandle(currentNote.path);
                openNote(handle, currentNote.path, currentNote.name);
            } catch (e) {
                currentNote = null;
            }
        }
    });

    switchBtn.addEventListener('click', switchFolder);

    // 点击“学习笔记”菜单项打开窗口时，等动画结束后初始化
    document.getElementById('note-study').addEventListener('click', function () {
        setTimeout(initStudy, 400);
    });

    // 关闭窗口时停止自动刷新
    document.getElementById('study-close-btn').addEventListener('click', stopPolling);
});
