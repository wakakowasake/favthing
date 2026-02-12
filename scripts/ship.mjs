import { execFileSync } from "node:child_process";

function resolveCommand(command) {
  if (process.platform !== "win32") return command;
  if (command === "npm" || command === "npx") return `${command}.cmd`;
  return command;
}

function run(command, args, options = {}) {
  execFileSync(resolveCommand(command), args, {
    stdio: "inherit",
    ...options,
  });
}

function capture(command, args, options = {}) {
  return execFileSync(resolveCommand(command), args, {
    encoding: "utf8",
    ...options,
  }).trim();
}

function captureBuffer(command, args, options = {}) {
  return execFileSync(resolveCommand(command), args, {
    encoding: "buffer",
    ...options,
  });
}

function defaultCommitMessage() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `chore: auto ship ${y}-${m}-${d} ${hh}:${mm}`;
}

function getStagedFiles() {
  const output = capture("git", ["diff", "--cached", "--name-only"]);
  if (!output) return [];
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function runSafetyCheck(stagedFiles) {
  const blockedFileRules = [
    /^\.env(?:\.|$)/i,
    /firebase-adminsdk.*\.json$/i,
    /\.pem$/i,
    /\.p12$/i,
    /id_rsa/i,
    /^firestore-debug\.log$/i,
    /^dataconnect-debug\.log$/i,
    /^pglite-debug\.log$/i,
  ];

  const secretRules = [
    { name: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
    { name: "OpenAI API key", regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
    { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
    { name: "Private key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
    { name: "Naver client secret", regex: /NAVER_CLIENT_SECRET\s*=\s*[^\s]+/g },
  ];

  const blockedFiles = stagedFiles.filter((file) =>
    blockedFileRules.some((rule) => rule.test(file))
  );

  if (blockedFiles.length > 0) {
    throw new Error(
      `Blocked sensitive files in staged changes:\n- ${blockedFiles.join("\n- ")}`
    );
  }

  const hits = [];
  for (const file of stagedFiles) {
    let content = "";
    try {
      const raw = captureBuffer("git", ["show", `:${file}`], {
        stdio: ["pipe", "pipe", "ignore"],
      });
      content = raw.toString("utf8");
    } catch {
      continue;
    }

    for (const rule of secretRules) {
      if (rule.regex.test(content)) {
        hits.push(`${file} -> ${rule.name}`);
      }
      rule.regex.lastIndex = 0;
    }
  }

  if (hits.length > 0) {
    throw new Error(`Possible secrets detected in staged files:\n- ${hits.join("\n- ")}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const skipDeploy = args.includes("--no-deploy");
  const commitParts = args.filter((arg) => arg !== "--no-deploy");
  const commitMessage =
    commitParts.length > 0 ? commitParts.join(" ").trim() : defaultCommitMessage();

  try {
    capture("git", ["rev-parse", "--is-inside-work-tree"]);
  } catch {
    throw new Error("Not a git repository.");
  }

  console.log("[ship] Stage all changes");
  run("git", ["add", "-A"]);

  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    console.log("[ship] No staged changes. Nothing to ship.");
    return;
  }

  console.log("[ship] Security checks on staged files");
  runSafetyCheck(stagedFiles);

  if (!skipDeploy) {
    console.log("[ship] Deploy all");
    run("npm", ["run", "deploy:all"]);
  } else {
    console.log("[ship] Skip deploy (--no-deploy)");
  }

  console.log("[ship] Commit");
  run("git", ["commit", "-m", commitMessage]);

  console.log("[ship] Push");
  run("git", ["push"]);

  console.log("[ship] Complete");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ship] Failed: ${message}`);
  process.exit(1);
}
