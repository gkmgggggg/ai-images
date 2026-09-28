const PRE = '\u0002';
const POST = '\u0003';

/** 渲染后端返回的高亮片段：命中词由 \u0002…\u0003 包裹，按文本拆分渲染，不使用 innerHTML。 */
export function Highlighted({ text }: { text: string }) {
  if (!text.includes(PRE)) return <>{text}</>;
  const parts: { text: string; hit: boolean }[] = [];
  let rest = text;
  while (rest.length) {
    const start = rest.indexOf(PRE);
    if (start === -1) {
      parts.push({ text: rest, hit: false });
      break;
    }
    if (start > 0) parts.push({ text: rest.slice(0, start), hit: false });
    const end = rest.indexOf(POST, start);
    const stop = end === -1 ? rest.length : end;
    parts.push({ text: rest.slice(start + 1, stop), hit: true });
    rest = end === -1 ? '' : rest.slice(end + 1);
  }
  return (
    <>
      {parts.map((part, index) => (part.hit ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>))}
    </>
  );
}

export function stripMarks(text: string): string {
  return text.replaceAll(PRE, '').replaceAll(POST, '');
}
