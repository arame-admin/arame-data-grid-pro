'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../../src/header-filter-table/index.js';
import {
  HeaderFilterTableColumn,
  HeaderFilterTableOptions,
  HeaderFilterChangeEventDetail,
  HeaderFiltersClearEventDetail
} from '../../src/header-filter-table/types.js';

export interface HeaderFilterTableWrapperProps<T = any> {
  columns: HeaderFilterTableColumn<T>[];
  data?: T[];
  options?: Partial<HeaderFilterTableOptions<T>>;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  onFilterChange?: (detail: HeaderFilterChangeEventDetail) => void;
  onFilterClear?: (detail: HeaderFiltersClearEventDetail) => void;
  onPageChange?: (page: number, pageSize: number) => void;
}

export function HeaderFilterTableWrapper<T = any>({
  columns,
  data,
  options,
  theme,
  className = '',
  onFilterChange,
  onFilterClear
}: HeaderFilterTableWrapperProps<T>) {
  const tableRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!tableRef.current) return;
    tableRef.current.columns = columns;
    if (data) tableRef.current.data = data;
    if (options) tableRef.current.options = options;
    if (theme && theme !== 'auto') {
      tableRef.current.setAttribute('theme', theme);
    } else {
      tableRef.current.removeAttribute('theme');
    }
  }, [columns, data, options, theme]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    const handleFilterChange = (e: Event) => onFilterChange?.((e as CustomEvent).detail);
    const handleFilterClear = (e: Event) => onFilterClear?.((e as CustomEvent).detail);

    el.addEventListener('header-filter:change', handleFilterChange);
    el.addEventListener('header-filter:clear', handleFilterClear);

    return () => {
      el.removeEventListener('header-filter:change', handleFilterChange);
      el.removeEventListener('header-filter:clear', handleFilterClear);
    };
  }, [onFilterChange, onFilterClear]);

  if (!mounted) {
    return <div className="p-8 text-center text-slate-500">Initializing in-header filter table...</div>;
  }

  return (
    <div className={`pro-header-filter-table-wrapper ${className}`}>
      {/* @ts-ignore */}
      <header-filter-data-table ref={tableRef} />
    </div>
  );
}
