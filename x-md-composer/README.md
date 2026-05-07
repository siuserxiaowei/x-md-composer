# X Markdown Composer

Markdown to X Articles and X thread composer for no-token publishing.

The project prepares paste-ready content and downloadable publishing assets in the browser. It does not publish through the X API, store API keys, or automate your logged-in X session.

## Recommended Manual Workflow

1. Open the local app or hosted static site.
2. Paste or write Markdown in the editor.
3. Choose Article mode for one long-form X Article, or Thread mode for multiple X posts.
4. Copy the prepared body.
5. Open X in a normal browser tab and paste into the official composer.
6. Upload images or code screenshots manually from the asset list or downloaded publish pack.
7. Review in X, then publish yourself.

This workflow is intentionally manual. It avoids X API tokens, developer app setup, write permissions, post caps, and media upload API steps. The tradeoff is that it cannot schedule, auto-publish, prefill the X composer, or attach media for you.

## Online Static Site

The web app can be deployed as a static site to hosts such as Vercel, Cloudflare Pages, or GitHub Pages. A static deployment still does not need an X token or X API access because all conversion work runs in the user's browser.

You only need X API credentials if you add a backend feature that auto-publishes posts, uploads media through X's media API, schedules posts, or stores connected X accounts. Those features are outside the current no-token product path.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for static hosting steps and privacy notes.

## Use The Web App

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

The app stores the current draft and mode in local browser storage. X credentials and API tokens are not requested.

Image handling has browser limits:

- Remote images can be copied or packed only when the image host allows browser fetches.
- Some image hosts block asset downloads with CORS, hotlink protection, auth, or expiring URLs.
- Private images, paywalled images, and images behind cookies usually need to be downloaded manually.
- When a browser fetch fails, the publish pack keeps the original URL so you can open or retrieve the asset yourself.

## Convert A File

```bash
npm run convert -- path/to/post.md
npm run convert -- path/to/post.md --mode=article --format=html --out=x-article.html
npm run convert -- path/to/post.md --mode=article --format=manifest --out=manifest.md
npm run convert -- path/to/post.md --mode=thread --max=280 --numbering=suffix --stats --out=x-thread.txt
```

CLI options:

- `--mode=article`: output one long-form article body. This is the default.
- `--mode=thread`: split the source into X-sized posts.
- `--format=plain`: article plain text output. This is the article default.
- `--format=html`: article HTML backup for rich-text editors.
- `--format=manifest`: publish-pack manifest/checklist for either mode.
- `--format=text`: thread text output. This is the thread default.
- `--max=280`: thread weighted character limit per post, from `80` to `25000`.
- `--numbering=suffix`: thread numbering style: `suffix`, `prefix`, or `none`.
- `--no-numbering`: shortcut for `--numbering=none`.
- `--stats`: print conversion stats to stderr without mixing them into the output file.
- `--out=FILE`: write converted output to a file.

The CLI is dependency-light and Node-only. It does not use browser APIs, X API tokens, clipboard APIs, fetch, canvas, or ZIP generation. Use the web app when you need the browser-generated publish pack with PNG image/code assets.

## Article Mode

Article mode is for X Articles or other long-form editors where you want one complete piece instead of a post split.

- Keeps one article in source order.
- Rich copy preserves headings, bold, lists, quotes, and links as HTML clipboard content in the web app.
- Plain text output strips Markdown syntax so pasted fallback text does not show raw markers.
- Markdown images become `[图片 N: label]` placeholders in the article body and are listed as separate assets.
- Fenced code blocks become `[代码块 N: lang]` placeholders and are listed as separate assets.
- Manual thread break comments are ignored as post breaks in Article mode.

## Thread Mode

Thread mode is for standard X post sequences.

- Splits Markdown into multiple posts by manual breaks, paragraphs, sentences, then characters.
- Uses `twitter-text` weighted character counting.
- Converts Markdown links into `label: URL` so they survive plain-text posting.
- Converts images into plain text references.
- Supports suffix, prefix, or no numbering.

Manual post breaks are supported in Thread mode with any of these comments:

```markdown
<!-- tweet -->
<!-- thread -->
<!-- x-post -->
<!-- post -->
```

## Publish Packs

The web app can download a ZIP publish pack. This is a handoff bundle for manual posting, not an API payload.

Article pack:

- `article.txt`: paste-friendly plain text body.
- `article.html`: rich text backup.
- `manifest.md`: stats, file list, image list, and code-block list.
- `assets/code/*.txt`: original fenced code block text.
- `assets/code/*.png`: browser-rendered PNG screenshot for each code block.
- `assets/images/*`: local attachments or fetched image copies when available.
- `assets/images/*.url.txt`: original image URL when the remote site blocks browser fetch.

Thread pack:

- `thread.txt`: each post in order, separated by dividers.
- `manifest.md`: post count and max-character checklist.

The CLI can emit a manifest with `--format=manifest`, but it does not create ZIP files or PNG assets because those require browser features.

## X API Limitations

This project avoids the X API on purpose.

- X's current API docs describe post creation through `POST /2/tweets`, which requires a developer app and user access token.
- API media posting is a separate flow: upload media first, receive a media ID, then attach it to a post creation request.
- X counts post length with weighted rules: URLs count as 23 characters, and emoji/CJK characters can count as 2. The converter uses `twitter-text` for this.
- X's help page documents Articles as an x.com composer workflow for eligible Premium/Premium+ or business/organization accounts. This app prepares content for that UI workflow; it does not claim to publish Articles through an API.

References checked on 2026-05-06:

- [X Articles help](https://help.x.com/en/using-x/articles)
- [X API Manage Posts](https://docs.x.com/x-api/posts/manage-tweets/introduction)
- [X API Create Post quickstart](https://docs.x.com/x-api/posts/manage-tweets/quickstart)
- [X character counting](https://docs.x.com/fundamentals/counting-characters)
- [X API media introduction](https://docs.x.com/x-api/media/introduction)

## Conversion Rules

- Article rich copy keeps headings, bold, lists, quotes, and links as HTML clipboard content.
- Article body replaces Markdown images and fenced code blocks with placeholders because X's official editor generally expects images and screenshots to be uploaded as media.
- Article image assets are listed separately for URL copy, image copy, opening, or pack download.
- Article code blocks are listed separately and can be copied as text or rendered as PNG screenshots in the web app.
- Article plain text strips Markdown markers.
- Thread mode turns Markdown links into `label: URL`.
- Thread posts are split by manual breaks, paragraphs, sentences, then characters.
- Character counting uses `twitter-text`.
