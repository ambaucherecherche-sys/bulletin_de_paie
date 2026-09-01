import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import UtilisateursClient from './utilisateurs-client';

export default async function UtilisateursPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'administrateur') redirect('/dashboard');

  return <UtilisateursClient />;
}
