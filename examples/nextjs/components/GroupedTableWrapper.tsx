'use client';

import React, { useEffect, useRef } from 'react';
import type { GroupedDataTable } from 'arame-data-grid-pro/grouped-table';
import type { 
  GroupedTableColumn, 
  GroupedTableOptions, 
  GroupedTableEventPayloads 
} from 'arame-data-grid-pro/grouped-table';
import 'arame-data-grid-pro/grouped-table/grouped-table.css';

interface GroupedTableProps<T> {
  rows: T[];
  columns: GroupedTableColumn<T>[];
  options?: Partial<GroupedTableOptions<T>>;
  onGroupToggle?: (payload: GroupedTableEventPayloads<T>['grouped-table:group-toggle']) => void;
}

export function GroupedTableWrapper<T extends Record<string, any>>({
  rows,
  columns,
  options,
  onGroupToggle
}: GroupedTableProps<T>) {
  const tableRef = useRef<GroupedDataTable<T> | null>(null);

  useEffect(() => {
    import('arame-data-grid-pro/grouped-table').then(({ defineGroupedDataTable }) => {
      defineGroupedDataTable();

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
    if (!el || !onGroupToggle) return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<GroupedTableEventPayloads<T>['grouped-table:group-toggle']>;
      onGroupToggle(customEvent.detail);
    };

    el.addEventListener('grouped-table:group-toggle', handler);
    return () => el.removeEventListener('grouped-table:group-toggle', handler);
  }, [onGroupToggle]);

  return <grouped-data-table ref={tableRef} />;
}
