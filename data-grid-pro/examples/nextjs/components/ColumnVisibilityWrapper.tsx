'use client';

import React, { useEffect, useRef } from 'react';
import type { ColumnVisibilityTable } from 'arame-data-grid-pro/column-visibility-table';
import type { 
  ColumnVisibilityDef, 
  ColumnVisibilityTableOptions,
  ColumnVisibilityEventPayloads 
} from 'arame-data-grid-pro/column-visibility-table';
import 'arame-data-grid-pro/column-visibility-table/column-visibility-table.css';

interface ColumnVisibilityProps<T> {
  rows: T[];
  columns: ColumnVisibilityDef<T>[];
  options?: Partial<ColumnVisibilityTableOptions<T>>;
  onVisibilityChange?: (payload: ColumnVisibilityEventPayloads<T>['column-visibility:change']) => void;
}

export function ColumnVisibilityWrapper<T extends Record<string, any>>({
  rows,
  columns,
  options,
  onVisibilityChange
}: ColumnVisibilityProps<T>) {
  const tableRef = useRef<ColumnVisibilityTable<T> | null>(null);

  useEffect(() => {
    import('arame-data-grid-pro/column-visibility-table').then(({ defineColumnVisibilityTable }) => {
      defineColumnVisibilityTable();

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
    if (!el || !onVisibilityChange) return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ColumnVisibilityEventPayloads<T>['column-visibility:change']>;
      onVisibilityChange(customEvent.detail);
    };

    el.addEventListener('column-visibility:change', handler);
    return () => el.removeEventListener('column-visibility:change', handler);
  }, [onVisibilityChange]);

  return <column-visibility-table ref={tableRef} />;
}
