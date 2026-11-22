import {
  FlattenedTreeNode,
  TreeNodeMeta,
  TreeDataOptions,
  TreeTableColumn
} from './types.js';
import { SortRule } from '../common/base-table-types.js';

export function defaultIdAccessor<T = Record<string, unknown>>(row: T): string {
  const r = row as Record<string, unknown>;
  return String(r.id ?? r.key ?? Math.random().toString(36).substring(2, 9));
}

export function defaultChildrenAccessor<T = Record<string, unknown>>(row: T): T[] | undefined {
  const r = row as Record<string, unknown>;
  return r.children as T[] | undefined;
}

/**
 * Traverses hierarchical nodes, filters matching search term (including ancestors if child matches),
 * sorts siblings, and flattens visible rows considering expansion states.
 */
export function flattenTree<T = Record<string, unknown>>(
  roots: T[],
  expandedIds: Set<string>,
  selectedIds: Set<string>,
  searchTerm: string,
  sortRule: SortRule<T> | null,
  options: TreeDataOptions<T>
): FlattenedTreeNode<T>[] {
  const getId = options.idAccessor || defaultIdAccessor;
  const getChildren = options.childrenAccessor || defaultChildrenAccessor;

  // 1. Search Filter predicate
  const q = searchTerm.trim().toLowerCase();

  function nodeMatchesSearch(node: T): boolean {
    if (!q) return true;
    const directMatch = Object.values(node as any).some(val => {
      if (val === null || val === undefined || typeof val === 'object') return false;
      return String(val).toLowerCase().includes(q);
    });
    if (directMatch) return true;

    const children = getChildren(node);
    if (children && children.length > 0) {
      return children.some(child => nodeMatchesSearch(child));
    }
    return false;
  }

  // 2. Sort siblings helper
  function sortSiblingNodes(nodes: T[]): T[] {
    if (!sortRule) return nodes;
    const { column, direction } = sortRule;
    const sorted = [...nodes].sort((a, b) => {
      const valA = (a as any)[column];
      const valB = (b as any)[column];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const comp = valA > valB ? 1 : -1;
      return direction === 'asc' ? comp : -comp;
    });
    return sorted;
  }

  // 3. Recursive traversal
  const result: FlattenedTreeNode<T>[] = [];

  function traverse(
    node: T,
    level: number,
    parentPath: string[],
    parentExpanded: boolean
  ): void {
    if (q && !nodeMatchesSearch(node)) {
      return;
    }

    const id = getId(node);
    const children = getChildren(node) || [];
    const hasChildren = children.length > 0;
    // If searching, automatically expand matching parent paths
    const isExpanded = q ? true : expandedIds.has(id);
    const isSelected = selectedIds.has(id);

    const childIds = children.map(c => getId(c));

    const meta: TreeNodeMeta<T> = {
      id,
      level,
      hasChildren,
      isExpanded,
      isSelected,
      parentPath,
      childIds
    };

    if (parentExpanded) {
      result.push({ data: node, meta });
    }

    if (hasChildren) {
      const sortedChildren = sortSiblingNodes(children);
      const nextParentExpanded = parentExpanded && isExpanded;
      const nextParentPath = [...parentPath, id];

      for (const child of sortedChildren) {
        traverse(child, level + 1, nextParentPath, nextParentExpanded);
      }
    }
  }

  const sortedRoots = sortSiblingNodes(roots);
  for (const root of sortedRoots) {
    traverse(root, 0, [], true);
  }

  return result;
}

/**
 * Handles parent/child selection cascade logic
 */
export function toggleNodeSelection<T = Record<string, unknown>>(
  roots: T[],
  targetId: string,
  selectedIds: Set<string>,
  options: TreeDataOptions<T>
): Set<string> {
  const mode = options.selection?.mode || 'cascade-all';
  const nextSelected = new Set(selectedIds);
  const isCurrentlySelected = selectedIds.has(targetId);
  const nextState = !isCurrentlySelected;

  const getId = options.idAccessor || defaultIdAccessor;
  const getChildren = options.childrenAccessor || defaultChildrenAccessor;

  // Helper to collect all descendant IDs
  function collectDescendantIds(node: T, acc: string[]): void {
    const children = getChildren(node);
    if (children && children.length > 0) {
      for (const child of children) {
        acc.push(getId(child));
        collectDescendantIds(child, acc);
      }
    }
  }

  // Find target node in tree
  function findNode(nodes: T[], id: string): T | null {
    for (const node of nodes) {
      if (getId(node) === id) return node;
      const children = getChildren(node);
      if (children) {
        const found = findNode(children, id);
        if (found) return found;
      }
    }
    return null;
  }

  const targetNode = findNode(roots, targetId);

  if (mode === 'independent' || !targetNode) {
    if (nextState) nextSelected.add(targetId);
    else nextSelected.delete(targetId);
    return nextSelected;
  }

  // Cascade Down
  if (nextState) nextSelected.add(targetId);
  else nextSelected.delete(targetId);

  const descendantIds: string[] = [];
  collectDescendantIds(targetNode, descendantIds);

  for (const dId of descendantIds) {
    if (nextState) nextSelected.add(dId);
    else nextSelected.delete(dId);
  }

  // Cascade Up (for 'cascade-all')
  if (mode === 'cascade-all') {
    function updateAncestors(nodes: T[]): void {
      for (const node of nodes) {
        const children = getChildren(node);
        if (children && children.length > 0) {
          updateAncestors(children);
          const nId = getId(node);
          const allChildrenSelected = children.every(c => nextSelected.has(getId(c)));
          if (allChildrenSelected) {
            nextSelected.add(nId);
          } else {
            nextSelected.delete(nId);
          }
        }
      }
    }
    updateAncestors(roots);
  }

  return nextSelected;
}

/**
 * Reorders a tree by moving a node relative to a target node.
 */
export function reorderTreeNodes<T = Record<string, unknown>>(
  roots: T[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'inside' | 'after',
  options: TreeDataOptions<T>
): T[] {
  if (draggedId === targetId) return roots;

  const getId = options.idAccessor || defaultIdAccessor;
  const getChildren = options.childrenAccessor || defaultChildrenAccessor;

  // Deep clone tree
  const treeClone: T[] = typeof structuredClone === 'function' ? structuredClone(roots) : JSON.parse(JSON.stringify(roots));

  let extractedNode: T | null = null;

  // Remove dragged node from current location
  function removeNode(nodes: T[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (getId(nodes[i]) === draggedId) {
        extractedNode = nodes.splice(i, 1)[0];
        return true;
      }
      const children = getChildren(nodes[i]);
      if (children && removeNode(children)) {
        return true;
      }
    }
    return false;
  }

  removeNode(treeClone);
  if (!extractedNode) return roots;

  // Insert dragged node into target position
  function insertNode(nodes: T[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
      const currId = getId(nodes[i]);
      if (currId === targetId) {
        if (position === 'before') {
          nodes.splice(i, 0, extractedNode!);
          return true;
        } else if (position === 'after') {
          nodes.splice(i + 1, 0, extractedNode!);
          return true;
        } else if (position === 'inside') {
          let children = (nodes[i] as any).children;
          if (!children) {
            children = [];
            (nodes[i] as any).children = children;
          }
          children.push(extractedNode!);
          return true;
        }
      }
      const children = getChildren(nodes[i]);
      if (children && insertNode(children)) {
        return true;
      }
    }
    return false;
  }

  insertNode(treeClone);
  return treeClone;
}

/**
 * Exports tree data to CSV format
 */
export function exportTreeToCsv<T = Record<string, unknown>>(
  rows: FlattenedTreeNode<T>[],
  columns: TreeTableColumn<T>[],
  includeHierarchyPath: boolean = true
): string {
  const sanitize = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = columns.map(c => sanitize(c.header));
  if (includeHierarchyPath) {
    headers.unshift('"Hierarchy Level"', '"Path"');
  }

  const csvLines: string[] = [headers.join(',')];

  for (const row of rows) {
    const lineValues: string[] = [];
    if (includeHierarchyPath) {
      lineValues.push(sanitize(row.meta.level));
      lineValues.push(sanitize(row.meta.parentPath.join(' / ')));
    }

    for (const col of columns) {
      const val = (row.data as any)[col.key];
      lineValues.push(sanitize(val));
    }

    csvLines.push(lineValues.join(','));
  }

  return csvLines.join('\n');
}
