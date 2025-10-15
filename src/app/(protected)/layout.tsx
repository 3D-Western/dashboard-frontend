export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // TODO: Add authentication check here to redirect the user if not authenticated.

  return <>{children}</>;
}
