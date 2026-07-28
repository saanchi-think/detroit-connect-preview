import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export function getLocalDataPath(fileName: string) {
  const configuredDirectory = process.env.DETROIT_CONNECT_DATA_DIR;
  const dataDirectory = configuredDirectory
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configuredDirectory)
    : path.join(process.cwd(), "data");

  return path.join(dataDirectory, fileName);
}

export async function writeLocalJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}
