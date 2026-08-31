'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { type DataTableFeatures } from './data-table-features';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';

const MOIS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export type Periode = {
  id: number;
  mois: number;
  annee: number;
  date_debut: string;
  date_fin: string;
  statut: 'ouverte' | 'cloturee';
  created_at: string;
  total_bulletins: number;
  bulletins_valides: number;
  bulletins_archives: number;
};

const columnHelper = createColumnHelper<DataTableFeatures, Periode>();

function ActionsCell({ row, onRefresh }: { row: any; onRefresh: () => void }) {
  const router = useRouter();
  const periode = row.original as Periode;
  const [cloturerOpen, setCloturerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCloturer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/periodes/${periode.id}/cloturer`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        const details: string[] = data.details ?? [];
        const desc = details.length > 0
          ? `${data.error}\n• ${details.join('\n• ')}`
          : data.error;
        toast.add({ title: 'Clôture impossible', description: desc, type: 'error' });
      } else {
        toast.add({ title: 'Période clôturée', description: 'Tous les bulletins ont été archivés.', type: 'success' });
        onRefresh();
        router.refresh();
      }
    } catch {
      toast.add({ title: 'Erreur réseau', type: 'error' });
    } finally {
      setLoading(false);
      setCloturerOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
          <span className="sr-only">Ouvrir le menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => router.push(`/dashboard/bulletins?periode=${periode.id}`)}
            >
              Voir les bulletins
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {periode.statut === 'ouverte' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setCloturerOpen(true)}
              >
                Clôturer la période
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cloturerOpen} onOpenChange={setCloturerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clôturer la période ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de clôturer la période{' '}
              <strong>{MOIS[periode.mois]} {periode.annee}</strong>.
              Tous les bulletins validés seront archivés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloturer}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Clôture en cours...' : 'Clôturer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function buildColumns(onRefresh: () => void) {
  return columnHelper.columns([
    columnHelper.accessor('annee', {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Période
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {MOIS[row.original.mois]} {row.original.annee}
        </span>
      ),
    }),
    columnHelper.accessor('date_debut', {
      header: 'Dates',
      cell: ({ row }) => {
        const debut = row.original.date_debut ? new Date(row.original.date_debut).toLocaleDateString('fr-FR') : '—';
        const fin = row.original.date_fin ? new Date(row.original.date_fin).toLocaleDateString('fr-FR') : '—';
        return <span className="text-sm text-muted-foreground">{debut} → {fin}</span>;
      },
    }),
    columnHelper.accessor('statut', {
      header: 'Statut',
      cell: ({ row }) => (
        <Badge variant={row.original.statut === 'ouverte' ? 'default' : 'secondary'}>
          {row.original.statut === 'ouverte' ? 'Ouverte' : 'Clôturée'}
        </Badge>
      ),
    }),
    columnHelper.accessor('total_bulletins', {
      header: () => <div className="text-center">Bulletins validés</div>,
      cell: ({ row }) => {
        const { bulletins_valides, bulletins_archives, total_bulletins } = row.original;
        const validates = bulletins_valides + bulletins_archives;
        return (
          <div className="text-center">
            <span className={validates === total_bulletins && total_bulletins > 0 ? 'text-green-600 font-semibold' : ''}>
              {validates}
            </span>
            <span className="text-muted-foreground"> / {total_bulletins}</span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => <ActionsCell row={row} onRefresh={onRefresh} />,
    }),
  ]);
}
