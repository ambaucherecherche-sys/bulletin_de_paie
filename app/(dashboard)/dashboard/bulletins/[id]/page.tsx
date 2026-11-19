'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Trash2, ArrowLeft, MoreHorizontal, FileDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Link from 'next/link';
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

export default function BulletinDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchId = React.use(params).id;

  const fetchBulletin = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bulletins/${fetchId}`);
      if (!res.ok) throw new Error('Bulletin introuvable');
      const json = await res.json();
      setData(json);
    } catch (error: any) {
      toast.error(error.message);
      router.push('/dashboard/bulletins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBulletin();
  }, [fetchId]);

  const handleValidate = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      setValidating(true);
      const res = await fetch(`/api/bulletins/${fetchId}/valider`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Bulletin validé avec succès');
      fetchBulletin();
      setValidateOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      setDeleting(true);
      const res = await fetch(`/api/bulletins/${fetchId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Bulletin supprimé');
      router.push('/dashboard/bulletins');
    } catch (err: any) {
      toast.error(err.message);
      setDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const res = await fetch(`/api/bulletins/${fetchId}/pdf`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Erreur lors du téléchargement');
      }

      const contentType = res.headers.get('content-type') || '';
      const blob = await res.blob();
      if (res.status === 204 || !contentType.includes('application/pdf') || blob.size === 0) {
        throw new Error(
          'Le PDF n’a pas été reçu. Actualisez la page et désactivez IDM Advanced Integration pour localhost, puis réessayez.'
        );
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin-${data?.bulletin?.numero ?? fetchId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Impossible de télécharger le PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Chargement du bulletin...</div>;
  }

  if (!data) return null;

  const { bulletin, lignes: lignesBulletin, cumulActuel } = data;
  const ligneIch15 = (lignesBulletin ?? []).find((l: any) => l.code === 'ICH15');
  const isBrouillon = bulletin.statut === 'brouillon';
  
  const formatVal = (v: any, keepDash: boolean = false) => {
    if (v === null || v === undefined || v === 0 || v === '0' || v === '') {
      return keepDash ? '-' : '';
    }
    if (typeof v === 'number') return v.toLocaleString('fr-FR').replace(/,/g, ' ');
    if (typeof v === 'string' && !isNaN(Number(v))) return Number(v).toLocaleString('fr-FR').replace(/,/g, ' ');
    return v;
  };

  // Arrondi à la dizaine supérieure  : 65 929 → 65 930
  const roundUp10 = (v: any): number | null => {
    const n = Number(v);
    if (!v || isNaN(n) || n === 0) return null;
    return Math.ceil(n / 10) * 10;
  };

  // Arrondi à la centaine supérieure : 24 990 → 25 000
  const roundUp100 = (v: any): number | null => {
    const n = Number(v);
    if (!v || isNaN(n) || n === 0) return null;
    return Math.ceil(n / 100) * 100;
  };

  const moisStr = new Date(bulletin.annee, bulletin.mois - 1).toLocaleString('fr-FR', { month: 'long' }).toUpperCase();

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const displayedTr20 = roundUp100(bulletin.total_autres_retenues) || 0;
  const displayedSn21 = roundUp10((Number(bulletin.salaire_brut) + displayedTr20) - (Number(bulletin.total_retenues_legales) + Number(bulletin.retenue_avance)));

  const rows = [
    { code: 'SB01', label: 'SALAIRE DE BASE', base: bulletin.salaire_base, taux: 30, retenues: null, gains: bulletin.salaire_base },
    { code: 'PA02', label: 'PRIME D\'ANCIENNETE', base: bulletin.salaire_categoriel, taux: bulletin.taux_anciennete > 0 ? `${bulletin.taux_anciennete}%` : null, retenues: null, gains: bulletin.prime_anciennete },
    { code: 'HS03', label: 'FORFAIT HEURES SUPPLEMENTAIRES', base: bulletin.heures_supp, taux: bulletin.heures_supp > 0 ? 30 : null, retenues: null, gains: bulletin.heures_supp },
    { code: 'ICL13', label: 'INDEMNITE COMPENSATRICE DE LOGEMENT', base: bulletin.indemnite_logement, taux: null, retenues: null, gains: bulletin.indemnite_logement },
    { code: 'ICT14', label: 'INDEMNITE COMPENSATRICE DE TRANSPORT', base: bulletin.indemnite_transport, taux: null, retenues: null, gains: bulletin.indemnite_transport },
    { code: 'TIP16', label: 'TOTAL INDEMNITES ET PRIMES IMPOSABLES', bold: true, base: null, taux: null, retenues: null, gains: bulletin.total_indemnites_imposables },
    { code: 'SS05', label: 'SURSALAIRE', base: null, taux: null, retenues: null, gains: bulletin.sursalaire, keepDashGains: true },
    { code: 'SB06', label: 'SALAIRE BRUT', bold: true, base: null, taux: null, retenues: null, gains: bulletin.salaire_brut },
    { code: 'IRPP08', label: 'IRPP', base: null, taux: null, retenues: bulletin.irpp, gains: null },
    { code: 'CS07', label: 'CNSS', base: bulletin.salaire_brut, taux: '4%', retenues: bulletin.cnss, gains: null },
    { code: 'AM3', label: 'AMU', base: bulletin.salaire_brut, taux: '5%', retenues: bulletin.amu, gains: null },
    { code: 'RL10', label: 'TOTAL RETENUES LEGALES', bold: true, base: null, taux: null, retenues: bulletin.total_retenues_legales, gains: null },
    { code: 'SNR11', label: 'SALAIRE NET APRES RETENUES LEGALES', bold: true, base: null, taux: null, retenues: null, gains: roundUp10(bulletin.salaire_net_retenues) },
    { code: 'RT17', label: 'REMUNERATION TOTALE', bold: true, base: null, taux: null, retenues: null, gains: roundUp10(bulletin.remuneration_totale) },
    { code: 'IR04', label: 'PRIMES DE CAISSE', base: null, taux: null, retenues: null, gains: bulletin.primes_caisse, keepDashGains: true },
    { code: 'IR12', label: 'PRIMES DE SALISSURE', base: null, taux: null, retenues: null, gains: bulletin.primes_salissure },
    { code: 'ICH15', label: 'PRIMES DE CANTINE', base: ligneIch15?.base ?? null, taux: ligneIch15?.taux_ou_nombre ?? null, retenues: null, gains: roundUp100(bulletin.primes_cantine) },
    { code: 'RAS18', label: 'RETENU/AVANCE SUR SALAIRE', base: null, taux: null, retenues: bulletin.retenue_avance, gains: null, keepDashRetenues: true },
    { code: 'AR19', label: 'AUTRES RETENUES', base: null, taux: null, retenues: bulletin.autres_retenues, gains: null },
    { code: 'TR20', label: 'TOTAL AUTRES PRIMES', bold: true, base: null, taux: null, retenues: displayedTr20, gains: null },
    { code: 'SN21', label: 'REMUNERATION NETTE', bold: true, base: null, taux: null, retenues: null, gains: displayedSn21 },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        {/* Gauche : bouton retour + titre + période + badge */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/dashboard/bulletins" />} nativeButton={false}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Bulletin N° {bulletin.numero}</h1>
          <span className="text-muted-foreground text-sm">
            {String(bulletin.mois).padStart(2, '0')}/{bulletin.annee}
          </span>
          <Badge variant={isBrouillon ? 'secondary' : bulletin.statut === 'valide' ? 'default' : 'outline'} className="capitalize">
            {bulletin.statut}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadPDF} disabled={downloading}>
            <FileDown data-icon="inline-start" />
            {downloading ? 'Téléchargement...' : 'Télécharger PDF'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {isBrouillon && (
                  <DropdownMenuItem onClick={() => setValidateOpen(true)} disabled={validating || deleting}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Valider
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              {isBrouillon && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                    disabled={deleting || validating}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={validateOpen} onOpenChange={setValidateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider ce bulletin ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir valider ce bulletin ? Cette action est irréversible et verrouillera le document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={validating}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleValidate} disabled={validating}>
              {validating ? 'Validation...' : 'Valider'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer ce bulletin (brouillon) ? Cette action supprimera les données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-white text-black p-8 font-sans text-[11px] print:p-0 border shadow-sm">
        
        {/* Table Unifiée avec Grid 9 colonnes via colSpan */}
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            {/* Ligne d'en-tête (Informations Employé / Période) */}
            <tr>
              <td colSpan={2} className="border border-black p-1">
                <div className="text-[9px]">Matricule</div>
                <div>{bulletin.matricule}</div>
              </td>
              <td colSpan={1} className="border border-black p-1">
                <div className="text-[9px]">Classement</div>
                <div>{bulletin.classement || ''}</div>
              </td>
              <td colSpan={1} className="border border-black p-1">
                <div className="text-[9px]">Situation Matri</div>
                <div className="truncate">{bulletin.situation_matrimoniale || ''}</div>
              </td>
              <td colSpan={1} className="border border-black p-1">
                <div className="text-[9px]">N° CNSS</div>
                <div>{bulletin.numero_cnss || ''}</div>
              </td>
              <td colSpan={1} className="border border-black p-1">
                <div className="text-[9px]">NIF</div>
                <div>{bulletin.nif || ''}</div>
              </td>
              <td colSpan={1} className="border border-black p-1 text-center font-bold uppercase">
                {moisStr}
              </td>
              <td colSpan={2} className="border border-black p-1 text-center whitespace-nowrap">
                Du {formatDateShort(bulletin.date_debut)} AU {formatDateShort(bulletin.date_fin)}
              </td>
            </tr>
            {/* Ligne des titres de colonnes */}
            <tr className="bg-gray-200">
              <th colSpan={1} className="border border-black p-1 text-left w-12 font-semibold">Code</th>
              <th colSpan={4} className="border border-black p-1 text-center font-semibold">Désignation</th>
              <th colSpan={1} className="border border-black p-1 text-center w-24 font-semibold">Base</th>
              <th colSpan={1} className="border border-black p-1 text-center w-20 font-semibold">Taux/Nb</th>
              <th colSpan={1} className="border border-black p-1 text-center w-24 font-semibold">Retenues</th>
              <th colSpan={1} className="border border-black p-1 text-center w-24 font-semibold">Gains</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className={row.bold ? "font-bold" : ""}>
                <td colSpan={1} className="border-x border-black p-1 px-2 align-top">{row.code}</td>
                <td colSpan={4} className="border-x border-black p-1 px-2 align-top">{row.label}</td>
                <td colSpan={1} className="border-x border-black p-1 px-2 text-right align-top">{formatVal(row.base)}</td>
                <td colSpan={1} className="border-x border-black p-1 px-2 text-right align-top">{formatVal(row.taux)}</td>
                <td colSpan={1} className="border-x border-black p-1 px-2 text-right align-top">{formatVal(row.retenues, (row as any).keepDashRetenues)}</td>
                <td colSpan={1} className="border-x border-black p-1 px-2 text-right align-top">{formatVal(row.gains, (row as any).keepDashGains)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Salaire Net */}
        <div className="flex justify-end mt-2 mb-4">
          <div className="flex items-center font-bold text-xs gap-4">
            <span>SALAIRE NET :</span>
            <div className="border border-black px-8 py-1 min-w-[120px] text-right">
              {formatVal(displayedSn21)}
            </div>
          </div>
        </div>

        {/* Reglement */}
        <div className="mt-4 grid grid-cols-[100px_10px_1fr] text-[11px] mb-4">
          <div>REGLEMENT</div>
          <div>:</div>
          <div className="uppercase">VIREMENT</div>
          <div>N° COMPTE</div>
          <div>:</div>
          <div>{bulletin.numero_compte || '-'}</div>
        </div>

        {/* Cumuls Table */}
        <table className="w-full border-collapse border border-black text-[10px] text-center">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-1 font-semibold">DESIGNATION</th>
              <th className="border border-black p-1 font-semibold">NB JOURS</th>
              <th className="border border-black p-1 font-semibold">BASE IRPP</th>
              <th className="border border-black p-1 font-semibold">CUM. IRPP</th>
              <th className="border border-black p-1 font-semibold">CUM CNSS</th>
              <th className="border border-black p-1 font-semibold">BRUT</th>
              <th className="border border-black p-1 font-semibold">PENSION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1 text-left">MOIS</td>
              <td className="border border-black p-1">30</td>
              <td className="border border-black p-1">-</td>
              <td className="border border-black p-1">{formatVal(bulletin.irpp)}</td>
              <td className="border border-black p-1">{formatVal(bulletin.cnss)}</td>
              <td className="border border-black p-1">{formatVal(bulletin.salaire_brut)}</td>
              <td className="border border-black p-1">-</td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-left">EXERCICE</td>
              <td className="border border-black p-1">{cumulActuel?.nb_jours_exercice ?? (Number(bulletin.mois) * 30)}</td>
              <td className="border border-black p-1">-</td>
              <td className="border border-black p-1">{formatVal(cumulActuel?.cum_irpp)}</td>
              <td className="border border-black p-1">{formatVal(cumulActuel?.cum_cnss)}</td>
              <td className="border border-black p-1">{formatVal(cumulActuel?.cum_brut)}</td>
              <td className="border border-black p-1">-</td>
            </tr>
          </tbody>
        </table>
        
      </div>
    </div>
  );
}
