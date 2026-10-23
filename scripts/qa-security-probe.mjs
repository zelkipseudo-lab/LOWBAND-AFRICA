// Sonde QA — LowBand Africa
// Usage : node scripts/qa-security-probe.mjs <group>
// Les tests sont répartis en groupes de <= 8 appels afin de rester sous la
// limite de debit du backend (10 analyses par adresse cliente sur 10 minutes).
// Chaque groupe doit etre execute avec un backend redemarre (fenetre de debit
// en memoire).

const base = process.env.API_BASE ?? "http://127.0.0.1:3001";

async function post(body, headers = {}) {
  const res = await fetch(`${base}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
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

async function postRaw(body, headers) {
  const res = await fetch(`${base}/api/v1/analyze`, { method: "POST", headers, body });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

const groups = {
  // G1 : enveloppe, types, champs du contrat
  g1: [
    { name: "health", fn: async () => {
      const res = await fetch(`${base}/api/v1/health`);
      return { status: res.status, body: await res.json(), headers: Object.fromEntries(res.headers) };
    }},
    { name: "no_content_type", fn: () => postRaw(JSON.stringify({ url: "https://example.com/", profile: "4g" }), {}) },
    { name: "malformed_json", fn: () => postRaw("{", { "Content-Type": "application/json" }) },
    { name: "array_body", fn: () => postRaw("[1,2,3]", { "Content-Type": "application/json" }) },
    { name: "extra_field", fn: () => post({ url: "https://example.com/", profile: "4g", extra: true }) },
    { name: "missing_profile", fn: () => post({ url: "https://example.com/" }) },
    { name: "profile_unstable", fn: () => post({ url: "https://example.com/", profile: "unstable" }) },
    { name: "missing_url", fn: () => post({ profile: "4g" }) },
  ],
  // G2 : protocoles, identifiants, forme de l URL
  g2: [
    { name: "ftp", fn: () => post({ url: "ftp://example.com/", profile: "4g" }) },
    { name: "file", fn: () => post({ url: "file:///C:/Windows/win.ini", profile: "4g" }) },
    { name: "javascript_scheme", fn: () => post({ url: "javascript:alert(1)", profile: "4g" }) },
    { name: "credentials", fn: () => post({ url: "https://user:pass@example.com/", profile: "4g" }) },
    { name: "leading_space", fn: () => post({ url: " https://example.com/", profile: "4g" }) },
    { name: "trailing_space", fn: () => post({ url: "https://example.com/ ", profile: "4g" }) },
    { name: "url_too_long", fn: () => post({ url: `https://example.com/${"a".repeat(2100)}`, profile: "4g" }) },
    { name: "body_over_8kb", fn: () => postRaw(JSON.stringify({ url: "https://example.com/", profile: "4g", pad: "x".repeat(9000) }), { "Content-Type": "application/json" }) },
  ],
  // G3 : SSRF loopback et representations obfusquees
  g3: [
    { name: "loopback_v4", fn: () => post({ url: "http://127.0.0.1/", profile: "4g" }) },
    { name: "loopback_v6", fn: () => post({ url: "http://[::1]/", profile: "4g" }) },
    { name: "localhost_name", fn: () => post({ url: "http://localhost/", profile: "4g" }) },
    { name: "loopback_explicit_80", fn: () => post({ url: "http://127.0.0.1:80/", profile: "4g" }) },
    { name: "decimal_ip", fn: () => post({ url: "http://2130706433/", profile: "4g" }) },
    { name: "hex_ip", fn: () => post({ url: "http://0x7f000001/", profile: "4g" }) },
    { name: "octal_ip", fn: () => post({ url: "http://0177.0.0.1/", profile: "4g" }) },
    { name: "ipv4_mapped_v6", fn: () => post({ url: "http://[::ffff:127.0.0.1]/", profile: "4g" }) },
  ],
  // G4 : SSRF plages privees, link-local et metadonnées cloud
  g4: [
    { name: "rfc1918_10", fn: () => post({ url: "http://10.0.0.1/", profile: "4g" }) },
    { name: "rfc1918_172", fn: () => post({ url: "http://172.16.0.1/", profile: "4g" }) },
    { name: "rfc1918_192", fn: () => post({ url: "http://192.168.1.1/", profile: "4g" }) },
    { name: "metadata_aws_azure_gcp", fn: () => post({ url: "http://169.254.169.254/latest/meta-data/", profile: "4g" }) },
    { name: "metadata_gcp_name", fn: () => post({ url: "http://metadata.google.internal/", profile: "4g" }) },
    { name: "cgnat", fn: () => post({ url: "http://100.100.100.200/", profile: "4g" }) },
    { name: "unspecified", fn: () => post({ url: "http://0.0.0.0/", profile: "4g" }) },
    { name: "ula_v6", fn: () => post({ url: "http://[fd00::1]/", profile: "4g" }) },
  ],
  // G5 : ports, DNS, verrou egress
  g5: [
    { name: "port_8080", fn: () => post({ url: "https://example.com:8080/", profile: "4g" }) },
    { name: "port_22", fn: () => post({ url: "https://example.com:22/", profile: "4g" }) },
    { name: "dns_failure", fn: () => post({ url: "https://does-not-exist-lowband-test.invalid/", profile: "4g" }) },
    { name: "egress_lock_public", fn: () => post({ url: "https://example.com/", profile: "4g" }) },
    { name: "egress_lock_public_3g", fn: () => post({ url: "https://example.com/", profile: "3g" }) },
    { name: "method_get_analyze", fn: async () => {
      const res = await fetch(`${base}/api/v1/analyze`);
      return { status: res.status, body: await res.text() };
    }},
    { name: "unknown_route", fn: async () => {
      const res = await fetch(`${base}/api/v1/unknown`);
      return { status: res.status, body: await res.text() };
    }},
    { name: "cors_foreign_origin", fn: async () => {
      const res = await fetch(`${base}/api/v1/health`, { headers: { Origin: "https://evil.example" } });
      return { status: res.status, allowOrigin: res.headers.get("access-control-allow-origin"), headers: Object.fromEntries(res.headers) };
    }},
  ],
  // G6 : analyse reelle, concurrence, limite de debit (verrou egress leve)
  g6: [
    { name: "real_analysis_4g", fn: () => post({ url: "https://example.com/", profile: "4g" }) },
    { name: "real_analysis_slow_3g", fn: () => post({ url: "https://example.com/", profile: "slow_3g" }) },
    { name: "concurrency_pair", fn: async () => {
      const [a, b] = await Promise.all([
        post({ url: "https://example.com/", profile: "fast" }),
        post({ url: "https://example.com/", profile: "fast" }),
      ]);
      return { first: a.status, second: b.status, secondCode: b.body?.error?.code };
    }},
  ],
  // G7 : limite de debit (11 appels depuis la meme adresse)
  g7: Array.from({ length: 11 }, (_, index) => ({
    name: `rate_limit_call_${index + 1}`,
    fn: () => post({ url: "https://example.com/", profile: "fast" }),
  })),
};

const key = process.argv[2];
if (!key || !groups[key]) {
  console.error(`Groupe inconnu : ${key}. Groupes disponibles : ${Object.keys(groups).join(", ")}`);
  process.exit(2);
}

for (const testCase of groups[key]) {
  try {
    const result = await testCase.fn();
    console.log(JSON.stringify({ group: key, case: testCase.name, ...result }));
  } catch (error) {
    console.log(JSON.stringify({ group: key, case: testCase.name, error: String(error) }));
  }
}
