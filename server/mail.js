// mail.js - email sending for WAMS.
//
// Delivery modes, in priority order (first one configured wins):
//   0a. Mailjet HTTP API - set MAILJET_API_KEY + MAILJET_SECRET_KEY. Sends over
//       HTTPS (works where SMTP ports are blocked, e.g. Railway). Sends to any inbox.
//   0b. Brevo HTTP API   - set BREVO_API_KEY. Same idea, over HTTPS.
//   1.  Real SMTP        - set SMTP_HOST / SMTP_USER / SMTP_PASS (e.g. Gmail App Password).
//   2.  Ethereal         - set SMTP_ETHEREAL=true. A disposable test mailbox + preview URL.
//   3.  Console          - nothing set. The verification link is printed to the console.
const nodemailer = require('nodemailer');

const {
  SMTP_HOST, SMTP_PORT = '587', SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE,
  SMTP_ETHEREAL, BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME,
  MAILJET_API_KEY, MAILJET_SECRET_KEY,
} = process.env;

const USE_MAILJET = Boolean(MAILJET_API_KEY && MAILJET_SECRET_KEY);
const USE_BREVO_API = !USE_MAILJET && Boolean(BREVO_API_KEY);
const CONFIGURED = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
const USE_ETHEREAL = !USE_MAILJET && !USE_BREVO_API && !CONFIGURED && String(SMTP_ETHEREAL).toLowerCase() === 'true';

// Parse "Name <email@x.com>" (or a bare address) from SMTP_FROM for the API sender.
function parseSender() {
  const raw = SMTP_FROM || BREVO_SENDER_EMAIL || SMTP_USER || '';
  const m = raw.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: BREVO_SENDER_NAME || m[1] || 'WAMS CLSU', email: m[2] };
  return { name: BREVO_SENDER_NAME || 'WAMS CLSU', email: BREVO_SENDER_EMAIL || raw };
}

let transporter = null;
let etherealReady = null; // a promise, created once

if (USE_MAILJET) {
  const s = parseSender();
  console.log(`Email: Mailjet HTTP API configured (sender ${s.email}). Verification emails will be delivered over HTTPS.`);
} else if (USE_BREVO_API) {
  const s = parseSender();
  console.log(`Email: Brevo HTTP API configured (sender ${s.email}). Verification emails will be delivered over HTTPS.`);
} else if (CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  console.log(`Email: SMTP configured (${SMTP_HOST}). Verification emails will be delivered.`);
} else if (USE_ETHEREAL) {
  console.log('Email: Ethereal test mode. A preview link is printed for each email (not delivered to a real inbox).');
} else {
  console.log('Email: SMTP not configured - verification links will be logged to the console.');
}

async function getEtherealTransporter() {
  if (!etherealReady) {
    etherealReady = (async () => {
      const acct = await nodemailer.createTestAccount();
      console.log(`Email: Ethereal account ready (${acct.user}).`);
      return nodemailer.createTransport({
        host: acct.smtp.host,
        port: acct.smtp.port,
        secure: acct.smtp.secure,
        auth: { user: acct.user, pass: acct.pass },
      });
    })();
  }
  return etherealReady;
}

function buildMessage(to, name, verifyUrl) {
  return {
    to,
    subject: 'Verify your WAMS account',
    text:
      `Hi ${name},\n\nPlease verify your email to activate your Workflow and Approval ` +
      `Management System (WAMS) account:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n` +
      `If you did not create this account, you can ignore this email.`,
    html:
      `<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
         <h2 style="color:#0e7a3b;margin:0 0 8px">Verify your WAMS account</h2>
         <p>Hi ${name},</p>
         <p>Please verify your email to activate your Workflow and Approval Management System account.</p>
         <p><a href="${verifyUrl}"
            style="display:inline-block;background:#0e7a3b;color:#fff;padding:10px 18px;
            border-radius:8px;text-decoration:none">Verify my email</a></p>
         <p style="color:#6b7280;font-size:13px">Or paste this link:<br>${verifyUrl}</p>
         <p style="color:#6b7280;font-size:13px">This link expires in 24 hours.</p>
       </div>`,
  };
}

function logLink(to, verifyUrl, note) {
  console.log('\n==============================================');
  console.log(`[EMAIL VERIFICATION - ${to}]`);
  if (note) console.log(note);
  console.log(verifyUrl);
  console.log('==============================================\n');
}

async function sendViaMailjet(to, msg) {
  const sender = parseSender();
  const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64');
  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [{
        From: { Email: sender.email, Name: sender.name },
        To: [{ Email: to }],
        Subject: msg.subject,
        TextPart: msg.text,
        HTMLPart: msg.html,
      }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Mailjet API ${res.status}: ${body.slice(0, 300)}`);
  }
}

async function sendViaBrevoApi(to, msg) {
  const sender = parseSender();
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject: msg.subject,
      htmlContent: msg.html,
      textContent: msg.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API ${res.status}: ${body.slice(0, 300)}`);
  }
}

// Shared delivery for any message ({ to, subject, text, html }).
// fallbackLink is a URL printed to the console if no real sender is configured
// (or a send fails), so the flow still works in console-only mode.
async function deliver(to, msg, fallbackLink) {
  // Mode 0a: Mailjet HTTP API
  if (USE_MAILJET) {
    try {
      await sendViaMailjet(to, msg);
      return { sent: true };
    } catch (e) {
      console.error('Email: Mailjet API send failed -', e.message);
      if (fallbackLink) logLink(to, fallbackLink, 'Mailjet API failed; use this link:');
      return { simulated: true, error: e.message };
    }
  }

  // Mode 0b: Brevo HTTP API
  if (USE_BREVO_API) {
    try {
      await sendViaBrevoApi(to, msg);
      return { sent: true };
    } catch (e) {
      console.error('Email: Brevo API send failed -', e.message);
      if (fallbackLink) logLink(to, fallbackLink, 'Brevo API failed; use this link:');
      return { simulated: true, error: e.message };
    }
  }

  // Mode 1: real delivery over SMTP (e.g. Gmail App Password)
  if (CONFIGURED) {
    try {
      await transporter.sendMail({ from: SMTP_FROM || `WAMS <${SMTP_USER}>`, ...msg });
      return { sent: true };
    } catch (e) {
      console.error('Email: real SMTP send failed -', e.message);
      if (fallbackLink) logLink(to, fallbackLink, 'SMTP failed; use this link:');
      return { simulated: true, error: e.message };
    }
  }

  // Mode 2: Ethereal test mailbox with a viewable preview link
  if (USE_ETHEREAL) {
    try {
      const t = await getEtherealTransporter();
      const info = await t.sendMail({ from: SMTP_FROM || 'WAMS <no-reply@wams.test>', ...msg });
      const preview = nodemailer.getTestMessageUrl(info);
      logLink(to, preview, 'Open this to view the email that was sent:');
      return { sent: true, previewUrl: preview };
    } catch (e) {
      console.error('Email: Ethereal unavailable (no internet?) -', e.message);
      if (fallbackLink) logLink(to, fallbackLink, 'Test mailbox unreachable; use this link:');
      return { simulated: true, error: e.message };
    }
  }

  // Mode 3: console-only
  if (fallbackLink) logLink(to, fallbackLink);
  return { simulated: true };
}

async function sendVerificationEmail(to, name, verifyUrl) {
  return deliver(to, buildMessage(to, name, verifyUrl), verifyUrl);
}

function buildResetMessage(to, name, resetUrl) {
  return {
    to,
    subject: 'Reset your WAMS password',
    text:
      `Hi ${name},\n\nWe received a request to reset your Workflow and Approval Management ` +
      `System (WAMS) password. Use the link below to choose a new password:\n\n${resetUrl}\n\n` +
      `This link expires in 1 hour. If you did not request this, you can ignore this email and ` +
      `your password will stay the same.`,
    html:
      `<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
         <h2 style="color:#0e7a3b;margin:0 0 8px">Reset your WAMS password</h2>
         <p>Hi ${name},</p>
         <p>We received a request to reset your password.</p>
         <p><a href="${resetUrl}"
            style="display:inline-block;background:#0e7a3b;color:#fff;padding:10px 18px;
            border-radius:8px;text-decoration:none">Choose a new password</a></p>
         <p style="color:#6b7280;font-size:13px">Or paste this link:<br>${resetUrl}</p>
         <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you did not request
         this, you can ignore this email.</p>
       </div>`,
  };
}

async function sendPasswordResetEmail(to, name, resetUrl) {
  return deliver(to, buildResetMessage(to, name, resetUrl), resetUrl);
}

// A general notification email (new request awaiting approval, approved, rejected, etc.).
// Sent alongside the in-app notification so people are alerted in Gmail too.
function buildNotice(to, subject, line, appUrl) {
  const openBtn = appUrl
    ? `<p><a href="${appUrl}" style="display:inline-block;background:#0e7a3b;color:#fff;
         padding:10px 18px;border-radius:8px;text-decoration:none">Open WAMS</a></p>`
    : '';
  return {
    to,
    subject,
    text: `${line}\n\n${appUrl ? `Open WAMS: ${appUrl}\n\n` : ''}This is an automated message from the ` +
      `Workflow and Approval Management System (WAMS), CLSU.`,
    html:
      `<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
         <h2 style="color:#0e7a3b;margin:0 0 8px">WAMS notification</h2>
         <p>${line}</p>
         ${openBtn}
         <p style="color:#6b7280;font-size:13px">Automated message from the Workflow and
         Approval Management System (WAMS), CLSU.</p>
       </div>`,
  };
}

async function sendNotificationEmail(to, subject, line, appUrl) {
  try {
    return await deliver(to, buildNotice(to, subject, line, appUrl), null);
  } catch (e) {
    // Never let an email problem break the request/approval flow.
    console.error('Email: notification send failed -', e.message);
    return { simulated: true, error: e.message };
  }
}

module.exports = {
  sendVerificationEmail,
  sendNotificationEmail,
  sendPasswordResetEmail,
  EMAIL_CONFIGURED: CONFIGURED || USE_BREVO_API || USE_MAILJET,
};
