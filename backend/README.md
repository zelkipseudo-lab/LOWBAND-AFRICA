# LowBand Africa Backend

Express API for the v1 contract. Node.js 20+ is required. The backend imports the existing `../engine` package as a local dependency; build the engine first so its `dist/` exports exist.

## Local setup

```powershell
cd ..\engine
npm ci
npx playwright install chromium
npm run build
cd ..\backend
npm ci
```

On Windows, from this `backend/` directory, start the API through the verified launcher:

```powershell
..\scripts\start-backend-with-verified-egress.ps1
```

If the Windows firewall rule has not been installed yet, install it once from an administrator PowerShell with `..\scripts\install-chromium-egress-policy.ps1`, then use a normal PowerShell for the verified launcher. Do not use `npm run dev` to run analyses: that raw development command intentionally leaves the EGRESS gate closed and returns `503 EGRESS_POLICY_UNVERIFIED`.

The API listens at `http://127.0.0.1:3001` by default. `GET /api/v1/health` returns `{"status":"ok"}`. `POST /api/v1/analyze` accepts `{"url":"https://example.com/","profile":"4g"}`.

The analysis route validates URL/profile, then checks destination DNS with the engine's `TargetGuard`. It runs one analysis at a time, permits 10 requests per client address per 10 minutes, applies 40 s total / 30 s navigation limits, and passes an abort signal so a disconnected HTTP client stops the engine. The backend returns the engine's measurements, score, evidence-based recommendations and warnings using the documented contract.

## Network isolation gate

Chromium and Playwright run on the backend host; visitors do not install anything. Analysis returns `503 EGRESS_POLICY_UNVERIFIED` unless `LOWBAND_EGRESS_ISOLATION=verified` is set for a backend runtime that already enforces outbound isolation. This setting is only a gate, not a firewall. On Windows development machines, install the rule once from an administrator PowerShell with `../scripts/install-chromium-egress-policy.ps1`, then start the backend from a normal PowerShell with `../scripts/start-backend-with-verified-egress.ps1`. The startup script checks the active Windows Firewall rule against the current Playwright Chromium path and shared blocked-range list, then runs the Chromium loopback-guard and public HTTPS smoke probes before setting the gate. Do not set the variable manually based only on the application-level DNS/CDP guard.

`.env.example` lists supported settings; the backend does not auto-load `.env`, so set any needed variables in the process environment before startup. For example, in PowerShell use `$env:LOWBAND_FRONTEND_ORIGIN = 'http://127.0.0.1:5173'`. The API does not allow credentials or wildcard CORS. Keep `LOWBAND_EGRESS_ISOLATION` empty until outbound isolation for Chromium has actually been verified. `LOWBAND_TRUST_PROXY` accepts only an explicit comma-separated list of trusted proxy IPs/CIDRs; leave empty for local direct access.

Commands: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and `npm start` (after build). `npm run dev` is available for backend development but deliberately runs with analysis locked unless the verified launcher is used. `npm ci` in backend expects `engine/dist` to have been built first.
