import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { Player } from "@/types/fut";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function maybeUploadAvatar(
  avatarUrl: string | null | undefined,
  playerId: string
): Promise<string | null> {
  if (!avatarUrl) return null;
  if (!avatarUrl.startsWith("data:image/")) return avatarUrl;

  try {
    const match = avatarUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return avatarUrl;
    const contentType = match[1];
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const buffer = Buffer.from(match[2], "base64");
    const path = `${playerId}-${Date.now()}.${ext}`;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, buffer, { contentType, upsert: true });

    if (error) {
      console.warn("Avatar upload fallback to inline data URL:", error.message);
      return avatarUrl;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return avatarUrl;
  }
}

export async function GET() {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Supabase no configurado." },
      { status: 200 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const [
      playersRes,
      matchesRes,
      matchPlayersRes,
      votesRes,
      historyRes,
      subscribersRes,
    ] = await Promise.all([
      supabase.from("players").select("*").order("created_at", { ascending: false }),
      supabase.from("matches").select("*").order("match_date", { ascending: false }),
      supabase.from("match_players").select("*"),
      supabase.from("match_votes").select("*"),
      supabase
        .from("player_rating_history")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("subscribers")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const firstError =
      playersRes.error ||
      matchesRes.error ||
      matchPlayersRes.error ||
      votesRes.error ||
      historyRes.error ||
      subscribersRes.error;

    if (firstError) {
      return NextResponse.json(
        { ok: false, configured: true, error: firstError.message },
        { status: 500 }
      );
    }

    // Strip password before returning to client
    const safePlayers = (playersRes.data ?? []).map((p: Record<string, unknown>) => {
      const rest = { ...p };
      delete rest.password;
      return rest;
    });

    return NextResponse.json({
      ok: true,
      configured: true,
      data: {
        players: safePlayers,
        matches: matchesRes.data ?? [],
        matchPlayers: matchPlayersRes.data ?? [],
        votes: votesRes.data ?? [],
        ratingHistory: historyRes.data ?? [],
        subscribers: subscribersRes.data ?? [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: err instanceof Error ? err.message : "Error cargando datos",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Supabase no configurado." },
      { status: 200 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { action, payload } = body as {
      action: string;
      payload: Record<string, unknown>;
    };

    switch (action) {
      case "registerPlayer": {
        const p = payload.player as Player;
        const avatarUrl = await maybeUploadAvatar(p.avatar_url, p.id);
        const { error } = await supabase.from("players").insert({
          id: p.id,
          name: p.name,
          nickname: p.nickname,
          email: p.email ?? null,
          password: p.password ?? null,
          role: p.role ?? "player",
          notify_emails: p.notify_emails ?? true,
          last_delta: 0,
          avatar_url: avatarUrl,
          position: p.position,
          card_tier: p.card_tier,
          playstyles: p.playstyles ?? [],
          pace: p.pace,
          shooting: p.shooting,
          passing: p.passing,
          dribbling: p.dribbling,
          defending: p.defending,
          physical: p.physical,
          performance_bonus: 0,
        });
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        if (p.email && p.notify_emails !== false) {
          await supabase.from("subscribers").upsert(
            {
              email: p.email,
              player_id: p.id,
              is_active: true,
            },
            { onConflict: "email" }
          );
        }
        return NextResponse.json({ ok: true, avatar_url: avatarUrl });
      }

      case "loginPlayer": {
        const email = String(payload.email || "").trim().toLowerCase();
        const password = String(payload.password || "").trim();
        const { data, error } = await supabase
          .from("players")
          .select("*")
          .eq("email", email)
          .maybeSingle();

        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }
        if (!data) {
          return NextResponse.json(
            { ok: false, error: "No existe ninguna cuenta con ese correo electrónico." },
            { status: 401 }
          );
        }
        if ((data.password ?? "") !== password) {
          return NextResponse.json(
            { ok: false, error: "Contraseña incorrecta." },
            { status: 401 }
          );
        }
        const safe = { ...data };
        delete safe.password;
        return NextResponse.json({ ok: true, player: safe });
      }

      case "updateOwnProfile": {
        const playerId = String(payload.playerId);
        const avatarUrl = await maybeUploadAvatar(
          payload.avatar_url as string | null,
          playerId
        );
        const { error } = await supabase
          .from("players")
          .update({
            name: payload.name,
            nickname: payload.nickname,
            position: payload.position,
            avatar_url: avatarUrl,
            notify_emails: payload.notify_emails,
          })
          .eq("id", playerId);
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true, avatar_url: avatarUrl });
      }

      case "upsertPlayer": {
        const p = payload.player as Player;
        const avatarUrl = await maybeUploadAvatar(p.avatar_url, p.id);
        const row: Record<string, unknown> = {
          id: p.id,
          name: p.name,
          nickname: p.nickname,
          email: p.email ?? null,
          role: p.role ?? "player",
          notify_emails: p.notify_emails ?? true,
          last_delta: p.last_delta ?? 0,
          avatar_url: avatarUrl,
          position: p.position,
          card_tier: p.card_tier,
          playstyles: p.playstyles ?? [],
          pace: p.pace,
          shooting: p.shooting,
          passing: p.passing,
          dribbling: p.dribbling,
          defending: p.defending,
          physical: p.physical,
          performance_bonus: p.performance_bonus ?? 0,
        };
        const { error } = await supabase
          .from("players")
          .upsert(row, { onConflict: "id" });
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true, avatar_url: avatarUrl });
      }

      case "deletePlayer": {
        const { error } = await supabase
          .from("players")
          .delete()
          .eq("id", String(payload.playerId));
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }

      case "createMatch": {
        const match = payload.match as Record<string, unknown>;
        const matchPlayers = (payload.matchPlayers ?? []) as Record<string, unknown>[];
        const { error: mErr } = await supabase.from("matches").insert({
          id: match.id,
          match_date: match.match_date,
          location: match.location,
          status: match.status,
          max_players: match.max_players ?? 14,
          team_a_name: match.team_a_name,
          team_b_name: match.team_b_name,
          team_a_color: match.team_a_color ?? "white",
          team_b_color: match.team_b_color ?? "black",
          score_a: 0,
          score_b: 0,
          mvp_player_id: null,
        });
        if (mErr) {
          return NextResponse.json({ ok: false, error: mErr.message }, { status: 400 });
        }
        if (matchPlayers.length > 0) {
          const { error: mpErr } = await supabase
            .from("match_players")
            .insert(matchPlayers);
          if (mpErr) {
            return NextResponse.json({ ok: false, error: mpErr.message }, { status: 400 });
          }
        }
        return NextResponse.json({ ok: true });
      }

      case "updateMatchDetails": {
        const { error } = await supabase
          .from("matches")
          .update({
            match_date: payload.match_date,
            location: payload.location,
            max_players: payload.max_players,
            team_a_name: payload.team_a_name,
            team_b_name: payload.team_b_name,
            team_a_color: payload.team_a_color,
            team_b_color: payload.team_b_color,
          })
          .eq("id", String(payload.matchId));
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }

      case "deleteMatch": {
        const { error } = await supabase
          .from("matches")
          .delete()
          .eq("id", String(payload.matchId));
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }

      case "upsertMatchPlayer": {
        const mp = payload.matchPlayer as Record<string, unknown>;
        const { error } = await supabase
          .from("match_players")
          .upsert(mp, { onConflict: "match_id,player_id" });
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }

      case "removeMatchPlayer": {
        const { error } = await supabase
          .from("match_players")
          .delete()
          .eq("match_id", String(payload.matchId))
          .eq("player_id", String(payload.playerId));
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }

      case "updateMatchTeams": {
        const updates = (payload.updates ?? []) as {
          match_id: string;
          player_id: string;
          team: "A" | "B";
        }[];
        for (const u of updates) {
          await supabase
            .from("match_players")
            .update({ team: u.team })
            .eq("match_id", u.match_id)
            .eq("player_id", u.player_id);
        }
        return NextResponse.json({ ok: true });
      }

      case "updateMatchScoreAndGoals": {
        const matchId = String(payload.matchId);
        const { error } = await supabase
          .from("matches")
          .update({
            score_a: payload.scoreA,
            score_b: payload.scoreB,
          })
          .eq("id", matchId);
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        const goalsMap = (payload.playerGoals ?? {}) as Record<string, number>;
        const assistsMap = (payload.playerAssists ?? {}) as Record<string, number>;
        const playerIds = new Set([
          ...Object.keys(goalsMap),
          ...Object.keys(assistsMap),
        ]);
        for (const playerId of playerIds) {
          const updateData: Record<string, number> = {};
          if (playerId in goalsMap) {
            updateData.goals = Math.max(0, goalsMap[playerId]);
          }
          if (playerId in assistsMap) {
            updateData.assists = Math.max(0, assistsMap[playerId]);
          }
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("match_players")
              .update(updateData)
              .eq("match_id", matchId)
              .eq("player_id", playerId);
          }
        }
        return NextResponse.json({ ok: true });
      }

      case "castMvpVote": {
        const vote = payload.vote as Record<string, unknown>;
        const { error } = await supabase.from("match_votes").insert(vote);
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }

      case "closeMatch": {
        const matchId = String(payload.matchId);
        const winnerId = (payload.winnerId as string | null) ?? null;
        const updatedPlayers = (payload.updatedPlayers ?? []) as Player[];
        const historyEntries = (payload.historyEntries ?? []) as Record<
          string,
          unknown
        >[];

        const { error: mErr } = await supabase
          .from("matches")
          .update({ status: "finished", mvp_player_id: winnerId })
          .eq("id", matchId);
        if (mErr) {
          return NextResponse.json({ ok: false, error: mErr.message }, { status: 400 });
        }

        for (const p of updatedPlayers) {
          await supabase
            .from("players")
            .update({
              pace: p.pace,
              shooting: p.shooting,
              passing: p.passing,
              dribbling: p.dribbling,
              defending: p.defending,
              physical: p.physical,
              performance_bonus: p.performance_bonus ?? 0,
              card_tier: p.card_tier,
              playstyles: p.playstyles ?? [],
              last_delta: p.last_delta ?? 0,
            })
            .eq("id", p.id);
        }

        if (historyEntries.length > 0) {
          await supabase.from("player_rating_history").insert(
            historyEntries.map((h) => ({
              player_id: h.player_id,
              match_id: h.match_id,
              previous_overall: h.previous_overall,
              new_overall: h.new_overall,
              delta: h.delta,
              previous_tier: h.previous_tier,
              new_tier: h.new_tier,
              avg_match_score: h.avg_match_score ?? 0,
              reason: h.reason ?? null,
            }))
          );
        }

        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Acción desconocida: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Error in /api/db POST:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error de servidor" },
      { status: 500 }
    );
  }
}
