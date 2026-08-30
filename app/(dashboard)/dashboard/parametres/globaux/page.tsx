import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ParametresGlobaux } from '@/components/parametres/ParametresGlobaux';

export const metadata = {
  title: 'Paramètres Globaux | Solutech',
};

export default async function ParametresGlobauxPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'administrateur') redirect('/dashboard');

  return <ParametresGlobaux />;
}
