/** 瀑布流布局（规格 0002 AC-1 ~ AC-3）：按缩略图宽高预先算出每张卡片的位置，图片加载前就能占好位。 */

export const MIN_COLUMN_WIDTH = 210;
export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 6;
/** 高宽比限制，超出部分裁切。 */
export const MIN_RATIO = 0.5;
export const MAX_RATIO = 2;
/** 没有封面时按 4:5 占位。 */
export const PLACEHOLDER_RATIO = 1.25;

export interface MasonrySize {
  width: number;
  height: number;
}

export interface MasonryBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MasonryLayout {
  boxes: MasonryBox[];
  height: number;
}

/** 卡片间距：内容区宽度 ≥ 576 px（视口 ≥ 640 px，左右各 32 px 内边距）时 6 px，否则 4 px。 */
export function gapFor(containerWidth: number): number {
  return containerWidth >= 576 ? 6 : 4;
}

export function columnsFor(containerWidth: number, gap = gapFor(containerWidth)): number {
  const fit = Math.floor((containerWidth + gap) / (MIN_COLUMN_WIDTH + gap));
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, fit));
}

export function ratioOf(size: MasonrySize | null | undefined): number {
  if (!size || size.width <= 0 || size.height <= 0) return PLACEHOLDER_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, size.height / size.width));
}

/**
 * 每张卡片放进当前累计高度最小的一列（相同时取最左）。
 * 卡片的位置只取决于它之前的卡片，所以追加下一页时已有卡片不会移动。
 */
export function computeMasonryLayout(
  sizes: readonly (MasonrySize | null | undefined)[],
  columns: number,
  containerWidth: number,
  gap: number,
): MasonryLayout {
  const columnWidth = (containerWidth - gap * (columns - 1)) / columns;
  const heights = new Array<number>(columns).fill(0);
  const boxes = sizes.map((size) => {
    let column = 0;
    for (let i = 1; i < columns; i += 1) if (heights[i] < heights[column]) column = i;
    const height = Math.round(columnWidth * ratioOf(size));
    const box = { left: column * (columnWidth + gap), top: heights[column], width: columnWidth, height };
    heights[column] += height + gap;
    return box;
  });
  return { boxes, height: sizes.length ? Math.max(...heights) - gap : 0 };
}
