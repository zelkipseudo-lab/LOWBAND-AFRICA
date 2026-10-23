import React, { useEffect, useState, useCallback } from "react";
import {
  History as HistoryIcon,
  RefreshCw,
  Trash2,
  Download,
  AlertCircle,
  Wifi,
  Calendar,
  Clock,
  ArrowRight,
  Check,
  FileText,
} from "lucide-react";
import type {
  AnalysisReport,
  ApiErrorCode,
  HistorySummaryItem,
} from "../types/api";
import { fetchHistory, fetchHistoryDetail, deleteHistoryItem, ApiError } from "../api/client";
import { PROFILE_LABELS } from "../constants/profiles";
import { formatDate, formatDuration } from "../utils/format";
import { generateAnalysisPdf } from "../utils/pdfReport";

interface HistoryViewProps {
  onSelectReport: (report: AnalysisReport) => void;
  onNewAudit: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onSelectReport,
  onNewAudit,
}) => {
  const [items, setItems] = useState<HistorySummaryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<{ code: ApiErrorCode; message: string } | null>(null);

  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadHistory = useCallback(
    async (resetOffset = true) => {
      const currentOffset = resetOffset ? 0 : offset;
      if (resetOffset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const response = await fetchHistory(limit, currentOffset);
        if (resetOffset) {
          setItems(response.items);
          setOffset(response.items.length);
        } else {
          setItems((prev) => [...prev, ...response.items]);
          setOffset((prev) => prev + response.items.length);
        }
        setTotal(response.total);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setError({ code: err.code, message: err.message });
        } else {
          setError({
            code: "UNKNOWN_ERROR",
            message: "Impossible de charger l'historique des analyses.",
          });
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [limit, offset]
  );

  useEffect(() => {
    void loadHistory(true);
  }, []);

  const handleInspect = async (item: HistorySummaryItem) => {
    setLoadingDetailId(item.analysisId);
    try {
      const fullReport = await fetchHistoryDetail(item.analysisId);
      onSelectReport(fullReport);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showNotification(err.message);
      } else {
        showNotification("Impossible de charger les détails de cette analyse.");
      }
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleExportPdf = async (item: HistorySummaryItem) => {
    setExportingId(item.analysisId);
    try {
      const fullReport = await fetchHistoryDetail(item.analysisId);
      generateAnalysisPdf(fullReport);
      showNotification("Rapport PDF généré avec succès.");
    } catch {
      showNotification("Erreur lors de la génération du rapport PDF.");
    } finally {
      setExportingId(null);
    }
  };

  const handleDelete = async (analysisId: string) => {
    setIsDeleting(true);
    try {
      await deleteHistoryItem(analysisId);
      setItems((prev) => prev.filter((i) => i.analysisId !== analysisId));
      setTotal((prev) => Math.max(0, prev - 1));
      setConfirmDeleteId(null);
      showNotification("Analyse supprimée de l'historique.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showNotification(err.message);
      } else {
        showNotification("Impossible de supprimer cette analyse.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const getScoreBadgeClass = (value: number | null) => {
    if (value === null) return "bg-surface-raised text-muted border-outline/30";
    if (value >= 80) return "bg-accent/15 text-accent-strong border-accent/40";
    if (value >= 50) return "bg-warning/15 text-foreground border-warning/40";
    return "bg-danger/15 text-danger border-danger/40";
  };

  return (
    <section className="space-y-6 sm:space-y-8 animate-in fade-in duration-200" aria-labelledby="history-heading">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline/20 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent uppercase tracking-wider mb-1">
            <HistoryIcon className="w-4 h-4" />
            <span>Archives locales · Registre d'audit</span>
          </div>
          <h2 id="history-heading" className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            Historique des audits de connectivité
          </h2>
          <p className="text-xs font-sans text-muted mt-1">
            Retrouvez vos sessions de mesure passées et comparez l'évolution de la résilience réseau de vos pages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void loadHistory(true)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold border border-outline/40 hover:bg-surface-raised hover:text-foreground text-muted transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            aria-label="Actualiser l'historique"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={onNewAudit}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-accent text-ink hover:bg-accent-strong transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Nouvel audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          role="status"
          className="p-3.5 rounded-xl border border-accent/40 bg-surface-raised text-foreground font-mono text-xs flex items-center gap-2.5 shadow-md animate-in fade-in duration-150"
        >
          <Check className="w-4 h-4 text-accent shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* State 1: Loading initial */}
      {loading && items.length === 0 && (
        <div className="p-12 text-center bg-surface border border-outline/30 rounded-2xl space-y-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-muted">
            Chargement de l'historique des sessions...
          </p>
        </div>
      )}

      {/* State 2: Error state */}
      {!loading && error && (
        <div
          role="alert"
          className="p-6 sm:p-8 rounded-2xl border border-danger/30 bg-danger/5 text-foreground space-y-4"
        >
          <div className="flex items-center gap-3 text-danger">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wide">
              Erreur d'accès à l'historique [{error.code}]
            </h3>
          </div>
          <p className="text-xs text-muted leading-relaxed max-w-xl">
            {error.message}
          </p>
          <button
            onClick={() => void loadHistory(true)}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-surface border border-outline/40 hover:bg-surface-raised text-foreground transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Réessayer</span>
          </button>
        </div>
      )}

      {/* State 3: Empty history */}
      {!loading && !error && items.length === 0 && (
        <div className="p-8 sm:p-12 text-center bg-surface border border-outline/30 rounded-2xl space-y-5 shadow-soft">
          <div className="w-12 h-12 rounded-2xl border border-outline/30 bg-surface-raised flex items-center justify-center text-muted mx-auto">
            <HistoryIcon className="w-6 h-6 text-accent" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-foreground">
              Aucun audit enregistré pour le moment
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Toutes les analyses de connectivité que vous lancez sont automatiquement archivées dans ce registre.
              Démarrez un premier audit pour mesurer votre site sous contraintes de connectivité.
            </p>
          </div>
          <button
            onClick={onNewAudit}
            className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-accent text-ink hover:bg-accent-strong transition-all inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span>Lancer un premier audit</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* State 4: Populated List */}
      {!error && items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-muted px-1">
            <span>
              Affichage de {items.length} analyse{items.length > 1 ? "s" : ""} sur {total} enregistrée{total > 1 ? "s" : ""}
            </span>
            <span>Tri chronologique (plus récent en premier)</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const scoreVal = item.score?.value ?? null;
              const isDetailLoading = loadingDetailId === item.analysisId;
              const isPdfExporting = exportingId === item.analysisId;
              const isConfirming = confirmDeleteId === item.analysisId;

              return (
                <article
                  key={item.analysisId}
                  className="p-4 sm:p-5 rounded-2xl bg-surface border border-outline/30 hover:border-outline/70 transition-all shadow-sm space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-outline/15 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Tag */}
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${
                          item.status === "completed"
                            ? "bg-accent/10 text-accent border-accent/30"
                            : "bg-warning/10 text-foreground border-warning/30"
                        }`}
                      >
                        {item.status === "completed" ? "Terminé" : "Partiel"}
                      </span>

                      {/* Network Profile */}
                      <span className="text-[11px] font-mono font-medium text-foreground bg-surface-raised px-2.5 py-0.5 rounded-md border border-outline/25 flex items-center gap-1.5">
                        <Wifi className="w-3 h-3 text-accent" />
                        <span>{PROFILE_LABELS[item.profile] || item.profile}</span>
                      </span>

                      {/* Date */}
                      <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(item.startedAt)}</span>
                      </span>

                      {/* Duration */}
                      <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(item.durationMs)}</span>
                      </span>
                    </div>

                    {/* Score badge */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 ${getScoreBadgeClass(
                          scoreVal
                        )}`}
                      >
                        <span>Score :</span>
                        <span className="text-sm font-extrabold">
                          {scoreVal !== null ? `${scoreVal}/100` : "Incomplet"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* URL Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold font-mono text-foreground break-all tracking-tight">
                        {item.url}
                      </h3>
                      <span className="text-[10px] font-mono text-muted block">
                        ID session : {item.analysisId}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Inspect button */}
                      <button
                        onClick={() => void handleInspect(item)}
                        disabled={isDetailLoading || isPdfExporting}
                        className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-accent text-ink hover:bg-accent-strong transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Ouvrir le rapport complet d'analyse"
                      >
                        {isDetailLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        <span>{isDetailLoading ? "Chargement..." : "Consulter"}</span>
                      </button>

                      {/* PDF Download */}
                      <button
                        onClick={() => void handleExportPdf(item)}
                        disabled={isPdfExporting || isDetailLoading}
                        className="px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border border-outline/40 hover:bg-surface-raised hover:text-foreground text-muted transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Télécharger le rapport PDF officiel"
                      >
                        {isPdfExporting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-accent" />
                        )}
                        <span>PDF</span>
                      </button>

                      {/* Delete */}
                      {isConfirming ? (
                        <div className="flex items-center gap-1.5 bg-danger/10 p-1 rounded-xl border border-danger/30">
                          <button
                            onClick={() => void handleDelete(item.analysisId)}
                            disabled={isDeleting}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-danger text-ink hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? "..." : "Confirmer"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                            className="px-2 py-1 rounded-lg text-[11px] font-mono text-muted hover:text-foreground cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(item.analysisId)}
                          disabled={isDeleting}
                          className="p-2 rounded-xl text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          aria-label="Supprimer cette analyse de l'historique"
                          title="Supprimer cette analyse"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Load more button */}
          {total > items.length && (
            <div className="text-center pt-3">
              <button
                onClick={() => void loadHistory(false)}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl text-xs font-mono font-bold border border-outline/40 bg-surface hover:bg-surface-raised text-foreground transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Charger les analyses précédentes</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
