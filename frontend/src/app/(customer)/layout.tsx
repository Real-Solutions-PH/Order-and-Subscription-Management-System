import CustomerNav from '@/components/CustomerNav';

export default function CustomerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-surface">
      <CustomerNav />
      <main className="page-enter">{children}</main>
    </div>
  );
}
