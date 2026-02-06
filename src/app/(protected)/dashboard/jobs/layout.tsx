import type { ReactNode } from 'react';

interface JobsLayoutProps {
  children: ReactNode;
}

export default function JobsLayout({ children }: JobsLayoutProps) {
  return <>{children}</>;
}
