import React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";

interface WarningsListProps {
  warnings: string[];
}

export const WarningsList: React.FC<WarningsListProps> = ({ warnings }) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="bg-surface border border-outline/30 rounded-2xl p-6 sm:p-8 shadow-soft space-y-4">
      <div className="flex items-center justify-between border-b border-outline/20 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-warning" />
          <h4 className="text-sm font-extrabold text-foreground uppercase font-mono tracking-wider">
            Limites d'observation & Avertissements ({warnings.length})
          </h4>
        </div>
        <span className="text-[11px] font-mono text-muted">
          Transparence méthodologique
        </span>
      </div>

      <div className="space-y-2.5">
        {warnings.map((w, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3.5 rounded-xl border border-outline/30 bg-surface-raised/40 text-xs text-foreground font-mono"
          >
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <span className="leading-relaxed font-sans font-medium text-foreground/90">{w}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted italic leading-relaxed pt-1">
        Ces avertissements reflètent des limitations matérielles ou temporelles réelles rencontrées par le moteur Chromium (ex. API non exposée par la page, fenêtre d'observation de 2 s pour le LCP, ou requêtes asynchrones en cours).
      </p>
    </div>
  );
};
