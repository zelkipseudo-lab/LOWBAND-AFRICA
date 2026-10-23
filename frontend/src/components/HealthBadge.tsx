import React, { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { checkHealth } from "../api/client";

export const HealthBadge: React.FC = () => {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  const verify = async () => {
    setStatus("checking");
    const ok = await checkHealth();
    setStatus(ok ? "online" : "offline");
  };

  useEffect(() => {
    verify();
    const interval = setInterval(verify, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center text-xs font-mono shrink-0">
      {status === "checking" && (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-outline/30 text-muted bg-surface text-[10px] sm:text-[11px] font-semibold whitespace-nowrap"
          role="status"
          aria-label="Vérification de la disponibilité de l'API"
        >
          <RefreshCw className="w-3 h-3 animate-spin text-accent shrink-0" />
          <span className="hidden sm:inline">Vérification API...</span>
          <span className="sm:hidden">API...</span>
        </span>
      )}
      {status === "online" && (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-outline/30 text-foreground bg-surface text-[10px] sm:text-[11px] font-semibold whitespace-nowrap"
          role="status"
          aria-label="API v1 opérationnelle"
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="text-muted hidden sm:inline">API v1 :</span>
          <span className="text-accent font-bold">En ligne</span>
        </span>
      )}
      {status === "offline" && (
        <button
          onClick={verify}
          title="Cliquez pour réessayer la connexion au backend"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-danger/40 text-danger bg-danger/10 hover:bg-danger/20 transition-all cursor-pointer text-[10px] sm:text-[11px] font-semibold whitespace-nowrap"
          aria-label="API hors ligne, réessayer"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-danger shrink-0" />
          <span className="hidden sm:inline">API hors ligne</span>
          <span className="sm:hidden">Hors ligne</span>
        </button>
      )}
    </div>
  );
};
