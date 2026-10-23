import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getMongoConfig,
  assertTestDatabase,
  __resetMongoConfigCache,
} from "../mongodb-config.ts";

function withEnv(vars: Record<string, string | undefined>, fn: () => void | Promise<void>) {
  const prev = { ...process.env };
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  __resetMongoConfigCache();
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      process.env = prev;
      __resetMongoConfigCache();
    });
}

describe("mongodb-config env guards", () => {
  it("accepts a matching test database", async () => {
    await withEnv(
      { NODE_ENV: "test", MONGODB_URI: "mongodb+srv://u:p@cluster/", MONGODB_DB_NAME: "jaadex_test" },
      () => {
        const config = getMongoConfig({ bypassCache: true });
        assert.equal(config.env, "test");
        assert.equal(config.dbName, "jaadex_test");
      },
    );
  });

  it("refuses tests pointing at non-test databases", async () => {
    await withEnv(
      {
        NODE_ENV: "test",
        MONGODB_URI: "mongodb+srv://u:p@cluster/",
        MONGODB_DB_NAME: "jaadex_development",
      },
      () => {
        assert.throws(() => getMongoConfig({ bypassCache: true }), /test database/);
        assert.throws(() => assertTestDatabase("jaadex_production"), /own database|production/);
      },
    );
  });

  it("refuses production env with non-production db names", async () => {
    await withEnv(
      {
        NODE_ENV: "production",
        MONGODB_URI: "mongodb+srv://u:p@cluster/",
        MONGODB_DB_NAME: "jaadex_test",
      },
      () => {
        assert.throws(() => getMongoConfig({ bypassCache: true }), /non-production/);
      },
    );
  });

  it("refuses dev/test env pointing at production", async () => {
    await withEnv(
      {
        NODE_ENV: "development",
        MONGODB_URI: "mongodb+srv://u:p@cluster/",
        MONGODB_DB_NAME: "jaadex_production",
      },
      () => {
        assert.throws(() => getMongoConfig({ bypassCache: true }), /production database/);
      },
    );
  });

  it("fails fast when vars are missing or env is invalid", async () => {
    await withEnv({ NODE_ENV: "development", MONGODB_URI: "", MONGODB_DB_NAME: "" }, () => {
      assert.throws(() => getMongoConfig({ bypassCache: true }), /MONGODB_URI/);
    });
    await withEnv(
      {
        NODE_ENV: "staging",
        MONGODB_URI: "mongodb+srv://u:p@cluster/",
        MONGODB_DB_NAME: "jaadex_test",
      },
      () => {
        assert.throws(() => getMongoConfig({ bypassCache: true }), /Invalid NODE_ENV/);
      },
    );
  });
});
