# WAMS — Email Setup (and why it behaves differently local vs. live)

The app sends two kinds of email:
1. **Verification link** when someone registers.
2. **Notifications** when a request is submitted or approved/rejected (the approver and the requestor get an email, on top of the in-app bell).

Important fact: **free cloud hosts (Railway, Render) block the port that Gmail uses to send email.** So Gmail works when you run the app on your own computer, but NOT on the live site. That is not a bug in the code — it is the host blocking it. The fix for the live site is to send email over HTTPS using Mailjet, which the host does not block.

---

## Running LOCALLY (your own computer) — use Gmail

1. In the `server` folder, copy `.env.example` to `.env`.
2. Fill in the Gmail section with a Gmail **App Password** (Google Account → Security → 2-Step Verification → App passwords). A normal Gmail password will not work.
3. Leave `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` empty.
4. Start the app. You should see in the terminal: `Email: SMTP configured (smtp.gmail.com).`

Real emails will now be sent from your Gmail. If a groupmate runs the project, they need their own `.env` with a Gmail App Password (the `.env` is never shared in the zip/repo for security).

---

## The LIVE site — use Mailjet (free, works on the host)

1. Go to **mailjet.com** and create a free account.
2. Add and **verify your sender email** (e.g. your Gmail) under **Senders & Domains**. Mailjet sends a confirmation link to that address — click it.
3. Open **Account Settings → API Key Management** and copy your **API Key** and **Secret Key**.
4. In your host's dashboard (Railway/Render → your backend service → **Variables / Environment**), add:
   - `MAILJET_API_KEY` = your API key
   - `MAILJET_SECRET_KEY` = your secret key
   - `SMTP_FROM` = `WAMS CLSU <your-verified-sender@gmail.com>`
   - make sure `CLIENT_URL` = your Netlify site URL (so links in emails point to the live site)
5. Save. The host redeploys. When it restarts you should see: `Email: Mailjet HTTP API configured.`

That's it — verification and notification emails now send from the live link to any inbox.

Mailjet free tier: 200 emails/day (6,000/month), which is plenty for a capstone demo.
