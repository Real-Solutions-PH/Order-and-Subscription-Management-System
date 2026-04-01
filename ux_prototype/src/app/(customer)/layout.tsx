import CustomerNav from '@/components/CustomerNav';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FEFAE0' }}>
      <CustomerNav />
      <main className="page-enter">{children}</main>
    </div>
  );
}
