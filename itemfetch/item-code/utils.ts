import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export function stripMinecraftNamespace(id: string): string {
  return id.startsWith("minecraft:") ? id.slice("minecraft:".length) : id;
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function fetchJsonOptional<T>(url: string): Promise<T | null> {
  const response = await fetch(url);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function downloadFile(url: string, destinationPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, bytes);
}

export async function sha1File(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  return createHash("sha1").update(bytes).digest("hex");
}

export async function runExec(
  command: string,
  args: string[],
  options?: { cwd?: string; maxBuffer?: number },
): Promise<string> {
  const result = await execFile(command, args, {
    cwd: options?.cwd,
    encoding: "utf8",
    maxBuffer: options?.maxBuffer ?? 128 * 1024 * 1024,
  });
  return result.stdout;
}
