export interface VirtualRange {
  startIndex: number;
  endIndex: number;
  topPadding: number;
  bottomPadding: number;
  totalHeight: number;
}

export function computeVirtualRange(
  scrollTop: number,
  viewportHeight: number,
  totalItems: number,
  rowHeight: number,
  overscanCount: number = 5
): VirtualRange {
  if (totalItems <= 0 || rowHeight <= 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      topPadding: 0,
      bottomPadding: 0,
      totalHeight: 0
    };
  }

  const totalHeight = totalItems * rowHeight;

  // Find index of first item visible in viewport
  const rawStartIndex = Math.floor(scrollTop / rowHeight);
  // Find number of visible items
  const visibleCount = Math.ceil(viewportHeight / rowHeight);

  // Apply overscan
  const startIndex = Math.max(0, rawStartIndex - overscanCount);
  const endIndex = Math.min(totalItems, rawStartIndex + visibleCount + overscanCount);

  const topPadding = startIndex * rowHeight;
  const bottomPadding = Math.max(0, (totalItems - endIndex) * rowHeight);

  return {
    startIndex,
    endIndex,
    topPadding,
    bottomPadding,
    totalHeight
  };
}
