/**
 * Centralized MongoDB Atlas configuration + validation.
 *
 * SERVER-ONLY: import this module only from server code
 * (Route Handlers, Server Actions, instrumentation, scripts).
 * Never import it from "use client" components.
 *
 * Required env vars (single shared Atlas cluster format):
 *   MONGODB_URI      e.g. mongodb+srv://<username>:<password>@<cluster-url>/
 *   MONGODB_DB_NAME  e.g. jaadex_development | jaadex_production | jaadex_test
 *   NODE_ENV         development | production | test (set by Next.js / test runner)
 */

export type AppEnv = "development" | "production" | "test";

export interface MongoConfig {
  env: AppEnv;
  /** Full Atlas connection string. Never log this value. */
  uri: string;
  /** Database name selected for the current environment. Safe to log. */
  dbName: string;
}

const ALLOWED_ENVS: readonly AppEnv[] = ["development", "production", "test"];

function readEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `[mongodb] Missing required env var ${name}. ` +
        `Set it in .env.development / .env.test locally or in your host secret manager for production. ` +
        `See .env.example.`,
    );
  }
  return value;
}

function resolveEnv(): AppEnv {
  const raw = (process.env.NODE_ENV ?? "development").trim().toLowerCase();
  if (raw !== "development" && raw !== "production" && raw !== "test") {
    throw new Error(
      `[mongodb] Invalid NODE_ENV "${process.env.NODE_ENV}". Allowed values: ${ALLOWED_ENVS.join(", ")}.`,
    );
  }
  return raw;
}

/** Refuse when the DB name clearly belongs to a different environment. */
function assertDbMatchesEnv(env: AppEnv, dbName: string): void {
  const lower = dbName.toLowerCase();

  if (env === "production") {
    if (lower.includes("dev") || lower.includes("test") || lower.includes("local")) {
      throw new Error(
        `[mongodb] Refusing to start: NODE_ENV=production but MONGODB_DB_NAME="${dbName}" ` +
          `looks like a non-production database.`,
      );
    }
    return;
  }

  if (lower.includes("prod")) {
    throw new Error(
      `[mongodb] Refusing to start: NODE_ENV=${env} but MONGODB_DB_NAME="${dbName}" ` +
        `looks like a production database.`,
    );
  }

  if (env === "test" && !lower.includes("test")) {
    throw new Error(
      `[mongodb] Refusing to connect in tests: MONGODB_DB_NAME="${dbName}" ` +
        `does not clearly indicate a test database (expected e.g. jaadex_test).`,
    );
  }
}

/** Extra hard guard for the test runner: never touch dev/prod data. */
export function assertTestDatabase(dbName: string): void {
  const lower = dbName.toLowerCase();
  if (!lower.includes("test")) {
    throw new Error(
      `[mongodb] Tests must use their own database. Got MONGODB_DB_NAME="${dbName}".`,
    );
  }
  if (lower.includes("prod")) {
    throw new Error(
      `[mongodb] Tests must never touch production data. Got MONGODB_DB_NAME="${dbName}".`,
    );
  }
}

let cached: MongoConfig | null = null;

export function getMongoConfig(options: { bypassCache?: boolean } = {}): MongoConfig {
  if (cached && !options.bypassCache) return cached;

  const env = resolveEnv();
  const uri = readEnv("MONGODB_URI");
  const dbName = readEnv("MONGODB_DB_NAME");

  assertDbMatchesEnv(env, dbName);
  if (env === "test") assertTestDatabase(dbName);

  cached = { env, uri, dbName };
  return cached;
}

/** Test helper: clear memoised config between cases. */
export function __resetMongoConfigCache(): void {
  cached = null;
}
