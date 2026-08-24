// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
    
    // 获取图标元素
    const githubIcon = document.getElementById('github-icon');
    const bilibiliIcon = document.getElementById('bilibili-icon');

    // 为 GitHub 图标添加点击事件
    githubIcon.addEventListener('click', function() {
        // 跳转到 GitHub 主页
        window.open('https://github.com/luyuil', '_blank'); // _blank 表示在新标签页打开
        // 如果想在当前页面打开，可以改成 window.location.href = '...'
    });

    // 为 Bilibili 图标添加点击事件
    bilibiliIcon.addEventListener('click', function() {
        // 跳转到 Bilibili 空间
        window.open('https://space.bilibili.com/565393704', '_blank');
    });

    // ================= 其他图标点击事件 ====================


    // =================  music 图标点击事件 =================
    const musicIcon = document.getElementById('music-icon');
    const musicImg = musicIcon.querySelector('img'); // 获取里面的图片元素
    const audio = new Audio('./music/bgm.mp3'); 
    let isPlaying = false; // 记录是否正在播放

    musicIcon.addEventListener('click', function() {
        if (!isPlaying) {
            // 开始播放
            audio.play();
            musicImg.classList.add('rotating'); // 添加旋转动画类
            isPlaying = true;
        } else {
            // 暂停播放
            audio.pause();
            musicImg.classList.remove('rotating'); // 移除旋转动画类
            isPlaying = false;
        }
    });

    // 歌曲播放结束后自动停止旋转
    audio.addEventListener('ended', function() {
        musicImg.classList.remove('rotating');
        isPlaying = false;
    });

    // ================= About 窗口逻辑 =================
    const aboutIcon = document.querySelectorAll('.icon-item')[0]; // 找到第一个图标(about)
    const aboutWindow = document.getElementById('about-window');
    const closeBtn = document.getElementById('close-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const popupHeader = document.getElementById('popup-header');
    
    // 1. 点击 about 打开窗口
    aboutIcon.addEventListener('click', function() {
        aboutWindow.style.display = 'flex';
        loadMarkdown(); // 打开时加载 md 文件
    });

    // 2. 点击关闭按钮
    closeBtn.addEventListener('click', function() {
        aboutWindow.style.display = 'none';
    });

    // 3. 点击放大/还原按钮
    maximizeBtn.addEventListener('click', function() {
        aboutWindow.classList.toggle('fullscreen');
        // 切换图标文本
        if (aboutWindow.classList.contains('fullscreen')) {
            maximizeBtn.textContent = '⤢'; // 还原图标
        } else {
            maximizeBtn.textContent = '⛶'; // 放大图标
        }
    });

    // 4. 窗口拖拽功能（在头部按住拖动）
    let isDragging = false;
    let offsetX, offsetY;

    popupHeader.addEventListener('mousedown', function(e) {
        // 排除点击按钮时的拖拽
        if (e.target.classList.contains('control-btn')) return; 

        // 如果处于全屏，禁止拖拽
        if (aboutWindow.classList.contains('fullscreen')) return;

        isDragging = true;
        // 计算鼠标位置和窗口左上角的偏移量
        const rect = aboutWindow.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // 禁用文本选中
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        // 移动窗口
        aboutWindow.style.left = e.clientX - offsetX + 'px';
        aboutWindow.style.top = e.clientY - offsetY + 'px';
        aboutWindow.style.transform = 'none'; // 去掉居中的 transform
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        document.body.style.userSelect = '';
    });

    // 5. 加载 Markdown 文件
    function loadMarkdown() {
        const mdContent = document.getElementById('md-content');
        
        // 注意：路径改为你的 md 文件路径，比如 ./docs/about.md
        fetch('./docs/about.md')
            .then(response => response.text())
            .then(text => {
                // 使用 marked.js 将 md 转换为 HTML
                mdContent.innerHTML = marked.parse(text);
            })
            .catch(error => {
                console.error('加载Markdown失败:', error);
                mdContent.innerHTML = '<p style="color:red;">无法加载md文件，请检查路径是否正确。</p>';
            });
    }
});

