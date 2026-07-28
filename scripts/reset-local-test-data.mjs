import { rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const testDirectory = path.resolve(process.cwd(), ".test-data");
const projectDirectory = path.resolve(process.cwd());

if (!testDirectory.startsWith(`${projectDirectory}${path.sep}`) || path.basename(testDirectory) !== ".test-data") {
  throw new Error("Refusing to reset a directory outside this project's .test-data folder.");
}

await rm(testDirectory, { force: true, recursive: true });

const result = spawnSync(
  process.execPath,
  ["scripts/generate-synthetic-connectors.mjs", "--output", ".test-data/local-dev-store.json"],
  { cwd: projectDirectory, stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
