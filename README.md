This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## MongoDB Atlas setup (Mongoose)

One shared Atlas cluster/URI format for every environment. The database name
is what separates environments — it always comes from env config, never from
hardcoded strings.

| Variable | Purpose | Example |
| --- | --- | --- |
| `MONGODB_URI` | Atlas connection string (server-only, never log it) | `mongodb+srv://<username>:<password>@<cluster-url>/` |
| `MONGODB_DB_NAME` | Database for the current environment | `jaadex_development` |
| `NODE_ENV` | Environment indicator (set by Next.js / test runner) | `development` |

Environment -> database:

| `NODE_ENV` | `MONGODB_DB_NAME` | Source |
| --- | --- | --- |
| `development` | `jaadex_development` | `.env.development` (local only) |
| `production` | `jaadex_production` | host secret manager (Vercel, etc.) |
| `test` | `jaadex_test` | `.env.test` (local only) |

### Local setup

```bash
cp .env.example .env.development
# edit .env.development with your real Atlas URI (keep MONGODB_DB_NAME=jaadex_development)
npm run dev
```

### Production (Vercel or similar)

Set these as secrets in the hosting provider — do not commit a `.env.production` file:

* `MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/`
* `MONGODB_DB_NAME=jaadex_production`

### Safety guards

`src/lib/mongodb-config.ts` fails fast when:

* `MONGODB_URI` or `MONGODB_DB_NAME` is missing/empty.
* `NODE_ENV` is not `development | production | test`.
* The DB name does not match the env (e.g. production with `*test*`, dev/test with `*prod*`).
* Tests run against a name that does not contain `test`.

Startup logs only `Connected to <dbName> in <env>` — never the URI.

### Usage (server-only)

```ts
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  await connectToDatabase();
  // ... use mongoose models
}
```

Never import `@/lib/mongodb` or `@/lib/mongodb-config` from `"use client"` code,
and never prefix Mongo vars with `NEXT_PUBLIC_`.

### Verify

```bash
npm test            # env-guard unit tests (no Atlas needed)
npm run verify:mongo
npm run lint
npx tsc --noEmit
npm run dev         # then GET http://localhost:3000/api/health
```

Expected health response:

```json
{ "status": "ok", "ok": true, "env": "development", "dbName": "jaadex_development" }
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
