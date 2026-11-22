'use client';

import React, { useEffect, useRef } from 'react';
import type { ExpandableDataTable } from 'arame-data-grid-pro/expandable-table';
import type { 
  ExpandableTableColumn, 
  ExpandableTableOptions,
  ExpandableTableEventPayloads
} from 'arame-data-grid-pro/expandable-table';
import 'arame-data-grid-pro/expandable-table/expandable-table.css';

interface ExpandableTableProps<T> {
  rows: T[];
  columns: ExpandableTableColumn<T>[];
  options?: Partial<ExpandableTableOptions<T>>;
  onToggle?: (payload: ExpandableTableEventPayloads<T>['expandable-table:toggle']) => void;
}

export function ExpandableTableWrapper<T extends Record<string, any>>({
  rows,
  columns,
  options,
  onToggle
}: ExpandableTableProps<T>) {
  const tableRef = useRef<ExpandableDataTable<T> | null>(null);

  useEffect(() => {
    import('arame-data-grid-pro/expandable-table').then(({ defineExpandableDataTable }) => {
      defineExpandableDataTable();

      if (tableRef.current) {
        tableRef.current.columns = columns;
        tableRef.current.rows = rows;
        if (options) tableRef.current.options = options;
      }
    });
  }, [columns, options]);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.rows = rows;
    }
  }, [rows]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el || !onToggle) return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ExpandableTableEventPayloads<T>['expandable-table:toggle']>;
      onToggle(customEvent.detail);
    };

    el.addEventListener('expandable-table:toggle', handler);
    return () => el.removeEventListener('expandable-table:toggle', handler);
  }, [onToggle]);

  return <expandable-data-table ref={tableRef} />;
}
