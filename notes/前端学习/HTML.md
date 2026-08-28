---
tags: [前端, HTML, 博客项目]
---
# 前端学习：HTML（博客的骨架）

> [!info] 这篇笔记讲什么
> HTML（超文本标记语言）负责搭建网页的**结构**——就像房子的钢筋骨架。
> 这里结合我自己的博客项目 `luyuil_blog`，讲清楚 HTML 的基础概念、常用标签，
> 以及博客里那些功能（弹窗、图标、视频背景、上传按钮）在 HTML 层面是怎么写的。
> 配套阅读：[[CSS]]（皮肤）、[[JavaScript]]（大脑）。

---

## 一、HTML 是什么

HTML 用一对对“标签”把内容包起来，告诉浏览器“这里是一张图、那里是一段文字”。

```html
<!-- 标签一般是成对出现：<开始>内容</结束> -->
<h1>我是标题</h1>
<p>我是一段文字</p>
<!-- 也有自闭合标签：没有内容的标签 -->
<img src="图片地址" alt="描述">
<input type="text">
```

标签上还能写**属性**，属性就是给标签补充信息：

```html
<img src="./image/isla3.jpg" alt="头像">
<!-- src: 图片地址；alt: 图片加载失败时显示的文字（也方便读屏软件） -->
```

> [!tip] 标签 ≠ 内容
> 标签是给浏览器看的“说明书”，用户看到的是标签之间的内容。

---

## 二、一个网页文档的基本结构

任何网页都以 `<!DOCTYPE html>` 开头，然后是 `<html>`、`<head>`、`<body>` 三层结构。
博客首页 `index.html` 开头就是这样：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- head 里放“给浏览器看的信息”，用户看不到 -->
    <meta charset="UTF-8">   <!-- 声明编码，中文不乱码的关键！ -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">  <!-- 手机适配 -->
    <title>luyuil_blog</title>

    <!-- 引入外部 CSS：网页的皮肤 -->
    <link rel="stylesheet" href="./CSS/style.css">
    <link rel="stylesheet" href="./CSS/diary.css">
    <link rel="stylesheet" href="./CSS/study.css">

    <!-- 引入外部 JS 库：marked 用来把 Markdown 渲染成网页 -->
    <script async src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body>
    <!-- body 里放用户能看到的全部内容 -->
</body>
</html>
```

> [!warning] `meta charset="UTF-8"` 必须写
> 不写它，中文会乱码。我的博客文件全是 UTF-8 编码，所以声明也要一致。

### 引入外部文件的两种方式

| 引入什么 | 用什么标签 | 放在哪 |
| --- | --- | --- |
| CSS 样式 | `<link rel="stylesheet" href="...">` | `<head>` 里 |
| JS 脚本 | `<script src="..."></script>` | 一般放 `<body>` **末尾** |
| 第三方库（如 marked） | `<script async src="...">` | `<head>`，`async` 表示异步加载不阻塞 |

> [!example] 为什么 JS 放 body 末尾？
> 脚本在**执行的那一刻**才能拿到它前面的 DOM 元素。
> 博客的弹窗结构都在 `<script src="./JavaScript/script.js">` 之后，
> 所以脚本一执行就能 `getElementById` 到它们。如果放到 `<head>` 里，
> 元素还没解析出来，就会拿到 `null`（这个问题我实际踩过，见 [[JavaScript]] 的踩坑记录）。

---

## 三、博客首页的结构是怎么搭出来的

博客 `index.html` 的 `<body>` 大体是这几块，从上到下：

```text
body
├── <video>           视频背景（铺满全屏）
├── <div class="overlay">   半透明遮罩（让背景更有氛围）
├── <div class="main-card"> 中间主卡片（头像问候 + 5 个功能图标）
│   └── <div class="icon-row">  about / note / photo / link / music 图标
├── <div class="link-icons">  底部固定：GitHub / Bilibili
├── <script>…</script>        JS 脚本
└── 5 个弹窗 + 1 个大图预览层
    ├── #about-window / #diary-window / #study-window
    ├── #photo-window / #link-window
    └── #photo-preview-overlay
```

> [!note] 每个弹窗长得都一样，所以结构统一
> ```html
> <div class="popup-window" id="diary-window">
>     <div class="popup-header">   <!-- 蓝色标题栏，可拖拽 -->
>         <span class="popup-title">diary</span>
>         <div class="window-controls">
>             <span class="control-btn" id="diary-close-btn">✕</span>
>         </div>
>     </div>
>     <div class="popup-body" id="diary-content">
>         <!-- 内容由 JS 动态填充 -->
>     </div>
> </div>
> ```
> 统一结构的好处：CSS 写一套样式（见 [[CSS]]），JS 写一套开关逻辑（见 [[JavaScript]]），
> 所有窗口都能复用。

---

## 四、博客里用到的核心标签速查

| 标签 | 作用 | 博客里用在哪 |
| --- | --- | --- |
| `<div>` | 无意义的块级容器，用来分组布局 | 弹窗、卡片、工具栏 |
| `<span>` | 行内容器 | 标题文字、关闭按钮 ✕ |
| `<img>` | 图片 | 头像、图标、照片墙 |
| `<video>` | 视频 | 全屏背景 |
| `<input>` | 输入框（text/password/file） | 说说输入、令牌输入、选图 |
| `<textarea>` | 多行文本输入 | 发说说的文本框 |
| `<button>` | 按钮 | 发布、关闭、管理模式 |
| `<label>` | 给 input 做“大门” | 点击“图片”就触发选图 |
| `<a>` | 超链接 | 底部社交图标 |

### 视频背景：一行标签实现

```html
<video autoplay muted loop playsinline id="bg-video" poster="./image/poster.jpg">
    <source src="./image/Isla1.mp4" type="video/mp4">
    您的浏览器不支持视频标签。
</video>
```

> [!tip] 这些属性的作用
> `autoplay` 自动播放；`muted` 静音（浏览器只允许静音自动播放）；
> `loop` 循环；`playsinline` 手机上不全屏播放；
> `poster` 是视频加载前的**封面图**——没有它，视频没加载出来时背景是黑的（我踩过这个坑）。

### 点击图标打开功能：靠 `id`

```html
<div class="icon-item" id="about-icon">
    <img src="./image/myself2.svg" alt="icon1"><span>about</span>
</div>
```

> [!warning] id 和 class 的区别
> - `id`：**全页面唯一**，给 JS 用 `document.getElementById('about-icon')` 精确定位。
> - `class`：**可以重复**，给 CSS 批量套样式、给 JS 批量查找。
> 一个元素的 id 不能重复，class 可以有一堆：`class="popup-window photo-wall"`。

### 隐藏的选图按钮：`hidden` + `label`

日记“发说说”的选图输入框在 HTML 里是藏起来的：

```html
<label class="diary-add-photo" title="添加图片（最多 9 张）">
    <img src="./image/photo2.svg" alt="photo"> 图片
    <input type="file" id="diary-file" accept="image/*" multiple hidden>
</label>
```

> [!note] 原理
> `hidden` 把原生文件选择框藏起来；`label` 包住它以后，用户点“图片”两个字，
> 浏览器就相当于点了那个隐藏的 `<input type="file">`。
> `accept="image/*"` 只允许选图片；`multiple` 允许一次选多张。

---

## 五、注意点总结（踩坑记录）

> [!warning] 中文乱码
> 文件保存为 UTF-8，且 `<head>` 里必须有 `<meta charset="UTF-8">`。

> [!warning] 相对路径
> `href="./CSS/style.css"` 的 `./` 表示“当前网页所在的目录”，
> 部署到 GitHub Pages 后路径结构不能变，否则资源 404。

> [!warning] id 不能重复
> 两个元素写同一个 id，`getElementById` 只返回第一个，功能会莫名其妙失效。

> [!warning] `display:none` 的元素拿不到宽高
> 弹窗默认 `display:none`（见 [[CSS]]），如果 JS 在弹窗隐藏时读它的
> `offsetWidth/offsetHeight`，会得到 0。博客的做法是：打开时先 `display:flex` 再测尺寸。

> [!tip] 先画结构，再上样式，最后写逻辑
> HTML → CSS → JS 是前端开发的天然顺序。改功能时也按这个顺序排查：
> 结构对不对 → 样式对不对 → 逻辑对不对。

---

## 六、和另外两篇的关系

- [[CSS]]：HTML 决定“有什么”，CSS 决定“长什么样”（位置、颜色、动画）。
- [[JavaScript]]：HTML 决定“有什么”，JS 决定“怎么动”（点击、弹窗、发说说）。
- 三者通过 **id / class** 联系在一起：HTML 写 id，CSS 用 class 美化，JS 用 id 找元素操作。

> [!quote] 一句话记忆
> HTML 是骨架，CSS 是皮囊，JavaScript 是肌肉。
