import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <AdminSidebar />
      <main className="page-enter flex-1 min-w-0 p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
}
