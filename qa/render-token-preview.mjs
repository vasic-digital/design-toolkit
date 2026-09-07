#!/usr/bin/env node
// =============================================================================
// render-token-preview.mjs — human-readable evidence for a token candidate.
//
// The gates answer questions with numbers. A palette also has to be LOOKED AT,
// and no exit code substitutes for that. This builds a single self-contained
// page from a candidate's own `--od-*` values — every swatch, the diagram
// scaffold in the arrangement the design-system's SVGs actually use, the status
// pills, and a focus ring — and screenshots it in both themes.
//
// It asserts NOTHING and gates NOTHING. It is a rendering tool, and its exit
// codes say only whether it managed to render:
//   0 = wrote the page (and, when chromium was available, the screenshots)
//   2 = COULD NOT DETERMINE — no candidate, or the browser is unavailable.
// There is deliberately no exit 1: a picture is not a verdict.
//
// Usage:
//   node render-token-preview.mjs --candidate ../proposed/x.od-tokens.css \
//        --out ../evidence/palette-preview
// =============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");

function parseArgs(argv) {
  const a = { candidates: [], out: undefined };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--candidate") a.candidates.push(argv[++i]);
    else if (t === "--out") a.out = argv[++i];
    else if (t === "--help" || t === "-h") {
      process.stdout.write("Usage: node render-token-preview.mjs --candidate <css> [--candidate <css>] --out <dir-prefix>\n");
      process.exit(0);
    }
  }
  return a;
}
const args = parseArgs(process.argv);
const log = (s) => process.stderr.write(s + "\n");
function undetermined(reason) {
  log(`preview: COULD NOT DETERMINE — ${reason}`);
  log("  Nothing was rendered. This is not a claim about the candidate.");
  process.exit(2);
}
if (!args.candidates.length || !args.out) undetermined("--candidate and --out are required");

const outDir = resolve(process.cwd(), args.out);
mkdirSync(outDir, { recursive: true });

// ---- the page ---------------------------------------------------------------
// Deliberately built from the token contract only: no hard-coded colour appears
// below except #0000 and the two theme-invariant status foregrounds, which the
// contract itself defines as theme-invariant.
function page(css, label) {
  const swatch = (name) => `<div class="sw"><span style="background:var(${name})"></span><code>${name}</code></div>`;
  const ramp = ["50","100","200","300","400","500","600","700","800","900"]
    .map((s) => `<div class="ramp"><i style="background:var(--od-accent-${s})"></i><b>${s}</b></div>`).join("");
  const core = ["--od-bg","--od-surface","--od-surface-2","--od-text","--od-text-muted","--od-border",
                "--od-accent","--od-on-accent","--od-success","--od-warning","--od-danger","--od-focus"];
  const diag = ["--od-diagram-panel","--od-diagram-panel2","--od-diagram-tint","--od-diagram-good",
                "--od-diagram-ink","--od-diagram-muted","--od-diagram-line","--od-diagram-good-line","--od-diagram-good-ink"];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${css}
*{box-sizing:border-box}
body{margin:0;background:var(--od-bg);color:var(--od-text);
     font-family:var(--od-font-body);padding:var(--od-space-6,28px)}
h1{font-family:var(--od-font-display);font-size:var(--od-fs-2xl);margin:0 0 4px;
   letter-spacing:var(--od-tracking-tight);line-height:var(--od-lh-tight)}
.sub{color:var(--od-text-muted);font-size:var(--od-fs-sm);margin:0 0 28px}
h2{font-size:var(--od-fs-sm);font-weight:600;color:var(--od-text-muted);
   margin:26px 0 10px;letter-spacing:var(--od-tracking-wide)}
.row{display:flex;flex-wrap:wrap;gap:10px}
.ramp{display:flex;flex-direction:column;align-items:center;gap:4px}
.ramp i{width:58px;height:52px;border-radius:var(--od-radius-sm);border:1px solid var(--od-border);display:block}
.ramp b{font-family:var(--od-font-mono);font-size:10px;font-weight:400;color:var(--od-text-muted)}
.sw{display:flex;align-items:center;gap:8px;background:var(--od-surface);
    border:1px solid var(--od-border);border-radius:var(--od-radius-md);padding:6px 10px 6px 6px}
.sw span{width:30px;height:30px;border-radius:var(--od-radius-sm);border:1px solid var(--od-border);display:block}
.sw code{font-family:var(--od-font-mono);font-size:11px;color:var(--od-text-muted)}
.pill{display:inline-block;padding:4px 12px;border-radius:var(--od-radius-pill);
      font-size:12px;font-weight:600;margin-right:8px}
.p-ok{background:var(--od-success);color:var(--od-status-fg-light)}
.p-ship{background:var(--od-badge-success-bg);color:var(--od-status-fg-light)}
.p-dev{background:var(--od-warning);color:var(--od-status-fg-dark)}
.p-err{background:var(--od-danger);color:var(--od-on-accent)}
button{font:inherit;font-size:14px;padding:9px 18px;border-radius:var(--od-radius-md);
       border:1px solid var(--od-border);background:var(--od-accent);color:var(--od-on-accent);cursor:pointer}
button.ghost{background:var(--od-surface);color:var(--od-text)}
button.focused{outline:3px solid var(--od-focus);outline-offset:2px}
svg{background:var(--od-surface);border:1px solid var(--od-border);border-radius:var(--od-radius-lg)}
.t{fill:var(--od-diagram-ink);font-size:12px;font-weight:600}
.s{fill:var(--od-diagram-muted);font-size:10px}
.gt{fill:var(--od-diagram-good-ink);font-size:12px;font-weight:600}
.box{fill:var(--od-diagram-panel);stroke:var(--od-diagram-line);stroke-width:1.4}
.dash{fill:var(--od-diagram-panel2);stroke:var(--od-diagram-line);stroke-width:1.4;stroke-dasharray:5 4}
.tint{fill:var(--od-diagram-tint);stroke:var(--od-accent);stroke-width:1.4}
.good{fill:var(--od-diagram-good);stroke:var(--od-diagram-good-line);stroke-width:1.4}
.conn{stroke:var(--od-diagram-line);stroke-width:1.4;fill:none}
</style></head><body>
<h1>${label}</h1>
<p class="sub">Every colour on this page is read from the candidate's own <code>--od-*</code> tokens. Nothing is hand-painted.</p>

<h2>Accent ramp</h2><div class="row">${ramp}</div>

<h2>Core roles</h2><div class="row">${core.map(swatch).join("")}</div>

<h2>Diagram scaffold — the arrangement the design-system SVGs create</h2>
<svg width="640" height="150" viewBox="0 0 640 150">
  <path class="conn" d="M150 55 H196"/><path class="conn" d="M304 55 H350"/><path class="conn" d="M458 55 H504"/>
  <rect class="box"  x="18"  y="26" width="132" height="58" rx="8"/>
  <text class="t" x="34" y="52">node plate</text><text class="s" x="34" y="70">--od-diagram-panel</text>
  <rect class="dash" x="196" y="26" width="108" height="58" rx="8"/>
  <text class="t" x="210" y="52">dashed</text><text class="s" x="210" y="70">panel2 · counterpoint</text>
  <rect class="tint" x="350" y="26" width="108" height="58" rx="8"/>
  <text class="t" x="364" y="52">tinted</text><text class="s" x="364" y="70">tint · accent</text>
  <rect class="good" x="504" y="26" width="118" height="58" rx="8"/>
  <text class="gt" x="518" y="52">success</text><text class="s" x="518" y="70">good</text>
</svg>

<h2>Status pills</h2>
<div><span class="pill p-ok">Active</span><span class="pill p-ship">Shipped</span><span class="pill p-dev">In development</span><span class="pill p-err">Failed</span></div>

<h2>Controls — the third swatch shows the focus ring (counterpoint hue)</h2>
<div class="row"><button>Save changes</button><button class="ghost">Cancel</button><button class="ghost focused">Keyboard focus</button></div>
</body></html>`;
}

let chromium;
try {
  const requireFromTests = createRequire(resolve(REPO_ROOT, "_tests/package.json"));
  ({ chromium } = requireFromTests("@playwright/test"));
} catch (e) {
  chromium = null;
  log(`preview: chromium unavailable (${e.message}) — HTML will be written, screenshots will not`);
}

let browser = null;
if (chromium) {
  try { browser = await chromium.launch(); }
  catch (e) { log(`preview: chromium refused to launch (${e.message}) — HTML only`); browser = null; }
}

const written = [];
for (const c of args.candidates) {
  const p = resolve(process.cwd(), c);
  if (!existsSync(p)) { log(`preview: skipping missing ${p}`); continue; }
  const name = basename(p).replace(/\.od-tokens\.css$/, "");
  const html = page(readFileSync(p, "utf8"), name);
  const htmlPath = resolve(outDir, `${name}.preview.html`);
  writeFileSync(htmlPath, html);
  written.push(htmlPath);
  if (!browser) continue;
  for (const theme of ["light", "dark"]) {
    const pg = await browser.newPage({ viewportSize: { width: 700, height: 900 }, colorScheme: theme });
    await pg.setContent(html, { waitUntil: "load" });
    await pg.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    const shot = resolve(outDir, `${name}.${theme}.png`);
    await pg.screenshot({ path: shot, fullPage: true });
    written.push(shot);
    await pg.close();
  }
}
if (browser) await browser.close();
if (!written.length) undetermined("no candidate produced any output");
for (const w of written) log(`wrote ${w}`);
process.exit(0);
