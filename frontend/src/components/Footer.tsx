import React from "react";
import { ShieldCheck, Info } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ink text-on-ink border-t border-outline/30 mt-16 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-accent-on-ink font-semibold text-xs font-mono uppercase tracking-wider">
              <Info className="w-4 h-4" />
              <span>Cadre méthodologique de laboratoire</span>
            </div>
            <p className="text-xs text-on-ink/75 leading-relaxed font-sans max-w-md">
              Les profils réseau sont appliqués via le protocole Chromium DevTools (CDP).
              Ces conditions constituent des simulations de laboratoire reproductibles et
              ne prétendent pas modéliser l'intégralité des disparités d'infrastructure d'un territoire donné.
            </p>
          </div>

          <div className="space-y-2.5 md:text-right">
            <div className="flex items-center gap-2 md:justify-end text-accent-on-ink font-semibold text-xs font-mono uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Sécurité et protection des analyses</span>
            </div>
            <p className="text-xs text-on-ink/75 leading-relaxed font-sans max-w-md md:ml-auto">
              Vérification anti-SSRF, sessions Chromium éphémères et aucune conservation de données privées.
              Les analyses restent verrouillées tant que le filtrage réseau sortant n'a pas été vérifié.
            </p>
            <p className="text-[11px] text-on-ink/50 pt-2 font-mono">
              Version API v1.0 · LowBand Africa Benchmarking System
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
