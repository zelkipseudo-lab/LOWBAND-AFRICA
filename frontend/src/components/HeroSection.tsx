import React from "react";
import { ArrowDown, ArrowUpRight, Gauge, ShieldCheck, Signal } from "lucide-react";
import { NETWORK_PROFILES } from "../constants/profiles";
import type { NetworkProfileId } from "../types/api";

interface HeroSectionProps {
  onScrollToForm: () => void;
}

const profileNames: Record<NetworkProfileId, string> = {
  fast: "Haut débit",
  "4g": "4G mobile",
  "3g": "3G mobile",
  slow_3g: "3G lente / Edge",
};

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToForm }) => (
  <section className="hero-panel" aria-labelledby="hero-title">
    <div className="hero-copy">
      <div className="hero-eyebrow">
        <span className="hero-badge-tag">LABORATOIRE INDÉPENDANT</span>
        <span>Émulation Réseau Chromium CDP</span>
      </div>
      <h1 id="hero-title">
        Le web doit rester accessible, <em>même sous forte latence.</em>
      </h1>
      <p className="hero-description">
        Sur les forfaits prépayés et les réseaux mobiles éloignés des grands CDN, chaque mégaoctet
        représente un coût réel et chaque requête RTT ralentit l'affichage. LowBand Africa audite vos pages
        sous quatre profils de laboratoire reproductibles.
      </p>
      <div className="hero-actions">
        <button className="button-primary" onClick={onScrollToForm}>
          <span>Lancer un audit de connectivité</span>
          <ArrowDown size={16} aria-hidden="true" />
        </button>
        <span className="hero-action-note">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Mesures réelles observées · Zéro estimation inventée</span>
        </span>
      </div>
      <div className="hero-proof" aria-label="Spécifications de mesure">
        <div className="hero-proof-item">
          <span>01 · LATENCE RTT</span>
          <p>Jusqu'à 400 ms de délai par requête</p>
        </div>
        <div className="hero-proof-item">
          <span>02 · BUDGET DE DONNÉES</span>
          <p>Seuil cible d'accessibilité à 2 Mo</p>
        </div>
        <div className="hero-proof-item">
          <span>03 · ÉMULATION MATÉRIELLE</span>
          <p>Capture directe via DevTools CDP</p>
        </div>
      </div>
    </div>

    <aside className="hero-visual" aria-label="Paramètres des profils réseau disponibles">
      <div className="profile-sheet-head">
        <div>
          <span className="sheet-kicker">Profils de laboratoire</span>
          <h2>Conditions de test</h2>
        </div>
        <span className="sheet-index">04 profils</span>
      </div>
      <div className="profile-sheet-columns" aria-hidden="true">
        <span>Profil réseau</span>
        <span>Débit descendant</span>
        <span>Latence RTT</span>
      </div>
      <div className="profile-sheet-list">
        {NETWORK_PROFILES.map((profile, index) => (
          <div className="profile-sheet-row" key={profile.id}>
            <span className="profile-sheet-number">0{index + 1}</span>
            <span className="profile-sheet-name" title={profile.name}>
              {profileNames[profile.id]}
            </span>
            <span className="profile-sheet-speed">{profile.downloadSpeed}</span>
            <span className="profile-sheet-latency">{profile.latency}</span>
          </div>
        ))}
      </div>
      <div className="profile-sheet-foot">
        <span>
          <Signal size={13} aria-hidden="true" /> Émulation matérielle CDP
        </span>
        <span>
          <Gauge size={13} aria-hidden="true" /> Conditions strictes
        </span>
        <ArrowUpRight size={14} aria-hidden="true" />
      </div>
    </aside>

    <div className="hero-footnote">
      <span>Un outil d'ingénierie web pour réduire l'empreinte réseau et garantir l'inclusion numérique.</span>
      <span className="hero-footnote-mark">LOWBAND AFRICA · BENCHMARK v1.0</span>
    </div>
  </section>
);
