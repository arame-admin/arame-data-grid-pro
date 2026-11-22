import { EditableTableWrapper } from '../components/EditableTableWrapper';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

export default function EditableTablePage() {
  const products: CatalogItem[] = [
    { id: 'item-1', name: 'Precision Workstation Tower 7920', category: 'Workstations', price: 3499.00, inStock: true },
    { id: 'item-2', name: 'UltraSharp 32-inch 4K USB-C Monitor', category: 'Peripherals', price: 799.50, inStock: true },
    { id: 'item-3', name: 'Gigabit Managed Switch 24-Port', category: 'Networking', price: 420.00, inStock: false }
  ];

  const columns = [
    {
      id: 'name',
      header: 'Product Name',
      field: 'name',
      width: '260px',
      editable: true,
      validator: (v: string) => (!v || v.trim().length < 3 ? 'Name must be at least 3 characters' : null)
    },
    {
      id: 'category',
      header: 'Category',
      field: 'category',
      width: '180px',
      editable: true,
      editor: {
        type: 'select' as const,
        options: [
          { label: 'Workstations', value: 'Workstations' },
          { label: 'Peripherals', value: 'Peripherals' },
          { label: 'Networking', value: 'Networking' }
        ]
      }
    },
    {
      id: 'price',
      header: 'Price ($)',
      field: 'price',
      width: '140px',
      editable: true,
      editor: { type: 'number' as const, min: 0 },
      formatter: (v: number) => `$${Number(v).toFixed(2)}`
    },
    {
      id: 'inStock',
      header: 'In Stock',
      field: 'inStock',
      width: '120px',
      editable: true,
      editor: { type: 'checkbox' as const }
    }
  ];

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Catalog Products (In-Place Editable Data Table)</h1>
      <p className="text-slate-600 text-sm">
        Double-click or press Enter on any cell to edit directly. Includes validation, optimistic updates with error recovery, and universal search, sorting, and pagination.
      </p>
      <EditableTableWrapper
        rows={products}
        columns={columns}
        options={{
          optimisticUpdates: true,
          onSave: async (payload) => {
            // Send patch request to server
            console.log('Saved to server:', payload);
          }
        }}
      />
    </main>
  );
}
