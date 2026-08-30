import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RubriquesTable } from '@/components/parametres/RubriquesTable';

export const metadata = {
  title: 'Rubriques | Solutech',
};

export default async function RubriquesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'administrateur') redirect('/dashboard');

  return <RubriquesTable />;
}
