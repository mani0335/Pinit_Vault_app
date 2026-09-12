# Connecting PINIT Vault to the Pinit-DNA Server

The PINIT Vault app runs **everything on-device** by default (6-layer DNA, Verification,
Difference Engine, Find Similar, vault Monitoring). The **DNA Lab → PINIT-DNA Server**
panel is optional — it only adds the two features that need a real backend:

- **AI Semantic Search (FAISS)** — search your indexed assets by meaning
- **Web Monitoring & Crawler** — crawl the public web (Bing visual search) for stolen copies

This guide gets that server running and connected.

---

## 1. Start the server (on your PC)

```bash
cd Pinit-DNA/Pinit-DNA

# one-time: generate the Prisma client
npm run db:generate

# install the Python AI service (FAISS + sentence-transformers)
cd python-ai
pip install -r requirements.txt
cd ..

# start the API (also auto-launches the Python AI on :8001)
npm run dev
```

You should see:

```
PINIT-DNA API running {"port":5000,"env":"development","prefix":"/api/v1"}
Vault scheduler started — 4 tasks active (+ monitoring crawler)
```

Health check:

```bash
curl http://localhost:5000/health          # → {"status":"healthy", ...}
curl http://localhost:5000/api/v1/ai/health # → online:true once Python AI is up
```

> **Note on the port:** the server logs the real port on boot (here `5000`).
> Use whatever it prints. `.env` has `PORT=` if you want to pin it.

---

## 2. Connect from the app (same PC / browser preview)

In the app: **PINIT DNA → Open DNA Lab → PINIT-DNA Server** panel
→ paste `http://localhost:5000` → **Connect**. Badge turns **Connected**.

This works for the desktop/browser preview because both sides are on `localhost`.

---

## 3. Connect from your phone (the installed APK)

Your phone **cannot** reach `localhost:5000` on your PC. Expose the server with a public
HTTPS tunnel — the server's CORS already allows `*.ngrok-free.app` / `*.ngrok.app`.

```bash
# install ngrok once, then:
ngrok http 5000
```

ngrok prints a public URL, e.g. `https://broadly-yonder-consult.ngrok-free.app`.
In the app's PINIT-DNA Server panel, paste **that https URL** → **Connect**.

For a permanent setup, deploy the server to any host (Railway, Render, Fly.io, a VPS)
and use its public URL instead of ngrok.

---

## 4. What each feature needs

| Feature | Requirement |
|---|---|
| **Connected** badge | Server reachable at the URL (`/health` returns 200) |
| **FAISS Semantic Search** | Python AI service running (`pip install -r requirements.txt`) + assets indexed (`POST /api/v1/ai/index/:dnaRecordId`, or "Enroll vault" which generates + indexes) |
| **Web Monitoring & Crawler** | Bing Visual Search API key in the server `.env`; the crawler scheduler runs automatically |
| **Database** | `DATABASE_URL` / `DIRECT_URL` (Supabase Postgres) in `.env` — already configured |

---

## 5. Endpoints the app calls

Base = `<server-url>/api/v1`

| App action | Method + path |
|---|---|
| Connect (health) | `GET <server-url>/health` |
| Cloud Semantic Search | `POST /ai/search` `{ query, topK }` |
| Cloud Find Similar | `POST /ai/similar` `{ dnaRecordId, topK }` |
| Generate + index (enroll) | `POST /dna/generate` (multipart `image`) |
| Enroll for monitoring | `POST /monitor/enroll/:dnaRecordId` |
| Crawler alerts | `GET /monitor/alerts` · `GET /monitor/stats` |

---

## 6. Troubleshooting

- **"Offline" after Connect** — server not running, wrong port, or (on phone) you used
  `localhost` instead of the ngrok/public URL.
- **Connected but Semantic Search empty** — Python AI not installed/running, or no assets
  indexed yet. Run the Python install, then "Enroll vault for web monitoring".
- **No crawler alerts** — Bing API key missing in `.env`, or the crawl interval hasn't
  elapsed yet.
- **CORS denied in logs** — your origin isn't in the allow-list; set `ALLOWED_ORIGIN` in
  the server `.env` or use an ngrok URL (already allowed).
