// mail.js - email sending for WAMS.
//
// Three modes, chosen by environment:
//   1. Real SMTP  - set SMTP_HOST / SMTP_USER / SMTP_PASS (e.g. a Gmail App
//      Password). Verification emails are delivered to the recipient's real inbox.
//   2. Ethereal   - set SMTP_ETHEREAL=true (no account needed). A disposable test
//      mailbox is created automatically and each email gets a preview URL printed
//      to the console. Nothing is delivered to a real inbox; it is for demos/testing.
//   3. Console    - nothing set. The verification link is printed to the console.
const nodemailer = require('nodemailer');

const {
  SMTP_HOST, SMTP_PORT = '587', SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE,
  SMTP_ETHEREAL,
} = process.env;

const CONFIGURED = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
const USE_ETHEREAL = !CONFIGURED && String(SMTP_ETHEREAL).toLowerCase() === 'true';

let transporter = null;
let etherealReady = null; // a promise, created once

if (CONFIGURED) {
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

async function sendVerificationEmail(to, name, verifyUrl) {
  const msg = buildMessage(to, name, verifyUrl);

  // Mode 1: real delivery to the recipient's inbox
  if (CONFIGURED) {
    try {
      await transporter.sendMail({ from: SMTP_FROM || `WAMS <${SMTP_USER}>`, ...msg });
      return { sent: true };
    } catch (e) {
      console.error('Email: real SMTP send failed -', e.message);
      logLink(to, verifyUrl, 'SMTP failed; use this link to verify:');
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
      logLink(to, verifyUrl, 'Test mailbox unreachable; use this link to verify:');
      return { simulated: true, error: e.message };
    }
  }

  // Mode 3: console-only
  logLink(to, verifyUrl);
  return { simulated: true };
}

module.exports = { sendVerificationEmail, EMAIL_CONFIGURED: CONFIGURED };
