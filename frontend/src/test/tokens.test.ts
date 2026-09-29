import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// vitest 以 frontend/ 为根目录运行（jsdom 环境下 import.meta.url 不是 file: 地址）
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** 取出某个选择器（如 :root、.dark）第一次出现的规则块里的 CSS 变量。 */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`\n${selector} {`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('N06 设计令牌对比度', () => {
  for (const [name, selector] of [
    ['浅色', ':root'],
    ['深色', '.dark'],
  ] as const) {
    it(`${name}主题：--fg、--muted 在 --bg、--surface、--surface-2 上不低于 4.5:1`, () => {
      const t = tokens(selector);
      for (const text of ['fg', 'muted']) {
        for (const background of ['bg', 'surface', 'surface-2']) {
          expect(t[text], `${selector} --${text}`).toMatch(/^#[0-9a-f]{6}$/i);
          expect(contrast(t[text], t[background]), `--${text} 在 --${background} 上`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`${name}主题：强调色上的文字不低于 4.5:1`, () => {
      const t = tokens(selector);
      expect(contrast(t['accent-fg'], t.accent)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
