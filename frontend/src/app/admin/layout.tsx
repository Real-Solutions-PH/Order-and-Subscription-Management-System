import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader />
        <main className="page-enter flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
