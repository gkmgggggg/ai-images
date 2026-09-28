import { Check, Copy } from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import type { CaseDetail } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { copyText, selectElementText } from '@/lib/clipboard';
import { cn, formatNumber } from '@/lib/utils';

type Variant = 'zh' | 'en' | 'raw';

const LABELS: Record<Variant, string> = { zh: '中文', en: 'English', raw: '原文' };

function variantsOf(item: CaseDetail): { key: Variant; text: string }[] {
  const list: { key: Variant; text: string }[] = [];
  if (item.prompt_zh) list.push({ key: 'zh', text: item.prompt_zh });
  if (item.prompt_en) list.push({ key: 'en', text: item.prompt_en });
  // 双语原文与单语版本不同时，额外提供原文
  if (!list.some((v) => v.text === item.prompt)) list.push({ key: 'raw', text: item.prompt });
  return list;
}

export function PromptBlock({ item }: { item: CaseDetail }) {
  const variants = useMemo(() => variantsOf(item), [item]);
  const [active, setActive] = useState<Variant>(variants[0]?.key ?? 'raw');
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const current = variants.find((v) => v.key === active) ?? variants[0];
  const text = current?.text ?? '';
  const isJson = item.prompt_format === 'json' && current?.key !== 'zh';

  const copy = async () => {
    if (await copyText(text)) {
      setCopied(true);
      toast.success(`已复制${variants.length > 1 ? LABELS[current.key] : ''}提示词`);
      window.setTimeout(() => setCopied(false), 1600);
    } else {
      selectElementText(preRef.current);
      toast.error('浏览器不允许自动复制，已为你选中文本，请按 Ctrl/⌘ + C');
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {variants.length > 1 ? (
          <div role="tablist" aria-label="提示词语言" className="inline-flex rounded-lg border border-line bg-paper p-0.5">
            {variants.map((v) => (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={v.key === current.key}
                onClick={() => setActive(v.key)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-semibold',
                  v.key === current.key ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
                )}
              >
                {LABELS[v.key]}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted">{formatNumber(text.length)} 字符</span>
        )}
        <Button variant="accent" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? '已复制' : variants.length > 1 ? `复制${LABELS[current.key]}` : '复制提示词'}
        </Button>
      </div>
      <pre
        ref={preRef}
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-line bg-paper p-4 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap"
      >
        {isJson ? <JsonText text={text} /> : text}
      </pre>
    </div>
  );
}

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/** 轻量 JSON 着色：键、字符串、数字、字面量分别上色。 */
export function JsonText({ text }: { text: string }) {
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }, [text]);

  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of pretty.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(pretty.slice(last, index));
    const [whole, str, colon, literal, num] = match;
    if (str && colon) {
      nodes.push(
        <span key={index} className="text-sky-700 dark:text-sky-300">
          {str}
        </span>,
        colon,
      );
    } else if (str) {
      nodes.push(
        <span key={index} className="text-emerald-700 dark:text-emerald-300">
          {str}
        </span>,
      );
    } else if (literal || num) {
      nodes.push(
        <span key={index} className="text-amber-700 dark:text-amber-300">
          {whole}
        </span>,
      );
    }
    last = index + whole.length;
  }
  nodes.push(pretty.slice(last));
  return <>{nodes}</>;
}
