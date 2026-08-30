import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { queryOne } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <span className="col-span-2 text-sm">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

export default async function EmployeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { id } = await params;
  const employe = await queryOne<any>('SELECT * FROM employes WHERE id = ?', [id]);
  if (!employe) notFound();

  const dateEntree = new Date(employe.date_entree);
  const now = new Date();
  const annees = differenceInYears(now, dateEntree);
  const mois = differenceInMonths(now, dateEntree) % 12;
  const taux = annees < 2 ? 0 : Math.min(annees, 25);
  const primeAnciennete = Math.round(Number(employe.salaire_categoriel) * taux / 100);

  return (
    <div className="flex flex-col gap-6 items-center w-full">
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" render={<Link href="/dashboard/employes" />} nativeButton={false}>
            ← Retour
          </Button>
          <div>
            <p className="text-muted-foreground">{employe.matricule}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={employe.actif ? 'default' : 'secondary'}>
            {employe.actif ? 'Actif' : 'Inactif'}
          </Badge>
          {['administrateur', 'gestionnaire_rh'].includes(session.user.role) && (
            <Button render={<Link href={`/dashboard/employes/${id}/modifier`} />} nativeButton={false}>
              Modifier
            </Button>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="rounded-lg border">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold">Identité</h2>
          </div>
          <div className="p-4">
            <InfoRow label="Nom complet" value={`${employe.nom} ${employe.prenom}`} />
            <InfoRow label="Date de naissance" value={employe.date_naissance ? format(new Date(employe.date_naissance), 'dd MMMM yyyy', { locale: fr }) : null} />
            <InfoRow label="Situation matrimoniale" value={employe.situation_matrimoniale} />
            <InfoRow label="Personnes à charge" value={employe.nb_personnes_charge} />
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold">Poste & Ancienneté</h2>
          </div>
          <div className="p-4">
            <InfoRow label="Poste" value={employe.poste} />
            <InfoRow label="Département" value={employe.departement} />
            <InfoRow label="Classement" value={employe.classement} />
            <InfoRow label="Date d'entrée" value={format(dateEntree, 'dd MMMM yyyy', { locale: fr })} />
            <InfoRow label="Ancienneté" value={`${annees} an${annees > 1 ? 's' : ''}${mois > 0 ? ` et ${mois} mois` : ''}`} />
            <InfoRow label="Taux ancienneté" value={`${taux}%`} />
            <InfoRow label="Prime ancienneté (PA02)" value={`${new Intl.NumberFormat('fr-TG').format(primeAnciennete)} FCFA`} />
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold">Rémunération</h2>
          </div>
          <div className="p-4">
            <InfoRow label="Salaire de base (SB01)" value={`${new Intl.NumberFormat('fr-TG').format(Number(employe.salaire_base))} FCFA`} />
            <InfoRow label="Salaire catégoriel" value={`${new Intl.NumberFormat('fr-TG').format(Number(employe.salaire_categoriel))} FCFA`} />
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold">Informations légales & Bancaires</h2>
          </div>
          <div className="p-4">
            <InfoRow label="NIF" value={employe.nif} />
            <InfoRow label="Numéro CNSS" value={employe.numero_cnss} />
            <InfoRow label="Numéro de compte" value={employe.numero_compte} />
            <InfoRow label="Établissement financier" value={employe.etablissement_financier} />
          </div>
        </div>
      </div>
    </div>
  );
}
