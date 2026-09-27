# hammurapi-web

Web app of **Hammurapi**, a platform for writing product specifications through quality gates with
an AI agent as a partner. It is a single-page app that talks only to the Hammurapi API
([`hammurapi-core`](../hammurapi-core)); deployment and documentation live in
[`hammurapi`](../hammurapi).

## What's inside

- **Screens:** sign-in through the instance's GitHub/GitLab, home page with "Awaiting your approval"
  and filters, feature page with the gate strip and WYSIWYG editor, diff since approval, import from
  a zip archive, administration (users and roles, domains and systems, rules, settings), profile.
- **Chat** with the user's agent: general and specification modes, answers streamed over
  server-sent events, attachments, push-to-talk voice input with transcript review.
- **Editor:** [Milkdown](https://milkdown.dev) (ProseMirror + remark) with CommonMark + GFM and
  fixed serialization options, so a document opened and saved without edits never changes.
  Autosave with optimistic concurrency (`baseSha`), edit locks, retry/discard on failed saves.
- **Five languages:** English (default and fallback), Russian, German, Spanish, Chinese
  (Simplified) — `locales/<lang>.json`, ICU MessageFormat via i18next; dates and numbers via `Intl`.
- **Light and dark themes**, desktop layout with the chat on the right, mobile layout with the chat
  over the screen.

Stack: React 19, TypeScript, Vite, TanStack Query, React Router, i18next, Milkdown.

## Development

Requires Node 24.

```sh
npm ci
npm run dev        # http://localhost:5173; /api and /admin/api are proxied to localhost:8080
npm test           # vitest
npm run build      # typecheck + production build into dist/
```

`HAMMURAPI_API=http://host:port npm run dev` points the dev proxy at another api. The easiest backend
is the demo stack from the `hammurapi` repository: `docker compose --profile demo up -d --build`.

## Layout

```text
locales/            translations (en is the source of truth for keys)
src/api/            typed API client (CSRF, error codes) and TanStack Query hooks
src/app/            app shell, routing, session and chat context, profile menu
src/pages/          home, feature, diff, import, new feature, admin/*
src/editor/         Milkdown wrapper and the document pane (locks, autosave)
src/chat/           chat panel and push-to-talk recorder
src/lib/            i18n, SSE client, formatting, markdown helpers, error texts
deploy/             nginx config template for the container image
```

## Container image

```sh
docker build -t hammurapi-web .
docker run -p 8080:8080 -e API_UPSTREAM=api:8080 hammurapi-web
```

nginx serves the SPA and proxies `/api`, `/admin/api` and `/hooks` to `API_UPSTREAM`, with
buffering disabled for the SSE stream and a 60 MB upload limit for archive imports.
