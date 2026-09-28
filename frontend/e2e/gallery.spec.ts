import { expect, test } from '@playwright/test';

const shots = process.env.E2E_SCREENSHOT_DIR;

test('图库：浏览、搜索、分类、详情弹窗与键盘切换', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('a[aria-label^="打开案例"]');
  await expect(cards.first()).toBeVisible();
  await expect(page.getByText(/\d+ 个结果/)).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/gallery.png` });

  // 搜索：防抖后写入 URL，结果带高亮
  await page.getByRole('textbox', { name: '搜索' }).fill('海报');
  await expect(page).toHaveURL(/q=%E6%B5%B7%E6%8A%A5/);
  await expect(page.locator('mark').first()).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/search.png` });

  // 打开详情弹窗，方向键切换，Esc 关闭后回到搜索结果
  const firstTitle = await cards.first().getAttribute('aria-label');
  await cards.first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /复制/ })).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/dialog.png` });
  // 上游有同名案例，用案例编号判断是否切换
  const caseBadge = dialog.getByText(/^Case \d+$/);
  const before = await caseBadge.textContent();
  await page.keyboard.press('ArrowRight');
  await expect(caseBadge).not.toHaveText(before ?? '');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/\?q=/);
  expect(firstTitle).toBeTruthy();

  // 清除筛选后按分类筛选
  await page.getByRole('button', { name: '清除筛选' }).click();
  await page.getByRole('navigation', { name: '分类' }).getByRole('button', { name: /海报与排版/ }).click();
  await expect(page).toHaveURL(/c=posters/);
  await expect(cards.first()).toBeVisible();

  // 回到全部，滚动触发游标分页加载
  await page.getByRole('navigation', { name: '分类' }).getByRole('button', { name: /^全部/ }).click();
  await expect(page).not.toHaveURL(/c=posters/);
  const nextPage = page.waitForRequest((r) => r.url().includes('/api/v1/cases?') && r.url().includes('cursor='));
  for (let i = 0; i < 8; i += 1) await page.mouse.wheel(0, 2500);
  await nextPage;
  // 虚拟列表只渲染视口附近的卡片
  expect(await cards.count()).toBeLessThan(60);
});

test('直接打开案例链接显示独立页面，主题可切换为深色', async ({ page }) => {
  await page.goto('/cases/5');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回图库' })).toBeVisible();
  await page.getByRole('radio', { name: '深色' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  if (shots) await page.screenshot({ path: `${shots}/case-page-dark.png` });
  await page.getByRole('radio', { name: '跟随系统' }).click();
});

test('移动端布局没有横向滚动', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page.locator('a[aria-label^="打开案例"]').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (shots) await page.screenshot({ path: `${shots}/mobile.png` });
});
