const endHandlers = new WeakMap();

function animateWindow(element, options) {
    const {
        fromScale = 0,
        toScale = 1,
        duration = 400,
        easing = 'cubic-bezier(0.25, 0.8, 0.25, 1)',
        onComplete = null
    } = options;

    // 取消上一次未结束动画的回调，防止旧回调在新动画结束时误触发
    const prevEnd = endHandlers.get(element);
    if (prevEnd) element.removeEventListener('transitionend', prevEnd);

    element.style.transition = 'none';
    element.style.transformOrigin = 'center center';

    element.style.transform = `scale(${fromScale})`;
    element.style.opacity = fromScale === 0 ? '0' : '1';

    void element.offsetWidth;

    element.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
    element.style.transform = `scale(${toScale})`;
    element.style.opacity = toScale === 0 ? '0' : '1';

    const handleEnd = (e) => {
        // 只响应元素自身的 transform/opacity 过渡结束，忽略子元素冒泡上来的事件
        if (e.target !== element) return;
        if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;

        element.removeEventListener('transitionend', handleEnd);
        endHandlers.delete(element);
        if (onComplete) onComplete();
    };
    endHandlers.set(element, handleEnd);
    element.addEventListener('transitionend', handleEnd);
}

// 获取忽略当前 transform 缩放后的位置，避免缩放动画中途取值导致窗口跳动
function getUntransformedRect(element) {
    const rect = element.getBoundingClientRect();
    if (rect.width === element.offsetWidth && rect.height === element.offsetHeight) {
        return rect;
    }
    return {
        left: rect.left + (element.offsetWidth - rect.width) / 2,
        top: rect.top + (element.offsetHeight - rect.height) / 2
    };
}
