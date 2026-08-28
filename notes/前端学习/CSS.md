---
tags: [前端, CSS, 博客项目]
---

# 前端学习：CSS（博客的皮肤）

> [!info] 这篇笔记讲什么
> CSS（层叠样式表）负责网页的**外观**——位置、颜色、大小、动画。
> 这里结合博客项目，讲清楚选择器、盒模型、flex 布局、定位、层级、动画这些核心概念，
> 以及博客里“弹窗居中”“左右分栏”“九宫格图片”“层级谁盖谁”是怎么写出来的。
> 配套阅读：[[HTML]]（骨架）、[[JavaScript]]（大脑）。

---

## 一、CSS 是什么

CSS 就是一堆“规则”：**选中谁，设置什么样式**。

```css
/* 选择器 { 属性: 值; } */
.greeting {
    font-size: 3rem;        /* 字号 */
    color: #333;            /* 颜色 */
    text-align: center;     /* 居中 */
}
```

### 选择器速查（博客里用到的）

| 选择器 | 含义 | 博客例子 |
| --- | --- | --- |
| `div` | 标签选择器：所有 div | `body, html { margin: 0; }` |
| `.popup-window` | 类选择器：所有带这个 class 的 | 所有弹窗共用一套样式 |
| `#diary-window` | id 选择器：唯一的那个 | 单独给日记窗口调宽高 |
| `.icon-item img` | 后代选择器：图标里的 img | 图标图片统一尺寸 |
| `.diary-photos img` | 后代选择器 | 九宫格图片铺满格子 |
| `.study-node.open > .study-children` | 子代选择器 | 展开的文件夹才显示子级 |

---

## 二、盒模型：所有元素的底层规律

每个元素都是一层层的“盒子”：

```text
┌────────────── margin（外边距）──────────────┐
│  ┌────────── border（边框）──────────┐      │
│  │  ┌────── padding（内边距）──────┐  │      │
│  │  │  ┌──── content（内容）────┐  │  │      │
│  │  │  │                        │  │  │      │
│  │  │  └────────────────────────┘  │  │      │
│  │  └──────────────────────────────┘  │      │
│  └────────────────────────────────────┘      │
└──────────────────────────────────────────────┘
```

```css
.popup-window {
    width: 800px;
    height: 600px;
    padding: 0;
    box-sizing: border-box;  /* 宽高包含 padding 和 border，布局更好算 */
}
```

> [!tip] `box-sizing: border-box`
> 默认情况下 width 只算内容，padding/border 会把盒子撑大，算尺寸容易懵。
> 项目里建议统一用 `border-box`（`* { box-sizing: border-box; }`）。

---

## 三、弹窗是怎么“藏起来”又“弹出来”的

这是博客最核心的 CSS 技巧，两个机制配合：

```css
.popup-window {
    position: fixed;            /* 固定定位，钉在屏幕上 */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0); /* 居中 + 缩到 0 = 看不见 */
    display: none;              /* 默认彻底不渲染，不挡点击 */
    pointer-events: none;       /* 保险：即使可见也不接收鼠标事件 */
}
```

> [!note] 为什么用 transform 缩放而不是 display 切换动画？
> `display: none` 和 `display: flex` 之间**无法做过渡动画**（display 不是可动画属性）。
> 所以博客的做法是：先 `display: flex` 显示出来，再用 `transform: scale(0→1)`
> 配合 JS 的 `transitionend` 做缩放动画（见 [[JavaScript]] 的窗口系统）。

### 居中三件套

```css
.main-card {
    position: absolute;      /* 或 fixed */
    top: 50%;
    left: 70%;               /* 想偏右一点就把 left 调到 70% */
    transform: translate(-50%, -50%);  /* 以自身一半宽高往回挪，实现居中 */
}
```

> [!warning] transform 和定位的关系（踩坑点）
> 拖拽窗口时，项目不用 `left/top` 而用 `margin-left/margin-top` 记录位置，
> 因为 `transform` 会和定位计算混在一起，导致拖拽时窗口跳动。
> 记住：**动了 transform，就别再用 left/top 精确摆放**。

---

## 四、flex 布局：博客排版的主力

### 1. 主卡片：内容垂直居中

```css
.card-body {
    display: flex;
    flex-direction: column;   /* 从上到下排列 */
    align-items: center;      /* 水平居中 */
    justify-content: center;  /* 垂直居中 */
}
```

### 2. 日记窗口：上面固定输入区，下面滚动时间线

```css
#diary-content {
    display: flex;
    flex-direction: column;
}
.diary-feed {
    flex: 1;                  /* 占满剩余高度 */
    overflow-y: auto;         /* 内容多了就滚动 */
    min-height: 0;            /* 关键！不然 flex 子项不会收缩 */
}
```

> [!warning] flex 子项滚动失效的坑
> 只写 `flex: 1; overflow-y: auto` 还不够，必须加 `min-height: 0`，
> 否则子项默认 `min-height: auto`，内容一多就把父容器撑爆而不是滚动。

### 3. 学习笔记：左边目录栏 + 右边内容

```css
.study-app {
    display: flex;             /* 默认横向排列 */
    height: 100%;
}
.study-sidebar {
    width: 230px;              /* 目录栏固定窄宽度 */
    flex-shrink: 0;            /* 不被压缩 */
}
.study-note {
    flex: 1;                   /* 右边占满剩余宽度 */
    overflow-y: auto;
}
```

> [!tip] flex 一图流
> `display:flex` 让子项横着排；`flex:1` 表示“剩余空间都给我”；
> `flex-shrink:0` 表示“我打死不让步”。

---

## 五、层级：谁盖在谁上面

弹窗要盖住主卡片，大图预览要盖住所有弹窗，靠 `z-index`：

```css
#bg-video      { z-index: 0; }   /* 最底层：背景视频 */
.overlay       { z-index: 1; }   /* 背景遮罩 */
.main-card     { z-index: 10; }  /* 主卡片 */
.popup-window  { z-index: 100; } /* 弹窗 */
.photo-preview-overlay,
.diary-lightbox { z-index: 999; } /* 大图预览：最高 */
```

> [!warning] z-index 只在定位元素上生效
> `z-index` 对 `position: static`（默认）的元素无效。
> 所以弹窗是 `position: fixed`，大图预览也是 `fixed`。

---

## 六、图片排版：九宫格与封面

### 1. 说说图片九宫格

```css
.diary-photos {
    display: grid;
    gap: 5px;                    /* 格子间距 */
}
.diary-photos.photo-count-1 { grid-template-columns: 1fr; max-width: 70%; }
.diary-photos.photo-count-2 { grid-template-columns: repeat(2, 1fr); }
.diary-photos.photo-count-3 { grid-template-columns: repeat(3, 1fr); }
.diary-photos img {
    width: 100%;
    aspect-ratio: 1;             /* 强制 1:1 正方形，不满的图片裁掉多余 */
    object-fit: cover;           /* 裁剪填满，不变形 */
    border-radius: 6px;
}
```

> [!note] `object-fit: cover`
> 图片默认会“拉伸变形”填满容器；`cover` 是按比例缩放后**裁剪**填满，
> 像 QQ 空间/朋友圈那样整齐，这是照片墙不变形的关键。

### 2. 视频封面

```css
#bg-video {
    position: fixed;
    width: 100%;
    height: 100%;
    object-fit: cover;   /* 视频铺满全屏且不变形 */
}
```

---

## 七、动画：让界面活起来

### 1. 入场动画（@keyframes）

```css
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
}
.greeting {
    animation: fadeInUp 1s ease forwards 0.2s; /* 0.2s 后开始，停在最后一帧 */
}
```

### 2. 新说说滑入

```css
@keyframes diaryIn {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
}
.diary-post {
    animation: diaryIn 0.35s ease;
}
```

### 3. 音乐图标旋转

```css
@keyframes rotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
.rotating { animation: rotate 1s linear infinite; }
```

> [!tip] transition 和 animation 的区别
> `transition` 是“状态变化时平滑过渡”（比如 hover 变大）；
> `animation` 是“自动播放一段动画”（比如入场、旋转）。

---

## 八、交互细节：user-select 和 pointer-events

```css
.popup-window {
    user-select: none;      /* 拖窗口时防止选中文字 */
    pointer-events: none;   /* 隐藏状态时不让它挡住其他元素点击 */
}
.popup-body {
    user-select: text;      /* 但内容区要允许选中文字、输入文字 */
}
```

> [!warning] 为什么弹窗要 `pointer-events: none`
> 弹窗虽然 `display:none` 了，但 JS 打开前会先显示；如果忘了开
> `pointer-events: auto`，弹窗会盖住主卡片导致点不到图标（这个逻辑在 [[JavaScript]]）。

---

## 九、注意点总结（踩坑记录）

> [!warning] 中文文件名在 URL 里会变成百分号编码
> 比如 `图.png` 可能显示为 `%E5%9B%BE.png`，这在 JS 里要用
> `decodeURIComponent` 还原再匹配文件名（见 [[JavaScript]] 踩坑记录）。

> [!warning] 大图不压缩 = 页面卡死
> 背景视频 18MB、照片 9MB 时页面加载极慢。把视频压到 0.3MB、
> 图片压到 200KB 左右，并给图片加 `loading="lazy"`，速度立竿见影。

> [!tip] 用浏览器开发者工具（F12）调样式
> 右键元素 → 检查，可以实时改 CSS 看效果，改完再抄回文件里。

---

## 十、和另外两篇的关系

- [[HTML]] 提供结构和 id/class，CSS 靠这些“挂钩”来选中元素。
- [[JavaScript]] 动态改的也是 CSS 属性（`style.display`、`classList`），
  所以 JS 操作样式前，得先懂 CSS 的属性名。

> [!quote] 一句话记忆
> CSS 就是“选中谁 + 设置什么”，先把选择器和盒模型吃透，剩下的都是查属性。
