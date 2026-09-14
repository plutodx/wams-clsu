# Deploying WAMS online (Netlify + Render)

This puts the system on the internet with a shareable link that saves data.

- **Front-end (React):** Netlify
- **Back-end (Express API) + PostgreSQL database:** Render

You need a **GitHub account** (the code must be in a GitHub repo), a **Netlify account**, and a **Render account**. All three have free tiers. Sign up for each first (you create the accounts yourself).

---

## Step 0 — Put the code on GitHub

If you haven't already: create a new repository on GitHub and push the `capstone-system` folder to it (see the README, or use GitHub Desktop). Netlify and Render both deploy from GitHub.

---

## Step 1 — Deploy the back-end + database on Render

1. Go to **render.com**, log in, and click **New +** → **Blueprint**.
2. Connect your GitHub and pick your `capstone-system` repository.
3. Render reads `render.yaml` and proposes a **web service (wams-api)** and a **PostgreSQL database (wams-db)**. Click **Apply**.
4. Wait for the database to finish creating and the web service to build and go live (a few minutes). Render automatically injects `DATABASE_URL`, so the database is wired up for you.
5. When it's live, copy the service URL. It looks like `https://wams-api.onrender.com`. Open `that-url/api/health` in a browser — you should see `{"ok":true,...}`.

> Free Render services sleep after ~15 minutes idle; the first request after sleeping takes ~30 seconds to wake. That's normal on the free tier.

---

## Step 2 — Deploy the front-end on Netlify

1. Go to **netlify.com**, log in, click **Add new site** → **Import an existing project**, and pick the same GitHub repo.
2. Netlify reads `netlify.toml`, so the build settings (base `client`, publish `dist`) are filled in already. Don't change them.
3. Before the first deploy, open **Site settings → Environment variables** and add:
   - Key: `VITE_API_URL`
   - Value: your Render backend URL from Step 1 (e.g. `https://wams-api.onrender.com`)
4. Trigger a deploy (**Deploys → Trigger deploy**, or it deploys automatically). When done, Netlify gives you a link like `https://your-site.netlify.app`. **That is your shareable link.**

---

## Step 3 — Connect the two (CORS)

1. Back in **Render → wams-api → Environment**, set:
   - Key: `CLIENT_ORIGIN`
   - Value: your Netlify URL (e.g. `https://your-site.netlify.app`)
2. Save. Render redeploys automatically. This lets the front-end talk to the back-end.

Done. Open your Netlify link and log in with any demo account (password `password123`). Data now persists in the Render PostgreSQL database.

---

## Updating later

Push changes to GitHub and both Netlify and Render redeploy automatically.

## Notes

- Local development is unchanged: `npm install` then `npm run dev` in `server/` and `client/`. Locally the backend uses a fast in-memory database (no setup); online it uses the real PostgreSQL database, so data is saved.
- If the free Render Postgres instance expires (Render's free databases have a limited lifespan), create a new one and update `DATABASE_URL`.
