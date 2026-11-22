'use client';

import React, { useEffect, useRef } from 'react';
import type { FilterableDataTable } from 'arame-data-grid-pro/filterable-table';
import type { 
  FilterableColumnDef, 
  FilterableTableOptions, 
  FilterableTableEventPayloads 
} from 'arame-data-grid-pro/filterable-table';
import 'arame-data-grid-pro/filterable-table/filterable-table.css';

interface FilterableTableProps<T> {
  rows: T[];
  columns: FilterableColumnDef<T>[];
  options?: Partial<FilterableTableOptions<T>>;
  onFilterChange?: (payload: FilterableTableEventPayloads<T>['filter-table:filter-change']) => void;
}

export function FilterableTableWrapper<T extends Record<string, any>>({
  rows,
  columns,
  options,
  onFilterChange
}: FilterableTableProps<T>) {
  const tableRef = useRef<FilterableDataTable<T> | null>(null);

  useEffect(() => {
    import('arame-data-grid-pro/filterable-table').then(({ defineFilterableDataTable }) => {
      defineFilterableDataTable();

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
    if (!el || !onFilterChange) return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<FilterableTableEventPayloads<T>['filter-table:filter-change']>;
      onFilterChange(customEvent.detail);
    };

    el.addEventListener('filter-table:filter-change', handler);
    return () => el.removeEventListener('filter-table:filter-change', handler);
  }, [onFilterChange]);

  return <filterable-data-table ref={tableRef} />;
}
