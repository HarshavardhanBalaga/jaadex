/**
 * Single shared Mongoose connection (singleton / cached).
 *
 * SERVER-ONLY: import from Route Handlers, Server Actions,
 * instrumentation, or scripts. Never from client components.
 */

import mongoose from "mongoose";
import { getMongoConfig } from "@/lib/mongodb-config";

interface MongooseGlobal {
  __jaadexMongoosePromise?: Promise<typeof mongoose>;
}

const globalForMongoose = globalThis as MongooseGlobal;

const CONNECT_OPTIONS = {
  dbName: undefined as string | undefined, // set per env from MONGODB_DB_NAME below
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 10_000,
  retryWrites: true,
} satisfies mongoose.ConnectOptions;

/** Connect once and reuse the connection across hot-reloads / invocations. */
export async function connectToDatabase(): Promise<typeof mongoose> {
  const { env, uri, dbName } = getMongoConfig();

  if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) {
    return mongoose;
  }

  if (!globalForMongoose.__jaadexMongoosePromise) {
    mongoose.set("strictQuery", true);
    globalForMongoose.__jaadexMongoosePromise = mongoose
      .connect(uri, { ...CONNECT_OPTIONS, dbName })
      .then((client) => {
        // Safe startup log: env + db name only, never the URI/credentials.
        console.info(`[mongodb] Connected to ${client.connection.name} in ${env}`);
        return client;
      })
      .catch((error: unknown) => {
        globalForMongoose.__jaadexMongoosePromise = undefined;
        throw error instanceof Error
          ? error
          : new Error(`[mongodb] Connection failed: ${String(error)}`);
      });
  }

  return globalForMongoose.__jaadexMongoosePromise;
}

/** Convenience accessor for the env-selected database connection. */
export async function getDb(): Promise<mongoose.Connection> {
  const client = await connectToDatabase();
  return client.connection;
}

/** Lightweight health check for the /api/health route. */
export async function checkMongoHealth(): Promise<{ ok: boolean; env: string; dbName: string }> {
  const client = await connectToDatabase();
  await client.connection.db?.admin().ping();
  return { ok: true, env: process.env.NODE_ENV ?? "development", dbName: client.connection.name };
}

/** Graceful shutdown (scripts / long-lived servers). */
export async function closeMongoConnection(): Promise<void> {
  globalForMongoose.__jaadexMongoosePromise = undefined;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

if (typeof process !== "undefined" && process.once) {
  const shutdown = () => {
    closeMongoConnection().catch(() => undefined);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
