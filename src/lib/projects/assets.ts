import "server-only";
import fs from "node:fs";
import path from "node:path";

// True when a file exists under /public. Runs on the server only, so a missing
// photo shows a placeholder instead of breaking the build.
export function assetExists(publicPath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", publicPath));
}
