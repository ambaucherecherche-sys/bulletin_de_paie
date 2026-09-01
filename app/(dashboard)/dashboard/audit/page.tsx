import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AuditClient from './audit-client';

export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'administrateur') redirect('/dashboard');

  return <AuditClient />;
}
