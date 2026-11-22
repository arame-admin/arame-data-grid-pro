'use client';

import React, { useEffect, useRef } from 'react';
import type { StickyDataTable } from 'arame-data-grid-pro/sticky-table';
import type { StickyTableColumn, StickyTableOptions } from 'arame-data-grid-pro/sticky-table';
import 'arame-data-grid-pro/sticky-table/sticky-table.css';

interface StickyTableProps<T> {
  rows: T[];
  columns: StickyTableColumn<T>[];
  options?: Partial<StickyTableOptions<T>>;
  dir?: 'ltr' | 'rtl';
}

export function StickyTableWrapper<T extends Record<string, any>>({
  rows,
  columns,
  options,
  dir = 'ltr'
}: StickyTableProps<T>) {
  const tableRef = useRef<StickyDataTable<T> | null>(null);

  useEffect(() => {
    // Dynamically register web component safely in browser
    import('arame-data-grid-pro/sticky-table').then(({ defineStickyDataTable }) => {
      defineStickyDataTable();

      if (tableRef.current) {
        tableRef.current.columns = columns;
        tableRef.current.rows = rows;
        if (options) tableRef.current.options = options;
        tableRef.current.setAttribute('dir', dir);
      }
    });
  }, [columns, options, dir]);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.rows = rows;
    }
  }, [rows]);

  return <sticky-data-table ref={tableRef} />;
}
