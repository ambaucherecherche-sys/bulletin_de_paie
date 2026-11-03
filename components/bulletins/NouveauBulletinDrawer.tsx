'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { toast } from 'sonner';

type Employe = { 
  id: number; 
  matricule: string; 
  nom: string; 
  prenom: string;
  salaire_base?: number;
  salaire_categoriel?: number;
};

type Periode = { 
  id: number; 
  mois: number; 
  annee: number; 
  statut: string;
};

interface NouveauBulletinDrawerProps {
  trigger?: React.ReactElement | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: {
    employeId: string;
    periodeId: string;
  };
  bulletinId?: number;
}

const DEFAULT_VARIABLES = {
  base_pa02: '',
  taux_pa02: '0',
  heures_supp: '0',
  indemnite_logement: '0',
  indemnite_transport: '0',
  sursalaire: '0',
  primes_caisse: '0',
  primes_salissure: '0',
  base_ich15: '0',
  taux_ich15: '0',
  retenue_avance: '0',
  autres_retenues: '0',
};

export function NouveauBulletinDrawer({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  defaultValues,
  bulletinId
}: NouveauBulletinDrawerProps = {}) {
  const isMobile = useIsMobile();
  const swipeDirection = isMobile ? "down" : "right";

  const router = useRouter();
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [periodes, setPeriodes] = useState<Periode[]>([]);

  const [employeId, setEmployeId] = useState(defaultValues?.employeId || '');
  const [periodeId, setPeriodeId] = useState(defaultValues?.periodeId || '');
  const [saving, setSaving] = useState(false);
  
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = setControlledOpen || setUncontrolledOpen;

  const [hasFetched, setHasFetched] = useState(false);
  const [loadingBulletin, setLoadingBulletin] = useState(false);

  // Éléments variables
  const [variables, setVariables] = useState({ ...DEFAULT_VARIABLES });

  // Charger les listes employés/périodes à l'ouverture
  useEffect(() => {
    if (open && !hasFetched) {
      const fetchData = async () => {
        try {
          const [resE, resP] = await Promise.all([
            fetch('/api/employes'),
            fetch('/api/periodes?statut=ouverte'),
          ]);
          const dataE = await resE.json();
          const dataP = await resP.json();
          setEmployes(dataE.data || []);
          setPeriodes(dataP.data || []);
          setHasFetched(true);
        } catch {
          toast.error('Erreur de chargement des données');
        }
      };
      fetchData();
    }
  }, [open, hasFetched]);

  // Charger les données du bulletin existant pour pré-remplir les champs en mode édition
  useEffect(() => {
    if (open && bulletinId) {
      const fetchBulletinData = async () => {
        try {
          setLoadingBulletin(true);
          const res = await fetch(`/api/bulletins/${bulletinId}`);
          if (!res.ok) return;
          const json = await res.json();
          const b = json.bulletin;
          const lignes: any[] = json.lignes ?? [];

          // Retrouver la ligne ICH15 pour base et nb_jours
          const ligneIch15 = lignes.find((l: any) => l.code === 'ICH15');

          setEmployeId(String(b.employe_id));
          setPeriodeId(String(b.periode_id));

          setVariables({
            base_pa02: String(b.salaire_categoriel || b.salaire_base || ''),
            taux_pa02: String(b.taux_anciennete || '0'),
            heures_supp: String(b.heures_supp || '0'),
            indemnite_logement: String(b.indemnite_logement || '0'),
            indemnite_transport: String(b.indemnite_transport || '0'),
            sursalaire: String(b.sursalaire || '0'),
            primes_caisse: String(b.primes_caisse || '0'),
            primes_salissure: String(b.primes_salissure || '0'),
            base_ich15: String(ligneIch15?.base || '0'),
            taux_ich15: String(ligneIch15?.taux_ou_nombre || '0'),
            retenue_avance: String(b.retenue_avance || '0'),
            autres_retenues: String(b.autres_retenues || '0'),
          });
        } catch {
          toast.error('Impossible de charger les données du bulletin');
        } finally {
          setLoadingBulletin(false);
        }
      };
      fetchBulletinData();
    }
  }, [open, bulletinId]);

  // Réinitialiser l'état à la fermeture pour permettre un rechargement propre à la prochaine ouverture
  useEffect(() => {
    if (!open) {
      setHasFetched(false);
    }
  }, [open]);

  const handleEmployeSelect = (idStr: string) => {
    setEmployeId(idStr);
    // En mode création uniquement, on pré-remplit la base PA02 depuis le salaire de l'employé
    if (!bulletinId) {
      const emp = employes.find(e => e.id.toString() === idStr);
      if (emp && emp.salaire_base !== undefined) {
        setVariables(prev => ({
          ...prev,
          base_pa02: String(emp.salaire_base || 0),
        }));
      }
    }
  };

  const handleVarChange = (field: string, value: string) => {
    setVariables(prev => ({ ...prev, [field]: value }));
  };

  const parseVariables = () => {
    const baseIch15 = parseFloat(variables.base_ich15) || 0;
    const nbJoursIch15 = parseFloat(variables.taux_ich15) || 0;

    return {
      base_pa02: parseFloat(variables.base_pa02) || 0,
      taux_pa02: parseFloat(variables.taux_pa02) || 0,
      hs03: parseFloat(variables.heures_supp) || 0,
      icl13: parseFloat(variables.indemnite_logement) || 0,
      ict14: parseFloat(variables.indemnite_transport) || 0,
      ss05: parseFloat(variables.sursalaire) || 0,
      ir04: parseFloat(variables.primes_caisse) || 0,
      ir12: parseFloat(variables.primes_salissure) || 0,
      base_ich15: baseIch15,
      taux_ich15: nbJoursIch15,
      nb_jours_ich15: nbJoursIch15,
      ras18: parseFloat(variables.retenue_avance) || 0,
      ar19: parseFloat(variables.autres_retenues) || 0,
      // Compatibilité
      heures_supp: parseFloat(variables.heures_supp) || 0,
      indemnite_logement: parseFloat(variables.indemnite_logement) || 0,
      indemnite_transport: parseFloat(variables.indemnite_transport) || 0,
      sursalaire: parseFloat(variables.sursalaire) || 0,
      primes_caisse: parseFloat(variables.primes_caisse) || 0,
      primes_salissure: parseFloat(variables.primes_salissure) || 0,
      primes_cantine: Math.round(baseIch15 * nbJoursIch15),
      retenue_avance: parseFloat(variables.retenue_avance) || 0,
      autres_retenues: parseFloat(variables.autres_retenues) || 0,
    };
  };

  const onSave = async () => {
    if (!employeId || !periodeId) {
      toast.error('Veuillez sélectionner un employé et une période');
      return;
    }
    
    try {
      setSaving(true);
      
      // 1. Calculer côté backend
      const calcRes = await fetch('/api/bulletins/calculer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employe_id: parseInt(employeId),
          periode_id: parseInt(periodeId),
          elements_variables: parseVariables()
        })
      });
      const calcData = await calcRes.json();
      if (!calcRes.ok) throw new Error(calcData.error || 'Erreur lors du calcul');
      
      // 2. Sauvegarder
      const isEdit = !!bulletinId;
      const saveUrl = isEdit ? `/api/bulletins/${bulletinId}` : '/api/bulletins';
      const saveMethod = isEdit ? 'PUT' : 'POST';
      
      const saveRes = await fetch(saveUrl, {
        method: saveMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employe_id: parseInt(employeId),
          periode_id: parseInt(periodeId),
          result_calcule: calcData.data
        })
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Erreur lors de la sauvegarde');
      
      toast.success(isEdit ? 'Bulletin modifié avec succès' : 'Bulletin créé avec succès');
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur inattendue');
    } finally {
      setSaving(false);
    }
  };

  const periodeItems = [
    { label: 'Sélectionner une période...', value: '' },
    ...periodes.map(p => ({
      label: `${String(p.mois).padStart(2, '0')}/${p.annee}`,
      value: p.id.toString(),
    }))
  ];

  const employeItems = [
    { label: 'Sélectionner un employé...', value: '' },
    ...employes.map(e => ({
      label: `${e.matricule} - ${e.nom} ${e.prenom}`,
      value: e.id.toString(),
    }))
  ];

  const isEdit = !!bulletinId;

  return (
    <Drawer showSwipeHandle={isMobile} swipeDirection={swipeDirection} open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DrawerTrigger render={trigger || <Button>Nouveau Bulletin</Button>} />
      )}
      <DrawerContent className={!isMobile ? "right-0 left-auto top-0 bottom-0 mt-0 w-[600px] sm:w-[800px] rounded-l-xl rounded-r-none" : ""}>
        <DrawerHeader>
          <DrawerTitle>{isEdit ? 'Modifier le bulletin' : 'Générer un bulletin'}</DrawerTitle>
          <DrawerDescription>
            Sélectionnez l&apos;employé et la période, puis renseignez les éléments variables.
          </DrawerDescription>
        </DrawerHeader>

        {loadingBulletin ? (
          <div className="flex-1 flex items-center justify-center p-6 text-muted-foreground">
            Chargement des données du bulletin...
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Période + Employé */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Période de Paie</Label>
              <Select
                items={periodeItems}
                value={periodeId}
                onValueChange={(v) => setPeriodeId(v ?? '')}
                disabled={isEdit}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une période..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {periodeItems.slice(1).map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employé</Label>
              <Select
                items={employeItems}
                value={employeId}
                onValueChange={(v) => handleEmployeSelect(v ?? '')}
                disabled={isEdit}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un employé..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {employeItems.slice(1).map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 1 : Éléments imposables */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Éléments imposables</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="base_pa02" className="text-xs">Base PA02 (défaut = salaire base)</Label>
                <Input
                  id="base_pa02"
                  type="number"
                  placeholder="0"
                  value={variables.base_pa02}
                  onChange={e => handleVarChange('base_pa02', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="taux_pa02" className="text-xs">Taux ancienneté PA02 %</Label>
                <Input
                  id="taux_pa02"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  value={variables.taux_pa02}
                  onChange={e => handleVarChange('taux_pa02', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="heures_supp" className="text-xs">HS03 - Heures supp.</Label>
                <Input
                  id="heures_supp"
                  type="number"
                  value={variables.heures_supp}
                  onChange={e => handleVarChange('heures_supp', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="indemnite_logement" className="text-xs">ICL13 - Indemnité logement</Label>
                <Input
                  id="indemnite_logement"
                  type="number"
                  value={variables.indemnite_logement}
                  onChange={e => handleVarChange('indemnite_logement', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="indemnite_transport" className="text-xs">ICT14 - Indemnité transport</Label>
                <Input
                  id="indemnite_transport"
                  type="number"
                  value={variables.indemnite_transport}
                  onChange={e => handleVarChange('indemnite_transport', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sursalaire" className="text-xs">SS05 - Sursalaire</Label>
                <Input
                  id="sursalaire"
                  type="number"
                  value={variables.sursalaire}
                  onChange={e => handleVarChange('sursalaire', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2 : Primes (non imposables) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Primes (non imposables)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="primes_caisse" className="text-xs">IR04 - Primes de Caisse</Label>
                <Input
                  id="primes_caisse"
                  type="number"
                  value={variables.primes_caisse}
                  onChange={e => handleVarChange('primes_caisse', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="primes_salissure" className="text-xs">IR12 - Primes de Salissure</Label>
                <Input
                  id="primes_salissure"
                  type="number"
                  value={variables.primes_salissure}
                  onChange={e => handleVarChange('primes_salissure', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="base_ich15" className="text-xs">Base ICH15 - Cantine</Label>
                <Input
                  id="base_ich15"
                  type="number"
                  placeholder="0"
                  value={variables.base_ich15}
                  onChange={e => handleVarChange('base_ich15', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="taux_ich15" className="text-xs">Nb jours ICH15 - Cantine</Label>
                <Input
                  id="taux_ich15"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={variables.taux_ich15}
                  onChange={e => handleVarChange('taux_ich15', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 3 : Retenues */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Retenues</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="retenue_avance" className="text-xs">RAS18 - Retenu/Avance sur salaire</Label>
                <Input
                  id="retenue_avance"
                  type="number"
                  value={variables.retenue_avance}
                  onChange={e => handleVarChange('retenue_avance', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="autres_retenues" className="text-xs">AR19 - Autres retenues</Label>
                <Input
                  id="autres_retenues"
                  type="number"
                  value={variables.autres_retenues}
                  onChange={e => handleVarChange('autres_retenues', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        )}

        <DrawerFooter className="flex flex-row justify-end gap-3 pt-4 border-t">
          <DrawerClose render={<Button variant="outline">Annuler</Button>} />
          <Button onClick={onSave} disabled={saving || loadingBulletin}>
            {saving ? (isEdit ? 'Modification...' : 'Création en cours...') : (isEdit ? 'Enregistrer les modifications' : 'Générer et enregistrer')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
