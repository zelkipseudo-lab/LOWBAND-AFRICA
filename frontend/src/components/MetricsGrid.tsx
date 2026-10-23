import React from "react";
import {
  Clock,
  Eye,
  Zap,
  Files,
  XCircle,
  Database,
  Info,
} from "lucide-react";
import type { EngineMetrics } from "../types/api";
import { formatBytes, formatDuration } from "../utils/format";

interface MetricsGridProps {
  metrics: EngineMetrics;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const metricCards = [
    {
      title: "Durée de navigation",
      value: formatDuration(metrics.navigationMs),
      subtext: "Jusqu'à l'événement 'load' du DOM",
      benchmark: "Seuil idéal < 10 s",
      icon: Clock,
      available: metrics.navigationMs !== null,
    },
    {
      title: "First Contentful Paint (FCP)",
      value: formatDuration(metrics.fcpMs),
      subtext: "Premier pixel significatif affiché",
      benchmark: "Seuil idéal < 5 s",
      icon: Eye,
      available: metrics.fcpMs !== null,
    },
    {
      title: "Largest Contentful Paint (LCP)",
      value: formatDuration(metrics.lcpMs),
      subtext: "Rendu du bloc principal de la page",
      benchmark: "Fenêtre d'observation 2 s",
      icon: Zap,
      available: metrics.lcpMs !== null,
    },
    {
      title: "Volume réseau transféré",
      value: formatBytes(metrics.transferBytes),
      subtext: "Octets encodés observés sur le fil",
      benchmark: "Budget cible < 2 Mo",
      icon: Database,
      available: metrics.transferBytes !== null,
    },
    {
      title: "Requêtes réseau observées",
      value: metrics.requestCount.toString(),
      subtext: "Ressources uniques contactées",
      benchmark: "Pénalité RTT si > 60",
      icon: Files,
      available: true,
    },
    {
      title: "Requêtes en échec / rejetées",
      value: `${metrics.failedRequests} ${
        metrics.requestCount > 0
          ? `(${Math.round((metrics.failedRequests / metrics.requestCount) * 100)} %)`
          : ""
      }`,
      subtext: "Erreurs réseau ou codes HTTP 4xx/5xx",
      benchmark: "Tolérance zéro recommandée",
      icon: XCircle,
      available: true,
    },
  ];

  return (
    <div className="bg-surface border border-outline/30 rounded-2xl p-6 sm:p-8 shadow-soft space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-outline/20 pb-4">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-on-ink bg-ink px-2.5 py-0.5 rounded-md inline-block mb-1 border border-outline/30">
            Métriques d'exécution
          </div>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">
            Performances et consommation réseau
          </h3>
          <p className="text-xs text-muted">
            Mesures directes issues des API CDP et Navigation Timing de Chromium
          </p>
        </div>
        <span className="text-xs font-mono text-muted border border-outline/30 px-3 py-1 rounded-full bg-surface-raised">
          Émulation matérielle active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="p-5 border border-outline/30 rounded-xl bg-surface-raised/30 space-y-3 hover:border-accent/60 hover:bg-surface transition-all duration-180 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground/80 font-sans">{m.title}</span>
                <div className="w-7 h-7 rounded-lg border border-outline/30 bg-surface flex items-center justify-center text-accent shadow-sm">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="py-0.5">
                <div
                  className={`font-mono text-2xl font-black ${
                    m.available ? "text-foreground" : "text-muted italic text-base font-normal"
                  }`}
                >
                  {m.value}
                </div>
                <div className="text-[11px] font-mono text-muted pt-0.5">
                  {m.benchmark}
                </div>
              </div>

              <div className="text-[11px] text-muted border-t border-outline/20 pt-2 flex items-center gap-1.5">
                <Info className="w-3 h-3 text-accent shrink-0" />
                <span className="truncate">{m.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
