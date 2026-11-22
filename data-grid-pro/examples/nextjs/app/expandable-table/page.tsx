import { ExpandableTableWrapper } from '../components/ExpandableTableWrapper';

interface NodeCluster {
  id: string;
  name: string;
  region: string;
  status: string;
  replicas: number;
  cpu: number;
  memory: number;
}

export default function ExpandableTablePage() {
  const clusters: NodeCluster[] = [
    { id: 'c-01', name: 'production-k8s-us-east', region: 'us-east-1', status: 'Healthy', replicas: 36, cpu: 74, memory: 68 },
    { id: 'c-02', name: 'staging-microservices-eu', region: 'eu-central-1', status: 'Degraded', replicas: 12, cpu: 91, memory: 88 }
  ];

  const columns = [
    { id: 'name', header: 'Cluster Name', field: 'name', width: '260px' },
    { id: 'region', header: 'Cloud Region', field: 'region', width: '160px' },
    { id: 'status', header: 'Status', field: 'status', width: '140px' },
    { id: 'replicas', header: 'Replicas', field: 'replicas', width: '120px' }
  ];

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Kubernetes Infrastructure Clusters</h1>
      <p className="text-slate-600 text-sm">
        Click any row or expand control to reveal real-time cluster telemetry and metrics directly beneath.
      </p>
      <ExpandableTableWrapper
        rows={clusters}
        columns={columns}
        options={{
          multiExpand: true,
          expandOnRowClick: true,
          detailRenderer: (row) => `
            <div class="space-y-2">
              <h4 class="font-semibold text-sm">Cluster Health Diagnostics (${row.name})</h4>
              <p class="text-xs text-slate-500">CPU Usage: ${row.cpu}% | Memory Allocated: ${row.memory}%</p>
            </div>
          `
        }}
      />
    </main>
  );
}
