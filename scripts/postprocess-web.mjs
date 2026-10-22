/**
 * Web 构建后处理：把 expo export 产出的静态包改造成「可以直接交给评委打开」的演示站。
 *
 * 做三件事：
 * 1. 加一层手机外框（桌面浏览器打开时内容居中、最大 430px，不会被拉成超宽表单）
 * 2. 把 index.html 复制成 404.html —— GitHub Pages 对 SPA 的深层路由刷新会 404，
 *    用 404.html 兜底才不会出现「一刷新就白页」
 * 3. 写入 .nojekyll —— GitHub Pages 默认跑 Jekyll，会忽略 `_expo` 这种下划线开头的目录，
 *    少了这个文件线上就是一片白屏（所有 JS 都 404）
 */
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist-web');
const htmlPath = path.join(dist, 'index.html');

const SHELL_CSS = `
    <style id="demo-shell">
      html,
      body {
        background: #e8eef7;
      }
      body {
        display: flex;
        justify-content: center;
      }
      #root {
        width: 100%;
        max-width: 430px;
        height: 100vh;
        background: #ffffff;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08), 0 16px 48px rgba(15, 23, 42, 0.14);
      }
    </style>`;

let html = await readFile(htmlPath, 'utf8');

if (!html.includes('demo-shell')) {
  html = html.replace('</head>', `${SHELL_CSS}\n  </head>`);
  await writeFile(htmlPath, html, 'utf8');
}

await copyFile(htmlPath, path.join(dist, '404.html'));
await writeFile(path.join(dist, '.nojekyll'), '', 'utf8');

console.log('[postprocess-web] 已注入演示外框、生成 404.html 与 .nojekyll');
