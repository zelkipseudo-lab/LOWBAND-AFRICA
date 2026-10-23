import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface AnalysisHistoryRecord {
  analysisId: string;
  status: "completed" | "partial";
  url: string;
  profile: string;
  startedAt: string;
  durationMs: number;
  metrics: unknown;
  score: unknown;
  recommendations: unknown[];
  warnings: string[];
}

export interface AnalysisHistoryStore {
  list(limit: number, offset: number): Promise<{ items: AnalysisHistoryRecord[]; total: number }>;
  get(id: string): Promise<AnalysisHistoryRecord | null>;
  save(record: AnalysisHistoryRecord): Promise<void>;
  delete(id: string): Promise<boolean>;
}

interface HistoryFile { version: 1; records: AnalysisHistoryRecord[] }

/** File-backed adapter for development and single-instance deployments. Replaceable via AnalysisHistoryStore. */
export class JsonFileAnalysisHistoryStore implements AnalysisHistoryStore {
  private queue: Promise<void> = Promise.resolve();
  private readonly filePath: string;

  constructor(filePath = process.env.LOWBAND_HISTORY_FILE ?? resolve(process.cwd(), "data", "analysis-history.json")) {
    this.filePath = resolve(filePath);
  }

  async list(limit: number, offset: number) {
    const records = await this.readRecords();
    return { items: records.slice(offset, offset + limit), total: records.length };
  }

  async get(id: string) {
    return (await this.readRecords()).find((record) => record.analysisId === id) ?? null;
  }

  async save(record: AnalysisHistoryRecord): Promise<void> {
    return this.mutate((records) => [record, ...records]);
  }

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    await this.mutate((records) => {
      const next = records.filter((record) => record.analysisId !== id);
      deleted = next.length !== records.length;
      return next;
    });
    return deleted;
  }

  private async mutate(change: (records: AnalysisHistoryRecord[]) => AnalysisHistoryRecord[]): Promise<void> {
    const operation = this.queue.then(async () => {
      const records = await this.readRecords();
      const next: HistoryFile = { version: 1, records: change(records) };
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporaryPath, JSON.stringify(next), { encoding: "utf8", flag: "wx" });
        await rename(temporaryPath, this.filePath);
      } catch (error) {
        const { rm } = await import("node:fs/promises");
        await rm(temporaryPath, { force: true }).catch(() => undefined);
        throw error;
      }
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  private async readRecords(): Promise<AnalysisHistoryRecord[]> {
    let content: string;
    try { content = await readFile(this.filePath, "utf8"); }
    catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
      throw error;
    }
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== "object" || !("version" in parsed) || parsed.version !== 1 || !("records" in parsed) || !Array.isArray(parsed.records)) {
      throw new Error("Invalid history store format");
    }
    return parsed.records as AnalysisHistoryRecord[];
  }
}

export function isValidAnalysisId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function sanitizeHistoryUrl(value: string): string {
  const url = new URL(value);
  for (const key of [...url.searchParams.keys()]) {
    if (/(^|_)(token|access_token|refresh_token|api_key|apikey|key|secret|password|signature|sig|auth|authorization|code)(_|$)/i.test(key) ||
        /^(token|access_token|refresh_token|api_key|apikey|key|secret|password|signature|sig|auth|authorization|code)$/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  url.hash = "";
  return url.toString();
}
