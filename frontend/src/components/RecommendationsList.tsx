import React from "react";
import { CheckCircle2, ChevronRight, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import type { Recommendation } from "../types/api";
import { formatPercent } from "../utils/format";

interface RecommendationsListProps {
  recommendations: Recommendation[];
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
}) => {
  const formatEvidence = (evidence: Record<string, number>): string => {
    return Object.entries(evidence)
      .map(([key, val]) => {
        if (key.toLowerCase().includes("share")) {
          return `${key} : ${formatPercent(val)}`;
        }
        return `${key} : ${val}`;
      })
      .join(" · ");
  };

  const getCodeMeta = (code: string) => {
    switch (code) {
      case "REVIEW_IMAGES":
        return {
          title: "Allègement et compression des visuels",
          advice:
            "Convertissez vos images vers des formats modernes (WebP ou AVIF), activez l'attribut natif loading='lazy' et adaptez les résolutions avec srcset pour ne pas surcharger les écrans mobiles.",
          impact: "Économie directe de mégaoctets pour l'usager prépayé",
        };
      case "REVIEW_JAVASCRIPT":
        return {
          title: "Rationalisation du code JavaScript",
          advice:
            "Appliquez le fractionnement de code (code-splitting), éliminez les dépendances mortes (tree-shaking) et différez l'exécution des scripts secondaires (defer/async) pour libérer le fil d'exécution principal.",
          impact: "Accélération du rendu visuel et économie de CPU mobile",
        };
      case "REDUCE_REQUESTS":
        return {
          title: "Réduction des allers-retours réseau (RTT)",
          advice:
            "Sous 150 ms à 400 ms de latence, chaque requête supplémentaire dégrade fortement le temps de chargement. Regroupez les ressources critiques, activez HTTP/2 ou HTTP/3 et intégrez les styles critiques en ligne.",
          impact: "Réduction massive du délai d'attente réseau cumulé",
        };
      case "INVESTIGATE_FAILED_REQUESTS":
        return {
          title: "Correction des requêtes en erreur ou bloquées",
          advice:
            "Identifiez les liens morts (404), les erreurs de scripts (500) et les trackers tiers qui bloquent des créneaux de connexion précieux sous connectivité restreinte.",
          impact: "Amélioration de la résilience globale du site",
        };
      default:
        return {
          title: "Optimisation des ressources ciblées",
          advice:
            "Réduisez l'empreinte réseau globale de la page pour améliorer l'accessibilité sur connexion lente.",
          impact: "Gain de bande passante",
        };
    }
  };

  return (
    <div className="bg-surface border border-outline/30 rounded-2xl p-6 sm:p-8 shadow-soft space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-outline/20 pb-4">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent-on-ink bg-ink px-2.5 py-0.5 rounded-md inline-block mb-1 border border-outline/30">
            Recommandations déterministes
          </div>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">
            Pistes d'allègement prioritaires
          </h3>
          <p className="text-xs text-muted">
            Conseils générés sur la base des seuils documentés dans la méthodologie v1.0
          </p>
        </div>
        <span className="text-xs font-mono text-foreground font-bold border border-outline/30 px-3 py-1 rounded-full bg-surface-raised">
          {recommendations.length} action(s) requise(s)
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className="p-6 rounded-xl border border-outline/30 bg-surface-raised/40 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl border border-accent/40 bg-surface flex items-center justify-center text-accent shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">
              Excellente sobriété observée · Aucun dépassement de seuil
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              La page respecte l'ensemble des seuils conventionnels de la méthodologie v1.0 :
              répartition saine du poids, volume de requêtes modéré et absence d'anomalies de transfert notables.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const meta = getCodeMeta(rec.code);
            return (
              <div
                key={index}
                className="p-5 border border-outline/30 rounded-xl hover:border-accent/60 hover:shadow-soft transition-all duration-180 space-y-3 bg-surface"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-ink text-accent-on-ink flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground bg-surface-raised px-2.5 py-0.5 rounded border border-outline/30">
                      {rec.code}
                    </span>
                    <span className="text-xs font-bold text-foreground hidden sm:inline">
                      · {meta.title}
                    </span>
                  </div>

                  {rec.evidence && Object.keys(rec.evidence).length > 0 && (
                    <div className="font-mono text-xs font-semibold text-foreground bg-surface-raised border border-outline/30 px-2.5 py-1 rounded-lg">
                      Preuve : <span className="text-accent font-bold">{formatEvidence(rec.evidence)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-0.5">
                  <h4 className="text-sm font-extrabold text-foreground leading-snug">
                    {rec.message}
                  </h4>
                  <p className="text-xs text-foreground/85 leading-relaxed flex items-start gap-2 bg-surface-raised/40 p-3 rounded-lg border border-outline/20">
                    <ChevronRight className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span>{meta.advice}</span>
                  </p>
                  <div className="text-[11px] font-mono text-muted flex items-center gap-1.5 pt-0.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-accent" />
                    <span>Impact attendu : {meta.impact}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[11px] text-muted border-t border-outline/20 pt-3 flex items-center gap-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>
          Les recommandations sont déduites des observations réelles et ne promettent aucun gain théorique non mesuré.
        </span>
      </div>
    </div>
  );
};
