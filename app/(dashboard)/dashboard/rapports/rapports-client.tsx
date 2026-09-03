'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ExportButtons } from './export-buttons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

const MOIS = [
  { val: 1, label: 'Janvier' }, { val: 2, label: 'Février' }, { val: 3, label: 'Mars' },
  { val: 4, label: 'Avril' }, { val: 5, label: 'Mai' }, { val: 6, label: 'Juin' },
  { val: 7, label: 'Juillet' }, { val: 8, label: 'Août' }, { val: 9, label: 'Septembre' },
  { val: 10, label: 'Octobre' }, { val: 11, label: 'Novembre' }, { val: 12, label: 'Décembre' },
];

const ANNEES = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

const CONFIG_RAPPORTS: Record<string, { titre: string, endpoint: string, colonnes: { cle: string, label: string, isNumeric?: boolean }[], isAnnual?: boolean }> = {
  'journal-paie': {
    titre: 'Journal de Paie',
    endpoint: '/api/rapports/journal-paie',
    colonnes: [
      { cle: 'matricule', label: 'Matricule' }, { cle: 'nom', label: 'Nom' }, { cle: 'prenom', label: 'Prénom' },
      { cle: 'salaire_brut', label: 'Brut', isNumeric: true }, { cle: 'cnss', label: 'CNSS', isNumeric: true },
      { cle: 'amu', label: 'AMU', isNumeric: true }, { cle: 'irpp', label: 'IRPP', isNumeric: true },
      { cle: 'remuneration_nette', label: 'Net Payé', isNumeric: true },
    ]
  },
  'cnss': {
    titre: 'Déclaration CNSS',
    endpoint: '/api/rapports/cnss',
    colonnes: [
      { cle: 'matricule', label: 'Matricule' }, { cle: 'nom', label: 'Nom' }, { cle: 'prenom', label: 'Prénom' },
      { cle: 'numero_cnss', label: 'N° CNSS' }, { cle: 'salaire_brut', label: 'Brut', isNumeric: true },
      { cle: 'cnss', label: 'Cotisation (4%)', isNumeric: true },
    ]
  },
  'amu': {
    titre: 'Déclaration AMU',
    endpoint: '/api/rapports/amu',
    colonnes: [
      { cle: 'matricule', label: 'Matricule' }, { cle: 'nom', label: 'Nom' }, { cle: 'prenom', label: 'Prénom' },
      { cle: 'numero_cnss', label: 'N° CNSS' }, { cle: 'salaire_brut', label: 'Brut', isNumeric: true },
      { cle: 'amu', label: 'Cotisation (5%)', isNumeric: true },
    ]
  },
  'irpp': {
    titre: 'Déclaration IRPP',
    endpoint: '/api/rapports/irpp',
    colonnes: [
      { cle: 'matricule', label: 'Matricule' }, { cle: 'nom', label: 'Nom' }, { cle: 'prenom', label: 'Prénom' },
      { cle: 'nif', label: 'NIF' }, { cle: 'salaire_brut', label: 'Brut', isNumeric: true },
      { cle: 'irpp', label: 'IRPP', isNumeric: true },
    ]
  },
  'masse-salariale': {
    titre: 'Masse Salariale',
    endpoint: '/api/rapports/masse-salariale',
    isAnnual: true,
    colonnes: [
      { cle: 'mois_str', label: 'Mois' }, { cle: 'nb_bulletins', label: 'Nb. Bulletins', isNumeric: true },
      { cle: 'total_brut', label: 'Masse Salariale Brute', isNumeric: true },
      { cle: 'total_cnss', label: 'CNSS', isNumeric: true }, { cle: 'total_amu', label: 'AMU', isNumeric: true },
      { cle: 'total_irpp', label: 'IRPP', isNumeric: true }, { cle: 'total_net', label: 'Total Net Payé', isNumeric: true },
    ]
  },
  'fiche-virement': {
    titre: 'Fiche de Virement',
    endpoint: '/api/rapports/fiche-virement',
    colonnes: [
      { cle: 'matricule', label: 'Matricule' }, { cle: 'nom', label: 'Nom' }, { cle: 'prenom', label: 'Prénom' },
      { cle: 'etablissement_financier', label: 'Banque' }, { cle: 'numero_compte', label: 'N° Compte' },
      { cle: 'remuneration_nette', label: 'Montant', isNumeric: true },
    ]
  }
};

function fmt(n: number | string) {
  if (typeof n === 'number') return new Intl.NumberFormat('fr-TG').format(n);
  return n;
}

export function RapportsClient() {
  const [typeRapport, setTypeRapport] = useState('journal-paie');
  const [mois, setMois] = useState<number>(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const config = CONFIG_RAPPORTS[typeRapport];

  const handleFetch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const url = new URL(window.location.origin + config.endpoint);
      if (!config.isAnnual) url.searchParams.set('mois', String(mois));
      url.searchParams.set('annee', String(annee));
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      } else {
        setData([]);
      }
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (val: string | null) => {
    if (!val) return;
    setTypeRapport(val);
    setData([]);
    setHasSearched(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapports & États</h1>
          <p className="text-muted-foreground">Consultez et exportez les rapports de paie et de cotisations</p>
        </div>
        <Button onClick={handleFetch} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Générer rapport
        </Button>
      </div>

      <div className="flex items-center py-4 gap-2 flex-wrap">
        <div className="w-[200px]">
          <Select value={typeRapport} onValueChange={handleTypeChange}>
            <SelectTrigger><SelectValue placeholder="Type de rapport" /></SelectTrigger>
            <SelectContent>
              {Object.entries(CONFIG_RAPPORTS).map(([key, c]) => (
                <SelectItem key={key} value={key}>{c.titre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!config.isAnnual && (
          <div className="w-[150px]">
            <Select value={String(mois)} onValueChange={(v) => { if(v) setMois(Number(v)) }}>
              <SelectTrigger><SelectValue placeholder="Mois" /></SelectTrigger>
              <SelectContent>
                {MOIS.map(m => <SelectItem key={m.val} value={String(m.val)}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="w-[150px]">
          <Select value={String(annee)} onValueChange={(v) => { if(v) setAnnee(Number(v)) }}>
            <SelectTrigger><SelectValue placeholder="Année" /></SelectTrigger>
            <SelectContent>
              {ANNEES.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {hasSearched && data.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <ExportButtons 
              endpoint={config.endpoint} 
              params={{ mois: config.isAnnual ? undefined : mois, annee }} 
            />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {config.colonnes.map(c => (
                <TableHead key={c.cle} className={c.isNumeric ? 'text-right' : ''}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={config.colonnes.length} className="h-24 text-center">Chargement...</TableCell></TableRow>
            ) : data.length > 0 ? (
              data.map((row, i) => (
                <TableRow key={i}>
                  {config.colonnes.map(c => (
                    <TableCell key={c.cle} className={c.isNumeric ? 'text-right' : ''}>
                      {c.isNumeric && row[c.cle] ? fmt(Number(row[c.cle])) : (row[c.cle] || '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={config.colonnes.length} className="h-24 text-center text-muted-foreground">
                  {hasSearched ? "Aucune donnée trouvée pour cette période." : "Cliquez sur 'Générer rapport' pour afficher les données."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
