import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ColumnVisibilityTable } from '../src/column-visibility-table/column-visibility-table.element.js';

interface EmployeeRecord {
  id: string;
  name: string;
  role: string;
  dept: string;
  email: string;
}

const mockData: EmployeeRecord[] = [
  { id: '1', name: 'John Doe', role: 'Staff Engineer', dept: 'Core Platform', email: 'john@company.com' }
];

describe('ColumnVisibilityTable Web Component', () => {
  let table: ColumnVisibilityTable<EmployeeRecord>;

  beforeEach(() => {
    if (!window.customElements.get('cvt-test-table')) {
      window.customElements.define('cvt-test-table', class extends ColumnVisibilityTable<EmployeeRecord> {});
    }
    table = document.createElement('cvt-test-table') as ColumnVisibilityTable<EmployeeRecord>;
    document.body.appendChild(table);

    table.columns = [
      { id: 'name', header: 'Name', field: 'name', required: true }, // Cannot be hidden
      { id: 'role', header: 'Job Title', field: 'role' },
      { id: 'dept', header: 'Department', field: 'dept' },
      { id: 'email', header: 'Email Address', field: 'email', visible: false } // Hidden by default
    ];
    table.rows = [...mockData];
  });

  const headerLabels = () =>
    Array.from(table.querySelectorAll('thead th')).map((th) =>
      (th.textContent || '').replace(/\s*[▲▼⇅]\s*/g, '').trim()
    );

  it('renders only visible columns in table header and body', () => {
    const headers = headerLabels();
    expect(headers).toContain('Name');
    expect(headers).toContain('Job Title');
    expect(headers).toContain('Department');
    expect(headers).not.toContain('Email Address');
  });

  it('toggles column visibility when setColumnVisibility is called', () => {
    const changeSpy = vi.fn();
    table.addEventListener('column-visibility:change', changeSpy);

    // Show email column
    table.setColumnVisibility('email', true);

    expect(changeSpy).toHaveBeenCalled();
    const event = changeSpy.mock.calls[0][0] as CustomEvent;
    expect(event.detail.columnId).toBe('email');
    expect(event.detail.visible).toBe(true);

    const headers = headerLabels();
    expect(headers).toContain('Email Address');
  });

  it('prevents hiding required columns', () => {
    // Attempt to hide the required 'name' column
    table.setColumnVisibility('name', false);

    const headers = headerLabels();
    expect(headers).toContain('Name'); // Must still remain visible
  });

  it('supports showAllColumns and hideOptionalColumns quick actions', () => {
    table.showAllColumns();
    let headers = headerLabels();
    expect(headers.length).toBe(4);

    table.hideOptionalColumns();
    headers = headerLabels();
    expect(headers.length).toBe(1); // Only 'Name' (the required column) remains
    expect(headers[0]).toBe('Name');
  });
});
