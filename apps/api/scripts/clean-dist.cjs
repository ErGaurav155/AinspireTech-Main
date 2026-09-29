const fs = require("node:fs");
const path = require("node:path");

const apiRoot = path.resolve(__dirname, "..");
const distDirectory = path.resolve(apiRoot, "dist");

if (
  path.dirname(distDirectory) !== apiRoot ||
  path.basename(distDirectory) !== "dist"
) {
  throw new Error(`Refusing to clean unexpected path: ${distDirectory}`);
}

fs.rmSync(distDirectory, { recursive: true, force: true });
