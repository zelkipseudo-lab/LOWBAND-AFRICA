const base = process.env.API_BASE ?? "http://127.0.0.1:3001";

async function postAnalyze(body) {
  const res = await fetch(`${base}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

const cases = [
  { name: "health", fn: async () => {
    const res = await fetch(`${base}/api/v1/health`);
    return { status: res.status, body: await res.json() };
  }},
  { name: "blocked_localhost", fn: () => postAnalyze({ url: "http://127.0.0.1/", profile: "4g" }) },
  { name: "blocked_metadata", fn: () => postAnalyze({ url: "http://169.254.169.254/latest/meta-data/", profile: "4g" }) },
  { name: "invalid_profile", fn: () => postAnalyze({ url: "https://example.com/", profile: "unstable" }) },
  { name: "unsupported_protocol", fn: () => postAnalyze({ url: "ftp://example.com/", profile: "4g" }) },
  { name: "engine_locked_public", fn: () => postAnalyze({ url: "https://example.com/", profile: "4g" }) },
];

for (const c of cases) {
  try {
    const result = await c.fn();
    console.log(JSON.stringify({ case: c.name, ...result }));
  } catch (e) {
    console.log(JSON.stringify({ case: c.name, error: String(e) }));
  }
}
