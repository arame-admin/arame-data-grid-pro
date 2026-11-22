'use client';

import React, { useEffect, useRef } from 'react';
import type { EditableDataTable } from 'arame-data-grid-pro/editable-table';
import type { 
  EditableColumnDef, 
  EditableTableOptions, 
  EditableTableEventPayloads 
} from 'arame-data-grid-pro/editable-table';
import 'arame-data-grid-pro/editable-table/editable-table.css';

interface EditableTableProps<T> {
  rows: T[];
  columns: EditableColumnDef<T>[];
  options?: Partial<EditableTableOptions<T>>;
  onSave?: (payload: EditableTableEventPayloads<T>['editable-table:save']) => void;
  onValidationError?: (payload: EditableTableEventPayloads<T>['editable-table:validation-error']) => void;
}

export function EditableTableWrapper<T extends Record<string, any>>({
  rows,
  columns,
  options,
  onSave,
  onValidationError
}: EditableTableProps<T>) {
  const tableRef = useRef<EditableDataTable<T> | null>(null);

  useEffect(() => {
    import('arame-data-grid-pro/editable-table').then(({ defineEditableDataTable }) => {
      defineEditableDataTable();

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
    if (!el) return;

    const saveHandler = (e: Event) => {
      if (onSave) onSave((e as CustomEvent).detail);
    };
    const valErrHandler = (e: Event) => {
      if (onValidationError) onValidationError((e as CustomEvent).detail);
    };

    el.addEventListener('editable-table:save', saveHandler);
    el.addEventListener('editable-table:validation-error', valErrHandler);

    return () => {
      el.removeEventListener('editable-table:save', saveHandler);
      el.removeEventListener('editable-table:validation-error', valErrHandler);
    };
  }, [onSave, onValidationError]);

  return <editable-data-table ref={tableRef} />;
}
