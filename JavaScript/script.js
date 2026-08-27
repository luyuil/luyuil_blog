document.addEventListener('DOMContentLoaded', function() {
    
    // ================= 底部社交图标 =================
    const githubIcon = document.getElementById('github-icon');
    const bilibiliIcon = document.getElementById('bilibili-icon');

    githubIcon.addEventListener('click', function() {
        window.open('https://github.com/luyuil', '_blank');
    });

    bilibiliIcon.addEventListener('click', function() {
        window.open('https://space.bilibili.com/565393704', '_blank');
    });

    // ================= music 图标 =================
    const musicIcon = document.getElementById('music-icon');
    const musicImg = musicIcon.querySelector('img');
    const audio = new Audio('./music/bgm.mp3'); 
    let isPlaying = false;

    musicIcon.addEventListener('click', function() {
        if (!isPlaying) {
            audio.play();
            musicImg.classList.add('rotating');
            isPlaying = true;
        } else {
            audio.pause();
            musicImg.classList.remove('rotating');
            isPlaying = false;
        }
    });

    audio.addEventListener('ended', function() {
        musicImg.classList.remove('rotating');
        isPlaying = false;
    });

    // ================= 核心辅助函数 =================

    // 获取元素不被 transform 干扰的真实坐标
    function getUntransformedRect(element) {
        element.style.transition = 'none';
        const originalTransform = element.style.transform;
        element.style.transform = 'none';
        
        const rect = element.getBoundingClientRect();
        
        // 恢复原本的 transform
        element.style.transform = originalTransform;
        return rect;
    }

    // 通用窗口开关函数
    function setupWindow(iconId, windowId, closeBtnId, headerId) {
        const icon = document.getElementById(iconId);
        const windowElement = document.getElementById(windowId);
        const closeBtn = document.getElementById(closeBtnId);
        const header = document.getElementById(headerId);
        
        let isOpen = false;

        icon.addEventListener('click', function() {
            if (isOpen) return;
            isOpen = true;

            windowElement.style.display = 'flex';
            windowElement.style.pointerEvents = 'auto';

            windowElement.style.top = '50%';
            windowElement.style.left = '50%';
            windowElement.style.marginTop = '-300px';
            windowElement.style.marginLeft = '-400px';
            windowElement.style.transform = 'scale(0)';

            animateWindow(windowElement, { fromScale: 0, toScale: 1, duration: 400 });
        });

        closeBtn.addEventListener('click', function() {
            if (!isOpen) return;
            isOpen = false;
            windowElement.style.pointerEvents = 'none';

            const rect = getUntransformedRect(windowElement);
            windowElement.style.transform = 'none';
            windowElement.style.left = '0px';
            windowElement.style.top = '0px';
            windowElement.style.marginLeft = rect.left + 'px';
            windowElement.style.marginTop = rect.top + 'px';

            animateWindow(windowElement, {
                fromScale: 1, toScale: 0, duration: 300,
                onComplete: () => { 
                    windowElement.style.display = 'none'; 
                    windowElement.style.marginTop = '0px';
                    windowElement.style.marginLeft = '0px';
                }
            });
        });

        // 为窗口头部绑定拖拽
        makeDraggable(header, windowElement);
    }

    // 通用拖拽函数
    function makeDraggable(header, windowElement) {
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('control-btn')) return; 
            
            const rect = getUntransformedRect(windowElement);
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            isDragging = true;
            document.body.style.userSelect = 'none';
            
            windowElement.style.transform = 'none';
            windowElement.style.left = '0px';
            windowElement.style.top = '0px';
            windowElement.style.marginLeft = rect.left + 'px';
            windowElement.style.marginTop = rect.top + 'px';
            
            windowElement.style.transition = 'none';
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            windowElement.style.marginLeft = (e.clientX - offsetX) + 'px';
            windowElement.style.marginTop = (e.clientY - offsetY) + 'px';
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
            document.body.style.userSelect = '';
            windowElement.style.transition = '';
        });
    }

    // ================= about窗口 =================
    setupWindow('about-icon', 'about-window', 'close-btn', 'popup-header');

    // about 的 Markdown 加载逻辑
    let markedReady = null;
    function ensureMarked() {
        if (window.marked) return Promise.resolve();
        if (!markedReady) {
            markedReady = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
                script.onload = () => resolve();
                script.onerror = () => {
                    markedReady = null;
                    reject(new Error('marked.js 加载失败'));
                };
                document.head.appendChild(script);
            });
        }
        return markedReady;
    }

    function loadMarkdown() {
        const mdContent = document.getElementById('md-content');
        
        Promise.all([
            fetch('./docs/about.md').then(response => response.text()),
            ensureMarked()
        ])
            .then(([text]) => {
                mdContent.innerHTML = marked.parse(text);
            })
            .catch(error => {
                console.error('加载Markdown失败:', error);
                mdContent.innerHTML = '<p style="color:red;">无法加载md文件，请检查路径是否正确。</p>';
            });
    }

    // 在 about 窗口动画结束后加载 Markdown（优化体验）
    document.getElementById('about-icon').addEventListener('click', function() {
        setTimeout(loadMarkdown, 400); // 等动画结束再加载
    });

    // ================= link窗口 =================
    setupWindow('link', 'link-window', 'link-close-btn', 'link-popup-header');

    const linkContent = document.getElementById('link-content');

    function addProject(name, url) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.textContent = name;
        card.addEventListener('click', () => window.open(url, '_blank'));
        linkContent.appendChild(card);
    }

    addProject('24电赛H车', 'https://github.com/luyuil/Line_Track_Car');
    addProject('个人博客架构', 'https://github.com/luyuil/luyuil_blog');

    // ================= Photo 窗口 =================
    // 注意：先 setupWindow，再初始化里面的元素
    setupWindow('photo', 'photo-window', 'photo-close-btn', 'photo-popup-header');

    const photoContent = document.getElementById('photo-content');
    const previewOverlay = document.getElementById('photo-preview-overlay');
    const previewImg = document.getElementById('preview-img');
    const previewClose = document.getElementById('preview-close-btn');

    // 防止照片在窗口还没显示时获取宽高为0，所以延迟到窗口打开后再添加
    window.addEventListener('resize', () => {
        // 如果窗口大小变了，重新计算边界（可选，这里仅作提示）
    });

    function addPhoto(imageSrc) {
        const card = document.createElement('div');
        card.className = 'photo-card';

        const randomRotate = Math.floor(Math.random() * 30) - 15;
        
        const img = document.createElement('img');
        img.src = imageSrc;
        card.appendChild(img);

        setTimeout(() => {
            const rect = photoContent.getBoundingClientRect();
            const maxX = Math.max(0, rect.width - 150);
            const maxY = Math.max(0, rect.height - 150);
            card.style.left = Math.floor(Math.random() * maxX) + 'px';
            card.style.top = Math.floor(Math.random() * maxY) + 'px';
        }, 50); 
        
        card.style.transform = `rotate(${randomRotate}deg)`;

        card.addEventListener('mousedown', function(e) {
            e.stopPropagation(); 
            e.preventDefault();

            let startX = e.clientX;
            let startY = e.clientY;
            let originLeft = parseFloat(card.style.left) || 0;
            let originTop = parseFloat(card.style.top) || 0;
            
            let hasDragged = false;

            function onMouseMove(ev) {
                if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
                    hasDragged = true;
                }

                let newLeft = originLeft + (ev.clientX - startX);
                let newTop = originTop + (ev.clientY - startY);

                const rect = photoContent.getBoundingClientRect();
                newLeft = Math.max(0, Math.min(newLeft, rect.width - 150));
                newTop = Math.max(0, Math.min(newTop, rect.height - 150));

                card.style.left = newLeft + 'px';
                card.style.top = newTop + 'px';
            }

            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                if (!hasDragged) {
                    showPreview(imageSrc); // 调用新函数
                }
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        photoContent.appendChild(card);
    }

    // 新增：根据图片原始尺寸打开预览的函数
    function showPreview(imageSrc) {
        const tempImg = new Image();
        tempImg.onload = function() {
            // 获取图片原始宽高
            let naturalW = tempImg.width;
            let naturalH = tempImg.height;

            // 限制最大尺寸（占屏幕90%），防止超清大图溢出屏幕
            const maxW = window.innerWidth * 0.9;
            const maxH = window.innerHeight * 0.9;

            let scale = Math.min(1, maxW / naturalW, maxH / naturalH);
            
            // 计算最终的显示尺寸
            let finalW = naturalW * scale;
            let finalH = naturalH * scale;

            // 设置预览框的尺寸
            const previewBox = document.getElementById('photo-preview-box');
            previewBox.style.width = finalW + 'px';
            previewBox.style.height = finalH + 'px';

            // 设置图片路径并显示
            previewImg.src = imageSrc;
            previewOverlay.classList.add('show');
        };
        tempImg.src = imageSrc;
    }

    // 添加你的图片
    addPhoto('./image/isla5.jpg');
    addPhoto('./image/misaki.jpg');
    addPhoto('./image/clanned.png');
    addPhoto('./image/air.jpg');
    addPhoto('./image/anglebeat.jpg');
    addPhoto('./image/helloworld.jpg');
    
    // 大图预览的关闭逻辑
    previewClose.addEventListener('click', () => previewOverlay.classList.remove('show'));
    previewOverlay.addEventListener('click', (e) => {
        if (e.target === previewOverlay) previewOverlay.classList.remove('show');
    });
});