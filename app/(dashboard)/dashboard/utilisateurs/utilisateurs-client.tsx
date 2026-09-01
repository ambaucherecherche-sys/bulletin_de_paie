'use client';

import { useCallback, useEffect, useState } from 'react';
import { buildColumns, type Utilisateur } from './columns';
import { DataTable } from './data-table';
import { NouvelUtilisateurDialog } from './utilisateur-form';

export default function UtilisateursClient() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUtilisateurs = useCallback(async () => {
    try {
      const res = await fetch('/api/utilisateurs');
      const json = await res.json();
      setUtilisateurs(json.data ?? []);
    } catch {
      console.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUtilisateurs();
  }, [fetchUtilisateurs]);

  const columns = buildColumns(fetchUtilisateurs);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground">Gestion des comptes utilisateurs SOLUTECH</p>
        </div>
        <NouvelUtilisateurDialog onSuccess={fetchUtilisateurs} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">Chargement...</div>
      ) : (
        <DataTable columns={columns} data={utilisateurs} />
      )}
    </div>
  );
}
