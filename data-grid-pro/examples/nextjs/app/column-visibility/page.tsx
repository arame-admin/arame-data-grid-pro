import { ColumnVisibilityWrapper } from '../components/ColumnVisibilityWrapper';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  location: string;
  tenure: string;
}

export default function ColumnVisibilityPage() {
  const staff: StaffMember[] = [
    { id: '1', name: 'Sarah Connor', role: 'Chief Security Officer', department: 'Cyber Defense', email: 's.connor@cyberdyne.io', location: 'Austin, TX', tenure: '4 yrs' },
    { id: '2', name: 'Miles Dyson', role: 'Principal AI Researcher', department: 'Advanced Robotics', email: 'm.dyson@cyberdyne.io', location: 'Palo Alto, CA', tenure: '6 yrs' }
  ];

  const columns = [
    { id: 'name', header: 'Staff Member', field: 'name', width: '220px', required: true }, // Required column cannot be hidden
    { id: 'role', header: 'Role Title', field: 'role', width: '180px' },
    { id: 'department', header: 'Department', field: 'department', width: '160px' },
    { id: 'email', header: 'Email Address', field: 'email', width: '220px' },
    { id: 'location', header: 'Office Location', field: 'location', width: '160px' },
    { id: 'tenure', header: 'Tenure', field: 'tenure', width: '120px', visible: false } // Hidden by default
  ];

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Personnel Directory (Column Visibility Filter)</h1>
      <p className="text-slate-600 text-sm">
        Use the "Columns" menu in the top toolbar to toggle column visibility. Preferences are saved to localStorage.
      </p>
      <ColumnVisibilityWrapper
        rows={staff}
        columns={columns}
        options={{
          storageKey: 'personnel-col-visibility-settings',
          menuButtonLabel: 'Manage Columns'
        }}
      />
    </main>
  );
}
