'use client';

import * as React from "react"
import { Users, FileText, Activity, Wallet } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorShapeProps } from "recharts/types/polar/Pie"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartStyle,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface DashboardData {
  nb_employes_actifs: number;
  masse_salariale_mois: number;
  nb_bulletins_valides: number;
  total_cnss_mois: number;
  total_amu_mois: number;
  evolution_3_mois: { mois: number; annee: number; total_brut: number }[];
  gains_vs_retenues: { total_gains: number; total_retenues: number };
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-TG').format(n);
}

const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function DashboardClient({ data }: { data: DashboardData }) {
  // ── Préparation BarChart ───────────────────────────────────────────────────
  const chartDataBar = data.evolution_3_mois.map(m => ({
    date: `${MOIS_NOMS[m.mois - 1]} ${m.annee}`,
    brut: m.total_brut
  }));

  const chartConfigBar = {
    views: { label: "Montant (FCFA)" },
    brut: { label: "Masse Salariale", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const totalBrut3Mois = chartDataBar.reduce((acc, curr) => acc + curr.brut, 0);

  // ── Préparation PieChart ───────────────────────────────────────────────────
  const pieData = [
    { category: "gains", amount: data.gains_vs_retenues.total_gains, fill: "var(--chart-2)" },
    { category: "retenues", amount: data.gains_vs_retenues.total_retenues, fill: "var(--chart-5)" },
  ];

  const chartConfigPie = {
    amount: { label: "Montant" },
    gains: { label: "Gains Bruts", color: "var(--chart-2)" },
    retenues: { label: "Retenues Légales", color: "var(--chart-5)" },
  } satisfies ChartConfig;

  const idPie = "pie-interactive";
  const [activeCategory, setActiveCategory] = React.useState(pieData[0]?.category || 'gains');
  
  const activeIndex = React.useMemo(() => pieData.findIndex(item => item.category === activeCategory), [activeCategory]);
  
  const renderPieShape = React.useCallback(
    ({ index, outerRadius = 0, ...props }: PieSectorShapeProps) => {
      if (index === activeIndex) {
        return (
          <g>
            <Sector {...props} outerRadius={outerRadius + 10} />
            <Sector {...props} outerRadius={outerRadius + 25} innerRadius={outerRadius + 12} />
          </g>
        )
      }
      return <Sector {...props} outerRadius={outerRadius} />
    },
    [activeIndex]
  );

  return (
    <div className="flex flex-col gap-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Aperçu de la paie, effectifs et cotisations pour la dernière période active.</p>
        </div>
      </div>

      {/* KPI CARDS (Standard Shadcn) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employés Actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.nb_employes_actifs}</div>
            <p className="text-xs text-muted-foreground">Dans la base de données</p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Masse Salariale</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(data.masse_salariale_mois)}</div>
            <p className="text-xs text-muted-foreground">FCFA (Dernière période)</p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotisations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{fmt(data.total_cnss_mois + data.total_amu_mois)}</div>
            <p className="text-xs text-muted-foreground">CNSS + AMU (Dernière période)</p>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulletins Validés</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.nb_bulletins_valides}</div>
            <p className="text-xs text-muted-foreground">Dernière période</p>
          </CardContent>
        </Card>

      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BAR CHART */}
        <Card className="py-0 flex flex-col shadow-none">
          <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!">
              <CardTitle>Évolution de la masse salariale</CardTitle>
              <CardDescription>Les 3 derniers mois (brut)</CardDescription>
            </div>
            <div className="flex">
              <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
                <span className="text-xs text-muted-foreground">
                  Masse Salariale
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {fmt(totalBrut3Mois)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <ChartContainer config={chartConfigBar} className="aspect-auto h-[250px] w-full">
              <BarChart accessibilityLayer data={chartDataBar} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[200px]"
                      nameKey="views"
                      labelFormatter={(val: any) => val}
                    />
                  }
                />
                <Bar dataKey="brut" fill="var(--color-brut)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* PIE CHART */}
        <Card data-chart={idPie} className="flex flex-col shadow-none">
          <ChartStyle id={idPie} config={chartConfigPie} />
          <CardHeader className="flex-row items-start space-y-0 pb-0">
            <div className="grid gap-1">
              <CardTitle>Gains vs Retenues</CardTitle>
              <CardDescription>Répartition sur l'année en cours</CardDescription>
            </div>
            <Select value={activeCategory} onValueChange={(val) => { if(val) setActiveCategory(val) }}>
              <SelectTrigger
                className="ml-auto h-7 w-[150px] rounded-lg pl-2.5"
                aria-label="Select a value"
              >
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl">
                {pieData.map((item) => {
                  const config = chartConfigPie[item.category as keyof typeof chartConfigPie];
                  if (!config) return null;
                  return (
                    <SelectItem
                      key={item.category}
                      value={item.category}
                      className="rounded-lg [&_span]:flex"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="flex h-3 w-3 shrink-0 rounded-xs"
                          style={{
                            backgroundColor: `var(--color-${item.category})`,
                          }}
                        />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="flex flex-1 justify-center pb-0">
            <ChartContainer id={idPie} config={chartConfigPie} className="mx-auto aspect-square w-full max-w-[280px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={60}
                  strokeWidth={5}
                  shape={renderPieShape}
                >
                  <Label
                    content={({ viewBox }: { viewBox?: any }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                              {fmt(pieData[activeIndex]?.amount || 0)}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                              {chartConfigPie[activeCategory as keyof typeof chartConfigPie]?.label}
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
