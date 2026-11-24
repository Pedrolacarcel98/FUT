"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  computeOverall,
  type Match,
  type MatchPlayer,
  type MatchRating,
  type MatchVote,
  type Player,
  type PlayerCareerStats,
  type PlayerRatingHistory,
  type Position,
  type Subscriber,
  type TeamColorId,
} from "@/types/fut";
import {
  applyMatchProgression,
  type ProgressionChange,
} from "./progression";
import {
  computePerformanceBonus,
  type PerformanceBonusBreakdown,
} from "./rating-bonus";
import { getEffectiveMatchPhase } from "./match-phase";
import { isValidEmail } from "./validation";
import { balanceTeams } from "./team-balancer";

const STORAGE_KEY = "fut-pachangas-prod-v1";
const FINGERPRINT_KEY = "fut-pachangas-voter-fp";
const ADMIN_AUTH_KEY = "fut-pachangas-admin-auth";
const CURRENT_PLAYER_KEY = "fut-pachangas-current-player";

const DEFAULT_ADMIN_USER = "adminpachangas";
const DEFAULT_ADMIN_PASS = "FutPachangas22";

interface PersistedState {
  players: Player[];
  matches: Match[];
  matchPlayers: MatchPlayer[];
  votes: MatchVote[];
  ratings: MatchRating[];
  ratingHistory: PlayerRatingHistory[];
  subscribers: Subscriber[];
}

interface FutStoreContextValue {
  hydrated: boolean;
  players: Player[];
  matches: Match[];
  matchPlayers: MatchPlayer[];
  votes: MatchVote[];
  ratings: MatchRating[];
  ratingHistory: PlayerRatingHistory[];
  subscribers: Subscriber[];
  isAdmin: boolean;
  currentPlayer: Player | null;
  voterFingerprint: string;

  // Admin Auth
  loginAdmin: (username: string, password: string) => boolean;
  logoutAdmin: () => void;

  // Player Auth & Profile
  registerPlayer: (input: {
    email: string;
    password: string;
    name: string;
    nickname: string;
    position: Position;
    avatar_url?: string | null;
    notify_emails?: boolean;
  }) => { ok: boolean; error?: string; player?: Player };
  loginPlayer: (
    email: string,
    password: string
  ) => { ok: boolean; error?: string; player?: Player };
  logoutPlayer: () => void;
  updateOwnProfile: (input: {
    name: string;
    nickname: string;
    position: Position;
    avatar_url: string | null;
    notify_emails: boolean;
  }) => { ok: boolean; error?: string };

  // Players CRUD (Admin)
  upsertPlayer: (
    player: Omit<Player, "id" | "overall" | "created_at"> & { id?: string }
  ) => Player;
  deletePlayer: (playerId: string) => void;

  // Matches CRUD & workflow
  createMatch: (input: {
    match_date: string;
    location: string;
    team_a_name: string;
    team_b_name: string;
    team_a_color?: TeamColorId;
    team_b_color?: TeamColorId;
    max_players?: number;
    teamAPlayerIds?: string[];
    teamBPlayerIds?: string[];
  }) => Match;
  updateMatchDetails: (
    matchId: string,
    input: {
      match_date: string;
      location: string;
      team_a_name: string;
      team_b_name: string;
      team_a_color?: TeamColorId;
      team_b_color?: TeamColorId;
      max_players?: number;
    }
  ) => void;
  deleteMatch: (matchId: string) => void;
  joinOrSwitchTeam: (
    matchId: string,
    team: "A" | "B"
  ) => { ok: boolean; action?: "joined" | "switched"; error?: string };
  leaveMatch: (matchId: string) => { ok: boolean; error?: string };
  adminAddPlayerToMatch: (
    matchId: string,
    playerId: string,
    team: "A" | "B"
  ) => { ok: boolean; error?: string };
  adminRemovePlayerFromMatch: (matchId: string, playerId: string) => void;
  autoBalanceMatchTeams: (matchId: string) => { ok: boolean; error?: string };
  swapMatchPlayerTeam: (matchId: string, playerId: string) => void;
  updateMatchScoreAndGoals: (
    matchId: string,
    scoreA: number,
    scoreB: number,
    playerGoals: Record<string, number>
  ) => void;
  openMatchVoting: (matchId: string) => void;
  closeMatchVotingAndFinish: (
    matchId: string,
    options: { promoteMvpToTotw: boolean; overrideMvpId?: string | null }
  ) => { winnerId: string | null; changes: ProgressionChange[] };

  // Voting & Subscribers
  castMvpVote: (
    matchId: string,
    mvpPlayerId: string
  ) => { ok: boolean; error?: string };
  hasCurrentPlayerVotedInMatch: (matchId: string) => boolean;
  getMatchRatings: (matchId: string) => MatchRating[];
  getPlayerRatingHistory: (playerId: string) => PlayerRatingHistory[];
  addSubscriber: (email: string) => { ok: boolean; error?: string };

  // Derived helpers
  getPlayerById: (id: string | null | undefined) => Player | undefined;
  getMatchPlayers: (matchId: string) => (MatchPlayer & { player: Player })[];
  getMatchVotes: (matchId: string) => MatchVote[];
  getPlayerCareerStats: (playerId: string) => PlayerCareerStats;
  getPlayerBonusBreakdown: (playerId: string) => PerformanceBonusBreakdown;
}

const FutStoreContext = createContext<FutStoreContextValue | null>(null);

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function calculateCareerStats(
  playerId: string,
  matches: Match[],
  matchPlayers: MatchPlayer[]
): PlayerCareerStats {
  const completedMatchIds = new Set(
    matches
      .filter((m) => m.status === "finished" || m.status === "voting_open")
      .map((m) => m.id)
  );

  const appearances = matchPlayers.filter(
    (mp) => mp.player_id === playerId && completedMatchIds.has(mp.match_id)
  );

  let goals = 0;
  let assists = 0;
  let wins = 0;

  for (const app of appearances) {
    goals += app.goals;
    assists += app.assists;
    const match = matches.find((m) => m.id === app.match_id);
    if (match) {
      const teamWon =
        (app.team === "A" && match.score_a > match.score_b) ||
        (app.team === "B" && match.score_b > match.score_a);
      if (teamWon) wins += 1;
    }
  }

  const mvpAwards = matches.filter(
    (m) => m.status === "finished" && m.mvp_player_id === playerId
  ).length;

  const matchesPlayed = appearances.length;
  const winRate =
    matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  return {
    matchesPlayed,
    goals,
    assists,
    mvpAwards,
    wins,
    winRate,
  };
}

const DEFAULT_STATE: PersistedState = {
  players: [],
  matches: [],
  matchPlayers: [],
  votes: [],
  ratings: [],
  ratingHistory: [],
  subscribers: [],
};

export function FutStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [voterFingerprint, setVoterFingerprint] = useState("local-guest");

  // Load persisted local state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (parsed) {
          setState({
            players: parsed.players ?? [],
            matches: parsed.matches ?? [],
            matchPlayers: parsed.matchPlayers ?? [],
            votes: parsed.votes ?? [],
            ratings: parsed.ratings ?? [],
            ratingHistory: parsed.ratingHistory ?? [],
            subscribers: parsed.subscribers ?? [],
          });
        }
      }
      let fp = localStorage.getItem(FINGERPRINT_KEY);
      if (!fp) {
        fp = generateId("fp");
        localStorage.setItem(FINGERPRINT_KEY, fp);
      }
      setVoterFingerprint(fp);

      if (localStorage.getItem(ADMIN_AUTH_KEY) === "true") {
        setIsAdmin(true);
      }
      const savedPlayerId = localStorage.getItem(CURRENT_PLAYER_KEY);
      if (savedPlayerId) {
        setCurrentPlayerId(savedPlayerId);
      }
    } catch {
      // ignore storage errors
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist state on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state, hydrated]);

  // Derived players with live performance_bonus (goals + MVPs + wins) applied to overall
  const enrichedPlayers = useMemo<Player[]>(() => {
    return state.players.map((p) => {
      const stats = calculateCareerStats(p.id, state.matches, state.matchPlayers);
      const bonus = computePerformanceBonus(stats).totalBonus;
      const baseOverall = computeOverall(p, 0);
      const finalOverall = computeOverall(p, bonus);
      return {
        ...p,
        base_overall: baseOverall,
        performance_bonus: bonus,
        overall: finalOverall,
      };
    });
  }, [state.players, state.matches, state.matchPlayers]);

  const currentPlayer = useMemo(
    () =>
      currentPlayerId
        ? enrichedPlayers.find((p) => p.id === currentPlayerId) ?? null
        : null,
    [enrichedPlayers, currentPlayerId]
  );

  const persistPlayerSession = useCallback((playerId: string | null) => {
    setCurrentPlayerId(playerId);
    try {
      if (playerId) {
        localStorage.setItem(CURRENT_PLAYER_KEY, playerId);
      } else {
        localStorage.removeItem(CURRENT_PLAYER_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const loginAdmin = useCallback((username: string, password: string) => {
    if (
      username.trim() === DEFAULT_ADMIN_USER &&
      password === DEFAULT_ADMIN_PASS
    ) {
      setIsAdmin(true);
      try {
        localStorage.setItem(ADMIN_AUTH_KEY, "true");
      } catch {
        // ignore
      }
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdmin(false);
    try {
      localStorage.removeItem(ADMIN_AUTH_KEY);
    } catch {
      // ignore
    }
  }, []);

  const registerPlayer = useCallback(
    (input: {
      email: string;
      password: string;
      name: string;
      nickname: string;
      position: Position;
      avatar_url?: string | null;
      notify_emails?: boolean;
    }) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        return { ok: false, error: "Introduce un correo electrónico válido." };
      }
      if (input.password.trim().length < 4) {
        return {
          ok: false,
          error: "La contraseña debe tener al menos 4 caracteres.",
        };
      }
      if (!input.name.trim() || !input.nickname.trim()) {
        return { ok: false, error: "Completa tu nombre y mote FUT." };
      }

      const duplicate = state.players.find(
        (p) => p.email?.toLowerCase() === normalizedEmail
      );
      if (duplicate) {
        return {
          ok: false,
          error:
            "Ya existe un jugador registrado con ese correo. Inicia sesión.",
        };
      }

      const acceptsEmails = input.notify_emails ?? true;

      // Every newly registered player starts at Silver (70 across all 6 stats)
      const newPlayer: Player = {
        id: generateId("p"),
        name: input.name.trim(),
        nickname: input.nickname.trim().toUpperCase(),
        email: normalizedEmail,
        password: input.password.trim(),
        role: "player",
        notify_emails: acceptsEmails,
        last_delta: 0,
        avatar_url: input.avatar_url ?? null,
        position: input.position,
        card_tier: "silver",
        playstyles: [],
        pace: 70,
        shooting: 70,
        passing: 70,
        dribbling: 70,
        defending: 70,
        physical: 70,
        overall: 70,
        created_at: new Date().toISOString(),
      };

      setState((prev) => {
        const alreadySubscribed = prev.subscribers.some(
          (s) => s.email === normalizedEmail
        );
        const nextSubscribers =
          acceptsEmails && !alreadySubscribed
            ? [
                {
                  id: generateId("sub"),
                  email: normalizedEmail,
                  player_id: newPlayer.id,
                  is_active: true,
                  created_at: new Date().toISOString(),
                },
                ...prev.subscribers,
              ]
            : prev.subscribers;

        return {
          ...prev,
          players: [newPlayer, ...prev.players],
          subscribers: nextSubscribers,
        };
      });

      persistPlayerSession(newPlayer.id);
      return { ok: true, player: newPlayer };
    },
    [state.players, persistPlayerSession]
  );

  const loginPlayer = useCallback(
    (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      const found = state.players.find(
        (p) => p.email?.toLowerCase() === normalized
      );
      if (!found) {
        return {
          ok: false,
          error: "No existe ninguna cuenta con ese correo electrónico.",
        };
      }
      const expectedPassword = found.password ?? "1234";
      if (password.trim() !== expectedPassword) {
        return { ok: false, error: "Contraseña incorrecta." };
      }
      persistPlayerSession(found.id);
      return { ok: true, player: found };
    },
    [state.players, persistPlayerSession]
  );

  const logoutPlayer = useCallback(() => {
    persistPlayerSession(null);
  }, [persistPlayerSession]);

  const updateOwnProfile = useCallback(
    (input: {
      name: string;
      nickname: string;
      position: Position;
      avatar_url: string | null;
      notify_emails: boolean;
    }) => {
      if (!currentPlayerId) {
        return { ok: false, error: "Debes iniciar sesión primero." };
      }
      if (!input.name.trim() || !input.nickname.trim()) {
        return { ok: false, error: "Nombre y mote son obligatorios." };
      }
      setState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === currentPlayerId
            ? {
              ...p,
              name: input.name.trim(),
              nickname: input.nickname.trim().toUpperCase(),
              position: input.position,
              avatar_url: input.avatar_url,
              notify_emails: input.notify_emails,
            }
            : p
        ),
      }));
      return { ok: true };
    },
    [currentPlayerId]
  );

  const upsertPlayer = useCallback(
    (
      input: Omit<Player, "id" | "overall" | "created_at"> & { id?: string }
    ): Player => {
      const overall = computeOverall(input);
      let saved!: Player;

      setState((prev) => {
        const existing = input.id
          ? prev.players.find((p) => p.id === input.id)
          : undefined;
        if (existing) {
          saved = {
            ...existing,
            ...input,
            id: existing.id,
            overall,
          };
          return {
            ...prev,
            players: prev.players.map((p) => (p.id === existing.id ? saved : p)),
          };
        }
        saved = {
          role: "player",
          notify_emails: true,
          last_delta: 0,
          ...input,
          id: input.id ?? generateId("p"),
          overall,
          created_at: new Date().toISOString(),
        };
        return {
          ...prev,
          players: [saved, ...prev.players],
        };
      });

      return saved;
    },
    []
  );

  const deletePlayer = useCallback(
    (playerId: string) => {
      if (currentPlayerId === playerId) {
        persistPlayerSession(null);
      }
      setState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.id !== playerId),
        matchPlayers: prev.matchPlayers.filter((mp) => mp.player_id !== playerId),
        votes: prev.votes.filter((v) => v.mvp_vote_player_id !== playerId),
        ratings: prev.ratings.filter(
          (r) =>
            r.rater_player_id !== playerId && r.target_player_id !== playerId
        ),
        ratingHistory: prev.ratingHistory.filter(
          (h) => h.player_id !== playerId
        ),
      }));
    },
    [currentPlayerId, persistPlayerSession]
  );

  const createMatch = useCallback(
    (input: {
      match_date: string;
      location: string;
      team_a_name: string;
      team_b_name: string;
      team_a_color?: TeamColorId;
      team_b_color?: TeamColorId;
      max_players?: number;
      teamAPlayerIds?: string[];
      teamBPlayerIds?: string[];
    }): Match => {
      const newMatch: Match = {
        id: generateId("m"),
        match_date: input.match_date,
        location: input.location,
        status: "scheduled",
        max_players: input.max_players ?? 14,
        team_a_name: input.team_a_name || "Equipo Claro",
        team_b_name: input.team_b_name || "Equipo Oscuro",
        team_a_color: input.team_a_color ?? "white",
        team_b_color: input.team_b_color ?? "black",
        score_a: 0,
        score_b: 0,
        mvp_player_id: null,
        created_at: new Date().toISOString(),
      };

      const newMatchPlayers: MatchPlayer[] = [
        ...(input.teamAPlayerIds ?? []).map((pid) => ({
          id: generateId("mp"),
          match_id: newMatch.id,
          player_id: pid,
          team: "A" as const,
          goals: 0,
          assists: 0,
        })),
        ...(input.teamBPlayerIds ?? []).map((pid) => ({
          id: generateId("mp"),
          match_id: newMatch.id,
          player_id: pid,
          team: "B" as const,
          goals: 0,
          assists: 0,
        })),
      ];

      setState((prev) => ({
        ...prev,
        matches: [newMatch, ...prev.matches],
        matchPlayers: [...prev.matchPlayers, ...newMatchPlayers],
      }));

      return newMatch;
    },
    []
  );

  const updateMatchDetails = useCallback(
    (
      matchId: string,
      input: {
        match_date: string;
        location: string;
        team_a_name: string;
        team_b_name: string;
        team_a_color?: TeamColorId;
        team_b_color?: TeamColorId;
        max_players?: number;
      }
    ) => {
      setState((prev) => ({
        ...prev,
        matches: prev.matches.map((m) =>
          m.id === matchId
            ? {
                ...m,
                match_date: input.match_date,
                location: input.location,
                team_a_name: input.team_a_name || m.team_a_name,
                team_b_name: input.team_b_name || m.team_b_name,
                team_a_color: input.team_a_color ?? m.team_a_color,
                team_b_color: input.team_b_color ?? m.team_b_color,
                max_players: input.max_players ?? m.max_players,
              }
            : m
        ),
      }));
    },
    []
  );

  const deleteMatch = useCallback((matchId: string) => {
    setState((prev) => ({
      ...prev,
      matches: prev.matches.filter((m) => m.id !== matchId),
      matchPlayers: prev.matchPlayers.filter((mp) => mp.match_id !== matchId),
      votes: prev.votes.filter((v) => v.match_id !== matchId),
      ratings: prev.ratings.filter((r) => r.match_id !== matchId),
      ratingHistory: prev.ratingHistory.filter((h) => h.match_id !== matchId),
    }));
  }, []);

  const joinOrSwitchTeam = useCallback(
    (matchId: string, team: "A" | "B") => {
      if (!currentPlayerId) {
        return {
          ok: false,
          error: "Inicia sesión o regístrate para apuntarte a un equipo.",
        };
      }
      const match = state.matches.find((m) => m.id === matchId);
      if (!match || match.status !== "scheduled") {
        return { ok: false, error: "Este partido ya no acepta inscripciones." };
      }
      if (Date.now() >= new Date(match.match_date).getTime()) {
        return {
          ok: false,
          error: "La convocatoria se cerró al alcanzar la hora del partido.",
        };
      }

      const roster = state.matchPlayers.filter((mp) => mp.match_id === matchId);
      const existing = roster.find((mp) => mp.player_id === currentPlayerId);
      const maxPerTeam = Math.ceil((match.max_players ?? 14) / 2);
      const targetTeamCount = roster.filter((mp) => mp.team === team).length;

      if (existing) {
        if (existing.team === team) {
          return { ok: true, action: "switched" as const };
        }
        if (targetTeamCount >= maxPerTeam) {
          return {
            ok: false,
            error: `Ese equipo ya está completo (${maxPerTeam}/${maxPerTeam} plazas).`,
          };
        }
        setState((prev) => ({
          ...prev,
          matchPlayers: prev.matchPlayers.map((mp) =>
            mp.match_id === matchId && mp.player_id === currentPlayerId
              ? { ...mp, team }
              : mp
          ),
        }));
        return { ok: true, action: "switched" as const };
      }

      if (targetTeamCount >= maxPerTeam) {
        return {
          ok: false,
          error: `Ese equipo ya está completo (${maxPerTeam}/${maxPerTeam} plazas).`,
        };
      }

      const entry: MatchPlayer = {
        id: generateId("mp"),
        match_id: matchId,
        player_id: currentPlayerId,
        team,
        goals: 0,
        assists: 0,
      };
      setState((prev) => ({
        ...prev,
        matchPlayers: [...prev.matchPlayers, entry],
      }));
      return { ok: true, action: "joined" as const };
    },
    [currentPlayerId, state.matches, state.matchPlayers]
  );

  const leaveMatch = useCallback(
    (matchId: string) => {
      if (!currentPlayerId) {
        return { ok: false, error: "Debes iniciar sesión primero." };
      }
      const match = state.matches.find((m) => m.id === matchId);
      if (!match || match.status !== "scheduled") {
        return { ok: false, error: "Este partido ya no permite cambios." };
      }
      if (Date.now() >= new Date(match.match_date).getTime()) {
        return {
          ok: false,
          error: "La convocatoria se cerró al alcanzar la hora del partido.",
        };
      }
      setState((prev) => ({
        ...prev,
        matchPlayers: prev.matchPlayers.filter(
          (mp) => !(mp.match_id === matchId && mp.player_id === currentPlayerId)
        ),
      }));
      return { ok: true };
    },
    [currentPlayerId, state.matches]
  );

  const adminAddPlayerToMatch = useCallback(
    (matchId: string, playerId: string, team: "A" | "B") => {
      const exists = state.matchPlayers.some(
        (mp) => mp.match_id === matchId && mp.player_id === playerId
      );
      if (exists) {
        return { ok: false, error: "Ese jugador ya está en este partido." };
      }
      const entry: MatchPlayer = {
        id: generateId("mp"),
        match_id: matchId,
        player_id: playerId,
        team,
        goals: 0,
        assists: 0,
      };
      setState((prev) => ({
        ...prev,
        matchPlayers: [...prev.matchPlayers, entry],
      }));
      return { ok: true };
    },
    [state.matchPlayers]
  );

  const adminRemovePlayerFromMatch = useCallback(
    (matchId: string, playerId: string) => {
      setState((prev) => ({
        ...prev,
        matchPlayers: prev.matchPlayers.filter(
          (mp) => !(mp.match_id === matchId && mp.player_id === playerId)
        ),
      }));
    },
    []
  );

  const autoBalanceMatchTeams = useCallback(
    (matchId: string) => {
      const rosterEntries = state.matchPlayers.filter(
        (mp) => mp.match_id === matchId
      );
      if (rosterEntries.length < 2) {
        return {
          ok: false,
          error: "Se necesitan al menos 2 jugadores apuntados para balancear.",
        };
      }
      const rosterPlayers = rosterEntries
        .map((mp) => state.players.find((p) => p.id === mp.player_id))
        .filter((p): p is Player => Boolean(p));

      const balanced = balanceTeams(rosterPlayers);
      const teamASet = new Set(balanced.teamA.map((p) => p.id));

      setState((prev) => ({
        ...prev,
        matchPlayers: prev.matchPlayers.map((mp) =>
          mp.match_id === matchId
            ? { ...mp, team: teamASet.has(mp.player_id) ? "A" : "B" }
            : mp
        ),
      }));
      return { ok: true };
    },
    [state.matchPlayers, state.players]
  );

  const swapMatchPlayerTeam = useCallback(
    (matchId: string, playerId: string) => {
      setState((prev) => ({
        ...prev,
        matchPlayers: prev.matchPlayers.map((mp) =>
          mp.match_id === matchId && mp.player_id === playerId
            ? { ...mp, team: mp.team === "A" ? "B" : "A" }
            : mp
        ),
      }));
    },
    []
  );

  const updateMatchScoreAndGoals = useCallback(
    (
      matchId: string,
      scoreA: number,
      scoreB: number,
      playerGoals: Record<string, number>
    ) => {
      setState((prev) => ({
        ...prev,
        matches: prev.matches.map((m) =>
          m.id === matchId ? { ...m, score_a: scoreA, score_b: scoreB } : m
        ),
        matchPlayers: prev.matchPlayers.map((mp) =>
          mp.match_id === matchId && mp.player_id in playerGoals
            ? { ...mp, goals: Math.max(0, playerGoals[mp.player_id]) }
            : mp
        ),
      }));
    },
    []
  );

  const openMatchVoting = useCallback((matchId: string) => {
    setState((prev) => ({
      ...prev,
      matches: prev.matches.map((m) =>
        m.id === matchId ? { ...m, status: "voting_open" } : m
      ),
    }));
  }, []);

  const closeMatchVotingAndFinish = useCallback(
    (
      matchId: string,
      options: { promoteMvpToTotw: boolean; overrideMvpId?: string | null }
    ) => {
      // Compute deterministically from current state snapshot so caller receives exact changes
      let winnerId: string | null = options.overrideMvpId ?? null;
      if (!winnerId) {
        const matchVotes = state.votes.filter((v) => v.match_id === matchId);
        const counts = new Map<string, number>();
        for (const v of matchVotes) {
          counts.set(
            v.mvp_vote_player_id,
            (counts.get(v.mvp_vote_player_id) ?? 0) + 1
          );
        }
        let maxVotes = 0;
        counts.forEach((count, pid) => {
          if (count > maxVotes) {
            maxVotes = count;
            winnerId = pid;
          }
        });
      }

      const roster = state.matchPlayers.filter((mp) => mp.match_id === matchId);

      // Simulate matches after closing this match so new MVP + win + goals count toward performance_bonus
      const simulatedMatches = state.matches.map((m) =>
        m.id === matchId
          ? { ...m, status: "finished" as const, mvp_player_id: winnerId }
          : m
      );
      const bonusByPlayerId: Record<string, number> = {};
      for (const p of enrichedPlayers) {
        const nextStats = calculateCareerStats(
          p.id,
          simulatedMatches,
          state.matchPlayers
        );
        bonusByPlayerId[p.id] = computePerformanceBonus(nextStats).totalBonus;
      }

      const { updatedPlayers, historyEntries, changes } = applyMatchProgression({
        matchId,
        players: enrichedPlayers,
        roster,
        votes: state.votes,
        mvpPlayerId: winnerId,
        promoteMvpToTotw: options.promoteMvpToTotw,
        bonusByPlayerId,
      });

      setState((prev) => ({
        ...prev,
        players: updatedPlayers,
        ratingHistory: [...historyEntries, ...prev.ratingHistory],
        matches: prev.matches.map((m) =>
          m.id === matchId
            ? { ...m, status: "finished", mvp_player_id: winnerId }
            : m
        ),
      }));

      return { winnerId, changes };
    },
    [state.votes, state.matchPlayers, state.matches, enrichedPlayers]
  );

  const hasCurrentPlayerVotedInMatch = useCallback(
    (matchId: string) => {
      if (!currentPlayerId) return false;
      return state.votes.some(
        (v) =>
          v.match_id === matchId &&
          (v.voter_player_id === currentPlayerId ||
            v.voter_fingerprint === `player-${currentPlayerId}`)
      );
    },
    [state.votes, currentPlayerId]
  );

  const castMvpVote = useCallback(
    (matchId: string, mvpPlayerId: string) => {
      if (!currentPlayerId) {
        return {
          ok: false,
          error: "Debes iniciar sesión con tu cuenta de jugador para votar.",
        };
      }

      const match = state.matches.find((m) => m.id === matchId);
      if (!match || getEffectiveMatchPhase(match) !== "voting_open") {
        return {
          ok: false,
          error: "La votación para este partido no está abierta actualmente.",
        };
      }

      const roster = state.matchPlayers.filter((mp) => mp.match_id === matchId);
      const isInMatch = roster.some((mp) => mp.player_id === currentPlayerId);
      if (!isInMatch) {
        return {
          ok: false,
          error: "Solo los jugadores convocados a este partido pueden votar.",
        };
      }

      if (hasCurrentPlayerVotedInMatch(matchId)) {
        return {
          ok: false,
          error: "Ya has emitido tu voto MVP en este partido.",
        };
      }

      if (mvpPlayerId === currentPlayerId) {
        return { ok: false, error: "No puedes votarte a ti mismo como MVP." };
      }

      const newVote: MatchVote = {
        id: generateId("v"),
        match_id: matchId,
        voter_fingerprint: `player-${currentPlayerId}`,
        voter_player_id: currentPlayerId,
        mvp_vote_player_id: mvpPlayerId,
        created_at: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        votes: [...prev.votes, newVote],
      }));

      return { ok: true };
    },
    [currentPlayerId, state.matches, state.matchPlayers, hasCurrentPlayerVotedInMatch]
  );

  const getMatchRatings = useCallback(
    (matchId: string) => state.ratings.filter((r) => r.match_id === matchId),
    [state.ratings]
  );

  const getPlayerRatingHistory = useCallback(
    (playerId: string) =>
      state.ratingHistory
        .filter((h) => h.player_id === playerId)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [state.ratingHistory]
  );

  const addSubscriber = useCallback(
    (email: string) => {
      const normalized = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return { ok: false, error: "Introduce un correo electrónico válido." };
      }
      if (state.subscribers.some((s) => s.email === normalized)) {
        return { ok: false, error: "Este correo ya está suscrito a los avisos." };
      }
      const sub: Subscriber = {
        id: generateId("sub"),
        email: normalized,
        player_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        subscribers: [sub, ...prev.subscribers],
      }));
      return { ok: true };
    },
    [state.subscribers]
  );

  const getPlayerById = useCallback(
    (id: string | null | undefined) =>
      id ? enrichedPlayers.find((p) => p.id === id) : undefined,
    [enrichedPlayers]
  );

  const getMatchPlayers = useCallback(
    (matchId: string) => {
      return state.matchPlayers
        .filter((mp) => mp.match_id === matchId)
        .map((mp) => {
          const player = enrichedPlayers.find((p) => p.id === mp.player_id);
          return player ? { ...mp, player } : null;
        })
        .filter((x): x is MatchPlayer & { player: Player } => x !== null);
    },
    [state.matchPlayers, enrichedPlayers]
  );

  const getMatchVotes = useCallback(
    (matchId: string) => state.votes.filter((v) => v.match_id === matchId),
    [state.votes]
  );

  const getPlayerCareerStats = useCallback(
    (playerId: string): PlayerCareerStats =>
      calculateCareerStats(playerId, state.matches, state.matchPlayers),
    [state.matches, state.matchPlayers]
  );

  const getPlayerBonusBreakdown = useCallback(
    (playerId: string): PerformanceBonusBreakdown => {
      const stats = calculateCareerStats(
        playerId,
        state.matches,
        state.matchPlayers
      );
      return computePerformanceBonus(stats);
    },
    [state.matches, state.matchPlayers]
  );

  const value = useMemo<FutStoreContextValue>(
    () => ({
      hydrated,
      players: enrichedPlayers,
      matches: state.matches,
      matchPlayers: state.matchPlayers,
      votes: state.votes,
      ratings: state.ratings,
      ratingHistory: state.ratingHistory,
      subscribers: state.subscribers,
      isAdmin,
      currentPlayer,
      voterFingerprint,
      loginAdmin,
      logoutAdmin,
      registerPlayer,
      loginPlayer,
      logoutPlayer,
      updateOwnProfile,
      upsertPlayer,
      deletePlayer,
      createMatch,
      updateMatchDetails,
      deleteMatch,
      joinOrSwitchTeam,
      leaveMatch,
      adminAddPlayerToMatch,
      adminRemovePlayerFromMatch,
      autoBalanceMatchTeams,
      swapMatchPlayerTeam,
      updateMatchScoreAndGoals,
      openMatchVoting,
      closeMatchVotingAndFinish,
      castMvpVote,
      hasCurrentPlayerVotedInMatch,
      getMatchRatings,
      getPlayerRatingHistory,
      addSubscriber,
      getPlayerById,
      getMatchPlayers,
      getMatchVotes,
      getPlayerCareerStats,
      getPlayerBonusBreakdown,
    }),
    [
      hydrated,
      enrichedPlayers,
      state,
      isAdmin,
      currentPlayer,
      voterFingerprint,
      loginAdmin,
      logoutAdmin,
      registerPlayer,
      loginPlayer,
      logoutPlayer,
      updateOwnProfile,
      upsertPlayer,
      deletePlayer,
      createMatch,
      updateMatchDetails,
      deleteMatch,
      joinOrSwitchTeam,
      leaveMatch,
      adminAddPlayerToMatch,
      adminRemovePlayerFromMatch,
      autoBalanceMatchTeams,
      swapMatchPlayerTeam,
      updateMatchScoreAndGoals,
      openMatchVoting,
      closeMatchVotingAndFinish,
      castMvpVote,
      hasCurrentPlayerVotedInMatch,
      getMatchRatings,
      getPlayerRatingHistory,
      addSubscriber,
      getPlayerById,
      getMatchPlayers,
      getMatchVotes,
      getPlayerCareerStats,
      getPlayerBonusBreakdown,
    ]
  );

  return (
    <FutStoreContext.Provider value={value}>
      {children}
    </FutStoreContext.Provider>
  );
}

export function useFutStore() {
  const ctx = useContext(FutStoreContext);
  if (!ctx) {
    throw new Error("useFutStore must be used inside FutStoreProvider");
  }
  return ctx;
}
