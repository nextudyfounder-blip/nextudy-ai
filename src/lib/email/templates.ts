// Bubble-style email templates for Nextudy.
// Inline styles only — required for reliable rendering across email clients.

const BASE_STYLES = {
  body: "margin:0;padding:0;background-color:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;",
  container: "max-width:560px;margin:0 auto;padding:32px 16px;",
  bubble: "background:#ffffff;border-radius:20px;padding:28px;margin:16px 0;box-shadow:0 2px 6px rgba(15,23,42,0.04);",
  bubbleSoft: "background:#eef2ff;border-radius:20px;padding:24px;margin:16px 0;",
  bubbleAccent: "background:linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%);border-radius:20px;padding:24px;margin:16px 0;",
  h1: "font-size:26px;line-height:1.25;font-weight:700;margin:0 0 12px;color:#0b1220;",
  h2: "font-size:18px;font-weight:600;margin:0 0 8px;color:#0b1220;",
  p: "font-size:15px;line-height:1.6;margin:0 0 12px;color:#334155;",
  small: "font-size:12px;color:#64748b;line-height:1.5;margin:16px 0 0;text-align:center;",
  cta: "display:inline-block;background:#7c3aed;color:#ffffff !important;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(124,58,237,0.35);",
  ctaWrap: "text-align:center;margin:8px 0 4px;",
  logo: "display:inline-block;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#0b1220;",
  logoDot: "color:#7c3aed;",
  imgWrap: "text-align:center;margin:0 0 8px;",
  hero: "width:100%;max-width:480px;border-radius:16px;display:block;margin:0 auto;",
};

function shell(inner: string, preheader = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nextudy</title></head>
<body style="${BASE_STYLES.body}">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
<div style="${BASE_STYLES.container}">
  <div style="text-align:center;margin-bottom:8px;">
    <span style="${BASE_STYLES.logo}">Nextudy<span style="${BASE_STYLES.logoDot}">.</span></span>
  </div>
  ${inner}
  <p style="${BASE_STYLES.small}">Study less. Know more. — Nextudy · <a href="https://nextudy.app" style="color:#64748b;">nextudy.app</a></p>
</div>
</body></html>`;
}

export function welcomeEmail(opts: { name?: string | null }) {
  const name = opts.name?.trim() || "there";
  const heroPlaceholder = `
    <div style="${BASE_STYLES.imgWrap}">
      <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);border-radius:16px;padding:36px 20px;color:#fff;">
        <div style="font-size:34px;font-weight:800;letter-spacing:-0.02em;">Welcome aboard 🎓</div>
        <div style="font-size:14px;opacity:0.9;margin-top:6px;">Your smarter study companion</div>
      </div>
    </div>`;

  const inner = `
    <div style="${BASE_STYLES.bubbleAccent}">
      ${heroPlaceholder}
      <h1 style="${BASE_STYLES.h1};text-align:center;">Hi ${name}, welcome to Nextudy!</h1>
      <p style="${BASE_STYLES.p};text-align:center;">
        We're stoked to have you. Nextudy turns your PDFs, slides, and notes into bite-sized summaries, flashcards, and practice questions — so you can study less and know more.
      </p>
    </div>

    <div style="${BASE_STYLES.bubble}">
      <h2 style="${BASE_STYLES.h2}">🚀 Get started in 30 seconds</h2>
      <p style="${BASE_STYLES.p}">Drop your first PDF into the dashboard — we'll generate a summary and practice questions instantly.</p>
      <div style="${BASE_STYLES.ctaWrap}">
        <a href="https://nextudy.app/dashboard" style="${BASE_STYLES.cta}">Open your dashboard →</a>
      </div>
    </div>

    <div style="${BASE_STYLES.bubbleSoft}">
      <h2 style="${BASE_STYLES.h2}">💡 What's inside</h2>
      <p style="${BASE_STYLES.p}">• AI summaries in bullets<br/>• Auto-generated flashcards & practice questions<br/>• Mindmaps, chat, and a Pomodoro timer<br/>• Share study sets with friends</p>
    </div>
  `;

  return {
    subject: `Welcome to Nextudy, ${name} 🎓`,
    html: shell(inner, "Your smarter study companion is ready."),
  };
}

export function inviteMemberEmail(opts: {
  inviterName?: string | null;
  tier: "teams" | "turbo";
  billingStrategy: "owner-pays" | "split-bill";
  checkoutUrl?: string | null;
  workspaceUrl?: string;
}) {
  const inviter = opts.inviterName?.trim() || "Your teammate";
  const tierLabel = opts.tier === "turbo" ? "Nextudy Turbo" : "Nextudy Teams";
  const isSplit = opts.billingStrategy === "split-bill";
  const share = opts.tier === "turbo" ? "€12.00" : "€16.00";
  const ctaUrl = isSplit ? opts.checkoutUrl || "https://nextudy.app" : opts.workspaceUrl || "https://nextudy.app/dashboard";
  const ctaLabel = isSplit ? `Pay ${share}/mo & join →` : "Join the workspace →";

  const billingBubble = isSplit
    ? `<div style="${BASE_STYLES.bubbleSoft}">
        <h2 style="${BASE_STYLES.h2}">💳 Your share</h2>
        <p style="${BASE_STYLES.p}">${inviter} chose <strong>split billing</strong>. Your part of the ${tierLabel} subscription is <strong>${share}/month</strong> via Stripe. You keep control of your own payment.</p>
      </div>`
    : `<div style="${BASE_STYLES.bubbleSoft}">
        <h2 style="${BASE_STYLES.h2}">🎁 On the house</h2>
        <p style="${BASE_STYLES.p}">${inviter} is covering your ${tierLabel} seat — no payment needed. Just click below to jump in.</p>
      </div>`;

  const inner = `
    <div style="${BASE_STYLES.bubbleAccent}">
      <h1 style="${BASE_STYLES.h1};text-align:center;">You're invited to ${tierLabel}</h1>
      <p style="${BASE_STYLES.p};text-align:center;">${inviter} invited you to collaborate on Nextudy — shared notes, flashcards, and study sessions in one workspace.</p>
    </div>

    ${billingBubble}

    <div style="${BASE_STYLES.bubble}">
      <div style="${BASE_STYLES.ctaWrap}">
        <a href="${ctaUrl}" style="${BASE_STYLES.cta}">${ctaLabel}</a>
      </div>
      <p style="${BASE_STYLES.p};text-align:center;font-size:13px;color:#64748b;">This invite expires in 7 days.</p>
    </div>
  `;

  return {
    subject: `${inviter} invited you to ${tierLabel} on Nextudy`,
    html: shell(inner, `${inviter} invited you to a Nextudy workspace.`),
  };
}
