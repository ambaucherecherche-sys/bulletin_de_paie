import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BaremeIrpp } from '@/components/parametres/BaremeIrpp';

export const metadata = {
  title: 'Barème IRPP | Solutech',
};

export default async function BaremePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'administrateur') redirect('/dashboard');

  return <BaremeIrpp />;
}
