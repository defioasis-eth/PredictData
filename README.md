# PredictData

Prediction market analytics frontend built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and set your Dune API key:
   ```bash
   cp .env.example .env.local
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Deployment (Vercel)

1. Push this repo to GitHub.
2. In Vercel, import the repository.
3. Add the `DUNE_API_KEY` environment variable (Project Settings → Environment Variables).
4. Deploy. Vercel will run `npm run build` and serve the app.

## Notes

- Server-side route handlers proxy Dune API requests and cache responses for 60 seconds.
- Client components use the `/api/dune/[queryId]` endpoints for per-module loading and error states.
