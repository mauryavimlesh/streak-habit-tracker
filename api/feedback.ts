import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Request, Response } from 'express';

export const maxDuration = 30;

interface FeedbackRequestBody {
  category?: string;
  subject?: string;
  message?: string;
  email?: string;
  images?: string[];
  userId?: string;
  deviceInfo?: {
    platform?: string;
    userAgent?: string;
    screen?: string;
    viewport?: string;
    language?: string;
    appUrl?: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General Feedback',
  bug: 'Bug Report',
  feature: 'Feature Request',
  ui: 'UI/Design',
  other: 'Other',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(
  req: VercelRequest | Request,
  res: VercelResponse | Response
) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Health / Status check for feedback service
    const isConfigured = Boolean(process.env.RESEND_API_KEY);
    return res.status(200).json({
      service: 'STREAK Feedback Email Delivery',
      status: 'ok',
      configured: isConfigured,
      receiverEmailConfigured: Boolean(process.env.FEEDBACK_RECEIVER_EMAIL),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  let bodyData: FeedbackRequestBody = req.body;
  if (typeof bodyData === 'string') {
    try {
      bodyData = JSON.parse(bodyData);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON payload in request body',
      });
    }
  }

  const {
    category = 'general',
    subject = '',
    message = '',
    email = '',
    images = [],
    userId = null,
    deviceInfo = {},
  } = bodyData || {};

  // 1. Validation
  const trimmedSubject = (subject || '').trim();
  const trimmedMessage = (message || '').trim();
  const trimmedEmail = (email || '').trim();

  if (!trimmedSubject) {
    return res.status(400).json({
      success: false,
      error: 'Subject is required.',
    });
  }

  if (!trimmedMessage) {
    return res.status(400).json({
      success: false,
      error: 'Message / Details is required.',
    });
  }

  if (trimmedEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.',
      });
    }
  }

  const categoryLabel = CATEGORY_LABELS[category] || category || 'General Feedback';
  const now = new Date();
  const submittedAtIso = now.toISOString();
  const submittedAtFormatted = now.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'UTC',
  }) + ' (UTC)';

  // Format safe device information
  const userAgent = (deviceInfo.userAgent || req.headers['user-agent'] || 'Unknown Browser/Agent') as string;
  const platform = deviceInfo.platform || 'Unknown Platform';
  const screen = deviceInfo.screen || 'Unknown';
  const viewport = deviceInfo.viewport || 'Unknown';
  const language = deviceInfo.language || 'en';
  const safeDeviceSummary = `Platform: ${platform} | Screen: ${screen} | Viewport: ${viewport} | Lang: ${language} | UA: ${userAgent}`;

  // Check Resend Configuration
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('[Feedback] RESEND_API_KEY is not configured in server environment.');
    return res.status(503).json({
      success: false,
      error:
        'Email delivery service is currently not configured. Please add RESEND_API_KEY in the environment settings.',
    });
  }

  // Process attachments
  const attachments: { filename: string; content: string }[] = [];
  if (Array.isArray(images) && images.length > 0) {
    images.slice(0, 4).forEach((imgStr: string, idx: number) => {
      if (typeof imgStr !== 'string') return;
      const match = imgStr.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const base64Data = match[2];
        const ext = mime.split('/')[1]?.split('+')[0] || 'png';
        attachments.push({
          filename: `screenshot-${idx + 1}.${ext}`,
          content: base64Data,
        });
      }
    });
  }

  // Determine Sender and Receiver
  // Note: Default to configured receiver email or user creator email
  const receiverEmail = process.env.FEEDBACK_RECEIVER_EMAIL || 'vim74590@gmail.com';
  // Resend requires verified domain or onboarding@resend.dev
  const senderEmail = process.env.FEEDBACK_SENDER_EMAIL || 'STREAK Support <onboarding@resend.dev>';

  // Format Email Subject
  const emailSubject = `[STREAK Feedback] ${categoryLabel} — ${trimmedSubject}`;

  // Format Email Plain Text Body
  const plainTextBody = `STREAK — Help & Support

Category:
${categoryLabel}

Subject:
${trimmedSubject}

Message:
${trimmedMessage}

User Email:
${trimmedEmail || 'Not provided'}

Submitted:
${submittedAtFormatted}

Device:
${safeDeviceSummary}
${attachments.length > 0 ? `\nAttached Screenshots: ${attachments.length} file(s) attached` : ''}
`;

  // Format Email HTML Body with responsive, elegant styling
  const categoryBadgeBg =
    category === 'bug'
      ? '#ef4444'
      : category === 'feature'
      ? '#3b82f6'
      : category === 'ui'
      ? '#8b5cf6'
      : '#8cee28';

  const categoryBadgeColor = category === 'general' ? '#000000' : '#ffffff';

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(emailSubject)}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #0b0d10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f3f7; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #12151b; border: 1px solid #242936; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
    
    <!-- Header -->
    <tr>
      <td style="padding: 24px 28px; background: linear-gradient(135deg, #181d24 0%, #12151b 100%); border-bottom: 1px solid #242936;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #8cee28; margin-bottom: 4px;">STREAK</div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Help & Support</h1>
            </td>
            <td align="right" valign="middle">
              <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; border-radius: 20px; background-color: ${categoryBadgeBg}; color: ${categoryBadgeColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                ${escapeHtml(categoryLabel)}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 28px;">
        
        <!-- Category & Subject -->
        <div style="margin-bottom: 22px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #7d8495; margin-bottom: 4px;">Subject</div>
          <div style="font-size: 16px; font-weight: 600; color: #ffffff; background-color: #0b0d10; border: 1px solid #242936; border-radius: 10px; padding: 12px 14px;">
            ${escapeHtml(trimmedSubject)}
          </div>
        </div>

        <!-- Full Message -->
        <div style="margin-bottom: 22px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #7d8495; margin-bottom: 4px;">Message / Details</div>
          <div style="font-size: 14px; line-height: 1.6; color: #e2e8f0; background-color: #0b0d10; border: 1px solid #242936; border-radius: 10px; padding: 16px; white-space: pre-wrap; word-break: break-word;">
${escapeHtml(trimmedMessage)}
          </div>
        </div>

        <!-- Meta Table -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0d10; border: 1px solid #242936; border-radius: 10px; margin-bottom: 22px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #1c212c; font-size: 12px; color: #7d8495; width: 120px; font-weight: 600;">User Email:</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #1c212c; font-size: 13px; color: #ffffff; font-weight: 500;">
              ${trimmedEmail ? `<a href="mailto:${escapeHtml(trimmedEmail)}" style="color: #8cee28; text-decoration: none;">${escapeHtml(trimmedEmail)}</a>` : '<span style="color: #7d8495; font-style: italic;">Not provided</span>'}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #1c212c; font-size: 12px; color: #7d8495; font-weight: 600;">Submitted:</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #1c212c; font-size: 12px; color: #e2e8f0;">
              ${escapeHtml(submittedAtFormatted)}
            </td>
          </tr>
          ${userId ? `<tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #1c212c; font-size: 12px; color: #7d8495; font-weight: 600;">User ID:</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #1c212c; font-size: 12px; color: #a1a7b5; font-family: monospace;">
              ${escapeHtml(userId)}
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #7d8495; font-weight: 600; vertical-align: top;">Device:</td>
            <td style="padding: 12px 16px; font-size: 11px; color: #8e95a5; line-height: 1.5;">
              ${escapeHtml(safeDeviceSummary)}
            </td>
          </tr>
        </table>

        <!-- Screenshots info -->
        ${attachments.length > 0 ? `
        <div style="margin-bottom: 16px; padding: 12px 14px; background-color: rgba(140,238,40,0.08); border: 1px solid rgba(140,238,40,0.25); border-radius: 10px;">
          <div style="font-size: 12px; font-weight: 600; color: #8cee28;">
            Attached Screenshots (${attachments.length})
          </div>
          <div style="font-size: 11px; color: #a1a7b5; margin-top: 2px;">
            ${attachments.length} image file(s) included directly as email attachments.
          </div>
        </div>
        ` : ''}

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 16px 28px; background-color: #0b0d10; border-top: 1px solid #1c212c; text-align: center; font-size: 11px; color: #5c6272;">
        Sent via STREAK In-App Help &amp; Support System &bull; Small actions. Every day.
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Send Email via Resend
  let emailDeliveryId: string | null = null;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);

    const emailPayload: any = {
      from: senderEmail,
      to: [receiverEmail],
      subject: emailSubject,
      text: plainTextBody,
      html: htmlBody,
    };

    if (trimmedEmail) {
      emailPayload.replyTo = trimmedEmail;
    }

    if (attachments.length > 0) {
      emailPayload.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
      }));
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('[Feedback Resend API Error]:', error);
      return res.status(502).json({
        success: false,
        error: `Email delivery failed: ${error.message || 'Error communicating with Resend service'}.`,
      });
    }

    emailDeliveryId = data?.id || 'resend_ok';
    console.log(`[Feedback Success] Email sent successfully to ${receiverEmail}. Delivery ID: ${emailDeliveryId}`);
  } catch (emailErr: any) {
    console.error('[Feedback Delivery Exception]:', emailErr);
    return res.status(502).json({
      success: false,
      error: `Could not send feedback email: ${emailErr?.message || 'Network error'}. Please try again.`,
    });
  }

  // 4. Store the feedback in database/storage
  let databaseSaved = false;
  let databaseDocId: string | null = null;

  try {
    const { getAdminDb } = await import('./firebase-admin');
    const db = getAdminDb();
    if (db) {
      const docRef = await db.collection('feedback').add({
        category,
        categoryLabel,
        subject: trimmedSubject,
        message: trimmedMessage,
        email: trimmedEmail || null,
        userId: userId || null,
        deviceInfo: {
          platform,
          screen,
          viewport,
          language,
          userAgent,
        },
        hasScreenshots: attachments.length > 0,
        screenshotsCount: attachments.length,
        submittedAt: submittedAtIso,
        emailDeliveryId,
        recipient: receiverEmail,
      });
      databaseDocId = docRef.id;
      databaseSaved = true;
    }
  } catch (dbError) {
    console.warn('[Feedback Database Storage Notice]: Firestore Admin bypass:', dbError);
  }

  return res.status(200).json({
    success: true,
    message: 'Feedback submitted successfully',
    deliveryId: emailDeliveryId,
    databaseSaved,
    databaseDocId,
    submittedAt: submittedAtIso,
  });
}
