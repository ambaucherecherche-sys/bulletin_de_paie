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

type Employe = { id: number; matricule: string; nom: string; prenom: string };
type Periode = { id: number; mois: number; annee: number; statut: string };

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
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = setControlledOpen || setUncontrolledOpen;

  const [hasFetched, setHasFetched] = useState(false);

  const [variables, setVariables] = useState({
    heures_supp: '0',
    indemnite_logement: '0',
    indemnite_transport: '0',
    sursalaire: '0',
    primes_caisse: '0',
    primes_salissure: '0',
    primes_cantine: '0',
    retenue_avance: '0',
    autres_retenues: '0'
  });


  useEffect(() => {
    if (open && !hasFetched) {
      const fetchData = async () => {
        try {
          const [resE, resP] = await Promise.all([
            fetch('/api/employes'),
            fetch('/api/periodes?statut=ouverte')
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

  const handleVarChange = (field: string, value: string) => {
    setVariables(prev => ({ ...prev, [field]: value }));
  };

  const parseVariables = () => ({
    heures_supp: parseFloat(variables.heures_supp) || 0,
    indemnite_logement: parseFloat(variables.indemnite_logement) || 0,
    indemnite_transport: parseFloat(variables.indemnite_transport) || 0,
    sursalaire: parseFloat(variables.sursalaire) || 0,
    primes_caisse: parseFloat(variables.primes_caisse) || 0,
    primes_salissure: parseFloat(variables.primes_salissure) || 0,
    primes_cantine: parseFloat(variables.primes_cantine) || 0,
    retenue_avance: parseFloat(variables.retenue_avance) || 0,
    autres_retenues: parseFloat(variables.autres_retenues) || 0,
  });

  const onSave = async () => {
    if (!employeId || !periodeId) {
      toast.error('Veuillez sélectionner un employé et une période');
      return;
    }
    
    try {
      setSaving(true);
      
      // 1. Calculer
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
      router.refresh(); // Update the datatable in the background
    } catch (err: any) {
      toast.error(err.message || 'Erreur inattendue');
    } finally {
      setSaving(false);
    }
  };

  // Build items for Base UI Select (items prop requires {label, value} objects)
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

  return (
    <Drawer showSwipeHandle={isMobile} swipeDirection={swipeDirection} open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DrawerTrigger render={trigger || <Button>Nouveau Bulletin</Button>} />
      )}
      <DrawerContent className={!isMobile ? "right-0 left-auto top-0 bottom-0 mt-0 w-[600px] sm:w-[800px] rounded-l-xl rounded-r-none" : ""}>
        <DrawerHeader>
          <DrawerTitle>Générer un bulletin</DrawerTitle>
          <DrawerDescription>
            Sélectionnez l&apos;employé et la période pour calculer la paie
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Période + Employé */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Période de Paie</Label>
              <Select
                items={periodeItems}
                value={periodeId}
                onValueChange={(v) => setPeriodeId(v ?? '')}
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
                onValueChange={(v) => setEmployeId(v ?? '')}
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

          {/* Éléments variables */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Éléments Variables</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'heures_supp', label: 'Heures Supplémentaires' },
                { key: 'sursalaire', label: 'Sursalaire' },
                { key: 'indemnite_logement', label: 'Ind. Logement' },
                { key: 'indemnite_transport', label: 'Ind. Transport' },
                { key: 'primes_caisse', label: 'Primes de Caisse' },
                { key: 'primes_salissure', label: 'Primes de Salissure' },
                { key: 'primes_cantine', label: 'Primes de Cantine' },
                { key: 'retenue_avance', label: 'Avance sur Salaire' },
                { key: 'autres_retenues', label: 'Autres Retenues' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    value={variables[key as keyof typeof variables]}
                    onChange={e => handleVarChange(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DrawerFooter className="flex flex-row justify-end gap-3 pt-4 border-t">
          <DrawerClose render={<Button variant="outline">Annuler</Button>} />
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Création en cours...' : 'Générer et enregistrer'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
