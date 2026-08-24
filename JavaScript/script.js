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

    // =================  about窗口 =================
    const aboutIcon = document.querySelectorAll('.icon-item')[0]; // about 图标
    const aboutWindow = document.getElementById('about-window');
    const closeBtn = document.getElementById('close-btn');
    const popupHeader = document.getElementById('popup-header'); // 补上这个变量

    let isOpen = false; 

    // 1. 点击 about 打开窗口
    aboutIcon.addEventListener('click', function() {
        if (isOpen) return; 
        isOpen = true;

        aboutWindow.style.display = 'flex';
        aboutWindow.style.pointerEvents = 'auto';

        // 关键：将窗口固定在屏幕正中间，并且用 margin 来精确补偿宽度/高度的一半
        aboutWindow.style.top = '50%';
        aboutWindow.style.left = '50%';
        aboutWindow.style.marginTop = '-300px'; // 高度的一半 (600/2)
        aboutWindow.style.marginLeft = '-400px'; // 宽度的一半 (800/2)

        // 保证此时没有 translate 干扰，让 scale 从正中心放大
        aboutWindow.style.transform = 'scale(0)';

        animateWindow(aboutWindow, {
            fromScale: 0,
            toScale: 1,
            duration: 400,
            onComplete: () => { loadMarkdown(); } 
        });
    });

    // 2. 点击关闭按钮
    closeBtn.addEventListener('click', function() {
        if (!isOpen) return;
        isOpen = false;
        aboutWindow.style.pointerEvents = 'none';

        // 关键：读取当前窗口的真实位置，用 margin 定格，防止跳回中间
        const rect = aboutWindow.getBoundingClientRect();
        aboutWindow.style.transform = 'none'; // 去掉可能残留的 translate（其实没有）
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
                // 关闭后重置，确保下一次打开能完美居中
                aboutWindow.style.marginTop = '0px';
                aboutWindow.style.marginLeft = '0px';
            }
        });
    });

    // 3. 窗口拖拽功能
    let isDragging = false;
    let offsetX, offsetY;

    popupHeader.addEventListener('mousedown', function(e) {
        if (e.target.classList.contains('control-btn')) return; 
        
        // 获取当前实际位置
        const rect = aboutWindow.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        isDragging = true;
        document.body.style.userSelect = 'none';
        
        // 将窗口转为绝对像素定位（margin）方式，去掉所有 transform 干扰
        aboutWindow.style.transform = 'none';
        aboutWindow.style.left = '0px';
        aboutWindow.style.top = '0px';
        aboutWindow.style.marginLeft = rect.left + 'px';
        aboutWindow.style.marginTop = rect.top + 'px';
        
        aboutWindow.style.transition = 'none'; // 拖拽时禁止过渡，防止卡顿
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        aboutWindow.style.marginLeft = (e.clientX - offsetX) + 'px';
        aboutWindow.style.marginTop = (e.clientY - offsetY) + 'px';
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        document.body.style.userSelect = '';
        aboutWindow.style.transition = ''; // 恢复过渡，供下次动画使用
    });


    // 4. 加载 Markdown 文件
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

