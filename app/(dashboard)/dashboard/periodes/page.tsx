import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PeriodesClient from './periodes-client';

export default async function PeriodesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return <PeriodesClient />;
}
