import { Resend } from "resend";

let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY env var is required to send email.");
  }
  cached = new Resend(apiKey);
  return cached;
}

interface InviteEmailArgs {
  to: string;
  treeName: string;
  inviterName: string;
  acceptUrl: string;
  role: string;
}

/**
 * Sends a tree-invitation email via Resend. Heritage-flavored but accessible:
 * a clear subject line, a single primary CTA button, the inviter's name and
 * tree name in plain prose, and a fallback plain-text body for clients that
 * strip HTML.
 *
 * The from-address comes from RESEND_FROM_EMAIL (must be on a verified Resend
 * domain). The reply-to is the inviter's actual email so the recipient can
 * respond directly with questions.
 */
export async function sendInviteEmail({
  to,
  treeName,
  inviterName,
  acceptUrl,
  role,
}: InviteEmailArgs): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL env var is required to send email.");
  }

  const subject = `${inviterName} invited you to the ${treeName} family tree`;
  const html = renderInviteHtml({ treeName, inviterName, acceptUrl, role });
  const text = renderInviteText({ treeName, inviterName, acceptUrl, role });

  const { error } = await getResend().emails.send({
    from,
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

function renderInviteHtml(args: Omit<InviteEmailArgs, "to">): string {
  const { treeName, inviterName, acceptUrl, role } = args;
  const safeTreeName = escapeHtml(treeName);
  const safeInviter = escapeHtml(inviterName);
  const safeRole = escapeHtml(role);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Family tree invitation</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#fdf5e6;color:#1a1a1a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fdf5e6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border:4px double #b22222;border-radius:24px;padding:40px;">
          <tr>
            <td style="text-align:center;">
              <h1 style="margin:0 0 16px;font-family:Georgia,serif;color:#b22222;font-size:28px;">Vanshavali</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#1a1a1a;">
                <strong>${safeInviter}</strong> has invited you to join the
                <strong>${safeTreeName}</strong> family tree as a <em>${safeRole}</em>.
              </p>
              <p style="margin:0 0 32px;font-size:14px;line-height:1.6;color:#666666;">
                Click the button below to accept the invitation. If you don't have a
                Vanshavali account yet, you'll be asked to create one first.
              </p>
              <a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;background:#b22222;color:#ffffff;font-weight:600;text-decoration:none;border-radius:9999px;letter-spacing:0.04em;">
                Accept invitation
              </a>
              <p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#888888;">
                If the button doesn't work, paste this link into your browser:<br />
                <a href="${acceptUrl}" style="color:#b22222;word-break:break-all;">${escapeHtml(acceptUrl)}</a>
              </p>
              <p style="margin:24px 0 0;font-size:12px;color:#aaaaaa;">
                If you weren't expecting this, you can safely ignore the email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderInviteText(args: Omit<InviteEmailArgs, "to">): string {
  const { treeName, inviterName, acceptUrl, role } = args;
  return [
    `${inviterName} invited you to the ${treeName} family tree as a ${role}.`,
    ``,
    `Accept the invitation: ${acceptUrl}`,
    ``,
    `If you don't have a Vanshavali account yet, you'll be asked to create one first.`,
    `If you weren't expecting this, you can safely ignore the email.`,
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
