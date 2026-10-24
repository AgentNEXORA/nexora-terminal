import fs from "node:fs";
import path from "node:path";

const file = process.argv[2] || process.env.COMMANDS_FILE || "commands.sample.json";
const resolved = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
const allowedEnv = new Set(["LANG", "LC_ALL", "TZ"]);
const allowedBuiltins = new Set(["runtime_info"]);
const placeholderPattern = /\{\{([a-zA-Z0-9_]+)\}\}/g;
const shellExecutables = new Set(["sh", "bash", "dash", "zsh", "fish", "cmd", "powershell", "pwsh"]);

function fail(message) {
  console.error(`commands validation failed: ${message}`);
  process.exitCode = 1;
}

let entries;
try {
  entries = JSON.parse(fs.readFileSync(resolved, "utf8"));
} catch (error) {
  fail(`unable to read ${resolved}: ${error.message}`);
  process.exit();
}
if (!Array.isArray(entries)) {
  fail("root value must be an array");
  entries = [];
}
const ids = new Set();
for (const [index, command] of entries.entries()) {
  const prefix = `entry ${index + 1}`;
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    fail(`${prefix} must be an object`);
    continue;
  }
  if (typeof command.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(command.id) || ids.has(command.id)) fail(`${prefix} has an invalid or duplicate id`);
  ids.add(command.id);
  if (typeof command.title !== "string" || !command.title.trim()) fail(`${prefix} requires title`);

  const hasBuiltin = typeof command.builtin === "string";
  if (command.builtin !== undefined && (!hasBuiltin || !allowedBuiltins.has(command.builtin))) fail(`${prefix}.builtin is not allowed`);
  if (hasBuiltin) {
    if (command.exec !== undefined || command.params !== undefined || command.cwd !== undefined || command.env !== undefined || command.internalJob !== undefined || command.serviceAction !== undefined) {
      fail(`${prefix} builtins cannot define exec, params, cwd, env, internalJob, or serviceAction`);
    }
  } else {
    if (typeof command.exec !== "string" || !command.exec.trim()) fail(`${prefix} requires exec`);
    else {
      if (!path.isAbsolute(command.exec)) fail(`${prefix}.exec must be an absolute path`);
      if (shellExecutables.has(path.basename(command.exec).toLowerCase())) fail(`${prefix} cannot execute a shell interpreter`);
    }
    if (command.params !== undefined && (!Array.isArray(command.params) || !command.params.every((value) => typeof value === "string"))) fail(`${prefix}.params must be an array of strings`);
    if (command.cwd !== undefined && (typeof command.cwd !== "string" || !path.isAbsolute(command.cwd))) fail(`${prefix}.cwd must be an absolute path`);
    if (command.env !== undefined) {
      if (!command.env || typeof command.env !== "object" || Array.isArray(command.env)) fail(`${prefix}.env must be an object`);
      for (const [key, value] of Object.entries(command.env || {})) {
        if (!allowedEnv.has(key) || typeof value !== "string" || value.length > 200) fail(`${prefix}.env contains a disallowed key or value`);
      }
    }
    const placeholders = new Set();
    for (const param of command.params || []) {
      for (const match of param.matchAll(placeholderPattern)) placeholders.add(match[1]);
    }
    if (command.internalJob === true && placeholders.size) fail(`${prefix} internalJob entries cannot contain placeholders`);
  }
  if (command.timeoutMs !== undefined && (!Number.isInteger(command.timeoutMs) || command.timeoutMs < 1000 || command.timeoutMs > 300000)) fail(`${prefix}.timeoutMs must be an integer between 1000 and 300000`);
  if (command.serviceAction !== undefined && !hasBuiltin) {
    const action = command.serviceAction;
    if (!action || !["start", "stop", "restart"].includes(action.operation) || typeof action.service !== "string" || !action.service.trim() || action.service.length > 100) fail(`${prefix}.serviceAction is invalid`);
  }
}
if (!process.exitCode) console.log(`commands validation passed: ${entries.length} entr${entries.length === 1 ? "y" : "ies"} in ${resolved}`);
