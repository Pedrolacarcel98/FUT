import { NextResponse } from "next/server";
import {
  isMailerConfigured,
  sendMvpAwardEmail,
  sendNewMatchEmail,
  sendTestEmail,
  sendWelcomeEmail,
} from "@/lib/mailer";
import { isDeliverableEmail, isValidEmail } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    if (!isMailerConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          error: "Servicio de correo no configurado (.env.local).",
        },
        { status: 200 }
      );
    }

    const body = await req.json();

    switch (body.type) {
      case "welcome": {
        if (!isDeliverableEmail(body.to)) {
          return NextResponse.json({
            ok: false,
            skipped: true,
            error: "Correo no entregable o inválido.",
          });
        }
        await sendWelcomeEmail({
          to: body.to,
          name: String(body.name || "Jugador"),
          nickname: String(body.nickname || "CRACK"),
          position: String(body.position || "MED"),
          cardPngDataUrl:
            typeof body.cardPngDataUrl === "string" ? body.cardPngDataUrl : null,
        });
        return NextResponse.json({ ok: true, sent: 1 });
      }

      case "new_match": {
        const recipients: string[] = Array.isArray(body.recipients)
          ? body.recipients.filter((e: unknown): e is string =>
              typeof e === "string" ? isDeliverableEmail(e) : false
            )
          : [];

        if (recipients.length === 0) {
          return NextResponse.json({
            ok: true,
            skipped: true,
            sent: 0,
            message: "No hay destinatarios con correo real activos.",
          });
        }

        await sendNewMatchEmail({
          bcc: Array.from(new Set(recipients)),
          matchDate: String(body.matchDate),
          location: String(body.location || "Campo por confirmar"),
          teamAName: String(body.teamAName || "Equipo Claro"),
          teamBName: String(body.teamBName || "Equipo Oscuro"),
          maxPlayers: Number(body.maxPlayers || 14),
        });
        return NextResponse.json({ ok: true, sent: recipients.length });
      }

      case "mvp_award": {
        if (!isDeliverableEmail(body.to)) {
          return NextResponse.json({
            ok: false,
            skipped: true,
            error: "El ganador MVP no tiene un correo real entregable.",
          });
        }
        await sendMvpAwardEmail({
          to: body.to,
          nickname: String(body.nickname || "MVP"),
          teamAName: String(body.teamAName || "Equipo Claro"),
          teamBName: String(body.teamBName || "Equipo Oscuro"),
          scoreA: Number(body.scoreA ?? 0),
          scoreB: Number(body.scoreB ?? 0),
          newOverall: Number(body.newOverall ?? 70),
          promotedToTotw: Boolean(body.promotedToTotw),
        });
        return NextResponse.json({ ok: true, sent: 1 });
      }

      case "test": {
        if (typeof body.to !== "string" || !isValidEmail(body.to)) {
          return NextResponse.json(
            { ok: false, error: "Introduce un correo electrónico válido." },
            { status: 400 }
          );
        }
        await sendTestEmail(body.to.trim());
        return NextResponse.json({ ok: true, sent: 1 });
      }

      default:
        return NextResponse.json(
          { ok: false, error: "Tipo de notificación no soportado." },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Error enviando notificación por correo:", err);
    const message =
      err instanceof Error ? err.message : "Error desconocido al enviar correo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
