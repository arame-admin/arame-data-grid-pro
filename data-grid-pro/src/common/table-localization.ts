export interface TableLocale {
  searchPlaceholder: string;
  noRecords: string;
  loading: string;
  error: string;
  retry: string;
  pagination: {
    showing: (start: number, end: number, total: number) => string;
    page: (current: number, total: number) => string;
    prev: string;
    next: string;
    rowsPerPage: string;
  };
  selection: {
    selectedCount: (count: number) => string;
    selectAll: string;
    deselectAll: string;
    selectRow: (id: string) => string;
  };
  columns: {
    resize: string;
    sortAsc: string;
    sortDesc: string;
    columnsMenu: string;
  };
  export: {
    exportCsv: string;
    exporting: string;
  };
}

export const defaultEnglishLocale: TableLocale = {
  searchPlaceholder: 'Search records...',
  noRecords: 'No records found',
  loading: 'Loading data...',
  error: 'An error occurred while loading data',
  retry: 'Retry',
  pagination: {
    showing: (start, end, total) => `Showing ${start} to ${end} of ${total} entries`,
    page: (current, total) => `Page ${current} of ${total}`,
    prev: 'Previous',
    next: 'Next',
    rowsPerPage: 'rows per page'
  },
  selection: {
    selectedCount: (count) => `${count} selected`,
    selectAll: 'Select all rows on current page',
    deselectAll: 'Deselect all rows',
    selectRow: (id) => `Select row ${id}`
  },
  columns: {
    resize: 'Resize column (use left/right arrows when focused)',
    sortAsc: 'Sort ascending',
    sortDesc: 'Sort descending',
    columnsMenu: 'Configure visible columns'
  },
  export: {
    exportCsv: 'Export CSV',
    exporting: 'Exporting...'
  }
};
