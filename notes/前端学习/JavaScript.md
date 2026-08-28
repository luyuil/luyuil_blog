---
tags: [前端, JavaScript, 博客项目]
---

# 前端学习：JavaScript（博客的大脑）

> [!info] 这篇笔记讲什么
> JavaScript 让网页“动”起来：点击有反应、数据能保存、能跟服务器通信。
> 这篇结合博客项目的**三大功能**讲透：
> ① 窗口系统（打开/关闭/拖拽）② 日记（GitHub Issues 云端版）③ 学习笔记（读取 Obsidian）。
> 最后是一份“踩坑记录”，全是项目里真实遇到过的问题。
> 配套阅读：[[HTML]]（骨架）、[[CSS]]（皮肤）。

---

## 一、JavaScript 核心概念（用博客举例）

### 1. DOM：把 HTML 变成可操作的对象

浏览器把 HTML 解析成一棵“对象树”，JS 就是通过这棵树改页面：

```js
document.getElementById('music-icon');      // 按 id 找一个元素
document.querySelector('.diary-post');      // 按 CSS 选择器找第一个
document.querySelectorAll('.icon-item');    // 找所有匹配的，返回列表
document.createElement('div');              // 新建一个元素
element.appendChild(newElement);            // 把新元素挂到页面上
element.innerHTML = '<p>内容</p>';          // 直接塞 HTML
element.classList.add('show');              // 加一个 class（触发 CSS 动画）
```

### 2. 事件：用户一操作，代码就响应

```js
document.getElementById('about-icon').addEventListener('click', function () {
    // 点击 about 图标后要执行的事
});
```

常用事件：`click` 点击、`input` 输入、`keydown` 按键、`change` 文件选择、
`mousedown/mousemove/mouseup` 拖拽、`transitionend` 动画结束。

> [!example] Ctrl+Enter 快捷发布
> ```js
> input.addEventListener('keydown', function (e) {
>     if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
>         e.preventDefault();   // 阻止默认行为（换行）
>         publish();            // 直接发布
>     }
> });
> ```

### 3. 异步：网络请求不会“卡住”页面

`fetch` 请求服务器是异步的，要用 `await` 等结果，并用 `try/catch` 兜住错误：

```js
async function loadData() {
    try {
        const res = await fetch('https://api.github.com/...');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return data;
    } catch (e) {
        return fallback;   // 网络失败时用备用数据
    }
}
```

> [!warning] 忘了 await / 不写 catch 的后果
> 忘 `await` 拿到的是 Promise 而不是数据；不写 `catch`，请求失败会变成
> “静默的 Uncaught error”，用户看到的就是“没反应”。项目里发布失败会
> `showToast('发布失败：' + e.message)`，这就是把错误展示给用户。

---

## 二、博客的窗口系统（打开 / 关闭 / 拖拽）

### 1. 统一的窗口开关

每个弹窗共用一套逻辑：点击图标 → 显示 + 缩放动画；点 ✕ → 缩放消失。

```js
function setupWindow(iconId, windowId, closeBtnId, headerId) {
    const icon = document.getElementById(iconId);
    const win = document.getElementById(windowId);
    const closeBtn = document.getElementById(closeBtnId);

    icon.addEventListener('click', function () {
        win.style.display = 'flex';              // 先显示
        win.style.pointerEvents = 'auto';        // 允许点击
        win.style.transform = 'scale(0)';        // 从 0 开始
        animateWindow(win, { fromScale: 0, toScale: 1, duration: 400 });
    });

    closeBtn.addEventListener('click', function () {
        win.style.pointerEvents = 'none';        // 关掉点击，防止挡住下面
        animateWindow(win, { fromScale: 1, toScale: 0, duration: 300,
            onComplete: () => { win.style.display = 'none'; } });
    });
}
```

### 2. 动画核心：transition + transitionend

`animateWindow`（在 `windowAnimation.js`）的原理：把 CSS 过渡打开，
等浏览器播完动画，用 `transitionend` 事件收尾：

```js
function animateWindow(element, { fromScale, toScale, duration, onComplete }) {
    element.style.transition = 'none';
    element.style.transform = `scale(${fromScale})`;   // 先瞬移到起点
    void element.offsetWidth;                          // 强制浏览器刷新布局

    element.style.transition = `transform ${duration}ms`;
    element.style.transform = `scale(${toScale})`;     // 再过渡到终点

    element.addEventListener('transitionend', function handle(e) {
        if (e.target !== element) return;              // 只认自己，忽略子元素
        element.removeEventListener('transitionend', handle);
        if (onComplete) onComplete();
    });
}
```

> [!tip] `void element.offsetWidth` 是什么
> 读一次布局属性，强制浏览器“先执行上一帧的样式”，不然起点和终点挤在一帧里，动画会消失。

### 3. 拖拽窗口

```js
header.addEventListener('mousedown', function (e) {
    if (e.target.classList.contains('control-btn')) return; // 点关闭按钮不拖
    const rect = getUntransformedRect(windowElement);       // 拿真实坐标
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    isDragging = true;
});
document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    windowElement.style.marginLeft = (e.clientX - offsetX) + 'px';
    windowElement.style.marginTop  = (e.clientY - offsetY) + 'px';
});
document.addEventListener('mouseup', function () {
    isDragging = false;
});
```

> [!warning] 为什么用 margin 而不是 left/top 拖拽
> 弹窗用了 `transform: translate(-50%,-50%)` 居中，`left/top` 会被 transform 干扰，
> 拖起来会跳。项目用 `margin-left/top` 存位置，`getUntransformedRect` 负责
> 临时去掉 transform 拿真实坐标（详见 [[CSS]] 的踩坑记录）。

---

## 三、日记功能（GitHub Issues 云端版）

### 1. 整体架构：读公开，写私有

静态网站没有服务器，所以用 **GitHub Issues 当数据库**：

```text
访客打开日记 ──fetch──▶ GitHub Issues 公开接口 ──▶ 显示说说（只读）
作者管理模式 ──token──▶ 创建 issue（发说说） / 关闭 issue（删除）
```

每条说说的识别方式：**issue 标题以“说说”开头**，其他 issue 一律过滤掉：

```js
const TITLE_PREFIX = '说说';

async function fetchIssues() {
    const res = await fetch(
        'https://api.github.com/repos/luyuil/luyuil_blog/issues' +
        '?state=open&per_page=100&sort=created&direction=desc'
    );
    const issues = await res.json();
    return issues.filter(i =>
        !i.pull_request && (i.title || '').indexOf(TITLE_PREFIX) === 0
    );
}
```

> [!tip] 离线兜底
> 如果网络请求失败，从 `localStorage` 读上次缓存，保证页面不白屏：
> ```js
> try { 拉取成功 } catch { 读缓存 || 返回空数组 }
> ```

### 2. 管理模式：令牌只存自己浏览器

作者发布需要令牌，但**令牌绝不能写进代码或仓库**（网页是公开的，谁都能看源码）。
所以令牌由作者在浏览器里输入，存到 `localStorage`：

```js
async function verifyToken(token) {
    const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: 'token ' + token }
    });
    if (res.status === 401) throw new Error('令牌无效：可能复制不完整、已过期或已被吊销');
    if (!res.ok) throw new Error('验证失败（HTTP ' + res.status + '）');
    return (await res.json()).login;
}
```

> [!danger] 安全铁律
> 1. 令牌永远只存在于作者浏览器的 localStorage，访客浏览器里没有。
> 2. 提交代码前用 `git grep 令牌` 检查一遍，绝不能把 token 提交上去。
> 3. 令牌泄露到聊天/帖子里后，去 GitHub 吊销重新生成。

### 3. 发说说：文字 + 图片

**文字** → 创建 issue：

```js
await fetch('https://api.github.com/repos/luyuil/luyuil_blog/issues', {
    method: 'POST',
    headers: {
        Authorization: 'token ' + token,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        title: '说说 · ' + formatTime(Date.now()),
        body: text
    })
});
```

**图片** → 先压缩，再上传到仓库的 `image/shuoshuo/`，得到公开图片地址，
最后以 Markdown 图片语法写进 issue 正文：

```js
// ① 压缩：把大图缩到最长边 1000px，输出 JPEG dataURL
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1000;
                canvas.height = img.height * 1000 / img.width;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// ② 上传到仓库，返回图片 URL
const base64 = dataUrl.split(',')[1];   // 去掉 data:image/jpeg;base64, 前缀
const res = await fetch('https://api.github.com/repos/luyuil/luyuil_blog/contents/image/shuoshuo/xxx.jpg', {
    method: 'PUT',
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'add shuoshuo image', content: base64 })
});
const url = (await res.json()).content.download_url;
// ③ issue 正文里写：![图片1](url)，博客读取时用正则把图片拆出来显示
```

> [!tip] 为什么图片要先压缩
> `localStorage` 只有约 5MB；即使上传 GitHub，18MB 的原图也会让访客加载到哭。
> 压缩成 1000px/质量 0.75 的 JPEG，一张图通常只有 100-300KB。

### 4. 删除 = 关闭 issue

GitHub 的 issue 不能真正删除，所以“删除”就是把它 `state: closed`：

```js
await fetch('https://api.github.com/repos/luyuil/luyuil_blog/issues/' + number, {
    method: 'PATCH',
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed' })
});
```

### 5. 渲染：按时间倒序 + 图片九宫格

```js
function renderFeed() {
    feed.innerHTML = '';
    entries.slice().sort((a, b) => b.createdAt - a.createdAt)  // 新的在上
        .forEach(entry => feed.appendChild(createPost(entry)));
}
```

时间格式化（右下角的 年-月-日 时:分）：

```js
function formatTime(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
```

---

## 四、学习笔记功能（读 Obsidian）

### 1. 两种模式

```text
本地模式（自己电脑）：
    浏览器 File System Access API 直接读 Obsidian 文件夹
    授权存 IndexedDB，下次免重选

公开模式（线上访客）：
    fetch('notes/index.json') 拿文件清单 → 建目录树 → 点开笔记 fetch 正文
```

本地模式先尝试公开模式，失败才走本地授权：

```js
async function initStudy() {
    if (await tryEnterPublicMode()) {   // 仓库里有 notes/index.json
        loadPublicTree();               // 访客也能看
        return;
    }
    // 否则：本地方案（showDirectoryPicker 选文件夹）
}
```

### 2. 本地模式：选一次文件夹，永久记住

```js
// ① 弹系统文件夹选择器，拿到“目录句柄”
const rootHandle = await window.showDirectoryPicker({ mode: 'read' });

// ② 句柄可以存进 IndexedDB（下次打开不用重选）
const req = indexedDB.open('luyuil-study', 1);
req.onupgradeneeded = () => req.result.createObjectStore('kv');
// ...事务里 put(rootHandle) / get(rootHandle)

// ③ 遍历目录（values() 是异步迭代器）
for await (const entry of rootHandle.values()) {
    if (entry.kind === 'directory') { /* 文件夹，继续展开 */ }
    else if (/\.md$/i.test(entry.name)) { /* 笔记文件 */ }
}

// ④ 读文件内容
const file = await fileHandle.getFile();
const text = await file.text();
```

> [!warning] 本地模式只在自己电脑的 Chrome/Edge 有效
> 这是浏览器安全限制：访客不可能读到你的硬盘。所以公开模式才是线上访客的入口。

### 3. 支持 Obsidian 双链语法

笔记里的 `[[笔记名]]` 和 `![[图片.png]]` 需要转换成网页能识别的形式：

```js
// 图片嵌入：![[图.png|说明]] -> ![图.png](图.png)
text = text.replace(/!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g, (m, name) => {
    return '![' + name.trim() + '](' + name.trim() + ')';
});
// 双链：[[笔记名]] -> 自定义链接，点击时在页面内跳转
text = text.replace(/\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g, (m, name) => {
    return '[' + name.trim() + '](obsidian-note://' + encodeURIComponent(name.trim()) + ')';
});
```

点击双链后，用“笔记名索引”（文件名去掉扩展名也要登记）找到目标：

```js
nameIndex.set('高等数学.md', info);
nameIndex.set('高等数学', info);   // 双链 [[高等数学]] 不带 .md，两种都登记
```

---

## 五、音效、照片墙等其他功能

### 1. 按键音效：复用同一个 Audio 对象

```js
const clickSound = new Audio('./music/point-beep.mp3');
clickSound.volume = 0.8;

function playClickSound() {
    clickSound.currentTime = 0;          // 从头播（连点也能立即重播）
    clickSound.play().catch(function () {});  // 失败不报错
}

document.querySelectorAll(
    '#github-icon, #about-icon, #close-btn, ...'  // 所有要发声的元素
).forEach(el => el.addEventListener('click', playClickSound));
```

### 2. 照片墙：懒加载

```js
img.loading = 'lazy';    // 窗口没打开时不下载，打开才加载
img.decoding = 'async';  // 异步解码，不卡主线程
```

---

## 六、踩坑记录（血泪经验，最值得看）

> [!warning] 坑 1：脚本执行时 DOM 还没生成 → 元素为 null
> 症状：`document.getElementById('diary-app')` 返回 null，功能整个不生效。
> 原因：`<script>` 标签放在了弹窗结构**之前**执行。
> 解决：把整段逻辑包进 `document.addEventListener('DOMContentLoaded', function(){...})`，
> 等页面解析完再跑（项目里 diary.js/study.js 都这么写）。

> [!warning] 坑 2：marked 把中文文件名转成百分号编码，图片找不到
> 症状：`![图](./图.png)` 在页面里不显示。
> 原因：Markdown 解析库把 src 变成 `./%E5%9B%BE.png`，跟真实文件名对不上。
> 解决：匹配前先 `src = decodeURIComponent(src)`。

> [!warning] 坑 3：异步错误没有 catch → 用户看到“没反应”
> 发布/拉取数据都是异步的，必须 `try/catch` 并把错误用 toast 提示出来，
> 不然控制台报错，用户一脸懵。

> [!warning] 坑 4：事件重复绑定
> 同一元素重复 `addEventListener` 会触发多次。项目里用
> `if (!closeBtn._bound) { ...; closeBtn._bound = true; }` 保证只绑一次。

> [!warning] 坑 5：资源太大，页面卡死
> 视频 18MB → 0.3MB；音乐 9MB → 2.5MB；大图 9MB → 200KB；
> 图片加 `loading="lazy"`。压缩是立竿见影的优化。

> [!warning] 坑 6：令牌写进代码 = 白送账号权限
> 静态站代码公开，令牌必须走“浏览器里输入 + localStorage 保存”，
> 并定期吊销换新。

> [!warning] 坑 7：`values()` 的返回值
> File System Access API 的 `dirHandle.values()` 返回**异步迭代器**，
> 要用 `for await (const x of dirHandle.values())` 遍历；
> 自己封装时别误包一层 Promise（项目测试时踩过）。

---

## 七、和另外两篇的关系

- [[HTML]] 提供 id/class，JS 靠 `getElementById` / `querySelector` 找到它们。
- [[CSS]] 负责样式，JS 通过 `style.display`、`classList` 和 `transform`
  来“指挥”CSS 做动画和显隐。
- 排查问题顺序：HTML 结构 → CSS 样式 → JS 逻辑，层层递进。

> [!quote] 一句话记忆
> 找到元素（DOM）→ 监听事件 → 改样式/发请求 → 把结果显示回页面。
