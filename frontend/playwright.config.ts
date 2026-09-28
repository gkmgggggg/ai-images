import { defineConfig } from '@playwright/test';

// 端到端测试：需要先启动后端（含已导入的数据）和前端 dev server。
// 默认使用本机安装的 Google Chrome，无需下载浏览器。
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173',
    channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome',
    locale: 'zh-CN',
    viewport: { width: 1360, height: 900 },
    trace: 'retain-on-failure',
  },
});
