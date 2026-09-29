import { Check, Copy } from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { toast } from 'sonner';

import type { CaseDetail } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
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

export interface PromptState {
  variants: { key: Variant; text: string }[];
  current: { key: Variant; text: string };
  setActive: (key: Variant) => void;
  isJson: boolean;
  copied: boolean;
  copyLabel: string;
  copy: () => Promise<void>;
  preRef: RefObject<HTMLPreElement | null>;
}

/** 提示词的语言切换与复制状态；详情里的提示词区和窄屏底部操作栏共用（F05、F06）。 */
export function usePrompt(item: CaseDetail): PromptState {
  const variants = useMemo(() => variantsOf(item), [item]);
  const [active, setActive] = useState<Variant>(variants[0]?.key ?? 'raw');
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const current = variants.find((v) => v.key === active) ?? variants[0] ?? { key: 'raw' as const, text: '' };
  const label = variants.length > 1 ? LABELS[current.key] : '';

  const copy = async () => {
    if (await copyText(current.text)) {
      setCopied(true);
      toast.success(`已复制${label}提示词`);
      window.setTimeout(() => setCopied(false), 1600);
    } else {
      selectElementText(preRef.current);
      toast.error('浏览器不允许自动复制，已为你选中文本，请按 Ctrl/⌘ + C');
    }
  };

  return {
    variants,
    current,
    setActive,
    isJson: item.prompt_format === 'json' && current.key !== 'zh',
    copied,
    copyLabel: label ? `复制${label}` : '复制提示词',
    copy,
    preRef,
  };
}

export function CopyButton({ prompt, className }: { prompt: PromptState; className?: string }) {
  return (
    <Button variant="accent" onClick={() => void prompt.copy()} className={className}>
      {prompt.copied ? <Check /> : <Copy />}
      {prompt.copied ? '已复制' : prompt.copyLabel}
    </Button>
  );
}

/** 提示词区：语言切换、字符数、复制按钮（窄屏由底部操作栏负责复制），JSON 原文着色。 */
export function PromptBlock({ prompt }: { prompt: PromptState }) {
  const { variants, current, isJson } = prompt;
  return (
    <div className="flex min-h-0 flex-col gap-2.5 md:flex-1">
      <div className="flex flex-wrap items-center gap-2.5">
        {variants.length > 1 && (
          <Segmented
            label="提示词语言"
            items={variants.map((v) => ({ value: v.key, label: LABELS[v.key] }))}
            value={current.key}
            onChange={prompt.setActive}
          />
        )}
        <span className="ml-auto text-xs text-muted tabular-nums">{formatNumber(current.text.length)} 字符</span>
        <CopyButton prompt={prompt} className="max-md:hidden" />
      </div>
      <pre
        ref={prompt.preRef}
        className={cn(
          'min-h-0 overflow-auto rounded-card border border-border bg-fg/[0.04] px-[18px] py-4 break-words whitespace-pre-wrap md:flex-1',
          isJson ? 'font-mono text-[12.5px] leading-[1.75]' : 'font-sans text-sm leading-[1.85]',
        )}
      >
        {isJson ? <JsonText text={current.text} /> : current.text}
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
        <span key={index} className="text-json-key">
          {str}
        </span>,
        colon,
      );
    } else if (str) {
      nodes.push(
        <span key={index} className="text-json-string">
          {str}
        </span>,
      );
    } else if (literal || num) {
      nodes.push(
        <span key={index} className="text-json-number">
          {whole}
        </span>,
      );
    }
    last = index + whole.length;
  }
  nodes.push(pretty.slice(last));
  return <>{nodes}</>;
}
