/**
 * Zero-dependency verification for the MongoDB env guards (no Atlas needed).
 * Run: npm run verify:mongo
 */
Object.assign(process.env, {
  NODE_ENV: "test",
  MONGODB_URI: "mongodb+srv://user:pass@cluster/",
  MONGODB_DB_NAME: "jaadex_test",
});

async function main() {
  const { getMongoConfig } = await import("../src/lib/mongodb-config.ts");
  const config = getMongoConfig({ bypassCache: true });
  console.info(`[verify:mongo] OK — env=${config.env} dbName=${config.dbName} (URI hidden)`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
