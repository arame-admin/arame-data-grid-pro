'use client';

import React, { useEffect, useRef } from 'react';
import type { ProDataGrid } from 'arame-data-grid-pro';
import type { ColumnDef, GridOptions, GridEventPayloads } from 'arame-data-grid-pro';
import 'arame-data-grid-pro/styles.css';

interface DataGridProps<T> {
  rows: T[];
  columns: ColumnDef<T>[];
  options?: Partial<GridOptions<T>>;
  onSelectionChange?: (payload: GridEventPayloads<T>['pdg:select']) => void;
}

export function DataGridWrapper<T extends Record<string, any>>({
  rows,
  columns,
  options,
  onSelectionChange
}: DataGridProps<T>) {
  const gridRef = useRef<ProDataGrid<T> | null>(null);

  useEffect(() => {
    // Dynamic import to guarantee custom elements register strictly on client
    import('arame-data-grid-pro').then(({ defineProDataGrid }) => {
      defineProDataGrid();

      if (gridRef.current) {
        gridRef.current.columns = columns;
        gridRef.current.rows = rows;
        if (options) gridRef.current.options = options;
      }
    });
  }, [columns, options]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.rows = rows;
    }
  }, [rows]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || !onSelectionChange) return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<GridEventPayloads<T>['pdg:select']>;
      onSelectionChange(customEvent.detail);
    };

    el.addEventListener('pdg:select', handler);
    return () => el.removeEventListener('pdg:select', handler);
  }, [onSelectionChange]);

  return <pro-data-grid ref={gridRef} />;
}
