type PasswordResetNotificationPayload = {
  adminEmail: string;
  clientName: string;
  userName: string | null;
  userEmail: string;
  temporaryPassword: string;
};

type ActivityMaterialCommentNotificationPayload = {
  adminEmail: string;
  clientName: string;
  activityTitle: string;
  materialName: string;
  commenterName: string;
  commenterEmail: string;
  commentBody: string;
};

type EmailResult = {
  sent: boolean;
  message: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!apiKey || !from) {
    return null;
  }
  return { apiKey, from };
}

async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<EmailResult> {
  const config = getResendConfig();
  if (!config) {
    return { sent: false, message: "Email provider is not configured." };
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { sent: false, message: `Resend error: ${body}` };
  }

  return { sent: true, message: "sent" };
}

export async function sendPasswordResetNotifications(payload: PasswordResetNotificationPayload) {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "Portal SaaS";
  const userDisplayName = payload.userName?.trim() || payload.userEmail;

  const userSubject = `Tu acceso fue restablecido - ${payload.clientName}`;
  const userText = [
    `Hola ${userDisplayName},`,
    "",
    `Tu contraseña temporal para ${payload.clientName} es: ${payload.temporaryPassword}`,
    "Te recomendamos cambiarla al iniciar sesion.",
    "",
    `Portal: ${appBaseUrl}`,
  ].join("\n");
  const userHtml = `
    <p>Hola <strong>${userDisplayName}</strong>,</p>
    <p>Tu contraseña temporal para <strong>${payload.clientName}</strong> es:</p>
    <p style="font-size:18px"><strong>${payload.temporaryPassword}</strong></p>
    <p>Te recomendamos cambiarla al iniciar sesion.</p>
    <p>Portal: ${appBaseUrl}</p>
  `;

  const userResult = await sendViaResend(payload.userEmail, userSubject, userHtml, userText);

  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL?.trim() || payload.adminEmail;
  const includePasswordInAdminEmail = String(process.env.ADMIN_INCLUDE_PASSWORD_IN_EMAIL || "false").toLowerCase() === "true";
  const adminSubject = `Reset de password aplicado - ${payload.clientName}`;
  const adminText = [
    `Se restablecio la contraseña del usuario: ${payload.userEmail}`,
    `Cliente: ${payload.clientName}`,
    includePasswordInAdminEmail ? `Password temporal: ${payload.temporaryPassword}` : "Password temporal: oculto por seguridad",
  ].join("\n");
  const adminHtml = `
    <p>Se restablecio la contraseña del usuario <strong>${payload.userEmail}</strong>.</p>
    <p>Cliente: <strong>${payload.clientName}</strong></p>
    <p>${includePasswordInAdminEmail ? `Password temporal: <strong>${payload.temporaryPassword}</strong>` : "Password temporal oculto por seguridad."}</p>
  `;

  const adminResult = await sendViaResend(adminAlertEmail, adminSubject, adminHtml, adminText);

  return {
    userResult,
    adminResult,
  };
}

export async function sendAdminActivityMaterialCommentNotification(
  payload: ActivityMaterialCommentNotificationPayload,
) {
  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL?.trim() || payload.adminEmail;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "Portal SaaS";
  const subject = `Nuevo comentario del cliente - ${payload.clientName}`;
  const text = [
    `Cliente: ${payload.clientName}`,
    `Actividad: ${payload.activityTitle}`,
    `Material: ${payload.materialName}`,
    `Autor: ${payload.commenterName} (${payload.commenterEmail})`,
    "",
    "Comentario:",
    payload.commentBody,
    "",
    `Portal: ${appBaseUrl}/activities`,
  ].join("\n");
  const html = `
    <p><strong>Nuevo comentario del cliente</strong></p>
    <p>Cliente: <strong>${payload.clientName}</strong></p>
    <p>Actividad: <strong>${payload.activityTitle}</strong></p>
    <p>Material: <strong>${payload.materialName}</strong></p>
    <p>Autor: <strong>${payload.commenterName}</strong> (${payload.commenterEmail})</p>
    <p>Comentario:</p>
    <blockquote>${payload.commentBody}</blockquote>
    <p>Portal: ${appBaseUrl}/activities</p>
  `;

  return sendViaResend(adminAlertEmail, subject, html, text);
}
