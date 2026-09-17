import fs from "node:fs";
import path from "node:path";

export default function globalSetup() {
  fs.rmSync(path.resolve(".e2e-data"), { recursive: true, force: true });
}
