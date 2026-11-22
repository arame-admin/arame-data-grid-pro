'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../../src/infinite-table/index.js';
import {
  InfiniteTableColumn,
  InfiniteScrollConfig,
  InfiniteDataLoader
} from '../../src/infinite-table/types.js';

export interface InfiniteTableWrapperProps<T = any> {
  columns: InfiniteTableColumn<T>[];
  dataLoader?: InfiniteDataLoader<T>;
  initialData?: T[];
  config?: Partial<InfiniteScrollConfig<T>>;
  className?: string;
  onBatchLoaded?: (event: CustomEvent) => void;
  onComplete?: (event: CustomEvent) => void;
  onError?: (event: CustomEvent) => void;
}

export function InfiniteTableWrapper<T = any>({
  columns,
  dataLoader,
  initialData,
  config,
  className = '',
  onBatchLoaded,
  onComplete,
  onError
}: InfiniteTableWrapperProps<T>) {
  const tableRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!tableRef.current) return;

    tableRef.current.columns = columns;

    if (dataLoader) {
      tableRef.current.config = {
        ...config,
        dataLoader
      };
    } else if (initialData) {
      tableRef.current.data = initialData;
      if (config) {
        tableRef.current.config = config;
      }
    }
  }, [columns, dataLoader, initialData, config]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    const handleBatch = (e: Event) => onBatchLoaded?.(e as CustomEvent);
    const handleComplete = (e: Event) => onComplete?.(e as CustomEvent);
    const handleError = (e: Event) => onError?.(e as CustomEvent);

    el.addEventListener('infinite-table:load-batch', handleBatch);
    el.addEventListener('infinite-table:complete', handleComplete);
    el.addEventListener('infinite-table:error', handleError);

    return () => {
      el.removeEventListener('infinite-table:load-batch', handleBatch);
      el.removeEventListener('infinite-table:complete', handleComplete);
      el.removeEventListener('infinite-table:error', handleError);
    };
  }, [onBatchLoaded, onComplete, onError]);

  if (!mounted) {
    return <div className="p-8 text-center text-slate-500">Initializing infinite data table...</div>;
  }

  return (
    <div className={`pro-infinite-table-container ${className}`}>
      {/* @ts-ignore */}
      <infinite-data-table ref={tableRef} />
    </div>
  );
}
