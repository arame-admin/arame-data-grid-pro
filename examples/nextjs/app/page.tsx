import { DataGridWrapper } from '../components/DataGridWrapper';

interface Customer {
  id: string;
  name: string;
  mrr: number;
  plan: string;
}

export default function Page() {
  const customers: Customer[] = [
    { id: 'c1', name: 'Acme Corp', mrr: 12500, plan: 'Enterprise' },
    { id: 'c2', name: 'Globex Ltd', mrr: 4200, plan: 'Pro' }
  ];

  const columns = [
    { id: 'name', header: 'Customer', field: 'name', sortable: true },
    { 
      id: 'mrr', 
      header: 'Monthly Revenue', 
      field: 'mrr', 
      sortable: true,
      formatter: (val: number) => `$${val.toLocaleString()}`
    },
    { id: 'plan', header: 'Subscription Tier', field: 'plan' }
  ];

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SaaS Accounts</h1>
      <DataGridWrapper 
        rows={customers} 
        columns={columns} 
        options={{ selectable: true, density: 'comfortable' }}
      />
    </main>
  );
}
