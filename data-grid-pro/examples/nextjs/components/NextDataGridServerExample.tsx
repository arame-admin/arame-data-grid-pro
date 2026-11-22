'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ProDataGrid } from 'arame-data-grid-pro';
import type { 
  ColumnDef, 
  GridOptions, 
  GridEventPayloads, 
  ServerDataLoader,
  ServerQueryParams,
  ServerQueryResult
} from 'arame-data-grid-pro';
import 'arame-data-grid-pro/styles.css';

interface CustomerRecord {
  id: string;
  company: string;
  mrr: number;
  tier: string;
}

export function NextDataGridServerExample() {
  const gridRef = useRef<ProDataGrid<CustomerRecord> | null>(null);
  const [auditLog, setAuditLog] = useState<string>('Ready');

  // Typed Asynchronous Server-side Data Loader
  const loadCustomers = useCallback<ServerDataLoader<CustomerRecord>>(
    async (params: ServerQueryParams): Promise<ServerQueryResult<CustomerRecord>> => {
      // In a real application: const res = await fetch(`/api/customers?page=${params.pageIndex}&search=${encodeURIComponent(params.globalSearch)}`, { signal: params.signal });
      // Here we simulate network response with cancellation:
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 300);
        params.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Query aborted', 'AbortError'));
        });
      });

      // Sample dataset
      const all: CustomerRecord[] = Array.from({ length: 80 }, (_, i) => ({
        id: `cust-${i + 1}`,
        company: ['Stripe', 'Vercel', 'Supabase', 'GitHub', 'Linear'][i % 5] + ` #${i + 1}`,
        mrr: (i + 1) * 350,
        tier: i % 2 === 0 ? 'Enterprise' : 'Scale'
      }));

      // Apply search
      const filtered = params.globalSearch
        ? all.filter(c => c.company.toLowerCase().includes(params.globalSearch.toLowerCase()))
        : all;

      // Apply page
      const start = params.pageIndex * params.pageSize;
      return {
        rows: filtered.slice(start, start + params.pageSize),
        totalRows: filtered.length
      };
    },
    []
  );

  useEffect(() => {
    import('@pro-data-grid/core').then(({ defineProDataGrid }) => {
      defineProDataGrid();

      if (gridRef.current) {
        gridRef.current.columns = [
          { 
            id: 'company', 
            header: 'Company', 
            field: 'company', 
            sortable: true,
            reorderable: true,
            editable: true,
            validator: (val) => (!val ? 'Company name required' : null)
          },
          { 
            id: 'mrr', 
            header: 'MRR', 
            field: 'mrr', 
            sortable: true,
            editable: true,
            formatter: (v: number) => `$${v.toLocaleString()}`
          },
          { id: 'tier', header: 'Plan Tier', field: 'tier' }
        ];

        gridRef.current.options = {
          serverSide: true,
          serverDataLoader: loadCustomers,
          rowReordering: true,
          columnReordering: true,
          editable: true,
          deletable: true,
          searchDebounceMs: 300,
          animations: { enabled: true, duration: 200 }
        };
      }
    });
  }, [loadCustomers]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const onEditSave = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<CustomerRecord>['pdg:edit-save']>).detail;
      setAuditLog(`Saved row ${detail.rowId} column ${detail.columnId} -> ${detail.newValue}`);
    };

    const onDelete = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<CustomerRecord>['pdg:delete']>).detail;
      setAuditLog(`Deleted record ${detail.rowId}`);
    };

    const onColReorder = (e: Event) => {
      const detail = (e as CustomEvent<GridEventPayloads<CustomerRecord>['pdg:column-reorder']>).detail;
      setAuditLog(`Reordered column: ${detail.column.header} to position ${detail.toIndex}`);
    };

    el.addEventListener('pdg:edit-save', onEditSave);
    el.addEventListener('pdg:delete', onDelete);
    el.addEventListener('pdg:column-reorder', onColReorder);

    return () => {
      el.removeEventListener('pdg:edit-save', onEditSave);
      el.removeEventListener('pdg:delete', onDelete);
      el.removeEventListener('pdg:column-reorder', onColReorder);
    };
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Accounts (Server-Side DataLoader)</h1>
        <span className="text-xs font-mono bg-slate-100 text-slate-800 px-2 py-1 rounded">
          {auditLog}
        </span>
      </div>
      <pro-data-grid ref={gridRef} />
    </div>
  );
}
