import React from "react";
import { Loader2, Globe, Cpu, Radio, Shield, Clock } from "lucide-react";
import type { NetworkProfileId } from "../types/api";
import { PROFILE_LABELS } from "../constants/profiles";

interface LoadingStateProps {
  url: string;
  profile: NetworkProfileId;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ url, profile }) => {
  return (
    <div className="bg-surface border border-outline/30 rounded-2xl p-8 sm:p-12 shadow-soft text-center space-y-8 animate-in fade-in duration-300">
      {/* Central Radar / Loader Visual */}
      <div className="relative inline-flex items-center justify-center w-20 h-20">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/20 opacity-75" />
        <div className="relative w-16 h-16 rounded-2xl border-2 border-accent/60 bg-ink text-accent-on-ink flex items-center justify-center shadow-lg">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>

      {/* Title & Core Explanation */}
      <div className="max-w-xl mx-auto space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised border border-outline/30 text-foreground font-mono text-xs font-semibold">
          <Radio className="w-3.5 h-3.5 text-accent" />
          <span>Session Chromium isolée active</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Audit de connectivité en cours
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-lg mx-auto">
          Le moteur Chromium automatisé applique les contraintes matérielles de débit et de latence
          spécifiées, puis navigue vers l'adresse pour capturer les événements réseau réels.
        </p>
      </div>

      {/* Target inspection box */}
      <div className="max-w-lg mx-auto bg-surface-raised border border-outline/30 rounded-xl p-4 text-left font-mono text-xs space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-outline/20 pb-2">
          <span className="text-muted">Cible de l'audit :</span>
          <span className="font-semibold text-foreground truncate max-w-[280px]" title={url}>
            {url}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-outline/20 pb-2">
          <span className="text-muted">Profil simulé :</span>
          <span className="font-bold text-accent">
            {PROFILE_LABELS[profile]}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>Délai de garde maximal :</span>
          </span>
          <span className="font-semibold text-foreground">30 à 40 secondes selon profil</span>
        </div>
      </div>

      {/* Step by step pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto text-left text-xs pt-2">
        <div className="p-4 rounded-xl border border-outline/30 bg-surface space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-foreground font-mono text-[11px]">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span>1. Garde SSRF</span>
          </div>
          <p className="text-muted text-[11px] leading-relaxed">
            Validation DNS, filtrage des plages privées RFC 1918 et interdiction des services internes.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-outline/30 bg-surface space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-foreground font-mono text-[11px]">
            <Radio className="w-3.5 h-3.5 text-accent" />
            <span>2. Émulation CDP</span>
          </div>
          <p className="text-muted text-[11px] leading-relaxed">
            Application matérielle du débit descendant/montant et de la latence RTT au niveau protocolaire.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-outline/30 bg-surface space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-foreground font-mono text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-accent" />
            <span>3. Mesures réelles</span>
          </div>
          <p className="text-muted text-[11px] leading-relaxed">
            Capture des requêtes, chronométrage FCP/LCP et calcul déterministe de l'Africa Ready Score.
          </p>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 text-xs text-muted font-mono pt-2">
        <Globe className="w-3.5 h-3.5 text-accent" />
        <span>Capture en direct · Aucune barre de progression fictive</span>
      </div>
    </div>
  );
};
