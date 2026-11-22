export interface VirtualRange {
  startIndex: number;
  endIndex: number;
  topOffset: number;
  totalHeight: number;
}

export function computeVirtualSlice(
  scrollTop: number,
  viewportHeight: number,
  totalItems: number,
  itemHeight: number,
  overscan = 3
): VirtualRange {
  const totalHeight = totalItems * itemHeight;
  if (totalItems === 0 || viewportHeight <= 0) {
    return { startIndex: 0, endIndex: 0, topOffset: 0, totalHeight: 0 };
  }

  const rawStartIndex = Math.floor(scrollTop / itemHeight);
  const rawEndIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + viewportHeight) / itemHeight)
  );

  const startIndex = Math.max(0, rawStartIndex - overscan);
  const endIndex = Math.min(totalItems - 1, rawEndIndex + overscan);
  const topOffset = startIndex * itemHeight;

  return { startIndex, endIndex, topOffset, totalHeight };
}
