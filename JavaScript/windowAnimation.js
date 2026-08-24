function animateWindow(element, options) {
    const { 
        fromScale = 0, 
        toScale = 1, 
        duration = 400, 
        easing = 'cubic-bezier(0.25, 0.8, 0.25, 1)', 
        onComplete = null 
    } = options;

    element.style.transition = 'none';
    element.style.transformOrigin = 'center center'; 

    element.style.transform = `scale(${fromScale})`;
    element.style.opacity = fromScale === 0 ? '0' : '1';

    void element.offsetWidth; 

    element.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
    element.style.transform = `scale(${toScale})`;
    element.style.opacity = toScale === 0 ? '0' : '1';

    const handleEnd = () => {
        element.removeEventListener('transitionend', handleEnd);
        if (onComplete) onComplete();
    };
    element.addEventListener('transitionend', handleEnd);
}