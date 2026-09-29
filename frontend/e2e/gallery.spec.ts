import { expect, test } from '@playwright/test';

const shots = process.env.E2E_SCREENSHOT_DIR;
const cardsOf = (page: import('@playwright/test').Page) => page.locator('a[aria-label^="打开案例"]');

test('F01 F02 F03 F04 F05 图库：浏览、搜索、分类、详情弹窗与键盘切换', async ({ page }) => {
  await page.goto('/');
  const cards = cardsOf(page);
  await expect(cards.first()).toBeVisible();
  await expect(page.getByText(/\d+ 个结果/)).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/gallery.png` });

  // 搜索：防抖后写入 URL，有搜索词时卡片常显标题与摘要，命中词高亮
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
  // 瀑布流只渲染视口附近的卡片
  expect(await cards.count()).toBeLessThan(60);
});

test('F02 F03 吸顶栏滚动后仍在顶部，按 / 聚焦搜索框', async ({ page }) => {
  await page.goto('/');
  await expect(cardsOf(page).first()).toBeVisible();
  // 宽屏换行显示全部分类，最后一个分类也完整可见
  await expect(page.getByRole('navigation', { name: '分类' }).getByRole('button').last()).toBeInViewport({ ratio: 1 });
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForFunction(() => window.scrollY >= 1500);
  const search = page.getByRole('textbox', { name: '搜索' });
  await expect(search).toBeInViewport();
  expect((await search.boundingBox())!.y).toBeLessThan(80);
  await expect(page.getByRole('navigation', { name: '分类' })).toBeInViewport();
  await expect(page.getByRole('button', { name: '随机打开一个案例' })).toBeInViewport();
  if (shots) await page.screenshot({ path: `${shots}/sticky-header.png` });

  await page.keyboard.press('/');
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('');
});

test('F12 F02 筛选面板：选标签、关闭仅有图，Esc 关闭', async ({ page }) => {
  await page.goto('/');
  await expect(cardsOf(page).first()).toBeVisible();
  await page.getByRole('button', { name: /^筛选/ }).click();
  const panel = page.getByRole('dialog', { name: '筛选' });
  await expect(panel).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/filter.png` });

  await panel.locator('button[aria-pressed="false"]').first().click();
  await expect(page).toHaveURL(/tag=\d+/);
  await panel.getByRole('switch', { name: /仅显示有图案例/ }).click();
  await expect(page).toHaveURL(/all=1/);
  await expect(page.getByRole('button', { name: /^筛选\s*2$/ })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: '移除条件：含无图案例' })).toBeVisible();
});

test('F13 首次访问默认深色，选择浅色后刷新保持', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('radio', { name: '浅色' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  if (shots) await page.screenshot({ path: `${shots}/gallery-light.png` });
});

test('F04 F05 F13 直接打开案例链接显示独立页面，主题可切换为深色', async ({ page }) => {
  await page.goto('/cases/5');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回图库' })).toBeVisible();
  await page.getByRole('radio', { name: '浅色' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('radio', { name: '深色' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  if (shots) await page.screenshot({ path: `${shots}/case-page-dark.png` });
});

test('F05 F06 窄屏详情底部操作栏固定可见并能复制', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/cases/5');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const copy = page.getByRole('button', { name: /^复制/ });
  await expect(copy).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(copy).toBeInViewport();
  expect((await copy.boundingBox())!.y + 44).toBeLessThanOrEqual(812);
  await expect(page.getByRole('button', { name: '上一条' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下一条' })).toBeVisible();
  await copy.click();
  await expect(page.getByText(/已复制|已为你选中文本/).first()).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/mobile-detail.png` });
});

for (const width of [320, 375]) {
  test(`N06 ${width} px 宽度下图库与详情没有横向滚动`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(cardsOf(page).first()).toBeVisible();
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    if (shots) await page.screenshot({ path: `${shots}/mobile-${width}.png` });

    await cardsOf(page).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);

    await page.goto('/cases/5');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
}
