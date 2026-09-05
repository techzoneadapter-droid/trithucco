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
const checks = [
  ["title", /<title>TRI THỨC CỔ – Đọc Sớm, Bớt Trả Giá<\/title>/, html],
  ["order form", /id="order-form"/, html],
  ["google script config", /GOOGLE_SCRIPT_URL/, script],
  ["mobile CTA", /mobile-buy-bar/, html],
  ["price", /199\.000đ/, html],
  ["original price", /249\.000đ/, html],
];

const failed = checks.filter(([, pattern, content]) => !pattern.test(content));
if (failed.length) {
  console.error("Build checks failed:");
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log("Build OK: static landing page is ready for GitHub Pages or Vercel.");
