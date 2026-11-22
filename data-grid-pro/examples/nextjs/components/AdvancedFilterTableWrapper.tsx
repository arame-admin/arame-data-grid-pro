'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../../src/advanced-filter-table/index.js';
import {
  AdvancedFilterColumn,
  AdvancedFilterTableOptions,
  FilterExpressionGroup,
  PresetChangeEventDetail,
  ExpressionChangeEventDetail
} from '../../src/advanced-filter-table/types.js';

export interface AdvancedFilterTableWrapperProps<T = any> {
  columns: AdvancedFilterColumn<T>[];
  data?: T[];
  options?: Partial<AdvancedFilterTableOptions<T>>;
  expression?: FilterExpressionGroup;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  onExpressionChange?: (detail: ExpressionChangeEventDetail) => void;
  onPresetChange?: (detail: PresetChangeEventDetail) => void;
}

export function AdvancedFilterTableWrapper<T = any>({
  columns,
  data,
  options,
  expression,
  theme,
  className = '',
  onExpressionChange,
  onPresetChange
}: AdvancedFilterTableWrapperProps<T>) {
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
    if (expression) tableRef.current.expression = expression;
    if (theme && theme !== 'auto') {
      tableRef.current.setAttribute('theme', theme);
    } else {
      tableRef.current.removeAttribute('theme');
    }
  }, [columns, data, options, expression, theme]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    const handleExp = (e: Event) => onExpressionChange?.((e as CustomEvent).detail);
    const handlePreset = (e: Event) => onPresetChange?.((e as CustomEvent).detail);

    el.addEventListener('advanced-filter:expression-change', handleExp);
    el.addEventListener('advanced-filter:preset-change', handlePreset);

    return () => {
      el.removeEventListener('advanced-filter:expression-change', handleExp);
      el.removeEventListener('advanced-filter:preset-change', handlePreset);
    };
  }, [onExpressionChange, onPresetChange]);

  if (!mounted) {
    return <div className="p-8 text-center text-slate-500">Initializing advanced filter table...</div>;
  }

  return (
    <div className={`pro-advanced-filter-table-wrapper ${className}`}>
      {/* @ts-ignore */}
      <advanced-filter-data-table ref={tableRef} />
    </div>
  );
}
