'use client';

import React, { useEffect, useRef } from 'react';
import type { ContextMenuDataTable } from 'arame-data-grid-pro/context-menu-table';
import type { 
  ContextMenuColumnDef, 
  ContextMenuTableOptions, 
  ContextMenuTableEventPayloads 
} from 'arame-data-grid-pro/context-menu-table';
import 'arame-data-grid-pro/context-menu-table/context-menu-table.css';

interface ContextMenuTableProps<T> {
  rows: T[];
  columns: ContextMenuColumnDef<T>[];
  options?: Partial<ContextMenuTableOptions<T>>;
  onRowMenuAction?: (payload: ContextMenuTableEventPayloads<T>['menu-table:row-menu-action']) => void;
}

export function ContextMenuTableWrapper<T extends Record<string, any>>({
  rows,
  columns,
  options,
  onRowMenuAction
}: ContextMenuTableProps<T>) {
  const tableRef = useRef<ContextMenuDataTable<T> | null>(null);

  useEffect(() => {
    import('arame-data-grid-pro/context-menu-table').then(({ defineContextMenuDataTable }) => {
      defineContextMenuDataTable();

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
    if (!el || !onRowMenuAction) return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ContextMenuTableEventPayloads<T>['menu-table:row-menu-action']>;
      onRowMenuAction(customEvent.detail);
    };

    el.addEventListener('menu-table:row-menu-action', handler);
    return () => el.removeEventListener('menu-table:row-menu-action', handler);
  }, [onRowMenuAction]);

  return <context-menu-data-table ref={tableRef} />;
}
