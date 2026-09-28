import { expect, test } from '@playwright/test';

// 需要一个管理员账号：uv run atlas create-admin <用户名>
const USERNAME = process.env.E2E_ADMIN_USER ?? 'admin';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'atlas-admin-2026';
const shots = process.env.E2E_SCREENSHOT_DIR;

// 1×1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
);

test('后台：未登录跳转、登录、新建案例、上传图片、发布、删除', async ({ page }) => {
  await page.goto('/admin/tags');
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Ftags/);

  await page.getByLabel('用户名').fill(USERNAME);
  await page.getByLabel('密码').fill('wrong-password');
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page.getByRole('alert')).toContainText('用户名或密码错误');

  await page.getByLabel('密码').fill(PASSWORD);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/admin\/tags/);
  await expect(page.getByRole('heading', { name: '标签' })).toBeVisible();

  await page.getByRole('link', { name: '案例' }).click();
  await expect(page.getByRole('heading', { name: '案例' })).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/admin-cases.png` });

  // 新建：校验错误
  await page.getByRole('link', { name: '新建案例' }).click();
  await page.getByRole('button', { name: '创建案例' }).click();
  await expect(page.getByText('请填写标题')).toBeVisible();
  await expect(page.getByText('至少填写一种提示词')).toBeVisible();

  const title = `E2E 测试案例 ${Date.now()}`;
  await page.getByLabel('标题').fill(title);
  await page.getByLabel('分类').selectOption({ label: '海报与排版' });
  await page.getByLabel('中文提示词').fill('一张端到端测试用的海报');
  await page.getByRole('button', { name: '创建案例' }).click();
  await expect(page.getByRole('heading', { name: /编辑案例 #\d+/ })).toBeVisible();

  // 上传图片
  await page.locator('input[type=file]').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByText('已上传 1 张图片')).toBeVisible();
  await expect(page.getByText('封面', { exact: true })).toBeVisible();

  // 发布并在前台可见
  await page.getByLabel('状态').selectOption('published');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.getByText('已保存')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/admin-edit.png`, fullPage: true });
  const caseUrl = page.url();
  const caseId = caseUrl.split('/').pop();
  const publicResponse = await page.request.get(`/api/v1/cases/${caseId}`);
  expect(publicResponse.status()).toBe(200);

  // 删除
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除案例' }).click();
  await expect(page).toHaveURL(/\/admin\/cases$/);
  expect((await page.request.get(`/api/v1/cases/${caseId}`)).status()).toBe(404);

  // 导入记录页
  await page.getByRole('link', { name: '导入与索引' }).click();
  await expect(page.getByText('搜索服务：')).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});
