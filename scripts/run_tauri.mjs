#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const scriptDir = dirname(filename);
const projectRoot = dirname(scriptDir);
const applyScript = resolve(scriptDir, "apply_runtime_libs.mjs");
const tauriArgs = process.argv.slice(2);
const tauriSubcommand = tauriArgs.find((arg) => arg === "dev" || arg === "build") ?? "";
const isDevOrBuild = tauriSubcommand === "dev" || tauriSubcommand === "build";

function runNodeScriptOrExit(commandArgs) {
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (isDevOrBuild && (process.platform === "linux" || process.platform === "win32")) {
  if (tauriSubcommand === "dev") {
    runNodeScriptOrExit([
      applyScript,
      "--platform",
      process.platform,
      "--mode",
      "dev",
      "--profile",
      "debug",
    ]);
  } else if (tauriSubcommand === "build") {
    const profile = tauriArgs.includes("--debug") ? "debug" : "release";
    runNodeScriptOrExit([
      applyScript,
      "--platform",
      process.platform,
      "--mode",
      "bundle",
      "--profile",
      profile,
    ]);
  }
}

const child =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", "tauri", ...tauriArgs], {
        cwd: projectRoot,
        stdio: "inherit",
        env: process.env,
      })
    : spawn("tauri", tauriArgs, {
        cwd: projectRoot,
        stdio: "inherit",
        env: process.env,
      });

child.on("error", (error) => {
  console.error(`[ERROR] Failed to run tauri: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
