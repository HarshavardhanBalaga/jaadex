/**
 * Next.js server startup hook. Validates MongoDB env config at boot
 * (fail-fast) without eagerly opening a connection during builds.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getMongoConfig } = await import("@/lib/mongodb-config");
    // Skip strict validation during `next build` when no env is provided;
    // runtime (dev/start/route) still validates on first DB use.
    if (process.env.NEXT_PHASE === "phase-production-build") return;
    const { env, dbName } = getMongoConfig();
    console.info(`[mongodb] Configured database "${dbName}" for ${env}`);
  }
}
