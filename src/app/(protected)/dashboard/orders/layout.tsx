import type { ReactNode } from 'react';

interface OrdersLayoutProps {
  children: ReactNode;
}

export default function OrdersLayout({ children }: OrdersLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto">
        {children}
      </div>
    </div>
  );
}