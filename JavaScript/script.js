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

    // ================= about窗口 =================
    const aboutIcon = document.querySelectorAll('.icon-item')[0];
    const aboutWindow = document.getElementById('about-window');
    const aboutCloseBtn = document.getElementById('close-btn');
    const aboutPopupHeader = document.getElementById('popup-header');

    let aboutOpen = false; 

    aboutIcon.addEventListener('click', function() {
        if (aboutOpen) return; 
        aboutOpen = true;

        aboutWindow.style.display = 'flex';
        aboutWindow.style.pointerEvents = 'auto';

        aboutWindow.style.top = '50%';
        aboutWindow.style.left = '50%';
        aboutWindow.style.marginTop = '-300px';
        aboutWindow.style.marginLeft = '-400px';
        aboutWindow.style.transform = 'scale(0)';

        animateWindow(aboutWindow, {
            fromScale: 0,
            toScale: 1,
            duration: 400,
            onComplete: () => { loadMarkdown(); } 
        });
    });

    aboutCloseBtn.addEventListener('click', function() {
        if (!aboutOpen) return;
        aboutOpen = false;
        aboutWindow.style.pointerEvents = 'none';

        const rect = aboutWindow.getBoundingClientRect();
        aboutWindow.style.transform = 'none';
        aboutWindow.style.left = '0px';
        aboutWindow.style.top = '0px';
        aboutWindow.style.marginLeft = rect.left + 'px';
        aboutWindow.style.marginTop = rect.top + 'px';

        animateWindow(aboutWindow, {
            fromScale: 1,
            toScale: 0,
            duration: 300,
            onComplete: () => { 
                aboutWindow.style.display = 'none'; 
                aboutWindow.style.marginTop = '0px';
                aboutWindow.style.marginLeft = '0px';
            }
        });
    });

    // ================= link窗口 =================
    const linkIcon = document.querySelectorAll('.icon-item')[3]; // 第4个图标
    const linkWindow = document.getElementById('link-window');
    const linkCloseBtn = document.getElementById('link-close-btn');
    const linkPopupHeader = document.getElementById('link-popup-header');
    const linkContent = document.getElementById('link-content');

    let linkOpen = false;

    // 封装：添加项目卡片函数（以后直接用这个函数）
    function addProject(name, url) {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.textContent = name; // 显示项目名称
        
        // 点击跳转到对应链接
        card.addEventListener('click', function() {
            window.open(url, '_blank');
        });

        linkContent.appendChild(card); // 自动排版（flex/calc 会自动换行）
    }

    // 手动添加你的两个项目
    addProject('24电赛H车', 'https://github.com/luyuil/Line_Track_Car');
    addProject('个人博客架构', 'https://github.com/luyuil/luyuil_blog');

    // 点击 link 图标打开窗口
    linkIcon.addEventListener('click', function() {
        if (linkOpen) return;
        linkOpen = true;

        linkWindow.style.display = 'flex';
        linkWindow.style.pointerEvents = 'auto';

        linkWindow.style.top = '50%';
        linkWindow.style.left = '50%';
        linkWindow.style.marginTop = '-300px';
        linkWindow.style.marginLeft = '-400px';
        linkWindow.style.transform = 'scale(0)';

        animateWindow(linkWindow, {
            fromScale: 0,
            toScale: 1,
            duration: 400
        });
    });

    // 关闭 link 窗口
    linkCloseBtn.addEventListener('click', function() {
        if (!linkOpen) return;
        linkOpen = false;
        linkWindow.style.pointerEvents = 'none';

        const rect = linkWindow.getBoundingClientRect();
        linkWindow.style.transform = 'none';
        linkWindow.style.left = '0px';
        linkWindow.style.top = '0px';
        linkWindow.style.marginLeft = rect.left + 'px';
        linkWindow.style.marginTop = rect.top + 'px';

        animateWindow(linkWindow, {
            fromScale: 1,
            toScale: 0,
            duration: 300,
            onComplete: () => { 
                linkWindow.style.display = 'none'; 
                linkWindow.style.marginTop = '0px';
                linkWindow.style.marginLeft = '0px';
            }
        });
    });

    // ================= 通用拖拽函数 (支持 about 和 link) =================
    function makeDraggable(header, windowElement) {
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('control-btn')) return; 
            
            const rect = windowElement.getBoundingClientRect();
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

    // 为 about 和 link 窗口绑定拖拽
    makeDraggable(aboutPopupHeader, aboutWindow);
    makeDraggable(linkPopupHeader, linkWindow);

    // 4. 加载 about 的 Markdown 文件
    function loadMarkdown() {
        const mdContent = document.getElementById('md-content');
        
        fetch('./docs/about.md')
            .then(response => response.text())
            .then(text => {
                mdContent.innerHTML = marked.parse(text);
            })
            .catch(error => {
                console.error('加载Markdown失败:', error);
                mdContent.innerHTML = '<p style="color:red;">无法加载md文件，请检查路径是否正确。</p>';
            });
    }
});