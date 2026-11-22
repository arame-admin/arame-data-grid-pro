'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../../src/tree-table/index.js';
import {
  TreeTableColumn,
  TreeDataOptions,
  TreeReorderDetail,
  TreeSelectionDetail,
  TreeExpansionDetail
} from '../../src/tree-table/types.js';

export interface TreeTableWrapperProps<T = any> {
  columns: TreeTableColumn<T>[];
  data?: T[];
  options?: Partial<TreeDataOptions<T>>;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  onExpansionChange?: (detail: TreeExpansionDetail<T>) => void;
  onSelectionChange?: (detail: TreeSelectionDetail<T>) => void;
  onReorder?: (detail: TreeReorderDetail<T>) => void;
}

export function TreeTableWrapper<T = any>({
  columns,
  data,
  options,
  theme,
  className = '',
  onExpansionChange,
  onSelectionChange,
  onReorder
}: TreeTableWrapperProps<T>) {
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

    const handleExp = (e: Event) => onExpansionChange?.((e as CustomEvent).detail);
    const handleSel = (e: Event) => onSelectionChange?.((e as CustomEvent).detail);
    const handleReorder = (e: Event) => onReorder?.((e as CustomEvent).detail);

    el.addEventListener('tree-table:expansion-change', handleExp);
    el.addEventListener('tree-table:selection-change', handleSel);
    el.addEventListener('tree-table:reorder', handleReorder);

    return () => {
      el.removeEventListener('tree-table:expansion-change', handleExp);
      el.removeEventListener('tree-table:selection-change', handleSel);
      el.removeEventListener('tree-table:reorder', handleReorder);
    };
  }, [onExpansionChange, onSelectionChange, onReorder]);

  if (!mounted) {
    return <div className="p-8 text-center text-slate-500">Initializing tree data table...</div>;
  }

  return (
    <div className={`pro-tree-table-wrapper ${className}`}>
      {/* @ts-ignore */}
      <tree-data-table ref={tableRef} />
    </div>
  );
}
