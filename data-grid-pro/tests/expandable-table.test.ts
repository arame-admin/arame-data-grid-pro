import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpandableDataTable } from '../src/expandable-table/expandable-data-table.element.js';

interface Account {
  id: string;
  name: string;
  tier: string;
}

const mockAccounts: Account[] = [
  { id: 'acc-1', name: 'Acme Corporation', tier: 'Enterprise' },
  { id: 'acc-2', name: 'Globex Inc', tier: 'Pro' }
];

describe('ExpandableDataTable Web Component', () => {
  let table: ExpandableDataTable<Account>;

  beforeEach(() => {
    if (!window.customElements.get('expandable-table-test')) {
      window.customElements.define('expandable-table-test', class extends ExpandableDataTable<Account> {});
    }
    table = document.createElement('expandable-table-test') as ExpandableDataTable<Account>;
    document.body.appendChild(table);

    table.columns = [
      { id: 'name', header: 'Account Name', field: 'name' },
      { id: 'tier', header: 'Plan Tier', field: 'tier' }
    ];
    table.rows = [...mockAccounts];
    table.options = {
      detailRenderer: (row) => `<div>Telemetry details for ${row.name}</div>`
    };
  });

  it('renders expansion controls with proper ARIA attributes', () => {
    const rowEl = table.querySelector('.xt-tbody .xt-row') as HTMLElement;
    expect(rowEl).not.toBeNull();
    expect(rowEl.getAttribute('aria-expanded')).toBe('false');

    const expandBtn = rowEl.querySelector('.xt-expand-btn') as HTMLElement;
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands row on click and renders details directly underneath', () => {
    const expandSpy = vi.fn();
    table.addEventListener('expandable-table:expand', expandSpy);

    table.expandRow('acc-1');

    expect(expandSpy).toHaveBeenCalled();
    expect(table.expandedRowIds).toContain('acc-1');

    const detailRow = table.querySelector('#xt-detail-acc-1');
    expect(detailRow).not.toBeNull();
    expect(detailRow?.textContent).toContain('Telemetry details for Acme Corporation');
  });

  it('enforces single-row expansion when multiExpand is false', () => {
    table.options = { multiExpand: false };

    table.expandRow('acc-1');
    expect(table.expandedRowIds).toEqual(['acc-1']);

    table.expandRow('acc-2');
    expect(table.expandedRowIds).toEqual(['acc-2']);
    expect(table.expandedRowIds).not.toContain('acc-1');
  });

  it('loads detail content asynchronously and fires success event', async () => {
    const asyncSuccessSpy = vi.fn();
    table.addEventListener('expandable-table:async-load-success', asyncSuccessSpy);

    table.options = {
      asyncDetailRenderer: async (row) => {
        return `<div>Async loaded metrics for ${row.name}</div>`;
      }
    };

    table.expandRow('acc-1');
    await vi.waitFor(() => expect(asyncSuccessSpy).toHaveBeenCalled());

    const detailContent = table.querySelector('#xt-detail-acc-1');
    expect(detailContent?.textContent).toContain('Async loaded metrics for Acme Corporation');
  });
});
