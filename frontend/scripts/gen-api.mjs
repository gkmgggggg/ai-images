// 从 FastAPI 导出 OpenAPI 文档，再用 @hey-api/openapi-ts 生成 TypeScript 类型。
// 用法：pnpm gen:api（需要先在 backend 目录 uv sync）
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(root, '../backend');
const specPath = resolve(root, 'openapi.json');

const env = { ...process.env };
delete env.VIRTUAL_ENV;
const spec = execFileSync(
  'uv',
  ['run', 'python', '-c', 'import json; from app.main import app; print(json.dumps(app.openapi(), ensure_ascii=False))'],
  { cwd: backend, env, encoding: 'utf8' },
);
writeFileSync(specPath, spec);

execFileSync(
  'pnpm',
  ['exec', 'openapi-ts', '-i', specPath, '-o', 'src/api/generated', '-p', '@hey-api/typescript', '--no-log-file'],
  { cwd: root, stdio: 'inherit' },
);
