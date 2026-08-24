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

    // ================= 新增: music 图标点击事件 =================
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
});

