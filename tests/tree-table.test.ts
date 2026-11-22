import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../src/tree-table/index.js';
import { TreeDataTableElement } from '../src/tree-table/tree-data-table.element.js';
import { TreeTableColumn } from '../src/tree-table/types.js';
import { flattenTree, toggleNodeSelection, reorderTreeNodes, exportTreeToCsv } from '../src/tree-table/tree-engine.js';

interface OrgNode {
  id: string;
  name: string;
  role: string;
  budget?: number;
  children?: OrgNode[];
}

describe('TreeDataTableElement (<tree-data-table>)', () => {
  let table: TreeDataTableElement<OrgNode>;

  const sampleTree: OrgNode[] = [
    {
      id: 'org-1',
      name: 'Engineering Division',
      role: 'Division',
      budget: 1500000,
      children: [
        {
          id: 'team-1',
          name: 'Platform Core',
          role: 'Team',
          budget: 800000,
          children: [
            { id: 'emp-1', name: 'Alice Smith', role: 'Staff Engineer', budget: 200000 },
            { id: 'emp-2', name: 'Bob Jones', role: 'Senior Engineer', budget: 180000 }
          ]
        },
        {
          id: 'team-2',
          name: 'UI Infrastructure',
          role: 'Team',
          budget: 700000,
          children: [
            { id: 'emp-3', name: 'Charlie Day', role: 'Frontend Lead', budget: 190000 }
          ]
        }
      ]
    },
    {
      id: 'org-2',
      name: 'Product Division',
      role: 'Division',
      budget: 900000,
      children: [
        { id: 'emp-4', name: 'Diana Prince', role: 'VP Product', budget: 300000 }
      ]
    }
  ];

  const columns: TreeTableColumn<OrgNode>[] = [
    { key: 'name', header: 'Organizational Unit', width: '280px', isTreeColumn: true },
    { key: 'role', header: 'Type / Role', width: '160px' },
    { key: 'budget', header: 'Budget', width: '140px', render: (val) => val ? `$${Number(val).toLocaleString()}` : '—' }
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    table = document.createElement('tree-data-table') as TreeDataTableElement<OrgNode>;
    table.columns = columns;
    table.data = sampleTree;
    document.body.appendChild(table);
  });

  describe('Tree Engine Unit Logic', () => {
    it('flattens root nodes when children are collapsed', () => {
      const flattened = flattenTree(sampleTree, new Set(), new Set(), '', null, {});
      expect(flattened.length).toBe(2);
      expect(flattened[0].data.id).toBe('org-1');
      expect(flattened[1].data.id).toBe('org-2');
    });

    it('flattens nested nodes when parents are expanded', () => {
      const expanded = new Set(['org-1', 'team-1']);
      const flattened = flattenTree(sampleTree, expanded, new Set(), '', null, {});
      // org-1, team-1, emp-1, emp-2, team-2, org-2 = 6 rows
      expect(flattened.length).toBe(6);
      expect(flattened[1].data.id).toBe('team-1');
      expect(flattened[2].data.id).toBe('emp-1');
      expect(flattened[2].meta.level).toBe(2);
      expect(flattened[2].meta.parentPath).toEqual(['org-1', 'team-1']);
    });

    it('automatically expands ancestors when searching for a deep child', () => {
      const flattened = flattenTree(sampleTree, new Set(), new Set(), 'Charlie', null, {});
      // Should show org-1 -> team-2 -> Charlie Day
      expect(flattened.length).toBe(3);
      expect(flattened[2].data.name).toBe('Charlie Day');
    });

    it('cascades selection down to children and up to parent in cascade-all mode', () => {
      // Selecting team-1 selects emp-1 and emp-2
      const selected = toggleNodeSelection(sampleTree, 'team-1', new Set(), { selection: { mode: 'cascade-all' } });
      expect(selected.has('team-1')).toBe(true);
      expect(selected.has('emp-1')).toBe(true);
      expect(selected.has('emp-2')).toBe(true);
      expect(selected.has('emp-3')).toBe(false);
    });

    it('reorders tree nodes correctly using reorderTreeNodes', () => {
      // Move emp-3 inside team-1
      const reordered = reorderTreeNodes(sampleTree, 'emp-3', 'team-1', 'inside', {});
      const team1 = reordered[0].children![0];
      expect(team1.children!.some(c => c.id === 'emp-3')).toBe(true);
    });

    it('exports tree to CSV with hierarchy paths and levels', () => {
      const flattened = flattenTree(sampleTree, new Set(['org-1']), new Set(), '', null, {});
      const csv = exportTreeToCsv(flattened, columns, true);
      expect(csv).toContain('"Hierarchy Level","Path"');
      expect(csv).toContain('"Engineering Division"');
      expect(csv).toContain('"Platform Core"');
    });
  });

  describe('Web Component Interactive Behavior', () => {
    it('renders initial root rows with expand buttons and level attributes', () => {
      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.tree-tbody .tree-tr');
      expect(rows.length).toBe(2);

      const expandBtn = rows[0].querySelector('.tree-expander-btn');
      expect(expandBtn).toBeTruthy();
    });

    it('expands all nodes and adds sticky-parent class to parents', () => {
      table.expandAll();
      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.tree-tbody .tree-tr');
      // All 8 nodes in the fixture should be visible when fully expanded
      expect(rows.length).toBe(8);

      const stickyParents = shadow.querySelectorAll('.tree-tr.sticky-parent');
      expect(stickyParents.length).toBeGreaterThan(0);
    });

    it('collapses all nodes when collapseAll is triggered', () => {
      table.expandAll();
      table.collapseAll();
      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.tree-tbody .tree-tr');
      expect(rows.length).toBe(2);
    });

    it('toggles expand for an individual node', () => {
      table.toggleExpand('org-1');
      expect(table.expandedIds).toContain('org-1');
      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.tree-tbody .tree-tr');
      // org-1, team-1, team-2, org-2 = 4
      expect(rows.length).toBe(4);
    });

    it('toggles selection and dispatches selection-change event', () => {
      const spy = vi.fn();
      table.addEventListener('tree-table:selection-change', spy);

      table.toggleSelect('org-2');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(table.selectedIds).toContain('org-2');
    });

    it('sorts sibling nodes while preserving hierarchy structure', () => {
      table.expandAll();
      table.setSortRule({ column: 'name', direction: 'desc' });

      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.tree-tbody .tree-tr');
      // Product Division should come before Engineering Division at root level
      expect(rows[0].textContent).toContain('Product Division');
    });
  });
});
