import { ContextMenuTableWrapper } from '../components/ContextMenuTableWrapper';

interface TaskRecord {
  id: string;
  title: string;
  assignee: string;
  priority: string;
  status: string;
}

export default function ContextMenuTablePage() {
  const tasks: TaskRecord[] = [
    { id: 't1', title: 'Implement OAuth PKCE Flow', assignee: 'Alex Johnson', priority: 'High', status: 'In Progress' },
    { id: 't2', title: 'Audit CSP and CORS Rules', assignee: 'Sarah Connor', priority: 'Critical', status: 'In Review' },
    { id: 't3', title: 'Optimize Postgres Query Plan', assignee: 'Miles Dyson', priority: 'Medium', status: 'Completed' }
  ];

  const columns = [
    { id: 'title', header: 'Task Title', field: 'title', width: '260px', required: true },
    { id: 'assignee', header: 'Assignee', field: 'assignee', width: '180px' },
    { id: 'priority', header: 'Priority', field: 'priority', width: '140px' },
    { id: 'status', header: 'Status', field: 'status', width: '160px' }
  ];

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Engineering Tasks (Context &amp; Header Menus)</h1>
      <p className="text-slate-600 text-sm">
        Click the header menu trigger (⋮) to sort or toggle column visibility. Right-click any row (or click the row's ⋮ button) to trigger context actions.
      </p>
      <ContextMenuTableWrapper
        rows={tasks}
        columns={columns}
        options={{
          rowContextMenu: {
            enabled: true,
            items: [
              { id: 'view', label: 'View Details', icon: '🔍', action: (row) => alert(`View ${row.title}`) },
              { id: 'edit', label: 'Edit Task', icon: '✎', action: (row) => alert(`Edit ${row.title}`) },
              { isSeparator: true },
              { id: 'delete', label: 'Delete Task', icon: '🗑', isDestructive: true, action: (row) => alert(`Deleted ${row.title}`) }
            ]
          }
        }}
      />
    </main>
  );
}
