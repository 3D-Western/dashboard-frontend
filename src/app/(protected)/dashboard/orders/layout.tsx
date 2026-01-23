import type { ReactNode } from 'react';

interface OrdersLayoutProps {
  children: ReactNode;
}

export default function OrdersLayout({ children }: OrdersLayoutProps) {
  return <>{children}</>;
}
