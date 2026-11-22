import { GroupRecord, GroupedTableColumn } from './types.js';

export function resolveValue<T>(row: T, fieldPath?: keyof T | string): any {
  if (!fieldPath || !row || typeof row !== 'object') return undefined;
  const path = String(fieldPath);
  if (!path.includes('.')) {
    if (path === '__proto__' || path === 'constructor' || path === 'prototype') return undefined;
    return (row as any)[path];
  }
  const parts = path.split('.');
  let current: any = row;
  for (const part of parts) {
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') return undefined;
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

export function computeAggregates<T>(rows: T[], columns: GroupedTableColumn<T>[]): Record<string, any> {
  const aggregates: Record<string, any> = {};

  columns.forEach((col) => {
    if (!col.aggregate || !col.field) return;
    const { type, customFn } = col.aggregate;

    if (type === 'custom' && customFn) {
      aggregates[col.id] = customFn(rows, col.field);
      return;
    }

    if (type === 'count') {
      aggregates[col.id] = rows.length;
      return;
    }

    const numericValues = rows
      .map((r) => Number(resolveValue(r, col.field)))
      .filter((v) => !isNaN(v));

    if (numericValues.length === 0) {
      aggregates[col.id] = 0;
      return;
    }

    switch (type) {
      case 'sum':
        aggregates[col.id] = numericValues.reduce((acc, n) => acc + n, 0);
        break;
      case 'avg':
        aggregates[col.id] = numericValues.reduce((acc, n) => acc + n, 0) / numericValues.length;
        break;
      case 'min':
        aggregates[col.id] = Math.min(...numericValues);
        break;
      case 'max':
        aggregates[col.id] = Math.max(...numericValues);
        break;
    }
  });

  return aggregates;
}

export function buildGroupHierarchy<T>(
  rows: T[],
  groupColumns: string[],
  allColumns: GroupedTableColumn<T>[],
  expandedMap: Map<string, boolean>,
  level = 0,
  parentKey = ''
): GroupRecord<T>[] {
  if (groupColumns.length === 0 || level >= groupColumns.length) {
    return [];
  }

  const currentColId = groupColumns[level];
  const colDef = allColumns.find((c) => c.id === currentColId);
  if (!colDef || !colDef.field) return [];

  // Bucket rows by current level's grouping value
  const buckets = new Map<string, T[]>();
  rows.forEach((row) => {
    const rawVal = resolveValue(row, colDef.field);
    const valKey = rawVal == null ? '(Blank)' : String(rawVal);
    if (!buckets.has(valKey)) buckets.set(valKey, []);
    buckets.get(valKey)!.push(row);
  });

  const groups: GroupRecord<T>[] = [];

  buckets.forEach((bucketRows, valKey) => {
    const fullKey = parentKey ? `${parentKey} > ${valKey}` : valKey;
    const isExpanded = expandedMap.has(fullKey) ? Boolean(expandedMap.get(fullKey)) : true;
    const aggregates = computeAggregates(bucketRows, allColumns);

    const groupRecord: GroupRecord<T> = {
      key: fullKey,
      columnId: currentColId,
      value: valKey,
      level,
      rows: bucketRows,
      aggregates,
      expanded: isExpanded
    };

    // If there is another grouping level, recurse
    if (level + 1 < groupColumns.length) {
      groupRecord.subGroups = buildGroupHierarchy(
        bucketRows,
        groupColumns,
        allColumns,
        expandedMap,
        level + 1,
        fullKey
      );
    }

    groups.push(groupRecord);
  });

  return groups;
}

export type FlattenedItem<T> =
  | { type: 'group-header'; group: GroupRecord<T> }
  | { type: 'row'; row: T; group: GroupRecord<T> };

export function flattenGroups<T>(groups: GroupRecord<T>[]): FlattenedItem<T>[] {
  const items: FlattenedItem<T>[] = [];

  for (const group of groups) {
    items.push({ type: 'group-header', group });

    if (group.expanded) {
      if (group.subGroups && group.subGroups.length > 0) {
        items.push(...flattenGroups(group.subGroups));
      } else {
        group.rows.forEach((row) => {
          items.push({ type: 'row', row, group });
        });
      }
    }
  }

  return items;
}
