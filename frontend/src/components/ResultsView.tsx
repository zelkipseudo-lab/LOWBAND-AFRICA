import React, { useState } from "react";
import {
  RotateCcw,
  Copy,
  Check,
  Calendar,
  Clock,
  Wifi,
  Download,
  ArrowLeft,
} from "lucide-react";
import type { AnalysisReport } from "../types/api";
import { PROFILE_LABELS } from "../constants/profiles";
import { formatDate, formatDuration } from "../utils/format";
import { generateAnalysisPdf } from "../utils/pdfReport";
import { ScoreCard } from "./ScoreCard";
import { MetricsGrid } from "./MetricsGrid";
import { ResourceDistribution } from "./ResourceDistribution";
import { RecommendationsList } from "./RecommendationsList";
import { WarningsList } from "./WarningsList";

interface ResultsViewProps {
  report: AnalysisReport;
  onReset: () => void;
  onBack?: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  report,
  onReset,
  onBack,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      generateAnalysisPdf(report);
    } finally {
      setTimeout(() => setIsExporting(false), 1200);
    }
  };

  const copySummary = async () => {
    const summary = [
      `RAPPORT D'ANALYSE TECHNIQUE — LOWBAND AFRICA`,
      `Identifiant unique : ${report.analysisId}`,
      `URL cible : ${report.url}`,
      `Profil réseau simulé : ${PROFILE_LABELS[report.profile]}`,
      `Date d'exécution : ${report.startedAt}`,
      `Durée totale de la session : ${formatDuration(report.durationMs)}`,
      `Africa Ready Score : ${report.score.value !== null ? report.score.value : "Indisponible"} / 100 (${report.score.label})`,
      `Sous-scores :`,
      `- Performance (30 %) : ${report.score.components.performance !== null ? Math.round(report.score.components.performance) : "Indisponible"}`,
      `- Efficacité des données (30 %) : ${report.score.components.dataEfficiency !== null ? Math.round(report.score.components.dataEfficiency) : "Indisponible"}`,
      `- Optimisation des ressources (20 %) : ${report.score.components.resourceOptimization !== null ? Math.round(report.score.components.resourceOptimization) : "Indisponible"}`,
      `- Résilience observée (20 %) : ${report.score.components.resilience !== null ? Math.round(report.score.components.resilience) : "Indisponible"}`,
      `Poids disponible effectif : ${Math.round(report.score.availableWeight * 100)} %`,
      `Recommandations calculées (${report.recommendations.length}) :`,
      ...report.recommendations.map((r) => `- [${r.code}] ${r.message}`),
      `Avertissements (${report.warnings.length}) :`,
      ...report.warnings.map((w) => `- ${w}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Results Hero Bar */}
      <div className="bg-ink text-on-ink rounded-2xl p-6 sm:p-8 border border-outline/30 shadow-panel space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-on-ink/15 pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-accent text-ink tracking-wide">
                AUDIT DE LABORATOIRE RÉUSSI
              </span>
              <span className="text-xs font-mono text-on-ink/60">
                ID : {report.analysisId}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight break-all text-on-ink">
              {report.url}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-accent text-ink hover:bg-accent-strong transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-75"
              aria-label="Télécharger le rapport officiel au format PDF"
            >
              <Download className="w-4 h-4 text-ink" />
              <span>{isExporting ? "Génération du PDF..." : "Télécharger le rapport PDF"}</span>
            </button>

            <button
              onClick={copySummary}
              className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-on-ink/30 text-on-ink hover:border-accent hover:text-accent-on-ink hover:bg-surface-raised/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-accent-on-ink" />
                  <span>Rapport copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-accent-on-ink" />
                  <span>Copier le texte</span>
                </>
              )}
            </button>

            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-on-ink/30 text-on-ink hover:border-accent hover:text-accent-on-ink hover:bg-surface-raised/10 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-accent-on-ink" />
                <span>Retour historique</span>
              </button>
            )}

            <button
              onClick={onReset}
              className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-on-ink/20 text-on-ink/80 hover:text-on-ink hover:border-on-ink/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Nouvel audit</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metatags */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono text-xs">
          <div className="flex items-center gap-3 bg-surface-raised/10 border border-on-ink/15 p-3.5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-surface-raised/20 border border-on-ink/20 flex items-center justify-center text-accent-on-ink shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <span className="text-on-ink/60 block text-[11px]">Profil simulé :</span>
              <span className="text-on-ink font-bold">{PROFILE_LABELS[report.profile]}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface-raised/10 border border-on-ink/15 p-3.5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-surface-raised/20 border border-on-ink/20 flex items-center justify-center text-accent-on-ink shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-on-ink/60 block text-[11px]">Date et heure :</span>
              <span className="text-on-ink font-bold">{formatDate(report.startedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface-raised/10 border border-on-ink/15 p-3.5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-surface-raised/20 border border-on-ink/20 flex items-center justify-center text-accent-on-ink shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-on-ink/60 block text-[11px]">Durée totale :</span>
              <span className="text-on-ink font-bold">{formatDuration(report.durationMs)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Score Card */}
      <ScoreCard score={report.score} />

      {/* Real Performance Metrics Grid */}
      <MetricsGrid metrics={report.metrics} />

      {/* Resource & Bandwidth Distribution */}
      <ResourceDistribution
        resources={report.metrics.resources}
        totalBytes={report.metrics.transferBytes}
      />

      {/* Deterministic Optimization Recommendations */}
      <RecommendationsList recommendations={report.recommendations} />

      {/* Audit Warnings & Limits */}
      <WarningsList warnings={report.warnings} />

      {/* Bottom CTA */}
      <div className="flex flex-wrap justify-center items-center gap-4 pt-4 pb-8">
        <button
          onClick={handleDownloadPdf}
          disabled={isExporting}
          className="px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-accent text-ink hover:bg-accent-strong transition-all duration-180 flex items-center gap-2.5 shadow-soft cursor-pointer disabled:opacity-75"
        >
          <Download className="w-4 h-4 text-ink" />
          <span>{isExporting ? "Génération du PDF..." : "Télécharger le rapport PDF"}</span>
        </button>

        <button
          onClick={onReset}
          className="px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-wider border border-outline/40 bg-surface text-foreground hover:bg-surface-raised transition-all duration-180 flex items-center gap-2.5 shadow-sm cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Tester un autre site ou un autre profil</span>
        </button>
      </div>
    </div>
  );
};
