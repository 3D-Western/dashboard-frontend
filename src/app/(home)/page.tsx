import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Home',
  description: "Welcome to 3D Western - Western's official 3D printing club",
};

export default function Page() {
  redirect('/login');
}
