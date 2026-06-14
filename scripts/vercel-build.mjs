import { spawnSync } from "node:child_process";

const dummyDatabaseUrl = "postgresql://unused:unused@localhost:5432/unused?schema=public";

process.env.DATABASE_URL ||= dummyDatabaseUrl;
process.env.DIRECT_URL ||= process.env.DATABASE_URL;

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "generate"]);
run("npx", ["next", "build"]);
