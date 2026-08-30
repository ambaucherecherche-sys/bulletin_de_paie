'use client';

import Link from 'next/link';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, UserRoundX } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// ─── helpers ──────────────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-base">{title}</h2>
      <dl className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{children}</dl>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-TG').format(n);
}

// ─── types ────────────────────────────────────────────────────────────────────

export interface EmployeDetailData {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  poste: string | null;
  departement: string | null;
  classement: string | null;
  actif: number;
  date_naissance: string | null;
  date_entree: string;
  situation_matrimoniale: string | null;
  nb_personnes_charge: number | null;
  salaire_base: number;
  salaire_categoriel: number;
  nif: string | null;
  numero_cnss: string | null;
  numero_compte: string | null;
  etablissement_financier: string | null;
}

interface Props {
  employe: EmployeDetailData;
  canEdit: boolean;
  employeId: string;
}

// ─── component ────────────────────────────────────────────────────────────────

export function EmployeDetailView({ employe, canEdit, employeId }: Props) {
  const dateEntree = new Date(employe.date_entree);
  const now = new Date();
  const annees = differenceInYears(now, dateEntree);
  const mois = differenceInMonths(now, dateEntree) % 12;
  const taux = annees < 2 ? 0 : Math.min(annees, 25);
  const primeAnciennete = Math.round(Number(employe.salaire_categoriel) * taux / 100);
  const initials = `${employe.nom[0]}${employe.prenom[0]}`.toUpperCase();

  return (
    <div className="flex flex-col gap-4 py-2">

      {/* Breadcrumb */}
      <Breadcrumb className="px-4">
        <BreadcrumbList>
          <BreadcrumbItem><span>Dashboard</span></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link href="/dashboard/employes" className="hover:text-foreground transition-colors">
              Employés
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{employe.nom} {employe.prenom}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-5 px-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-16 sm:size-20 shrink-0">
            <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <h1 className="truncate font-semibold text-xl tracking-tight sm:text-2xl">
                {employe.nom} {employe.prenom}
              </h1>
              <p className="truncate text-muted-foreground text-sm">
                {employe.matricule}{employe.poste ? ` · ${employe.poste}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={employe.actif ? 'default' : 'secondary'} className="rounded-sm">
                {employe.actif ? 'Actif' : 'Inactif'}
              </Badge>
              {employe.departement && (
                <Badge variant="outline" className="rounded-sm">{employe.departement}</Badge>
              )}
              {employe.classement && (
                <Badge variant="outline" className="rounded-sm">{employe.classement}</Badge>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              render={<Link href={`/dashboard/employes/${employeId}/modifier`} />}
              nativeButton={false}
            >
              <Pencil data-icon="inline-start" />
              Modifier
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button aria-label="Plus d'actions" size="sm" variant="outline" />}>
                •••
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive">
                    <UserRoundX />
                    Désactiver
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs className="min-h-0 flex-1 gap-0" defaultValue="apercu">
        <div className="scrollbar-none touch-pan-x overflow-x-auto overscroll-x-contain border-y">
          <TabsList
            className="w-max min-w-full justify-start gap-4 px-4 *:data-[slot=tabs-trigger]:flex-none"
            variant="line"
          >
            <TabsTrigger value="apercu">Aperçu</TabsTrigger>
            <TabsTrigger value="personnel">Personnel</TabsTrigger>
            <TabsTrigger value="emploi">Emploi & Ancienneté</TabsTrigger>
            <TabsTrigger value="remuneration">Rémunération</TabsTrigger>
            <TabsTrigger value="legal">Informations légales</TabsTrigger>
          </TabsList>
        </div>

        <div className="px-4 md:px-6">

          {/* Aperçu */}
          <TabsContent value="apercu" className="py-6">
            <dl className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <InfoField label="Matricule" value={employe.matricule} />
              <InfoField label="Poste" value={employe.poste} />
              <InfoField label="Département" value={employe.departement} />
              <InfoField label="Date d'entrée" value={format(dateEntree, 'dd MMMM yyyy', { locale: fr })} />
              <InfoField
                label="Ancienneté"
                value={`${annees} an${annees > 1 ? 's' : ''}${mois > 0 ? ` et ${mois} mois` : ''}`}
              />
              <InfoField label="Salaire de base" value={`${fmt(Number(employe.salaire_base))} FCFA`} />
            </dl>
          </TabsContent>

          {/* Personnel */}
          <TabsContent value="personnel" className="py-6">
            <Section title="Informations personnelles">
              <InfoField label="Nom complet" value={`${employe.nom} ${employe.prenom}`} />
              <InfoField
                label="Date de naissance"
                value={employe.date_naissance
                  ? format(new Date(employe.date_naissance), 'dd MMMM yyyy', { locale: fr })
                  : null}
              />
              <InfoField label="Situation matrimoniale" value={employe.situation_matrimoniale} />
              <InfoField label="Personnes à charge" value={employe.nb_personnes_charge} />
            </Section>
          </TabsContent>

          {/* Emploi */}
          <TabsContent value="emploi" className="py-6 flex flex-col gap-6">
            <Section title="Poste & Organisation">
              <InfoField label="Poste" value={employe.poste} />
              <InfoField label="Département" value={employe.departement} />
              <InfoField label="Classement" value={employe.classement} />
            </Section>
            <Separator />
            <Section title="Ancienneté">
              <InfoField label="Date d'entrée" value={format(dateEntree, 'dd MMMM yyyy', { locale: fr })} />
              <InfoField
                label="Durée"
                value={`${annees} an${annees > 1 ? 's' : ''}${mois > 0 ? ` et ${mois} mois` : ''}`}
              />
              <InfoField label="Taux ancienneté" value={`${taux}%`} />
              <InfoField label="Prime ancienneté (PA02)" value={`${fmt(primeAnciennete)} FCFA`} />
            </Section>
          </TabsContent>

          {/* Rémunération */}
          <TabsContent value="remuneration" className="py-6">
            <Section title="Salaires contractuels">
              <InfoField label="Salaire de base (SB01)" value={`${fmt(Number(employe.salaire_base))} FCFA`} />
              <InfoField label="Salaire catégoriel" value={`${fmt(Number(employe.salaire_categoriel))} FCFA`} />
            </Section>
          </TabsContent>

          {/* Légal */}
          <TabsContent value="legal" className="py-6">
            <Section title="Informations légales & Bancaires">
              <InfoField label="NIF" value={employe.nif} />
              <InfoField label="Numéro CNSS" value={employe.numero_cnss} />
              <InfoField label="Numéro de compte" value={employe.numero_compte} />
              <InfoField label="Établissement financier" value={employe.etablissement_financier} />
            </Section>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
