/* ================= 日记（说说）功能 =================
 *
 * 数据存哪里：
 * - 线上：GitHub Issues。访客通过 GitHub 公开接口读取（谁都能看）；
 *   作者在“管理模式”里输入自己的令牌后发布（只有你能发）。
 * - 本地：localStorage 只用来做离线缓存和存放旧版数据（可一键迁移到线上）。
 *
 * 每一条说说 = { id, number, text, images[], createdAt, fromGitHub }。
 * 渲染时按 createdAt 从新到旧排序，最新的永远在最上面。
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ================= 数据层 =================
    const STORAGE_KEY = 'luyuil_diary_v1';      // 旧版本地数据
    const CACHE_KEY = 'luyuil_diary_cache_v2';  // GitHub 说说缓存
    const TOKEN_KEY = 'luyuil_diary_token';     // 管理模式令牌（只存本浏览器）
    const REPO = 'luyuil/luyuil_blog';
    const TITLE_PREFIX = '说说';                // issue 标题前缀，用来识别哪些是说说

    function readLocal(key, fallback) {
        try {
            const v = localStorage.getItem(key);
            return v ? JSON.parse(v) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function writeLocal(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 忽略 */ }
    }

    // 把 issue 正文里的 Markdown 图片拆出来，剩下的算文字
    function splitBodyImages(body) {
        const images = [];
        const text = String(body).replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, (m, alt, url) => {
            images.push(url);
            return '';
        });
        return { text: text.replace(/\n{3,}/g, '\n\n').trim(), images };
    }

    const DiaryAPI = {
        // ---- 读取：GitHub 优先，失败用缓存 ----
        async loadAll() {
            try {
                const issues = await this.fetchIssues();
                const list = issues.map(this.issueToEntry);
                writeLocal(CACHE_KEY, { time: Date.now(), entries: list });
                return list;
            } catch (e) {
                const cached = readLocal(CACHE_KEY, null);
                return cached && cached.entries ? cached.entries : [];
            }
        },

        async fetchIssues() {
            const url = 'https://api.github.com/repos/' + REPO +
                '/issues?state=open&per_page=100&sort=created&direction=desc';
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const issues = await res.json();
            return issues.filter(i => !i.pull_request && (i.title || '').indexOf(TITLE_PREFIX) === 0);
        },

        issueToEntry(issue) {
            const parsed = splitBodyImages(issue.body || '');
            return {
                id: 'gh-' + issue.number,
                number: issue.number,
                text: parsed.text,
                images: parsed.images,
                createdAt: Date.parse(issue.created_at),
                fromGitHub: true
            };
        },

        // ---- 令牌 ----
        getToken() {
            try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
        },
        setToken(t) { localStorage.setItem(TOKEN_KEY, t); },
        clearToken() { localStorage.removeItem(TOKEN_KEY); },

        async verifyToken(token) {
            const res = await fetch('https://api.github.com/user', {
                headers: { Authorization: 'token ' + token }
            });
            if (!res.ok) throw new Error('令牌无效或已过期');
            const user = await res.json();
            return user.login;
        },

        // ---- 发布 ----
        async createIssue(opts) {
            const token = this.getToken();
            let body = opts.text || '';
            (opts.imageUrls || []).forEach((url, i) => {
                body += '\n\n![图片' + (i + 1) + '](' + url + ')';
            });
            const title = TITLE_PREFIX + ' · ' + formatTime(Date.now());
            const res = await fetch('https://api.github.com/repos/' + REPO + '/issues', {
                method: 'POST',
                headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title, body: body })
            });
            if (!res.ok) throw new Error('发布失败 HTTP ' + res.status);
            return res.json();
        },

        // 把图片上传到博客仓库，返回可以直接访问的图片地址
        async uploadImage(dataUrl, fileName) {
            const token = this.getToken();
            const base64 = String(dataUrl).split(',')[1] || String(dataUrl);
            const safeName = String(fileName || 'pic.jpg').replace(/[^\w.\-]/g, '_');
            const path = 'image/shuoshuo/' + Date.now() + '_' + safeName;
            const res = await fetch('https://api.github.com/repos/' + REPO + '/contents/' + path, {
                method: 'PUT',
                headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'add shuoshuo image', content: base64 })
            });
            if (!res.ok) throw new Error('图片上传失败 HTTP ' + res.status);
            const data = await res.json();
            return data.content.download_url;
        },

        // ---- 删除（把 issue 关闭）----
        async closeIssue(number) {
            const token = this.getToken();
            const res = await fetch('https://api.github.com/repos/' + REPO + '/issues/' + number, {
                method: 'PATCH',
                headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: 'closed' })
            });
            if (!res.ok) throw new Error('删除失败 HTTP ' + res.status);
        },

        // ---- 旧版本地数据 ----
        loadLegacy() { return readLocal(STORAGE_KEY, []); },
        saveLegacy(list) { writeLocal(STORAGE_KEY, list); },
        clearLegacy() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* 忽略 */ } }
    };

    // ================= 页面元素 =================
    const diaryApp = document.getElementById('diary-app');
    if (!diaryApp) return;

    const input = document.getElementById('diary-input');
    const publishBtn = document.getElementById('diary-publish');
    const fileInput = document.getElementById('diary-file');
    const previewBox = document.getElementById('diary-preview');
    const feed = document.getElementById('diary-feed');
    const composer = document.getElementById('diary-composer');
    const adminBar = document.getElementById('diary-admin-bar');

    // ================= 状态 =================
    let entries = [];        // 所有说说
    let pendingFiles = [];   // 本次还没发布的图片文件
    let previewURLs = [];    // 预览用的临时 URL（发布后要释放）
    let isAdmin = false;     // 是否进入管理模式

    // ================= 工具函数 =================
    function formatTime(ts) {
        const d = new Date(ts);
        const p = (n) => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
            ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    // 压缩图片：最大边 1000px、质量 0.75，返回 dataURL
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 1000;
                    let w = img.width;
                    let h = img.height;
                    if (w > MAX) {
                        h = h * MAX / w;
                        w = MAX;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.75));
                };
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // 把文字里的网址变成可点击的链接
    function linkify(text) {
        return escapeHtml(text).replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );
    }

    // ================= 管理模式 =================
    function renderAdminBar() {
        adminBar.innerHTML = '';

        if (isAdmin) {
            const status = document.createElement('span');
            status.className = 'diary-admin-status';
            status.textContent = '🔑 管理模式已开启，只有你能发说说';

            // 有旧版本地数据时，提供一键迁移
            const legacy = DiaryAPI.loadLegacy();
            if (legacy.length > 0) {
                const migrate = document.createElement('button');
                migrate.className = 'diary-admin-btn';
                migrate.textContent = '迁移本地说说（' + legacy.length + '）';
                migrate.addEventListener('click', migrateLegacy);
                adminBar.appendChild(migrate);
            }

            const exit = document.createElement('button');
            exit.className = 'diary-admin-exit';
            exit.textContent = '退出管理';
            exit.addEventListener('click', () => {
                DiaryAPI.clearToken();
                isAdmin = false;
                composer.style.display = 'none';
                renderAdminBar();
                renderFeed();
                showToast('已退出管理模式');
            });

            adminBar.appendChild(status);
            adminBar.appendChild(exit);
            return;
        }

        const enter = document.createElement('button');
        enter.className = 'diary-admin-btn';
        enter.textContent = '🔑 管理模式';
        enter.addEventListener('click', showTokenForm);
        adminBar.appendChild(enter);
    }

    function showTokenForm() {
        adminBar.innerHTML = '';

        const status = document.createElement('span');
        status.className = 'diary-admin-status';
        status.textContent = '粘贴 GitHub 令牌（只保存在本浏览器）';

        const tokenInput = document.createElement('input');
        tokenInput.type = 'password';
        tokenInput.className = 'diary-token-input';
        tokenInput.placeholder = 'ghp_...';

        const ok = document.createElement('button');
        ok.className = 'diary-admin-btn';
        ok.textContent = '进入';

        const cancel = document.createElement('button');
        cancel.className = 'diary-admin-btn';
        cancel.textContent = '取消';
        cancel.addEventListener('click', renderAdminBar);

        ok.addEventListener('click', async () => {
            const token = tokenInput.value.trim();
            if (!token) return;
            ok.disabled = true;
            ok.textContent = '验证中…';
            try {
                const login = await DiaryAPI.verifyToken(token);
                DiaryAPI.setToken(token);
                isAdmin = true;
                composer.style.display = 'block';
                renderAdminBar();
                renderFeed();
                showToast('欢迎回来，' + login);
            } catch (e) {
                showToast(e.message || '令牌无效');
                ok.disabled = false;
                ok.textContent = '进入';
            }
        });

        tokenInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') ok.click();
        });

        adminBar.appendChild(status);
        adminBar.appendChild(tokenInput);
        adminBar.appendChild(ok);
        adminBar.appendChild(cancel);
        tokenInput.focus();
    }

    // 把旧版 localStorage 里的说说逐条搬到 GitHub
    async function migrateLegacy() {
        if (!isAdmin) return;
        const legacy = DiaryAPI.loadLegacy();
        if (!legacy.length) return;
        showToast('开始迁移…');
        try {
            let done = 0;
            while (legacy.length) {
                const entry = legacy[0];
                const imageUrls = [];
                for (const img of (entry.images || [])) {
                    if (String(img).indexOf('data:') === 0) {
                        imageUrls.push(await DiaryAPI.uploadImage(img, 'migrate_' + done + '.jpg'));
                    } else if (String(img).indexOf('http') === 0) {
                        imageUrls.push(img);
                    }
                }
                await DiaryAPI.createIssue({ text: entry.text || '', imageUrls: imageUrls });
                legacy.shift();
                DiaryAPI.saveLegacy(legacy);
                done++;
            }
            DiaryAPI.clearLegacy();
            await refreshEntries();
            renderAdminBar();
            showToast('已迁移 ' + done + ' 条说说 ✔');
        } catch (e) {
            console.error('迁移中断:', e);
            await refreshEntries();
            renderAdminBar();
            showToast('迁移中断，已完成的不受影响');
        }
    }

    // ================= 渲染 =================
    function renderFeed() {
        feed.innerHTML = '';
        const sorted = entries.slice().sort((a, b) => b.createdAt - a.createdAt);

        if (sorted.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'diary-empty';
            empty.textContent = '还没有说说 ✨';
            feed.appendChild(empty);
            return;
        }

        sorted.forEach(entry => feed.appendChild(createPost(entry)));
    }

    function createPost(entry) {
        const card = document.createElement('div');
        card.className = 'diary-post';

        // 头部：头像 + 昵称
        const head = document.createElement('div');
        head.className = 'diary-post-head';

        const avatar = document.createElement('img');
        avatar.className = 'diary-avatar';
        avatar.src = './image/isla3.jpg';
        avatar.alt = 'avatar';

        const name = document.createElement('span');
        name.className = 'diary-post-name';
        name.textContent = 'luyuil';

        head.appendChild(avatar);
        head.appendChild(name);
        card.appendChild(head);

        // 文案
        if (entry.text) {
            const text = document.createElement('div');
            text.className = 'diary-post-text';
            text.innerHTML = linkify(entry.text);
            card.appendChild(text);
        }

        // 图片九宫格
        if (entry.images && entry.images.length > 0) {
            const photos = document.createElement('div');
            photos.className = 'diary-photos photo-count-' + Math.min(entry.images.length, 9);
            entry.images.forEach(src => {
                const img = document.createElement('img');
                img.src = src;
                img.loading = 'lazy';
                img.addEventListener('click', () => openLightbox(src));
                photos.appendChild(img);
            });
            card.appendChild(photos);
        }

        // 右下角时间
        const time = document.createElement('div');
        time.className = 'diary-post-time';
        time.textContent = formatTime(entry.createdAt);
        card.appendChild(time);

        // 删除（仅管理模式显示）
        if (isAdmin) {
            const del = document.createElement('span');
            del.className = 'diary-post-delete';
            del.title = '删除这条说说';
            del.textContent = '✕';
            del.addEventListener('click', () => deletePost(entry));
            card.appendChild(del);
        }

        return card;
    }

    // ================= 大图预览 =================
    let lightbox = null;

    function openLightbox(src) {
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.className = 'diary-lightbox';
            lightbox.innerHTML = '<img alt="preview">';
            lightbox.addEventListener('click', () => lightbox.remove());
            document.body.appendChild(lightbox);
        }
        lightbox.querySelector('img').src = src;
    }

    // ================= 选择图片 =================
    fileInput.addEventListener('change', function () {
        const files = Array.from(fileInput.files).slice(0, 9 - pendingFiles.length);
        files.forEach(file => {
            pendingFiles.push(file);
            previewURLs.push(URL.createObjectURL(file));
        });
        fileInput.value = '';
        renderPreview();
        updatePublishState();
    });

    function renderPreview() {
        previewBox.innerHTML = '';
        pendingFiles.forEach((file, i) => {
            const item = document.createElement('div');
            item.className = 'diary-preview-item';

            const img = document.createElement('img');
            img.src = previewURLs[i];
            item.appendChild(img);

            const remove = document.createElement('span');
            remove.className = 'diary-preview-remove';
            remove.textContent = '✕';
            remove.addEventListener('click', () => {
                URL.revokeObjectURL(previewURLs[i]);
                pendingFiles.splice(i, 1);
                previewURLs.splice(i, 1);
                renderPreview();
                updatePublishState();
            });
            item.appendChild(remove);

            previewBox.appendChild(item);
        });
    }

    // ================= 发布 =================
    function updatePublishState() {
        const hasText = input.value.trim().length > 0;
        const hasImages = pendingFiles.length > 0;
        publishBtn.disabled = !hasText && !hasImages;
    }

    async function publish() {
        if (publishBtn.disabled) return;
        if (!isAdmin) {
            showToast('请先进入管理模式');
            return;
        }

        const text = input.value.trim();
        const originText = publishBtn.textContent;
        publishBtn.disabled = true;
        publishBtn.textContent = '发布中…';

        try {
            // 图片先压缩再上传到仓库
            const imageUrls = [];
            for (const file of pendingFiles) {
                const dataUrl = await compressImage(file);
                imageUrls.push(await DiaryAPI.uploadImage(dataUrl, file.name));
            }
            await DiaryAPI.createIssue({ text: text, imageUrls: imageUrls });

            // 清空输入区
            input.value = '';
            pendingFiles.forEach((_, i) => URL.revokeObjectURL(previewURLs[i]));
            pendingFiles = [];
            previewURLs = [];
            renderPreview();
            updatePublishState();

            await refreshEntries();
            feed.scrollTop = 0;
            showToast('发布成功 ✔');
        } catch (e) {
            console.error('发布失败:', e);
            showToast('发布失败：' + (e.message || '请重试'));
        } finally {
            publishBtn.textContent = originText;
            updatePublishState();
        }
    }

    publishBtn.addEventListener('click', publish);
    input.addEventListener('input', updatePublishState);

    // Ctrl + Enter 快捷发布
    input.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            publish();
        }
    });

    // ================= 删除说说 =================
    async function deletePost(entry) {
        if (!isAdmin) {
            showToast('只有管理模式可以删除');
            return;
        }
        if (!confirm('确定删除这条说说吗？')) return;
        try {
            if (entry.fromGitHub) {
                await DiaryAPI.closeIssue(entry.number);
            } else {
                const legacy = DiaryAPI.loadLegacy().filter(e => e.id !== entry.id);
                DiaryAPI.saveLegacy(legacy);
            }
            await refreshEntries();
            showToast('已删除');
        } catch (e) {
            showToast('删除失败：' + e.message);
        }
    }

    // ================= 轻提示 =================
    let toastTimer = null;
    function showToast(msg) {
        let toast = document.querySelector('.diary-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'diary-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
    }

    // ================= 初始化 =================
    async function refreshEntries() {
        try {
            entries = await DiaryAPI.loadAll();
        } catch (e) {
            entries = [];
        }
        // 合并还没迁移的旧版本地数据
        const legacy = DiaryAPI.loadLegacy();
        const ids = new Set(entries.map(e => e.id));
        legacy.forEach(e => {
            if (!ids.has(e.id)) entries.push(e);
        });
        renderFeed();
        updatePublishState();
    }

    (async function init() {
        if (DiaryAPI.getToken()) {
            isAdmin = true;
            composer.style.display = 'block';
        }
        renderAdminBar();
        await refreshEntries();
    })();

});
