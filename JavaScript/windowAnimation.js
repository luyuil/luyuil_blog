/**
 * 窗口动画引擎（独立封装）
 * 用法: animateWindow(element, options)
 */
function animateWindow(element, options) {
    const { 
        fromScale = 0, 
        toScale = 1, 
        duration = 400, 
        easing = 'cubic-bezier(0.25, 0.8, 0.25, 1)', 
        onComplete = null 
    } = options;

    // 清除之前的动画状态
    element.style.transition = 'none';
    element.style.transformOrigin = 'center center'; // 保证从中心缩放

    // 初始状态：强制渲染一下，确保过渡生效
    element.style.transform = `translate(-50%, -50%) scale(${fromScale})`;
    element.style.opacity = fromScale === 0 ? '0' : '1';

    // 强制重绘
    void element.offsetWidth; 

    // 开始动画
    element.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
    element.style.transform = `translate(-50%, -50%) scale(${toScale})`;
    element.style.opacity = toScale === 0 ? '0' : '1';

    // 动画结束后的回调
    const handleEnd = () => {
        element.removeEventListener('transitionend', handleEnd);
        if (onComplete) onComplete();
    };
    element.addEventListener('transitionend', handleEnd);
}