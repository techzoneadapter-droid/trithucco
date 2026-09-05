const fs = require("fs");
const path = require("path");

const root = process.cwd();
const required = [
  "index.html",
  "styles.css",
  "script.js",
  "apps-script/Code.gs",
  "design/thật.png",
  "design/thật1.png",
  "design/thật2.png",
  "design/ChatGPT Image 10_12_24 3 thg 9, 2026 (7).png",
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("Missing required files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const appsScript = fs.readFileSync(path.join(root, "apps-script/Code.gs"), "utf8");
const checks = [
  ["title", /<title>TRI THỨC CỔ – Đọc Sớm, Bớt Trả Giá<\/title>/, html],
  ["order form", /id="order-form"/, html],
  ["google script config", /GOOGLE_SCRIPT_URL/, script],
  ["promo config", /PROMO_CONFIG/, script],
  ["promo end time", /PROMO_END_TIME/, script],
  ["form scroll target", /document\.querySelector\("#order-form"\)\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/, script],
  ["mobile CTA", /mobile-buy-bar/, html],
  ["price", /199\.000đ/, html],
  ["original price", /249\.000đ/, html],
  ["apps script doGet", /function doGet/, appsScript],
  ["viet font", /Be Vietnam Pro/, css],
];

const failed = checks.filter(([, pattern, content]) => !pattern.test(content));
if (failed.length) {
  console.error("Build checks failed:");
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

const mojibakePattern = /(?:\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00c4[\u0080-\u00bf]|\u00c6[\u0080-\u00bf]|\u00e1[\u00ba-\u00bf]|\u00e2\u20ac)/;

const sourceFiles = [
  ["index.html", html],
  ["styles.css", css],
  ["script.js", script],
  ["apps-script/Code.gs", appsScript],
  ["README.md", fs.readFileSync(path.join(root, "README.md"), "utf8")],
];

const mojibakeHits = [];
for (const [file, content] of sourceFiles) {
  const match = content.match(mojibakePattern);
  if (match) {
    mojibakeHits.push(`${file}: ${match[0]}`);
  }
}

if (mojibakeHits.length) {
  console.error("Mojibake markers found:");
  for (const hit of mojibakeHits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log("Build OK: static landing page is ready for GitHub Pages or Vercel.");
