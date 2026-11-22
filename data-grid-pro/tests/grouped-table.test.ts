import { describe, it, expect, beforeEach } from 'vitest';
import { GroupedDataTable } from '../src/grouped-table/grouped-data-table.element.js';
import { computeAggregates, buildGroupHierarchy } from '../src/grouped-table/group-engine.js';
import { GroupedTableColumn } from '../src/grouped-table/types.js';

interface Employee {
  id: string;
  name: string;
  department: string;
  team: string;
  salary: number;
}

const mockEmployees: Employee[] = [
  { id: '1', name: 'Alice', department: 'Engineering', team: 'Frontend', salary: 140000 },
  { id: '2', name: 'Bob', department: 'Engineering', team: 'Backend', salary: 160000 },
  { id: '3', name: 'Charlie', department: 'Product', team: 'Design', salary: 130000 },
  { id: '4', name: 'David', department: 'Engineering', team: 'Frontend', salary: 150000 }
];

const mockColumns: GroupedTableColumn<Employee>[] = [
  { id: 'name', header: 'Employee', field: 'name' },
  { id: 'department', header: 'Department', field: 'department', groupable: true },
  { id: 'team', header: 'Team', field: 'team', groupable: true },
  { id: 'salary', header: 'Salary', field: 'salary', aggregate: { type: 'sum', label: 'Total Payroll' } }
];

describe('GroupedDataTable & Aggregates Engine', () => {
  it('computes column aggregates correctly (sum and count)', () => {
    const aggs = computeAggregates(mockEmployees, mockColumns);
    expect(aggs.salary).toBe(580000); // 140k + 160k + 130k + 150k
  });

  it('builds multi-level nested group hierarchies', () => {
    const hierarchy = buildGroupHierarchy(mockEmployees, ['department', 'team'], mockColumns, new Map());

    expect(hierarchy).toHaveLength(2); // 'Engineering' and 'Product'
    const engGroup = hierarchy.find(g => g.value === 'Engineering')!;
    expect(engGroup.rows).toHaveLength(3);
    expect(engGroup.subGroups).toHaveLength(2); // 'Frontend' and 'Backend'
  });

  it('renders group headers with aggregate summaries in table DOM', () => {
    if (!window.customElements.get('gt-test-table')) {
      window.customElements.define('gt-test-table', class extends GroupedDataTable<Employee> {});
    }
    const table = document.createElement('gt-test-table') as GroupedDataTable<Employee>;
    document.body.appendChild(table);

    table.columns = mockColumns;
    table.rows = mockEmployees;
    table.options = {
      grouping: { groupBy: ['department'] }
    };

    const groupHeaderRows = table.querySelectorAll('.gt-group-header-row');
    expect(groupHeaderRows.length).toBe(2);

    const firstHeaderText = groupHeaderRows[0].textContent;
    expect(firstHeaderText).toContain('Engineering');
    expect(firstHeaderText).toContain('3 records');
  });
});
