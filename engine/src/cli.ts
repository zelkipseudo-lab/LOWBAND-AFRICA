import { analyze } from "./analyze.js";
import { EngineError, isEngineError } from "./errors.js";
import { createTargetGuard } from "./security/target-guard.js";
import type { EngineResult, NetworkProfileId } from "./types.js";

interface CliOptions {
  url: string;
  profile: NetworkProfileId;
  json: boolean;
  guard: boolean;
  headed: boolean;
  noSandbox: boolean;
  disableCache: boolean;
  totalTimeoutMs?: number;
  navigationTimeoutMs?: number;
}

const USAGE = `Usage: npm run analyze -- <url> [options]

Options:
  --profile <fast|4g|3g|slow_3g>   Profil réseau (défaut: 4g)
  --json                           Affiche le résultat JSON brut
  --no-guard                       Désactive la garde de cible (tests locaux uniquement)
  --headed                         Lance Chromium avec fenêtre
  --no-sandbox                     Lance Chromium sans sandbox (conteneurs)
  --allow-cache                    Laisser le cache HTTP actif (désactivé par défaut)
  --timeout-ms <ms>                Échéance totale (défaut: 45000)
  --navigation-timeout-ms <ms>     Échéance de navigation (défaut: 30000)
  --help                           Affiche cette aide

La garde de cible est active par défaut: elle valide l'URL initiale et chaque
requête (redirections comprises) et bloque les adresses non publiques.`;

function parsePositiveInt(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} attend un entier positif.`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const positional: string[] = [];
  const options: CliOptions = {
    url: "",
    profile: "4g",
    json: false,
    guard: true,
    headed: false,
    noSandbox: false,
    disableCache: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    switch (arg) {
      case "--help":
      case "-h":
        console.log(USAGE);
        process.exit(0);
        break;
      case "--json":
        options.json = true;
        break;
      case "--no-guard":
        options.guard = false;
        break;
      case "--headed":
        options.headed = true;
        break;
      case "--no-sandbox":
        options.noSandbox = true;
        break;
      case "--allow-cache":
        options.disableCache = false;
        break;
      case "--profile": {
        const value = argv[i + 1];
        if (!value) throw new Error("--profile attend une valeur.");
        options.profile = value as NetworkProfileId;
        i += 1;
        break;
      }
      case "--timeout-ms": {
        const value = argv[i + 1];
        if (!value) throw new Error("--timeout-ms attend une valeur.");
        options.totalTimeoutMs = parsePositiveInt(value, "--timeout-ms");
        i += 1;
        break;
      }
      case "--navigation-timeout-ms": {
        const value = argv[i + 1];
        if (!value) throw new Error("--navigation-timeout-ms attend une valeur.");
        options.navigationTimeoutMs = parsePositiveInt(value, "--navigation-timeout-ms");
        i += 1;
        break;
      }
      default:
        if (arg.startsWith("--profile=")) {
          options.profile = arg.slice("--profile=".length) as NetworkProfileId;
        } else if (arg.startsWith("--timeout-ms=")) {
          options.totalTimeoutMs = parsePositiveInt(
            arg.slice("--timeout-ms=".length),
            "--timeout-ms",
          );
        } else if (arg.startsWith("--navigation-timeout-ms=")) {
          options.navigationTimeoutMs = parsePositiveInt(
            arg.slice("--navigation-timeout-ms=".length),
            "--navigation-timeout-ms",
          );
        } else if (arg.startsWith("-")) {
          throw new Error(`Option inconnue: ${arg}`);
        } else {
          positional.push(arg);
        }
    }
  }

  if (positional.length !== 1) {
    throw new Error("Une seule URL est attendue.");
  }
  options.url = positional[0] ?? "";
  return options;
}

function formatMetric(value: number | null, unit: string): string {
  return value === null ? "indisponible" : `${value} ${unit}`;
}

function printHuman(result: EngineResult): void {
  const { metrics } = result;
  console.log(`URL demandée       : ${result.requestedUrl}`);
  console.log(`URL finale         : ${result.finalUrl ?? "indisponible"}`);
  console.log(`Profil             : ${result.profile}`);
  console.log(`Début              : ${result.startedAt}`);
  console.log(`Durée totale       : ${result.durationMs} ms`);
  console.log("");
  console.log(`Navigation         : ${formatMetric(metrics.navigationMs, "ms")}`);
  console.log(`FCP                : ${formatMetric(metrics.fcpMs, "ms")}`);
  console.log(`LCP                : ${formatMetric(metrics.lcpMs, "ms")}`);
  console.log(`Requêtes           : ${metrics.requestCount}`);
  console.log(`Échecs             : ${metrics.failedRequests}`);
  console.log(`Transfert          : ${formatMetric(metrics.transferBytes, "octets")}`);
  console.log(`  JavaScript       : ${formatMetric(metrics.resources.javascriptBytes, "octets")}`);
  console.log(`  CSS              : ${formatMetric(metrics.resources.cssBytes, "octets")}`);
  console.log(`  Images           : ${formatMetric(metrics.resources.imageBytes, "octets")}`);
  console.log(`  Polices          : ${formatMetric(metrics.resources.fontBytes, "octets")}`);
  console.log(`  Autres           : ${formatMetric(metrics.resources.otherBytes, "octets")}`);
  console.log("");
  console.log("Émulation réseau appliquée (CDP):");
  console.log(
    `  descendant ${result.networkEmulation.downloadKbps} Kbps, montant ${result.networkEmulation.uploadKbps} Kbps, latence ${result.networkEmulation.latencyMs} ms, perte non simulée`,
  );
  if (result.warnings.length > 0) {
    console.log("");
    console.log("Avertissements:");
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
  }
}

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }

  try {
    const result = await analyze(options.url, {
      profile: options.profile,
      targetGuard: options.guard ? createTargetGuard() : undefined,
      headless: !options.headed,
      noSandbox: options.noSandbox,
      disableCache: options.disableCache,
      totalTimeoutMs: options.totalTimeoutMs,
      navigationTimeoutMs: options.navigationTimeoutMs,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printHuman(result);
    }
  } catch (error) {
    const engineError = isEngineError(error)
      ? error
      : new EngineError("ANALYSIS_FAILED", undefined, { cause: error });
    if (options.json) {
      console.log(JSON.stringify({ error: engineError.toSafeJSON() }, null, 2));
    } else {
      console.error(`Erreur ${engineError.code}: ${engineError.message}`);
    }
    process.exitCode = 1;
  }
}

void main();
