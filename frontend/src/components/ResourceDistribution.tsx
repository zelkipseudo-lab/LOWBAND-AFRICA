import React from "react";
import { FileCode, Palette, Image as ImageIcon, Type, Box } from "lucide-react";
import type { ResourceDistribution as ResourceDistType } from "../types/api";
import { formatBytes, formatPercent } from "../utils/format";

interface ResourceDistributionProps {
  resources: ResourceDistType;
  totalBytes: number | null;
}

export const ResourceDistribution: React.FC<ResourceDistributionProps> = ({
  resources,
  totalBytes,
}) => {
  const items = [
    {
      label: "Images & Médias graphiques",
      shortLabel: "Images",
      bytes: resources.imageBytes,
      icon: ImageIcon,
      description: "Fichiers matriciels et vectoriels (WebP, PNG, JPG, SVG)",
      barClass: "bg-accent",
    },
    {
      label: "Scripts JavaScript",
      shortLabel: "JavaScript",
      bytes: resources.javascriptBytes,
      icon: FileCode,
      description: "Code exécutable client, bibliothèques et scripts tiers",
      barClass: "bg-muted",
    },
    {
      label: "Feuilles de style (CSS)",
      shortLabel: "CSS",
      bytes: resources.cssBytes,
      icon: Palette,
      description: "Règles d'affichage, thèmes et mise en page",
      barClass: "bg-accent-soft",
    },
    {
      label: "Polices de caractères",
      shortLabel: "Polices",
      bytes: resources.fontBytes,
      icon: Type,
      description: "Fichiers typographiques web téléchargeables (WOFF2, TTF)",
      barClass: "bg-surface-raised border-l border-outline/60",
    },
    {
      label: "Autres ressources",
      shortLabel: "Autres",
      bytes: resources.otherBytes,
      icon: Box,
      description: "Document HTML initial, requêtes XHR/Fetch, flux multimédias",
      barClass: "bg-outline border-l border-outline/60",
    },
  ];

  const validTotal = totalBytes !== null && totalBytes > 0 ? totalBytes : null;

  return (
    <div className="bg-surface border border-outline/30 rounded-2xl p-6 sm:p-8 shadow-soft space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-outline/20 pb-4">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-on-ink bg-ink px-2.5 py-0.5 rounded-md inline-block mb-1 border border-outline/30">
            Ventilation des transferts
          </div>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">
            Répartition de la bande passante consommée
          </h3>
          <p className="text-xs text-muted">
            Détail des octets réseau encodés observés par famille de contenu
          </p>
        </div>
        <div className="text-xs font-mono text-foreground font-bold border border-outline/30 px-3.5 py-1.5 rounded-xl bg-surface-raised">
          Total observé : <span className="text-accent font-bold">{formatBytes(totalBytes)}</span>
        </div>
      </div>

      {/* Proportional Segment Bar */}
      {validTotal && (
        <div className="space-y-2">
          <div className="h-4 w-full rounded-lg border border-outline/30 overflow-hidden flex bg-surface-raised shadow-inner">
            {items.map((item) => {
              if (item.bytes === null || item.bytes <= 0) return null;
              const share = (item.bytes / validTotal) * 100;

              return (
                <div
                  key={item.label}
                  style={{ width: `${share}%` }}
                  title={`${item.shortLabel} : ${formatBytes(item.bytes)} (${Math.round(share)} %)`}
                  className={`${item.barClass} h-full transition-all duration-500`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted">
            <span>0 %</span>
            <span>Répartition cumulée sur le volume total observé</span>
            <span>100 %</span>
          </div>
        </div>
      )}

      {/* Table Breakdown */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-outline/30 text-foreground uppercase text-[11px] tracking-wider">
              <th className="py-2.5 font-bold">Catégorie</th>
              <th className="py-2.5 font-bold text-right">Volume transféré</th>
              <th className="py-2.5 font-bold text-right">Part du total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline/15 text-foreground font-sans">
            {items.map((item) => {
              const Icon = item.icon;
              const share =
                validTotal && item.bytes !== null
                  ? item.bytes / validTotal
                  : null;

              return (
                <tr key={item.label} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg border border-outline/30 bg-surface flex items-center justify-center text-accent shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-foreground block text-xs">
                          {item.label}
                        </span>
                        <span className="text-[11px] text-muted block font-normal">
                          {item.description}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold text-foreground text-xs">
                    {formatBytes(item.bytes)}
                  </td>
                  <td className="py-3.5 text-right font-mono text-foreground text-xs">
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-surface-raised border border-outline/30 font-bold">
                      {formatPercent(share)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-muted border-t border-outline/20 pt-3">
        <strong className="text-foreground">Règle de traçabilité :</strong> La somme correspond exclusivement aux réponses réseau entièrement terminées avec succès. Les octets de requêtes annulées ou interrompues sont exclus pour ne pas fausser le décompte réel.
      </div>
    </div>
  );
};
