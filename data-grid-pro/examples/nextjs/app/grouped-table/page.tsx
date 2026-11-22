import { GroupedTableWrapper } from '../components/GroupedTableWrapper';

interface StaffProfile {
  id: string;
  name: string;
  department: string;
  team: string;
  role: string;
  salary: number;
}

export default function GroupedTablePage() {
  const staff: StaffProfile[] = [
    { id: '1', name: 'Alice Freeman', department: 'Engineering', team: 'Frontend Core', role: 'Staff UI Architect', salary: 185000 },
    { id: '2', name: 'Bob Henderson', department: 'Engineering', team: 'Cloud Infrastructure', role: 'DevOps Lead', salary: 175000 },
    { id: '3', name: 'Clara Oswald', department: 'Product Design', team: 'Design Systems', role: 'Principal Designer', salary: 160000 },
    { id: '4', name: 'David Kim', department: 'Engineering', team: 'Frontend Core', role: 'Senior React Dev', salary: 145000 },
    { id: '5', name: 'Elena Rostova', department: 'Product Design', team: 'Product UX', role: 'UX Researcher', salary: 135000 }
  ];

  const columns = [
    { id: 'name', header: 'Staff Member', field: 'name', width: '220px' },
    { id: 'department', header: 'Department', field: 'department', width: '180px' },
    { id: 'team', header: 'Team', field: 'team', width: '160px' },
    { id: 'role', header: 'Role', field: 'role', width: '200px' },
    {
      id: 'salary',
      header: 'Salary ($)',
      field: 'salary',
      width: '160px',
      aggregate: { type: 'sum' as const, label: 'Total Payroll' },
      formatter: (v: number) => `$${v.toLocaleString()}`
    }
  ];

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Organizational Directory (Row Grouping & Aggregates)</h1>
      <p className="text-slate-600 text-sm">
        Rows grouped by Department with calculated payroll aggregates. Click any group header to expand/collapse.
      </p>
      <GroupedTableWrapper
        rows={staff}
        columns={columns}
        options={{
          grouping: {
            groupBy: ['department'],
            showAggregatesInHeader: true
          }
        }}
      />
    </main>
  );
}
