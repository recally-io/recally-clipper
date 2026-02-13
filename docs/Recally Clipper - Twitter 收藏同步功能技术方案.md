# Recally Clipper - Twitter 收藏同步功能技术方案

## 1. 概述

本文档旨在为 `recally-clipper` 浏览器扩展项目设计一个技术方案，以实现同步用户在 Twitter/X 上的所有收藏（Bookmarks/Likes）的功能。方案的核心是借鉴现有开源项目的成功经验，通过拦截 Twitter Web App 的内部 GraphQL API 请求来获取数据，从而规避官方 API 的高昂成本和使用限制。

## 2. 方案对比与选择

在设计阶段，我们评估了两种主要的数据获取方案：

| 方案 | 优点 | 缺点 |
| :--- | :--- | :--- |
| **X API v2** | - 官方支持，稳定可靠<br>- 标准化的 API 接口 | - **高成本**：采用按使用量付费的信用点模式，免费额度极低，无法满足大规模同步需求 [1]<br>- **功能限制**：Bookmarks API 最多只能获取最近的 800 条记录 [2]<br>- **认证复杂**：需要完整的 OAuth 2.0 用户认证流程 | 
| **拦截 Web App 请求** | - **零成本**：完全免费，无需申请开发者账号或购买 API 信用点<br>- **无数据限制**：可以获取用户所有的收藏，不受 800 条的限制<br>- **认证简单**：利用用户在浏览器中已有的登录状态，通过 Cookie 自动完成认证，无需扩展程序处理用户凭据 | - **稳定性风险**：依赖于 Twitter 未公开的内部 API，如果 Twitter 对其 Web App 前端或 API 进行重大改版，可能导致功能失效<br>- **需要用户交互**：初始版本需要用户手动滚动页面以加载所有收藏数据 | 

**结论：** 考虑到 `recally-clipper` 作为一个免费工具的定位，以及同步 *所有* 收藏的核心需求，**拦截 Web App 内部 GraphQL 请求** 的方案是当前阶段唯一可行且最高效的选择。尽管存在对 Twitter 前端变化的依赖风险，但其零成本和无数据限制的优势是决定性的。我们可以参考 `twitter-web-exporter` [3] 等成熟开源项目的实现来降低开发和维护成本。

## 3. 详细技术设计

我们将在 `recally-clipper` 现有架构内，引入一个新的同步模块来实现此功能。

### 3.1. 核心流程

1.  **用户触发**：在扩展的 Popup 界面或设置页面，用户点击“同步 Twitter 收藏”按钮。
2.  **打开目标页面**：扩展程序在新的浏览器标签页中打开用户的 Twitter Bookmarks 页面 (`https://twitter.com/i/bookmarks`)。
3.  **启动拦截器**：后台脚本 (`background.ts`) 启动一个网络请求监听器，专门用于拦截来自该标签页的 GraphQL API 响应。
4.  **数据捕获与解析**：当用户在 Bookmarks 页面滚动时，Twitter 前端会不断请求新的数据。监听器捕获这些包含推文数据的 JSON 响应，并进行解析，提取出关键信息（如推文 ID、文本、作者、媒体等）。
5.  **数据去重与存储**：捕获到的推文数据会与本地已存储的数据进行对比去重，新的收藏项将被格式化为 Recally 的标准 `Content` 对象。
6.  **发送至 Recally API**：格式化后的新收藏项通过 `recally-clipper` 已有的 `createContent` API (`/api/v1/contents`) 发送到用户的 Recally 后端进行存储。
7.  **用户反馈**：Popup 界面实时显示同步进度，例如已同步的数量，并在全部完成后提示用户。

### 3.2. 关键模块实现

#### a) 后台脚本 (`background.ts`)

这是功能的核心。我们将利用 `wxt` 框架提供的 `browser.webRequest` API 来实现网络拦截。

```typescript
// /entrypoints/background.ts

// 定义一个监听器，用于拦截来自 Twitter 的网络响应
const listener = (details: browser.WebRequest.OnCompletedDetails) => {
  // 1. 检查请求是否来自 Twitter Bookmarks 页面
  // 2. 确认 URL 是否匹配 GraphQL Bookmarks API 的端点 (例如 /i/api/graphql/.*/Bookmarks)
  if (isTwitterBookmarksAPI(details.url)) {
    // 使用 browser.tabs.captureVisibleTab() 或其他方法获取响应体
    // 由于 webRequest API 本身无法直接读取 response body，需要借助 content script 或其他技术
    // 一个更可靠的方法是注入一个脚本来代理 fetch/XHR API
    browser.tabs.sendMessage(details.tabId, { type: 'process-graphql-response', url: details.url });
  }
};

// 注册监听器
browser.webRequest.onCompleted.addListener(
  listener,
  { urls: ["https://twitter.com/i/api/graphql/*", "https://x.com/i/api/graphql/*"] }
);
```

**挑战与对策**：`webRequest` API 在标准模式下无法直接读取响应体（Response Body）。为了解决这个问题，我们将采用 `twitter-web-exporter` 的方法：通过 **Content Script 注入一个代理脚本**，重写（Monkey-patch）页面中的 `fetch` 和 `XMLHttpRequest` 的 `prototype.open` 和 `prototype.send` 方法，从而在数据返回给 Twitter 前端代码之前捕获它。

#### b) 内容脚本 (`content.ts`)

我们需要创建一个专门用于 Twitter 页面的内容脚本，负责注入代理脚本并与后台脚本通信。

```typescript
// /entrypoints/twitter-content.ts

// 注入一个脚本到页面 DOM 中，该脚本将重写 fetch API
const injectInterceptor = () => {
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('injected-interceptor.js');
  (document.head || document.documentElement).appendChild(script);
};

injectInterceptor();

// 监听来自 injected-interceptor.js 的事件，该事件包含了捕获到的数据
window.addEventListener('RecallyGraphQLResponse', (event: CustomEvent) => {
  const { data } = event.detail;
  // 将捕获到的数据发送到后台脚本进行处理
  browser.runtime.sendMessage({ type: 'twitter-bookmark-data', payload: data });
});
```

#### c) 注入脚本 (`injected-interceptor.js`)

这个脚本运行在页面的主世界（main world）中，因此有权限重写 `fetch` API。

```javascript
// /public/injected-interceptor.js

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const requestUrl = args[0] instanceof Request ? args[0].url : args[0];

  if (requestUrl.includes('/i/api/graphql/') && requestUrl.includes('/Bookmarks')) {
    const clonedResponse = response.clone();
    clonedResponse.json().then(data => {
      // 通过自定义事件将数据发送给 content script
      window.dispatchEvent(new CustomEvent('RecallyGraphQLResponse', { detail: { data } }));
    });
  }

  return response;
};
```

#### d) UI 组件 (`Popup/App.tsx`)

在 Popup 界面中添加一个新的同步源。

```tsx
// /entrypoints/popup/App.tsx

const handleSyncTwitter = () => {
  // 向后台脚本发送消息，启动同步流程
  browser.runtime.sendMessage({ type: 'start-twitter-sync' });
};

return (
  <div>
    {/* ... 其他同步源 ... */}
    <button onClick={handleSyncTwitter}>Sync Twitter Bookmarks</button>
    {/* ... 显示同步状态 ... */}
  </div>
);
```

### 3.3. 数据处理与转换

捕获的 GraphQL 响应是一个复杂的 JSON 结构。我们需要编写一个转换函数，将其中的推文条目映射到 `recally-clipper` 的 `Content` 类型。

-   **解析推文**：从 `data.bookmark_timeline.timeline.instructions[0].entries` 路径下提取推文列表。
-   **提取字段**：为每个推文提取 `rest_id`、`full_text`、`created_at` 以及 `user.screen_name` 等核心字段。
-   **构建 URL**：使用 `https://twitter.com/{user.screen_name}/status/{rest_id}` 格式构建唯一的文章 URL。
-   **格式化**：将提取的信息填充到 `Content` 对象中，准备发送到 Recally API。

## 4. 实施计划

1.  **阶段一：核心功能实现**
    -   搭建 `webRequest` 拦截框架和 `fetch` 代理脚本。
    -   实现对 Bookmarks GraphQL API 响应的捕获和解析。
    -   实现数据到 `Content` 对象的转换逻辑。
    -   在 Popup 界面添加入口按钮和简单的状态显示。

2.  **阶段二：增强与优化**
    -   **自动滚动**：研究通过注入脚本模拟页面滚动，实现全自动同步，减少用户操作。
    -   **错误处理**：增加对 Twitter 页面变化、API 结构变更的检测和错误处理机制。
    -   **增量同步**：优化同步逻辑，在用户再次同步时，仅获取上次同步时间点之后的新收藏，提高效率。
    -   **支持 Likes**：在 Bookmarks 功能稳定后，以类似的方式实现对 Likes (`https://twitter.com/{username}/likes`) 页面的数据同步。

## 5. 参考文献

[1] X Developer Platform. (2026). *Pricing*. Retrieved from https://docs.x.com/x-api/getting-started/pricing

[2] X Developer Platform. (2026). *Get Bookmarks*. Retrieved from https://docs.x.com/x-api/users/get-bookmarks

[3] prinsss. (2024). *twitter-web-exporter*. GitHub. Retrieved from https://github.com/prinsss/twitter-web-exporter
