'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { type DataTableFeatures } from './data-table-features';

export type AuditLog = {
  id: number;
  action: string;
  table_cible: string | null;
  id_enregistrement: number | null;
  details: string | null;
  ip_address: string | null;
  date_heure: string;
  user_nom: string | null;
  user_email: string | null;
  user_role: string | null;
};

// Badge coloring by action prefix
function getActionBadge(action: string) {
  if (action === 'CONNEXION')
    return <Badge className="bg-green-600 text-white">{action}</Badge>;
  if (action.startsWith('CREATION_'))
    return <Badge className="bg-blue-600 text-white">{action}</Badge>;
  if (action.startsWith('MODIFICATION_'))
    return <Badge className="bg-orange-500 text-white">{action}</Badge>;
  if (action.startsWith('DESACTIVATION_'))
    return <Badge variant="destructive">{action}</Badge>;
  if (action === 'CHANGEMENT_MOT_DE_PASSE')
    return <Badge className="bg-purple-600 text-white">{action}</Badge>;
  if (action === 'RESET_MOT_DE_PASSE_ADMIN')
    return <Badge className="bg-yellow-500 text-white">{action}</Badge>;
  if (action === 'VALIDATION_BULLETIN')
    return <Badge className="bg-sky-500 text-white">{action}</Badge>;
  if (action === 'CLOTURE_PERIODE')
    return <Badge className="bg-gray-700 text-white">{action}</Badge>;
  return <Badge variant="secondary">{action}</Badge>;
}

const columnHelper = createColumnHelper<DataTableFeatures, AuditLog>();

export const columns = columnHelper.columns([
  columnHelper.accessor('date_heure', {
    header: 'Date / Heure',
    cell: ({ row }) =>
      new Date(row.original.date_heure).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }),
  }),
  columnHelper.accessor('user_nom', {
    header: 'Utilisateur',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.user_nom ?? '—'}</div>
        <div className="text-xs text-muted-foreground">{row.original.user_email ?? ''}</div>
      </div>
    ),
  }),
  columnHelper.accessor('action', {
    header: 'Action',
    cell: ({ row }) => getActionBadge(row.original.action),
  }),
  columnHelper.accessor('table_cible', {
    header: 'Table ciblée',
    cell: ({ row }) => (
      <span className="text-sm font-mono text-muted-foreground">
        {row.original.table_cible ?? '—'}
        {row.original.id_enregistrement ? ` #${row.original.id_enregistrement}` : ''}
      </span>
    ),
  }),
  columnHelper.accessor('details', {
    header: 'Détails',
    cell: ({ row }) => {
      const text = row.original.details;
      if (!text) return <span className="text-sm text-muted-foreground">—</span>;
      const truncated = text.length > 20 ? text.slice(0, 20) + '...' : text;
      return (
        <span className="text-sm cursor-help" title={text}>
          {truncated}
        </span>
      );
    },
  }),
]);
