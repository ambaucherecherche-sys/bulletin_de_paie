'use client';

import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

interface ExportButtonsProps {
  endpoint: string; // ex: '/api/rapports/journal-paie'
  params: Record<string, any>; // ex: { mois: 5, annee: 2026 }
  disabled?: boolean;
}

export function ExportButtons({ endpoint, params, disabled }: ExportButtonsProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'pdf') setLoadingPdf(true);
    if (format === 'excel') setLoadingExcel(true);

    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
      });
      searchParams.append('format', format);

      const url = `${endpoint}?${searchParams.toString()}`;
      
      // Téléchargement direct (le navigateur gérera le Content-Disposition)
      window.location.href = url;
      
    } catch (err) {
      toast.add({
        title: "Erreur",
        description: "Impossible de lancer l'exportation.",
        type: "error",
      });
    } finally {
      // Un petit délai car window.location.href ne renvoie pas de promise
      setTimeout(() => {
        setLoadingPdf(false);
        setLoadingExcel(false);
      }, 1000);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loadingExcel}
        onClick={() => handleExport('excel')}
      >
        <FileSpreadsheet className="mr-2 size-4 text-green-600" />
        {loadingExcel ? 'Export...' : 'Excel'}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || loadingPdf}
        onClick={() => handleExport('pdf')}
      >
        <FileText className="mr-2 size-4 text-red-500" />
        {loadingPdf ? 'Export...' : 'PDF'}
      </Button>
    </div>
  );
}
