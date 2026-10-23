import React from "react";
import { BookOpen, Gauge, History, Moon, Radio, Sun } from "lucide-react";
import { HealthBadge } from "./HealthBadge";
import type { ThemeName } from "../theme/useTheme";

interface HeaderProps {
  onReset: () => void;
  onOpenDoc: () => void;
  onOpenHistory: () => void;
  activeView: "audit" | "history";
  theme: ThemeName;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onOpenDoc,
  onOpenHistory,
  activeView,
  theme,
  onToggleTheme,
}) => (
  <header className="site-header">
    <div className="header-inner">
      <button onClick={onReset} className="brand-lockup" aria-label="Accueil LowBand Africa">
        <span className="brand-mark" aria-hidden="true">
          <Radio size={20} strokeWidth={2.2} />
        </span>
        <span className="brand-wordmark">
          <span className="brand-name">
            LowBand<span className="brand-accent">Africa</span>
          </span>
          <span className="brand-caption">Observatoire Réseau & Connectivité</span>
        </span>
      </button>

      <div className="header-right">
        <HealthBadge />
        <span className="header-divider" aria-hidden="true" />
        <nav className="header-nav" aria-label="Navigation principale">
          <button
            onClick={onReset}
            className={`nav-link ${activeView === "audit" ? "text-accent font-bold" : ""}`}
            aria-label="Nouvel audit de connectivité"
          >
            <Gauge size={15} aria-hidden="true" />
            <span>Nouvel audit</span>
          </button>
          <button
            onClick={onOpenHistory}
            className={`nav-link ${activeView === "history" ? "text-accent font-bold" : ""}`}
            aria-label="Consulter l'historique des audits"
          >
            <History size={15} aria-hidden="true" />
            <span>Historique</span>
          </button>
          <button onClick={onOpenDoc} className="nav-link" aria-label="Voir la méthodologie">
            <BookOpen size={15} aria-hidden="true" />
            <span>Méthodologie</span>
          </button>
          <button
            onClick={onToggleTheme}
            className="nav-link theme-toggle"
            aria-label={`Passer au thème ${theme === "dark" ? "clair" : "sombre"}`}
            aria-pressed={theme === "light"}
          >
            {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            <span>{theme === "dark" ? "Clair" : "Sombre"}</span>
          </button>
        </nav>
      </div>
    </div>
  </header>
);
