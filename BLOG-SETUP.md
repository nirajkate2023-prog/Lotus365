# Lotus365 Blog — Setup & Publishing Guide

The blog is a static feature: posts live in `content/blog/posts.json` and are rendered in the
browser by vanilla JavaScript. No database and no server-side code are required, so it works on
Hostinger/Apache exactly like the rest of the site.

## What was added

| File | Purpose |
| --- | --- |
| `blog.html` | Blog index: featured story, category filters, search, paginated grid. Served at `/blog`. |
| `blog-post.html` | Single article view at `/blog-post?slug=<slug>`. Updates title, meta, canonical, Open Graph and injects `BlogPosting` JSON-LD. |
| `blog-studio.html` | Private editor at `/blog-studio`. Write, preview and publish posts. |
| `content/blog/posts.json` | The post store. All posts, newest first is handled client-side. |
| `js/blog-core.js` | Shared helpers: safe HTML escaping, Markdown renderer, post loading. |
| `js/blog.js` | Blog index controller. |
| `js/blog-post.js` | Single article controller. |
| `js/blog-studio.js` | Blog Studio controller (GitHub Contents API publishing). |
| `css/blog.css` | Blog + studio styles, using the existing design tokens. |
| `images/blog/*.svg` | Four cover illustrations used by the seed posts. |

Also updated: `Blog` link in the navigation and footer of every page, `sitemap.xml`, `robots.txt`
(studio blocked from crawlers) and `.htaccess` (no-store caching for `posts.json`, `noindex`
header for the studio).

## How to sign in and post (one-time setup)

Publishing is done from the browser and writes straight to this GitHub repository. The only
credential is a **fine-grained personal access token** that you create yourself — it is never
stored in the repository and never sent anywhere except `api.github.com`.

1. Open `https://github.com/settings/personal-access-tokens/new`.
2. **Token name:** `Lotus365 Blog Studio`.
3. **Expiration:** 90 days (regenerate when it expires).
4. **Repository access:** *Only select repositories* → `Lotus365`.
5. **Permissions → Repository permissions → Contents:** `Read and write`. Leave everything else
   as *No access*.
6. Generate the token and copy it (it is shown once).
7. Open `https://lotus365slot.com/blog-studio` (or `blog-studio.html` locally).
8. Paste the token into **1. Publishing connection**, optionally tick *Remember token in this
   browser*, then click **Connect & load posts**. The status line should read
   `Connected to nirajkate2023-prog/Lotus365 (main).`

That is the access you asked for: this page is the blog admin. It is `noindex` and not linked
from the public navigation, but it is not behind a password — the token is what authorises
publishing. Anyone without the token can draft locally but cannot commit anything.

## Writing and publishing

1. Click **+ New post**.
2. Fill in the title — the URL slug is generated automatically (edit it if you want a custom URL).
3. Choose a category (free text, existing categories are suggested in the dropdown).
4. Add a cover path such as `images/blog/aviator-cover.svg` or an absolute `https://` URL.
   Leave it blank for an automatic gradient placeholder.
5. Write the body in Markdown; the right-hand pane renders a live preview.
6. Tick/untick **Published** to keep a post hidden, and **Feature on the blog index** to make it
   the large hero story.
7. Click **Publish post** (or press `Ctrl/⌘ + S`).

Publishing commits `content/blog/posts.json` with a message like
`blog: publish "Your title"`. Editing and deleting work the same way.

### Deployment note

A commit to GitHub only updates the live site if your host deploys from the repository.

- **Git deployment (Hostinger Git / cPanel):** pull or wait for the automatic deploy, then the
  post is live at `/blog`.
- **Manual FTP/file-manager upload:** after publishing, click **Download posts.json** in the
  studio and upload that file to `public_html/content/blog/posts.json`.

The studio still works without a token — it keeps drafts locally and lets you download
`posts.json` for manual upload.

## Markdown supported in the editor

```
# Section heading
## Section heading (same size)
### Sub-heading

**bold**  *italic*  `inline code`  ~~strike~~

[link text](/games)  [external](https://example.com)

- bullet item
- another item

1. numbered item
2. another item

> blockquote

Fenced code block: three backticks, the code, then three backticks
```

Raw HTML is escaped, not rendered — this keeps the page safe if an editor account is ever
compromised.

## Post data format

```json
{
  "version": 1,
  "site": "https://lotus365slot.com",
  "updated": "2026-11-16T00:00:00.000Z",
  "categories": ["Aviator & Crash", "Cricket & Sports", "Card Games", "Slots", "Safety & Trust", "Platform News"],
  "posts": [
    {
      "id": "post-aviator-bankroll",
      "slug": "aviator-crash-game-bankroll-guide",
      "title": "Aviator Crash Games: A Practical Guide to Bankroll Control",
      "excerpt": "Card and social preview summary.",
      "category": "Aviator & Crash",
      "tags": ["Aviator", "Bankroll", "Strategy"],
      "author": "Lotus365 Editorial",
      "date": "2026-11-14T09:30:00.000Z",
      "cover": "images/blog/aviator-cover.svg",
      "featured": true,
      "published": true,
      "body": "Markdown body..."
    }
  ]
}
```

`slug` must be unique — the studio appends `-2`, `-3`, … automatically if it collides.
`published: false` hides a post from the index, search and direct links.

## Security notes

- Never commit the token. It is only ever kept in the browser's `localStorage`, and only when
  *Remember token* is ticked.
- Use the token only for this repository and only with `Contents: Read and write`.
- Treat `blog-studio.html` as an admin page: bookmark it rather than sharing it, and regenerate
  the token if you use a shared computer.
- `posts.json` is blocked from crawlers via `robots.txt`, and `.htaccess` sends `no-store` so new
  posts appear immediately instead of being cached for a month.

## Adding cover art or categories

- Drop a new SVG/PNG under `images/blog/` and reference it as `images/blog/your-cover.svg`.
- Categories are free text; a new category appears in the filters automatically as soon as one
  post uses it.

## Rollback

Every publish is a normal commit on `main`. Use `git revert <commit>` (or the GitHub UI) to undo a
post. Reverting `posts.json` is enough; no build step is involved.
