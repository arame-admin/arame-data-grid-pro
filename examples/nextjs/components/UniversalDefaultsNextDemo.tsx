'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { BaseTableDataLoader, BaseTableQueryParams, BaseTableQueryResult } from '@pro-data-grid/core';
import '@pro-data-grid/core/styles.css';

interface ServerDevice {
  id: number;
  hostname: string;
  ip: string;
  status: string;
}

export function UniversalDefaultsNextDemo() {
  const [statusText, setStatusText] = useState('Ready');

  // Typed Server DataLoader receiving current page, pageSize, search, and sorting
  const serverDataLoader = useCallback<BaseTableDataLoader<ServerDevice>>(
    async (params: BaseTableQueryParams): Promise<BaseTableQueryResult<ServerDevice>> => {
      setStatusText(`Loading Page ${params.pageIndex + 1}, Search="${params.globalSearch}"...`);

      // Simulated network call with cancellation
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 300);
        params.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });

      const allDevices: ServerDevice[] = Array.from({ length: 75 }, (_, i) => ({
        id: i + 1,
        hostname: `edge-node-${String(i + 1).padStart(2, '0')}.internal`,
        ip: `10.0.4.${i + 1}`,
        status: i % 3 === 0 ? 'Maintenance' : 'Active'
      }));

      let filtered = allDevices;
      if (params.globalSearch) {
        filtered = filtered.filter((d) =>
          d.hostname.toLowerCase().includes(params.globalSearch.toLowerCase())
        );
      }

      if (params.sortCriteria.length > 0) {
        const crit = params.sortCriteria[0];
        filtered = [...filtered].sort((a, b) => {
          const valA = (a as any)[crit.columnId];
          const valB = (b as any)[crit.columnId];
          if (valA < valB) return crit.direction === 'asc' ? -1 : 1;
          if (valA > valB) return crit.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      const start = params.pageIndex * params.pageSize;
      setStatusText(`Loaded ${filtered.length} total matching records.`);
      return {
        rows: filtered.slice(start, start + params.pageSize),
        totalRows: filtered.length
      };
    },
    []
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Universal Default Features (Next.js)</h1>
          <p className="text-slate-500 text-sm">
            All tables include pagination (10/page), sorting, and search by default.
          </p>
        </div>
        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
          {statusText}
        </span>
      </div>

      {/* Renders ProDataGrid with zero custom flags needed for search, sort, and pagination */}
      <pro-data-grid
        ref={(el) => {
          if (el && !(el as any)._initialized) {
            (el as any)._initialized = true;
            el.columns = [
              { id: 'hostname', header: 'Hostname', field: 'hostname', sortable: true },
              { id: 'ip', header: 'IP Address', field: 'ip', sortable: true },
              { id: 'status', header: 'Status', field: 'status' }
            ];
            el.options = {
              serverSide: true,
              serverDataLoader
            };
          }
        }}
      />
    </div>
  );
}
