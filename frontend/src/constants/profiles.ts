import type { NetworkProfileId, NetworkProfileInfo } from "../types/api";

export const NETWORK_PROFILES: NetworkProfileInfo[] = [
  {
    id: "fast",
    name: "Haut débit (Fast)",
    downloadSpeed: "20 Mbps",
    uploadSpeed: "10 Mbps",
    latency: "20 ms",
    description: "Connexion stable et rapide servant de référence haute.",
  },
  {
    id: "4g",
    name: "4G Mobile Standard",
    downloadSpeed: "10 Mbps",
    uploadSpeed: "5 Mbps",
    latency: "50 ms",
    description: "Couverture 4G urbaine représentative d'un usage courant.",
  },
  {
    id: "3g",
    name: "3G Mobile Intermédiaire",
    downloadSpeed: "1,5 Mbps",
    uploadSpeed: "750 Kbps",
    latency: "150 ms",
    description: "Connectivité 3G périurbaine ou zone à signal modéré.",
  },
  {
    id: "slow_3g",
    name: "3G Lente / Edge Dégradé",
    downloadSpeed: "400 Kbps",
    uploadSpeed: "200 Kbps",
    latency: "400 ms",
    description: "Conditions contraintes, latence élevée et bande passante restreinte.",
  },
];

export const PROFILE_LABELS: Record<NetworkProfileId, string> = {
  fast: "Haut débit (20 Mbps / 20 ms)",
  "4g": "4G Standard (10 Mbps / 50 ms)",
  "3g": "3G Intermédiaire (1,5 Mbps / 150 ms)",
  slow_3g: "3G Lente (400 Kbps / 400 ms)",
};
