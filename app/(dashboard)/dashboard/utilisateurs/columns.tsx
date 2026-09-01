'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
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
import { UtilisateurFormDialog } from './utilisateur-form';

export type Utilisateur = {
  id: number;
  nom: string;
  email: string;
  role: 'administrateur' | 'gestionnaire_rh' | 'comptable' | 'directeur' | 'employe';
  actif: 0 | 1;
  must_change_password: 0 | 1;
  password_expires_at: string | null;
  derniere_connexion: string | null;
  created_at: string;
};

const ROLE_BADGE: Record<string, { label: string; className: string; variant?: any }> = {
  administrateur:  { label: 'Administrateur',   variant: 'destructive',  className: '' },
  gestionnaire_rh: { label: 'Gestionnaire RH',  className: 'bg-blue-600 text-white' },
  comptable:       { label: 'Comptable',         className: 'bg-purple-600 text-white' },
  directeur:       { label: 'Directeur',         className: 'bg-orange-500 text-white' },
  employe:         { label: 'Employé',           variant: 'secondary',    className: '' },
};

const columnHelper = createColumnHelper<DataTableFeatures, Utilisateur>();

function ActionsCell({ row, onRefresh }: { row: any; onRefresh: () => void }) {
  const user = row.original as Utilisateur;
  const [toggleOpen, setToggleOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/utilisateurs/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: user.actif === 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.add({ title: 'Erreur', description: data.error, type: 'error' });
      } else {
        toast.add({
          title: user.actif === 1 ? 'Utilisateur désactivé' : 'Utilisateur activé',
          type: 'success',
        });
        onRefresh();
      }
    } catch {
      toast.add({ title: 'Erreur réseau', type: 'error' });
    } finally {
      setLoading(false);
      setToggleOpen(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/utilisateurs/${user.id}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.add({ title: 'Erreur', description: data.error, type: 'error' });
      } else {
        toast.add({
          title: 'Mot de passe réinitialisé',
          description: `Un email a été envoyé à ${user.email}.`,
          type: 'success',
        });
        onRefresh();
      }
    } catch {
      toast.add({ title: 'Erreur réseau', type: 'error' });
    } finally {
      setLoading(false);
      setResetOpen(false);
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
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResetOpen(true)}>
              Réinitialiser le mot de passe
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={user.actif === 1 ? 'text-destructive focus:text-destructive' : ''}
            onClick={() => setToggleOpen(true)}
          >
            {user.actif === 1 ? 'Désactiver' : 'Activer'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog modification */}
      <UtilisateurFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        utilisateur={user}
        onSuccess={() => { setEditOpen(false); onRefresh(); }}
      />

      {/* Confirmation toggle actif */}
      <AlertDialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user.actif === 1 ? 'Désactiver' : 'Activer'} cet utilisateur ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user.actif === 1
                ? `Le compte de ${user.nom} sera désactivé. Il ne pourra plus se connecter.`
                : `Le compte de ${user.nom} sera réactivé.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggle}
              disabled={loading}
              className={user.actif === 1 ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {loading ? 'En cours...' : user.actif === 1 ? 'Désactiver' : 'Activer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation reset password */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un nouveau mot de passe temporaire sera généré et envoyé par email à{' '}
              <strong>{user.email}</strong>. L'utilisateur devra le changer à sa prochaine connexion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={loading}>
              {loading ? 'Envoi en cours...' : 'Réinitialiser et envoyer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function buildColumns(onRefresh: () => void) {
  return columnHelper.columns([
    columnHelper.accessor('nom', {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Nom
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.nom}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    }),
    columnHelper.accessor('role', {
      header: 'Rôle',
      cell: ({ row }) => {
        const r = ROLE_BADGE[row.original.role];
        return r ? (
          <Badge variant={r.variant} className={r.className}>
            {r.label}
          </Badge>
        ) : null;
      },
    }),
    columnHelper.accessor('actif', {
      header: 'Statut',
      cell: ({ row }) => (
        <Badge variant={row.original.actif === 1 ? 'default' : 'secondary'}
          className={row.original.actif === 1 ? 'bg-green-600 text-white' : ''}>
          {row.original.actif === 1 ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    }),
    columnHelper.accessor('must_change_password', {
      header: 'Mot de passe',
      cell: ({ row }) =>
        row.original.must_change_password === 1 ? (
          <Badge className="bg-yellow-500 text-white">⏳ Connexion en attente</Badge>
        ) : (
          <Badge variant="secondary" className="bg-green-100 text-green-800">✓ Actif</Badge>
        ),
    }),
    columnHelper.accessor('derniere_connexion', {
      header: 'Dernière connexion',
      cell: ({ row }) =>
        row.original.derniere_connexion
          ? new Date(row.original.derniere_connexion).toLocaleDateString('fr-FR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
          : <span className="text-muted-foreground text-sm">Jamais</span>,
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => <ActionsCell row={row} onRefresh={onRefresh} />,
    }),
  ]);
}
