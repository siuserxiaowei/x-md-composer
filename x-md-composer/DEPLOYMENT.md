# Deployment

X Markdown Composer can run as a static website. The current product path does not need a server, database, X token, or X API credentials.

## Static Hosting

Use the normal Vite static build:

```bash
npm install
npm run build
```

Deploy the generated `dist/` directory.

### Vercel

- Import the repository.
- Framework preset: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- No environment variables are required for the no-token app.

### Cloudflare Pages

- Connect the repository.
- Framework preset: Vite, or configure manually.
- Build command: `npm run build`.
- Build output directory: `dist`.
- No environment variables are required.

### GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

- The workflow installs dependencies in `x-md-composer/`.
- It runs `npm test`.
- It builds the static site with Vite.
- It uploads `x-md-composer/dist/` to GitHub Pages.
- The workflow sets `PAGES_BASE` to `/${repository-name}/`, which matches the normal project Pages URL.

For a user or organization site at the domain root, build with `PAGES_BASE=/` instead. For a custom path, set `PAGES_BASE` or `BASE_PATH` before `npm run build`.

Local build with a custom base path:

```bash
PAGES_BASE=/your-repo-name/ npm run build
```

## Privacy And Security

- Conversion runs in the browser.
- Draft text and selected mode are stored in local browser storage.
- X credentials, X API tokens, and cookies are not requested by this app.
- The app does not publish, schedule, or upload media to X.
- Static hosts will still serve the app files and may collect normal access logs.
- Remote image URLs may be requested by the user's browser when copying or downloading image assets.

Do not add X API tokens to the static frontend. If a future feature needs credentials, put them behind a backend service with explicit account connection and publishing controls.

## Image Limits

Browser-only image fetching is limited by the remote host:

- CORS can block downloads even when the image displays in the browser.
- Hotlink protection, auth, cookies, signed URLs, and rate limits can prevent asset packing.
- Failed image fetches should fall back to URL references for manual retrieval.

The recommended workflow is to paste the prepared body into X, then upload images manually from local files or from the original source URLs.

## Optional Backend Image Proxy

A future backend image proxy could improve publish packs by fetching images server-side when browser CORS blocks them.

Tradeoffs:

- Pros: fewer failed image downloads, cleaner ZIP packs, better handling for some image hosts.
- Cons: server cost, abuse/rate-limit risk, copyright and privacy responsibilities, URL logging, and stricter security requirements.

If added, keep it optional and separate from the no-token static app. The proxy should not require X credentials unless it also performs X media uploads.

## Optional X API Mode

Auto-publishing, media upload, scheduling, or account connection requires X API credentials and user authorization. Treat that as a separate paid/API mode, not the default static website experience.
