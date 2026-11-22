'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../../src/calculated-table/index.js';
import {
  CalculatedTableColumn,
  CalculatedTableOptions,
  CellChangeDetail
} from '../../src/calculated-table/types.js';

export interface CalculatedTableWrapperProps<T = any> {
  columns: CalculatedTableColumn<T>[];
  data?: T[];
  options?: Partial<CalculatedTableOptions<T>>;
  theme?: 'light' | 'dark';
  dir?: 'ltr' | 'rtl';
  className?: string;
  onCellChange?: (detail: CellChangeDetail<T>) => void;
  onPageChange?: (detail: { page: number; pageSize: number }) => void;
  onSortChange?: (detail: any) => void;
}

export function CalculatedTableWrapper<T = any>({
  columns,
  data,
  options,
  theme,
  dir = 'ltr',
  className = '',
  onCellChange,
  onPageChange,
  onSortChange
}: CalculatedTableWrapperProps<T>) {
  const tableRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.columns = columns;
    if (data) {
      tableRef.current.data = data;
    }
    if (options) {
      tableRef.current.options = options;
    }
    if (theme) {
      tableRef.current.setAttribute('theme', theme);
    } else {
      tableRef.current.removeAttribute('theme');
    }
    tableRef.current.setAttribute('dir', dir);
  }, [columns, data, options, theme, dir]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    const handleCellChange = (e: Event) => onCellChange?.((e as CustomEvent).detail);
    const handlePageChange = (e: Event) => onPageChange?.((e as CustomEvent).detail);
    const handleSortChange = (e: Event) => onSortChange?.((e as CustomEvent).detail);

    el.addEventListener('calculated-table:cell-change', handleCellChange);
    el.addEventListener('calculated-table:page-change', handlePageChange);
    el.addEventListener('calculated-table:sort-change', handleSortChange);

    return () => {
      el.removeEventListener('calculated-table:cell-change', handleCellChange);
      el.removeEventListener('calculated-table:page-change', handlePageChange);
      el.removeEventListener('calculated-table:sort-change', handleSortChange);
    };
  }, [onCellChange, onPageChange, onSortChange]);

  if (!mounted) {
    return <div className="p-8 text-center text-slate-500">Initializing calculated data table...</div>;
  }

  return (
    <div className={`pro-calculated-table-wrapper ${className}`}>
      {/* @ts-ignore */}
      <calculated-data-table ref={tableRef} />
    </div>
  );
}
