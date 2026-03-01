import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "child_process";
import fs from "fs";
import https from "https";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8787;
const COMMANDS_FILE = process.env.COMMANDS_FILE || "./commands.json";

/**
 * Basic hardening:
 * - Only runs whitelisted commands from commands.json
 * - Replaces {{placeholders}} with user-provided args (string-limited)
 * - Optional extra guard: rejects shell metacharacters in args
 */
const DANGEROUS = /[;&|`$<>]/g;

function loadCommands() {
  if (!fs.existsSync(COMMANDS_FILE)) return [];
  const raw = fs.readFileSync(COMMANDS_FILE, "utf-8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function getCommandById(id) {
  const cmds = loadCommands();
  return cmds.find((c) => c.id === id);
}

function sanitizeArg(v) {
  const s = (v === undefined || v === null) ? "" : String(v);
  const clipped = s.slice(0, 800);
  if (DANGEROUS.test(clipped)) {
    throw new Error("Argument contains disallowed characters.");
  }
  return clipped;
}

function ghRequest(method, p, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: "api.github.com",
      path: p,
      method,
      headers: {
        "User-Agent": "nexora-bridge",
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": data ? Buffer.byteLength(data) : 0
      }
    }, (res) => {
      let buf = "";
      res.on("data", (d) => buf += d.toString());
      res.on("end", () => {
        try {
          const j = buf ? JSON.parse(buf) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(j);
          else reject(new Error(j?.message || String(res.statusCode)));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function ghGetSha(owner, repo, path, branch, token) {
  const j = await ghRequest("GET", `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`, token);
  return j?.sha || null;
}

async function ghPutContent(owner, repo, path, branch, token, content, message, sha) {
  const body = {
    message: message || "Update via NEXORA Bridge",
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch
  };
  if (sha) body.sha = sha;
  return await ghRequest("PUT", `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, token, body);
}
app.get("/health", (_req, res) => res.json({ ok: true, service: "nexora-bridge" }));

app.get("/api/commands", (_req, res) => {
  const cmds = loadCommands().map(({ id, title, description, exampleArgs }) => ({
    id,
    title,
    description,
    exampleArgs: exampleArgs || {},
  }));
  res.json({ commands: cmds });
});

app.post("/api/run", async (req, res) => {
  try {
    const { commandId, args } = req.body || {};
    if (!commandId) return res.status(400).json({ error: "commandId is required" });

    const cmd = getCommandById(commandId);
    if (!cmd) return res.status(404).json({ error: "Command not found" });

    const safeArgs = args && typeof args === "object" ? args : {};

    const finalParams = (cmd.params || []).map((p) => {
      if (typeof p !== "string") return "";
      return p.replace(/\{\{(\w+)\}\}/g, (_, k) => sanitizeArg(safeArgs[k]));
    });

    const timeoutMs = Math.min(Number(cmd.timeoutMs || 120000), 300000);

    // NOTE: cmd.exec is typically "bash" with ["-lc", "..."] to support quoted args,
    // but the command body is still controlled by whitelist.
    const child = spawn(cmd.exec, finalParams, {
      cwd: cmd.cwd || process.cwd(),
      env: { ...process.env, ...(cmd.env || {}) },
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(killTimer);
      res.json({ ok: code === 0, code, stdout, stderr });
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

app.post("/api/github/sync-commands", async (_req, res) => {
  try {
    const owner = process.env.GITHUB_OWNER || "";
    const repo = process.env.GITHUB_REPO || "";
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.GITHUB_TOKEN || "";
    const dest = process.env.GITHUB_PATH || "backend/commands.json";
    if (!owner || !repo || !token) return res.status(400).json({ ok: false, error: "Missing GitHub configuration" });
    const content = fs.existsSync(COMMANDS_FILE) ? fs.readFileSync(COMMANDS_FILE, "utf-8") : "[]";
    const sha = await ghGetSha(owner, repo, dest, branch, token).catch(() => null);
    const r = await ghPutContent(owner, repo, dest, branch, token, content, "Sync commands.json", sha);
    const url = r?.content?.html_url || "";
    res.json({ ok: true, url, message: `Synced to ${owner}/${repo}:${branch}/${dest}` });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

function runGit(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd: cwd || process.cwd(), shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

app.post("/api/github/create-repo", async (_req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN || "";
    const repo = process.env.GITHUB_REPO || "";
    const isPrivate = String(process.env.GITHUB_PRIVATE || "true") === "true";
    if (!token || !repo) return res.status(400).json({ ok: false, error: "Missing GitHub token or repo" });
    const body = { name: repo, private: isPrivate, auto_init: false };
    const j = await ghRequest("POST", "/user/repos", token, body).catch((e) => {
      const msg = String(e?.message || "");
      if (msg.includes("already exists")) return { ok: true };
      throw e;
    });
    res.json({ ok: true, message: "Repository ensured" });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

app.post("/api/github/connect", async (_req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN || "";
    const owner = process.env.GITHUB_OWNER || "";
    const repo = process.env.GITHUB_REPO || "";
    const branch = process.env.GITHUB_BRANCH || "main";
    const remoteName = process.env.GIT_REMOTE_NAME || "origin";
    const userName = process.env.GIT_USER_NAME || "NEXORA";
    const userEmail = process.env.GIT_USER_EMAIL || "noreply@nexora.local";
    if (!token || !owner || !repo) return res.status(400).json({ ok: false, error: "Missing GitHub configuration" });
    const url = `https://${token}@github.com/${owner}/${repo}.git`;
    await runGit(["init"]);
    await runGit(["config", "user.name", userName]);
    await runGit(["config", "user.email", userEmail]);
    const addRemote = await runGit(["remote", "add", remoteName, url]);
    if (addRemote.code !== 0) await runGit(["remote", "set-url", remoteName, url]);
    await runGit(["add", "-A"]);
    await runGit(["commit", "-m", "Initial commit"]).catch(() => {});
    await runGit(["branch", "-M", branch]);
    res.json({ ok: true, message: "Connected to remote" });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});

app.post("/api/github/push", async (_req, res) => {
  try {
    const remoteName = process.env.GIT_REMOTE_NAME || "origin";
    const branch = process.env.GIT_BRANCH || process.env.GITHUB_BRANCH || "main";
    const r = await runGit(["push", "-u", remoteName, branch]);
    res.json({ ok: r.code === 0, code: r.code, stdout: r.stdout, stderr: r.stderr });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e?.message || e) });
  }
});
app.listen(PORT, () => {
  console.log(`NEXORA Bridge listening on :${PORT}`);
  console.log(`Commands file: ${COMMANDS_FILE}`);
});
