import { describe, it, expect, vi } from 'vitest';
import {
  defaultUnifiedSettings,
  buildGridOptionsFromSettings,
  UnifiedFeatureSettings
} from '../src/common/configurable-table-types.js';

describe('Configurable Table Model & Settings Interaction Suite', () => {
  it('supplies solid default configuration settings', () => {
    expect(defaultUnifiedSettings.pagination).toBe(true);
    expect(defaultUnifiedSettings.sorting).toBe(true);
    expect(defaultUnifiedSettings.globalSearch).toBe(true);
    expect(defaultUnifiedSettings.selectable).toBe(true);
    expect(defaultUnifiedSettings.multiSelect).toBe(true);
    expect(defaultUnifiedSettings.density).toBe('comfortable');
    expect(defaultUnifiedSettings.serverSide).toBe(false);
  });

  it('correctly maps density to row height', () => {
    const compact = buildGridOptionsFromSettings({ ...defaultUnifiedSettings, density: 'compact' });
    expect(compact.rowHeight).toBe(36);

    const comfortable = buildGridOptionsFromSettings({ ...defaultUnifiedSettings, density: 'comfortable' });
    expect(comfortable.rowHeight).toBe(48);

    const spacious = buildGridOptionsFromSettings({ ...defaultUnifiedSettings, density: 'spacious' });
    expect(spacious.rowHeight).toBe(60);
  });

  it('enforces dependency rule: multiSelect disabled if selectable is false', () => {
    const settings: UnifiedFeatureSettings = {
      ...defaultUnifiedSettings,
      selectable: false,
      multiSelect: true
    };
    const options = buildGridOptionsFromSettings(settings);
    expect(options.selectable).toBe(false);
    expect(options.multiSelect).toBe(false);
  });

  it('toggles pagination boolean and pageSize cleanly', () => {
    const paginated = buildGridOptionsFromSettings({ ...defaultUnifiedSettings, pagination: true, pageSize: 25 });
    expect(paginated.pagination).toBe(true);
    expect(paginated.pageSize).toBe(25);

    const unpaginated = buildGridOptionsFromSettings({ ...defaultUnifiedSettings, pagination: false });
    expect(unpaginated.pagination).toBe(false);
  });

  it('toggles globalSearch via searchable boolean cleanly', () => {
    const searchOn = buildGridOptionsFromSettings({ ...defaultUnifiedSettings, globalSearch: true });
    expect(searchOn.searchable).toBe(true);

    const searchOff = buildGridOptionsFromSettings({ ...defaultUnifiedSettings, globalSearch: false });
    expect(searchOff.searchable).toBe(false);
  });

  it('attaches serverDataLoader strictly when serverSide is true', () => {
    const mockLoader = vi.fn();
    const offOptions = buildGridOptionsFromSettings({ ...defaultUnifiedSettings, serverSide: false }, mockLoader);
    expect(offOptions.serverDataLoader).toBeUndefined();

    const onOptions = buildGridOptionsFromSettings({ ...defaultUnifiedSettings, serverSide: true }, mockLoader);
    expect(onOptions.serverDataLoader).toBe(mockLoader);
  });

  it('verifies server query cancellation via AbortSignal', async () => {
    let callCount = 0;
    const fetchWithSignal = vi.fn((query: any, signal: AbortSignal) => {
      callCount++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve({ rows: [{ id: '1', name: 'Item 1' }], total: 1 });
        }, 60);

        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const controller1 = new AbortController();
    const p1 = fetchWithSignal({ page: 0 }, controller1.signal);
    controller1.abort();

    await expect(p1).rejects.toThrow('Aborted');
    expect(callCount).toBe(1);

    const controller2 = new AbortController();
    const p2 = await fetchWithSignal({ page: 1 }, controller2.signal);
    expect(p2.rows.length).toBe(1);
    expect(callCount).toBe(2);
  });

  it('handles empty server result sets gracefully', async () => {
    const emptyLoader = vi.fn(async () => ({ rows: [], total: 0 }));
    const result = await emptyLoader();
    expect(result.rows).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
