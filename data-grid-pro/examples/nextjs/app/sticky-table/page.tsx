import { StickyTableWrapper } from '../components/StickyTableWrapper';

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  warehouse: string;
  vendor: string;
}

export default function StickyTablePage() {
  const products: ProductItem[] = [
    { id: '1', name: 'NVIDIA RTX 6000 Ada 48GB', sku: 'GPU-6000-ADA', category: 'Computing', price: 6800, stock: 12, warehouse: 'US-East-1', vendor: 'NVIDIA Corp' },
    { id: '2', name: 'Intel Xeon Platinum 8480+', sku: 'CPU-8480-PLT', category: 'Processor', price: 9500, stock: 8, warehouse: 'US-West-2', vendor: 'Intel Global' },
    { id: '3', name: 'Micron 128GB DDR5 Server RAM', sku: 'RAM-128G-D5', category: 'Memory', price: 820, stock: 65, warehouse: 'EU-Central-1', vendor: 'Micron Semi' }
  ];

  const columns = [
    { id: 'name', header: 'Product Spec', field: 'name', width: '240px', sortable: true },
    { id: 'sku', header: 'SKU', field: 'sku', width: '160px' },
    { id: 'category', header: 'Category', field: 'category', width: '150px' },
    { id: 'price', header: 'Unit Price', field: 'price', width: '140px', sortable: true, formatter: (p: number) => `$${p.toLocaleString()}` },
    { id: 'stock', header: 'Available Units', field: 'stock', width: '150px', sortable: true },
    { id: 'warehouse', header: 'Fulfillment Center', field: 'warehouse', width: '180px' },
    { id: 'vendor', header: 'Authorized Vendor', field: 'vendor', width: '200px' }
  ];

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Catalog Matrix with Sticky First Column</h1>
      <p className="text-slate-600 text-sm">
        Scroll horizontally to inspect warehouse and vendor details while keeping the Product Name locked at the left edge.
      </p>
      <StickyTableWrapper 
        rows={products} 
        columns={columns} 
        options={{ stickyFirstColumn: true, density: 'comfortable' }} 
      />
    </main>
  );
}
