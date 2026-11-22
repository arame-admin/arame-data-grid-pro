import { FilterableTableWrapper } from '../components/FilterableTableWrapper';

interface InvoiceRecord {
  id: string;
  client: string;
  status: string;
  amount: number;
  date: string;
}

export default function FilterableTablePage() {
  const invoices: InvoiceRecord[] = [
    { id: '1', client: 'Stripe Corporation', status: 'Paid', amount: 14500, date: '2024-01-10' },
    { id: '2', client: 'Vercel Platform', status: 'Pending', amount: 8200, date: '2024-02-14' },
    { id: '3', client: 'Supabase Cloud', status: 'Paid', amount: 3900, date: '2024-02-28' },
    { id: '4', client: 'Linear App', status: 'Overdue', amount: 1800, date: '2024-03-05' }
  ];

  const columns = [
    { 
      id: 'client', 
      header: 'Client Account', 
      field: 'client', 
      width: '240px', 
      filter: { type: 'text' as const, placeholder: 'Filter client...' } 
    },
    { 
      id: 'status', 
      header: 'Status', 
      field: 'status', 
      width: '160px', 
      filter: { 
        type: 'select' as const, 
        options: [
          { label: 'Paid', value: 'Paid' },
          { label: 'Pending', value: 'Pending' },
          { label: 'Overdue', value: 'Overdue' }
        ] 
      } 
    },
    { 
      id: 'amount', 
      header: 'Amount ($)', 
      field: 'amount', 
      width: '200px', 
      filter: { type: 'number-range' as const },
      formatter: (v: number) => `$${v.toLocaleString()}`
    },
    { 
      id: 'date', 
      header: 'Invoice Date', 
      field: 'date', 
      width: '240px', 
      filter: { type: 'date-range' as const } 
    }
  ];

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Invoices (Multi-Column Filtering)</h1>
      <p className="text-slate-600 text-sm">
        Filter records via global search or specific column filters (text, select dropdown, number min/max, and date ranges).
      </p>
      <FilterableTableWrapper
        rows={invoices}
        columns={columns}
        options={{
          showGlobalSearch: true,
          density: 'comfortable'
        }}
      />
    </main>
  );
}
