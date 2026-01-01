import { createServer } from "http";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, extname, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const PAYOUTS_DIR = join(__dirname, "payouts");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/**
 * Parse a payout CSV file and return structured data
 */
function parsePayoutsCsv(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const payouts = {};

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",");
    if (!row[0]) continue;

    const picks = parseInt(row[0], 10);
    if (isNaN(picks)) continue;

    payouts[picks] = {};

    for (let hitCol = 1; hitCol <= 11; hitCol++) {
      const hits = hitCol - 1;
      const value = row[hitCol];

      if (value && value.trim() !== "") {
        payouts[picks][hits] = parseFloat(value);
      }
    }
  }

  return payouts;
}

/**
 * List all CSV files in the payouts directory
 */
function listPayoutFiles() {
  if (!existsSync(PAYOUTS_DIR)) return [];

  return readdirSync(PAYOUTS_DIR)
    .filter((file) => file.endsWith(".csv"))
    .map((file) => ({
      filename: file,
      name: basename(file, ".csv"),
    }));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API: List payout files
  if (url.pathname === "/api/payouts") {
    const files = listPayoutFiles();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(files));
    return;
  }

  // API: Get specific payout file
  if (url.pathname.startsWith("/api/payouts/")) {
    const filename = decodeURIComponent(
      url.pathname.replace("/api/payouts/", "")
    );
    const filePath = join(PAYOUTS_DIR, filename);

    // Security: ensure we're not escaping the payouts directory
    if (!filePath.startsWith(PAYOUTS_DIR) || !existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "File not found" }));
      return;
    }

    try {
      const payouts = parsePayoutsCsv(filePath);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payouts));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to parse file" }));
    }
    return;
  }

  // Static files
  let filePath = join(
    __dirname,
    "public",
    url.pathname === "/" ? "index.html" : url.pathname
  );

  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎰  Keno Odds Simulator                                  ║
║                                                            ║
║   Server running at:  http://localhost:${PORT}               ║
║                                                            ║
║   Press Ctrl+C to stop                                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
});
