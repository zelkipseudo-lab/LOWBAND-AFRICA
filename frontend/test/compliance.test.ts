import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getAllFiles(dirPath: string, extensions: string[]): string[] {
  const result: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".git") {
        result.push(...getAllFiles(fullPath, extensions));
      }
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      result.push(fullPath);
    }
  }
  return result;
}

// Regex to detect emojis in unicode
// Covers Extended Pictographic, Emoticons, Symbols & Pictographs, Transport, Misc symbols, Flags
const EMOJI_REGEX = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u;

describe("Frontend compliance", () => {
  const frontendRoot = path.resolve(__dirname, "..");

  it("enforces ABSOLUTE ZERO EMOJIS in all frontend source files", () => {
    const files = getAllFiles(path.resolve(frontendRoot, "src"), [".ts", ".tsx", ".css", ".html"]);
    files.push(path.resolve(frontendRoot, "index.html"));

    const violations: { file: string; line: number; char: string }[] = [];

    for (const file of files) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((lineText, index) => {
        // Exclude test regex itself if scanned
        if (file.includes("compliance.test.ts")) return;
        const match = EMOJI_REGEX.exec(lineText);
        if (match) {
          violations.push({
            file: path.relative(path.resolve(__dirname, ".."), file),
            line: index + 1,
            char: match[0],
          });
        }
      });
    }

    assert.equal(
      violations.length,
      0,
      `Emoji violations found in frontend: ${JSON.stringify(violations, null, 2)}`
    );
  });

  it("keeps both themes in the shared semantic token layer", () => {
    const tokenPath = path.resolve(frontendRoot, "src/theme/tokens.css");
    const tailwindConfigPath = path.resolve(frontendRoot, "tailwind.config.ts");
    const tokens = fs.readFileSync(tokenPath, "utf-8");
    const tailwind = fs.readFileSync(tailwindConfigPath, "utf-8");
    assert.match(tokens, /\[data-theme="dark"\]/);
    assert.match(tokens, /\[data-theme="light"\]/);
    const utilityByRole: Record<string, string> = { border: "outline" };
    for (const role of [
      "canvas", "ink", "surface", "surface-raised", "foreground", "muted",
      "accent", "accent-strong", "accent-on-ink", "accent-soft", "on-ink",
      "border", "danger", "warning",
    ]) {
      assert.match(tokens, new RegExp(`--${role}-rgb:`), `Missing ${role} color token`);
      const utility = utilityByRole[role] ?? role;
      assert.match(tailwind, new RegExp(`"?${utility}"?: token\\("${role}"\\)`), `Tailwind does not map ${role}`);
    }

    // Keep literal palette values in one file; components consume named roles.
    const hexRegex = /#[0-9a-fA-F]{6}/g;
    const files = [
      ...getAllFiles(path.resolve(frontendRoot, "src"), [".ts", ".tsx", ".css", ".html"])
        .filter((file) => path.resolve(file) !== tokenPath),
      path.resolve(frontendRoot, "index.html"),
      tailwindConfigPath,
    ];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      for (const hex of content.match(hexRegex) || []) {
        assert.fail(`Hard-coded color ${hex} found outside theme tokens in ${path.relative(frontendRoot, file)}`);
      }
    }
  });

  it("does not ask visitors to install or configure the server-side browser", () => {
    const errorDisplay = fs.readFileSync(path.resolve(frontendRoot, "src/components/ErrorDisplay.tsx"), "utf-8");
    const apiClient = fs.readFileSync(path.resolve(frontendRoot, "src/api/client.ts"), "utf-8");
    assert.doesNotMatch(errorDisplay, /install-chromium|PowerShell administrateur|scripts\/start-backend/);
    assert.match(errorDisplay, /Aucun navigateur ni logiciel n'est à installer sur votre appareil/);
    assert.match(apiClient, /EGRESS_POLICY_UNVERIFIED/);
  });
});
