# X Markdown Composer

Markdown to X Articles and X thread composer for no-token publishing.

The project prepares paste-ready content and downloadable publishing assets in the browser. It does not publish through the X API, store API keys, or automate your logged-in X session.

## Product Paths

| Path | Use it for | X access | Limits |
| --- | --- | --- | --- |
| Web app | Safest default workflow: static browser app for converting Markdown, copying bodies, and building manual publish packs. | No account access, no X API, no tokens. | Manual publish only: you paste into X and upload media yourself. |
| Extension helper | Optional helper inside the X Article UI when the extension is installed. | No X API and no stored X credentials; it works in the logged-in page you already opened. | Depends on X page structure. The MVP can try editor insertion or clipboard fallback, but does not upload media, click publish, schedule, or manage accounts. |
| API mode | Not implemented. | Would require a backend, X developer app, user authorization, and secret handling. | Only needed for auto-posting, media upload through X, scheduling, or account connection. |

## Recommended Manual Workflow

1. Open the local app or hosted static site.
2. Paste or write Markdown, import a `.md` / `.markdown` file, or drag a Markdown file onto the page.
3. Optionally set frontmatter metadata: `title` or `标题` for the article title, and `cover` or `封面` for the cover image.
4. Choose Article mode for one long-form X Article, or Thread mode for multiple X posts.
5. Attach local images from asset cards, or use the asset-folder matching workflow when it is available in your build.
6. Copy the prepared body or download the publish pack.
7. Open X in a normal browser tab and paste into the official composer.
8. Upload images, code screenshots, and table screenshots manually from the asset list or downloaded publish pack.
9. Confirm detected tweet embeds in X, preview, then publish yourself.

This workflow is intentionally manual. It avoids X API tokens, developer app setup, write permissions, post caps, and media upload API steps. The tradeoff is that it cannot schedule, auto-publish, or attach media for you. The optional extension helper can reduce copy/paste friction, but final review and publishing still happen in X.

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

Markdown import and metadata:

- Use `Import .md` to load `.md`, `.markdown`, or `text/markdown` files.
- Dragging a Markdown file onto the page imports it into the editor. Dropping onto an image card remains reserved for attaching a local image to that asset.
- Article title comes from frontmatter `title` / `标题`, then falls back to the first Markdown heading.
- Article cover comes from frontmatter `cover` / `封面`, then falls back to the first image when no cover is declared.
- X/Twitter status links such as `https://x.com/user/status/123` or `https://twitter.com/user/status/123` are detected as tweet embeds and listed for manual confirmation. X decides whether pasted links render as embed cards.

Local image workflow:

- You can attach local files on individual image cards; those local files are preferred in ZIP packs.
- `Import asset folder` can match Markdown image paths such as `./assets/hero.png` to a selected local folder by normalized path or filename. This is a local packing convenience, not a media upload to X.
- Local asset matching should be checked in the publish panel before posting, especially when two files share the same basename.

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

### Smart Formatting

Article mode applies a deterministic, local editing pass before rich copy:

- Lead lines ending in `：` become bold.
- Numbered standalone resource names become section headings.
- Field labels such as `网址：`, `推荐理由：`, `亮点：`, and `场景：` become bold.
- Common AI/tool/product terms and key phrases become bold.
- `我的结论：`, `核心观点：`, `引用：`, and quoted sentences become blockquotes.
- Bare domains become safe HTTPS links.

Explicit Markdown wins. Use `**manual bold**`, `> quote`, headings, and links when you want exact control.

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
- `metadata.json`: title, cover, image, table, tweet embed, and generation metadata for tooling or review.
- `publish-checklist.md`: a concise manual checklist for pasting the body, uploading media, confirming tweet embeds, previewing, and publishing yourself.
- `manifest.md`: stats, file list, image list, and code-block list.
- `assets/code/*.txt`: original fenced code block text.
- `assets/code/*.png`: browser-rendered PNG screenshot for each code block.
- `assets/tables/*.csv`: extracted Markdown tables.
- `assets/tables/*.txt`: readable table text.
- `assets/tables/*.png`: browser-rendered PNG screenshot for each table.
- `assets/images/*`: local attachments or fetched image copies when available.
- `assets/images/*.url.txt`: original image URL when the remote site blocks browser fetch.

Thread pack:

- `thread.txt`: each post in order, separated by dividers.
- `manifest.md`: post count and max-character checklist.

The CLI can emit a manifest with `--format=manifest`, but it does not create ZIP files or PNG assets because those require browser features.

## Optional Extension Helper

The extension helper is separate from the static web app. It is optional and only useful when you want help inside the official X Article composer.

When the helper is included in your checkout or release package:

1. Install it as an unpacked Chrome extension during development, or from the Chrome Web Store after a reviewed release exists.
2. Open an X Article composer page.
3. Use the helper to import Markdown, attempt rich insertion into the editor, or copy HTML/plain text as a fallback.
4. Upload media manually and publish manually in X.

MVP limitations:

- It has no X API integration and should not request API keys.
- It depends on X's current page structure and editor behavior, so direct insertion can break when X changes the UI.
- Clipboard fallback is expected for some browsers, permissions, or editor states.
- It does not auto-publish, click the publish button, upload media, schedule posts, or connect accounts.

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
- Article tables are listed separately and can be copied as text, copied as CSV, or rendered as PNG screenshots.
- Article plain text strips Markdown markers.
- Thread mode turns Markdown links into `label: URL`.
- Thread posts are split by manual breaks, paragraphs, sentences, then characters.
- Character counting uses `twitter-text`.
