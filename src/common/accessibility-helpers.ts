export interface AriaAnnouncerOptions {
  politeness?: 'polite' | 'assertive';
}

/**
 * Creates or retrieves a visually hidden live region for screen reader announcements.
 */
export class LiveRegionAnnouncer {
  private _liveElement: HTMLElement | null = null;

  constructor(private container: ShadowRoot | HTMLElement = document.body) {}

  public announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
    if (typeof document === 'undefined') return;

    if (!this._liveElement) {
      this._liveElement = document.createElement('div');
      this._liveElement.setAttribute('aria-live', politeness);
      this._liveElement.setAttribute('aria-atomic', 'true');
      this._liveElement.setAttribute('role', 'status');
      this._liveElement.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      this.container.appendChild(this._liveElement);
    }

    // Force re-announcement of identical messages by clearing first
    this._liveElement.textContent = '';
    setTimeout(() => {
      if (this._liveElement) {
        this._liveElement.textContent = message;
      }
    }, 50);
  }

  public destroy(): void {
    if (this._liveElement && this._liveElement.parentNode) {
      this._liveElement.parentNode.removeChild(this._liveElement);
      this._liveElement = null;
    }
  }
}

/**
 * Keyboard navigation helper for ARIA data table cells.
 * Supports Arrow Keys, Home, End, PageUp, PageDown.
 */
export function handleGridCellKeyboardNav(
  event: KeyboardEvent,
  currentRowIndex: number,
  currentColIndex: number,
  totalRows: number,
  totalCols: number,
  focusCell: (row: number, col: number) => void
): boolean {
  let targetRow = currentRowIndex;
  let targetCol = currentColIndex;

  switch (event.key) {
    case 'ArrowRight':
      targetCol = Math.min(totalCols - 1, currentColIndex + 1);
      break;
    case 'ArrowLeft':
      targetCol = Math.max(0, currentColIndex - 1);
      break;
    case 'ArrowDown':
      targetRow = Math.min(totalRows - 1, currentRowIndex + 1);
      break;
    case 'ArrowUp':
      targetRow = Math.max(0, currentRowIndex - 1);
      break;
    case 'Home':
      if (event.ctrlKey) targetRow = 0;
      targetCol = 0;
      break;
    case 'End':
      if (event.ctrlKey) targetRow = totalRows - 1;
      targetCol = totalCols - 1;
      break;
    case 'PageUp':
      targetRow = Math.max(0, currentRowIndex - 10);
      break;
    case 'PageDown':
      targetRow = Math.min(totalRows - 1, currentRowIndex + 10);
      break;
    default:
      return false;
  }

  event.preventDefault();
  focusCell(targetRow, targetCol);
  return true;
}
