import React from "react";
import { Award, HelpCircle } from "lucide-react";
import type { AnalysisScore, ScoreLabel } from "../types/api";

interface ScoreCardProps {
  score: AnalysisScore;
}

const SCORE_LABELS_FR: Record<
  ScoreLabel,
  { label: string; description: string; detail: string }
> = {
  excellent: {
    label: "Excellent",
    description: "Site hautement optimisé pour les conditions réseau restreintes.",
    detail: "Consommation de données très maîtrisée et temps de rendu adapté aux forfaits prépayés.",
  },
  acceptable: {
    label: "Acceptable",
    description: "Performances correctes avec des marges d'allègement identifiées.",
    detail: "La page se charge de manière satisfaisante mais gagnerait à optimiser ses ressources lourdes.",
  },
  needs_improvement: {
    label: "À améliorer",
    description: "Poids important ou lenteur notable pénalisant l'expérience mobile.",
    detail: "Le volume de transfert ou le nombre de requêtes engendre des délais perceptibles sur réseau lent.",
  },
  poor: {
    label: "Faible",
    description: "Site très lourd ou instable sous contraintes de connectivité.",
    detail: "Consommation excessive de mégaoctets ou risque élevé d'abandon sur connexion 2G/3G.",
  },
  incomplete: {
    label: "Données incomplètes",
    description: "Mesures insuffisantes pour établir un score global consolidé.",
    detail: "Moins de deux composantes calculables ou poids disponible inférieur au seuil de 50 %.",
  },
};

export const ScoreCard: React.FC<ScoreCardProps> = ({ score }) => {
  const meta = SCORE_LABELS_FR[score.label] || SCORE_LABELS_FR.incomplete;

  const componentItems = [
    {
      key: "performance",
      name: "Performance de chargement",
      weight: "Poids 30 %",
      value: score.components.performance,
      threshold: "Seuil navigation 10 s · FCP 5 s",
      desc: "Durée de navigation (load) et métriques de premier affichage visuel (FCP / LCP).",
    },
    {
      key: "dataEfficiency",
      name: "Efficacité des données",
      weight: "Poids 30 %",
      value: score.components.dataEfficiency,
      threshold: "Budget cible 2 Mo",
      desc: "Volume total d'octets transférés comparé au budget cible d'accessibilité économique.",
    },
    {
      key: "resourceOptimization",
      name: "Optimisation des ressources",
      weight: "Poids 20 %",
      value: score.components.resourceOptimization,
      threshold: "Budget 1 Mo · Max 100 requêtes",
      desc: "Compromis entre volume global strict et nombre d'allers-retours réseau (RTT).",
    },
    {
      key: "resilience",
      name: "Résilience observée",
      weight: "Poids 20 %",
      value: score.components.resilience,
      threshold: "Tolérance échecs < 5 %",
      desc: "Proportion de requêtes réseau réussies sans échec ni code HTTP 4xx/5xx.",
    },
  ];

  // SVG Circular Gauge calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    score.value !== null
      ? circumference - (score.value / 100) * circumference
      : circumference;

  return (
    <div className="bg-surface border border-outline/30 rounded-2xl p-6 sm:p-8 shadow-soft space-y-6">
      {/* Top Section: Header & Global Score Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-b border-outline/20 pb-7">
        <div className="lg:col-span-7 space-y-2.5">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase text-foreground bg-surface-raised px-2.5 py-1 rounded-md border border-outline/30">
            <Award className="w-4 h-4 text-accent" />
            <span>Score de laboratoire · Méthodologie v{score.methodologyVersion}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Africa Ready Score
          </h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
            {meta.description} {meta.detail}
          </p>
          <div className="text-[11px] font-mono text-muted flex items-center gap-2 pt-1">
            <span>Poids effectif disponible : {Math.round(score.availableWeight * 100)} %</span>
            <span>·</span>
            <span>Renormalisation stricte sans zéros inventés</span>
          </div>
        </div>

        {/* Global Circular Score Display */}
        <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
          <div className="bg-ink text-on-ink p-5 rounded-2xl border border-outline/40 flex items-center gap-5 shadow-panel min-w-[280px]">
            {/* SVG Circular Progress Meter */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 128 128">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="rgb(var(--on-ink-rgb) / 0.15)"
                  strokeWidth="8"
                  fill="transparent"
                />
                {score.value !== null && (
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    stroke="var(--color-accent-on-ink)"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black font-mono text-on-ink tracking-tight">
                  {score.value !== null ? score.value : "—"}
                </span>
                <span className="text-[10px] font-mono text-on-ink/60 uppercase">/ 100</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-accent-on-ink">
                Évaluation
              </div>
              <div className="text-base font-extrabold text-on-ink">
                {meta.label}
              </div>
              <p className="text-[11px] text-on-ink/70 leading-tight">
                {score.value !== null ? "Note globale consolidée" : "Mesures incomplètes"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-scores Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold uppercase tracking-wider text-foreground">
            Décomposition des quatre piliers
          </span>
          <span className="text-muted">Échelle 0 à 100 par composante</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {componentItems.map((item) => (
            <div
              key={item.key}
              className="p-4 rounded-xl border border-outline/30 bg-surface-raised/40 space-y-2.5 hover:border-accent/60 hover:bg-surface transition-all duration-180"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-foreground block font-sans">
                    {item.name}
                  </span>
                  <span className="text-[11px] font-mono text-muted block">
                    {item.weight} · {item.threshold}
                  </span>
                </div>
                <div className="font-mono text-base font-extrabold text-foreground text-right">
                  {item.value !== null ? (
                    <span className="text-foreground">
                      {Math.round(item.value)}
                      <span className="text-xs text-muted font-normal">/100</span>
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-muted font-normal bg-surface px-2 py-0.5 rounded border border-outline/30">
                      Indisponible
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-outline/20">
                {item.value !== null ? (
                  <div
                    className="bg-accent h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, Math.min(100, item.value))}%` }}
                  />
                ) : (
                  <div className="bg-muted/20 h-full w-full" />
                )}
              </div>

              <p className="text-[11px] text-muted leading-relaxed font-sans">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[11px] text-muted bg-surface-raised/50 border border-outline/20 p-3.5 rounded-xl flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-foreground">Règle de rigueur méthodologique :</strong> Les sous-scores reposent exclusivement sur des observations directes. Une métrique indisponible n'est jamais remplacée par 0 et n'apporte aucun point artificiel.
        </p>
      </div>
    </div>
  );
};
