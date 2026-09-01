'use client';

import { useCallback, useEffect, useState } from 'react';
import { columns, type AuditLog } from './columns';
import { DataTable } from './data-table';

type Utilisateur = { id: number; nom: string; email: string };
type Filters = { userId: string; action: string; dateDebut: string; dateFin: string };
type Pagination = { page: number; totalPages: number; total: number };

export default function AuditClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ userId: '', action: '', dateDebut: '', dateFin: '' });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 });

  const fetchLogs = useCallback(async (f: Filters, page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (f.userId)    params.set('userId', f.userId);
      if (f.action)    params.set('action', f.action);
      if (f.dateDebut) params.set('dateDebut', f.dateDebut);
      if (f.dateFin)   params.set('dateFin', f.dateFin);

      const res = await fetch(`/api/audit?${params.toString()}`);
      const json = await res.json();
      setLogs(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, totalPages: 1, total: 0 });
    } catch {
      console.error('Erreur chargement audit');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load utilisateurs list for filter dropdown
  useEffect(() => {
    fetch('/api/utilisateurs')
      .then((r) => r.json())
      .then((j) => setUtilisateurs(j.data ?? []))
      .catch(() => {});
  }, []);

  // Reload when filters or page changes
  useEffect(() => {
    fetchLogs(filters, pagination.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page]);

  const handleFiltersChange = (f: Filters) => {
    setFilters(f);
    setPagination((p) => ({ ...p, page: 1 })); // reset to page 1 on filter change
  };

  const handlePageChange = (page: number) => {
    setPagination((p) => ({ ...p, page }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journal d'audit</h1>
        <p className="text-muted-foreground">Historique de toutes les actions réalisées dans SOLUTECH</p>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex justify-center py-12 text-muted-foreground">Chargement...</div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          utilisateurs={utilisateurs}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
