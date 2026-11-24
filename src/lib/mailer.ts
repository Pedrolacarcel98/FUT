import nodemailer from "nodemailer";

function getMailerConfig() {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "").trim();
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000"
  ).replace(/\/$/, "");
  return { gmailUser, gmailPass, appUrl };
}

export function isMailerConfigured(): boolean {
  const { gmailUser, gmailPass } = getMailerConfig();
  return Boolean(gmailUser && gmailPass);
}

export function getMissingMailerVars(): string[] {
  const { gmailUser, gmailPass } = getMailerConfig();
  const missing: string[] = [];
  if (!gmailUser) missing.push("GMAIL_USER");
  if (!gmailPass) missing.push("GMAIL_APP_PASSWORD");
  return missing;
}

function getTransporter() {
  const { gmailUser, gmailPass } = getMailerConfig();
  if (!gmailUser || !gmailPass) {
    throw new Error(
      `Faltan variables de entorno: ${getMissingMailerVars().join(", ")}.`
    );
  }
  return {
    gmailUser,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    }),
  };
}

function extractPngBuffer(dataUrl?: string | null): Buffer | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

function wrapEmailLayout(
  title: string,
  bodyHtml: string,
  badge?: string
): string {
  const badgeHtml = badge
    ? `<div style="display:inline-block;margin-bottom:12px;padding:4px 12px;border-radius:999px;background-color:rgba(245,158,11,0.16);border:1px solid rgba(245,158,11,0.45);color:#FBBF24;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${badge}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#090D16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F3F4F6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#090D16;padding:28px 14px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background-color:#111827;border:1px solid #1F2937;border-radius:24px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <!-- Top Brand Bar faithful to app header -->
          <tr>
            <td style="padding:18px 24px;background-color:#090D16;border-bottom:1px solid #1F2937;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="40" valign="middle">
                    <div style="width:34px;height:34px;line-height:34px;text-align:center;border-radius:10px;background:linear-gradient(135deg,#FBBF24,#D97706);color:#090D16;font-weight:900;font-size:15px;letter-spacing:0.04em;">
                      FP
                    </div>
                  </td>
                  <td valign="middle" style="padding-left:10px;">
                    <div style="font-size:17px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;color:#FFFFFF;line-height:1;">
                      FUT <span style="color:#F59E0B;">PACHANGAS</span>
                    </div>
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#10B981;margin-top:3px;">
                      CLUB AMATEUR
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Title -->
          <tr>
            <td style="padding:26px 26px 18px 26px;background:radial-gradient(circle at top right,rgba(245,158,11,0.14),transparent 60%),linear-gradient(180deg,#131C2F 0%,#111827 100%);border-bottom:1px solid #1F2937;">
              ${badgeHtml}
              <h1 style="margin:0;font-size:25px;line-height:1.2;color:#FFFFFF;font-weight:900;letter-spacing:0.01em;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:24px 26px;font-size:14px;line-height:1.65;color:#D1D5DB;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;background-color:#090D16;border-top:1px solid #1F2937;font-size:11px;color:#6B7280;text-align:center;">
              FUT Pachangas · Notificación automática del club
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  nickname: string;
  position: string;
  cardPngDataUrl?: string | null;
}) {
  const { transporter, gmailUser } = getTransporter();
  const { appUrl } = getMailerConfig();
  const pngBuffer = extractPngBuffer(params.cardPngDataUrl);

  const cardBlock = pngBuffer
    ? `
      <div style="text-align:center;margin:20px 0 22px 0;padding:18px 12px;border-radius:18px;background:radial-gradient(circle at center,rgba(245,158,11,0.12) 0%,#090D16 75%);border:1px solid #1F2937;">
        <img src="cid:fut-card-png" alt="Carta FUT de ${params.nickname}" width="210" style="display:block;margin:0 auto;max-width:100%;height:auto;" />
      </div>
    `
    : "";

  const html = wrapEmailLayout(
    `¡Bienvenido al club, ${params.nickname}!`,
    `
      <p style="margin:0 0 12px 0;font-size:15px;color:#F3F4F6;">Hola <strong style="color:#FFFFFF;">${params.name}</strong>,</p>
      <p style="margin:0 0 16px 0;">Tu carta coleccionable <strong style="color:#FBBF24;">${params.nickname}</strong> (<strong style="color:#E5E7EB;">${params.position}</strong>) ya está activa en <strong style="color:#FFFFFF;">FUT Pachangas</strong>.</p>

      ${cardBlock}

      <div style="text-align:center;">
        <a href="${appUrl}" style="display:inline-block;background:linear-gradient(90deg,#F59E0B,#FACC15);color:#090D16;text-decoration:none;font-weight:900;letter-spacing:0.05em;text-transform:uppercase;padding:13px 26px;border-radius:14px;font-size:13px;">
          Ir a FUT PACHANGAS
        </a>
      </div>
    `
  );

  await transporter.sendMail({
    from: `"FUT Pachangas" <${gmailUser}>`,
    to: params.to,
    subject: `⚽ ¡Bienvenido al club, ${params.nickname}!`,
    html,
    attachments: pngBuffer
      ? [
          {
            filename: `FUT-${params.nickname.toLowerCase().replace(/\s+/g, "-")}.png`,
            content: pngBuffer,
            contentType: "image/png",
            cid: "fut-card-png",
          },
        ]
      : [],
  });
}

export async function sendNewMatchEmail(params: {
  bcc: string[];
  matchDate: string;
  location: string;
  teamAName: string;
  teamBName: string;
  maxPlayers: number;
}) {
  if (params.bcc.length === 0) return;
  const { transporter, gmailUser } = getTransporter();
  const { appUrl } = getMailerConfig();
  const dateObj = new Date(params.matchDate);
  const formattedDate = dateObj.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedTime = dateObj.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    params.location
  )}`;

  const html = wrapEmailLayout(
    `${params.teamAName} vs ${params.teamBName}`,
    `
      <p style="margin:0 0 16px 0;">Ya está abierta una nueva pachanga. Entra en la app para apuntarte y elegir tu equipo antes de la hora de inicio.</p>
      <div style="background-color:#090D16;border:1px solid #1F2937;border-radius:14px;padding:16px;margin-bottom:22px;">
        <div style="margin-bottom:8px;">📅 <strong style="color:#FFFFFF;">${formattedDate}</strong> a las <strong style="color:#FBBF24;">${formattedTime}h</strong></div>
        <div style="margin-bottom:8px;">📍 <a href="${mapsUrl}" style="color:#34D399;text-decoration:none;">${params.location}</a></div>
        <div>👥 Plazas disponibles: <strong style="color:#FFFFFF;">${params.maxPlayers} jugadores</strong></div>
      </div>
      <div style="text-align:center;">
        <a href="${appUrl}" style="display:inline-block;background-color:#10B981;color:#090D16;text-decoration:none;font-weight:900;letter-spacing:0.05em;text-transform:uppercase;padding:13px 26px;border-radius:14px;font-size:13px;">
          Apuntarme ahora
        </a>
      </div>
    `,
    "Nueva Convocatoria Abierta"
  );

  await transporter.sendMail({
    from: `"FUT Pachangas" <${gmailUser}>`,
    to: gmailUser,
    bcc: params.bcc,
    subject: `🏟️ Nueva convocatoria: ${params.teamAName} vs ${params.teamBName}`,
    html,
  });
}

export async function sendMvpAwardEmail(params: {
  to: string;
  nickname: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  newOverall: number;
  promotedToTotw: boolean;
}) {
  const { transporter, gmailUser } = getTransporter();
  const { appUrl } = getMailerConfig();
  const html = wrapEmailLayout(
    `¡Eres el MVP del partido, ${params.nickname}!`,
    `
      <p style="margin:0 0 14px 0;">Tus compañeros te han elegido como el <strong style="color:#FBBF24;">Mejor Jugador del Partido</strong>.</p>
      <div style="background-color:#090D16;border:1px solid rgba(245,158,11,0.45);border-radius:16px;padding:18px;margin-bottom:22px;text-align:center;">
        <div style="font-size:13px;color:#9CA3AF;">${params.teamAName} ${params.scoreA} - ${params.scoreB} ${params.teamBName}</div>
        <div style="font-size:32px;font-weight:900;color:#FBBF24;margin:8px 0;">MEDIA ${params.newOverall}</div>
        ${
          params.promotedToTotw
            ? `<div style="font-size:12px;color:#34D399;font-weight:700;">Tu carta luce ahora el diseño negro y dorado TOTW hasta el próximo partido.</div>`
            : ""
        }
      </div>
      <div style="text-align:center;">
        <a href="${appUrl}/profile" style="display:inline-block;background:linear-gradient(90deg,#F59E0B,#FACC15);color:#090D16;text-decoration:none;font-weight:900;letter-spacing:0.05em;text-transform:uppercase;padding:13px 26px;border-radius:14px;font-size:13px;">
          Ver mi carta actualizada
        </a>
      </div>
    `,
    params.promotedToTotw ? "👑 MVP · Ascenso a TOTW" : "👑 Premio MVP"
  );

  await transporter.sendMail({
    from: `"FUT Pachangas" <${gmailUser}>`,
    to: params.to,
    subject: `👑 ¡Enhorabuena ${params.nickname}! Has sido elegido MVP`,
    html,
  });
}

export async function sendTestEmail(to: string) {
  const { transporter, gmailUser } = getTransporter();
  const html = wrapEmailLayout(
    "Conexión con Gmail verificada",
    `
      <p style="margin:0 0 14px 0;">Este es un correo de prueba enviado desde <strong style="color:#FFFFFF;">FUT Pachangas</strong> usando <code>${gmailUser}</code>.</p>
      <p style="margin:0;color:#10B981;font-weight:700;">✓ Las notificaciones automáticas (Registro, Convocatorias y MVP) están listas para funcionar.</p>
    `,
    "Correo de Prueba"
  );

  await transporter.sendMail({
    from: `"FUT Pachangas" <${gmailUser}>`,
    to,
    subject: "✅ Prueba de notificaciones — FUT Pachangas",
    html,
  });
}
