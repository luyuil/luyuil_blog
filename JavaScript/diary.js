/* ================= 日记（说说）功能 =================
 *
 * 设计思路：
 * 1. 数据层（DiaryAPI）与界面层（渲染/发布）分开。
 *    现在数据存在浏览器 localStorage 里，以后要上线公网时，
 *    只需要把 DiaryAPI 内部换成 LeanCloud / GitHub Issues 等接口，
 *    界面代码完全不用动。
 * 2. 每一条说说 = { id, text, images[], createdAt }。
 *    渲染时按 createdAt 从新到旧排序，最新的永远在最上面。
 * 3. 发布像 QQ 空间一样简单：文本框输入 + 选图 + 点发布（或 Ctrl+Enter）。
 *    图片会在本地自动压缩后再保存，避免撑爆 localStorage 的容量。
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // ================= 数据层（以后上线就只改这里） =================
    const STORAGE_KEY = 'luyuil_diary_v1';

    const DiaryAPI = {
        async loadAll() {
            try {
                return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            } catch (e) {
                return [];
            }
        },

        async saveAll(list) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
    };

    // ================= 页面元素 =================
    const diaryApp = document.getElementById('diary-app');
    if (!diaryApp) return;

    const input = document.getElementById('diary-input');
    const publishBtn = document.getElementById('diary-publish');
    const fileInput = document.getElementById('diary-file');
    const previewBox = document.getElementById('diary-preview');
    const feed = document.getElementById('diary-feed');

    // ================= 状态 =================
    let entries = [];        // 所有说说
    let pendingFiles = [];   // 本次还没发布的图片文件
    let previewURLs = [];    // 预览用的临时 URL（发布后要释放）

    // ================= 工具函数 =================
    function formatTime(ts) {
        const d = new Date(ts);
        const p = (n) => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
            ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    // 压缩图片：最大边 1000px、质量 0.75，返回 dataURL（能存进 localStorage）
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
        return str
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

    // ================= 渲染 =================
    function renderFeed() {
        feed.innerHTML = '';
        const sorted = entries.slice().sort((a, b) => b.createdAt - a.createdAt);

        if (sorted.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'diary-empty';
            empty.textContent = '还没有说说，来发第一条吧 ✨';
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

        // 删除（悬停显示）
        const del = document.createElement('span');
        del.className = 'diary-post-delete';
        del.title = '删除这条说说';
        del.textContent = '✕';
        del.addEventListener('click', () => deletePost(entry.id));
        card.appendChild(del);

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

        const text = input.value.trim();
        const originText = publishBtn.textContent;
        publishBtn.disabled = true;
        publishBtn.textContent = '发布中…';

        try {
            const images = [];
            for (const file of pendingFiles) {
                images.push(await compressImage(file));
            }

            const entry = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                text: text,
                images: images,
                createdAt: Date.now()
            };

            entries.push(entry);
            await DiaryAPI.saveAll(entries);

            // 清空输入区
            input.value = '';
            pendingFiles.forEach((_, i) => URL.revokeObjectURL(previewURLs[i]));
            pendingFiles = [];
            previewURLs = [];
            renderPreview();
            updatePublishState();

            renderFeed();
            feed.scrollTop = 0;            // 新说说在最上面
            showToast('发布成功 ✔');
        } catch (e) {
            // 最常见的原因是 localStorage 满了（图片太多）
            if (e && e.name === 'QuotaExceededError') {
                entries.pop();
                showToast('存储空间不够啦，少放几张图或删掉旧说说再试');
            } else {
                console.error('发布失败:', e);
                showToast('发布失败，请重试');
            }
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
    function deletePost(id) {
        if (!confirm('确定删除这条说说吗？')) return;
        entries = entries.filter(e => e.id !== id);
        DiaryAPI.saveAll(entries)
            .then(renderFeed)
            .catch(() => showToast('删除失败'));
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
        toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
    }

    // ================= 初始化 =================
    (async function init() {
        entries = await DiaryAPI.loadAll();

        // 第一次打开时放一条示例说说，方便看效果（可以随时删掉）
        if (!localStorage.getItem(STORAGE_KEY)) {
            entries.push({
                id: 'welcome',
                text: '这是我的第一条说说 🎉\n以后可以在这里记录日常、配图片，像 QQ 空间一样～',
                images: ['./image/isla5.jpg'],
                createdAt: Date.now()
            });
            await DiaryAPI.saveAll(entries);
        }

        renderFeed();
        updatePublishState();
    })();

});
