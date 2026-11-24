export type Position = "POR" | "DEF" | "MED" | "DEL";

export type CardTier = "bronze" | "silver" | "gold" | "totw" | "icon" | "tots";

export type UserRole = "player" | "admin";

export type PlayStyleId =
  | "speedster"
  | "finisher"
  | "wall"
  | "playmaker"
  | "mvp"
  | "engine"
  | "dribbler"
  | "keeper";

export interface PlayStyleMeta {
  id: PlayStyleId;
  label: string;
  shortLabel: string;
  description: string;
}

export interface Player {
  id: string;
  name: string;
  nickname: string;
  email?: string | null;
  password?: string | null; // Local demo only; Supabase uses auth.users
  role?: UserRole;
  notify_emails?: boolean;
  last_delta?: number;
  avatar_url: string | null;
  position: Position;
  card_tier: CardTier;
  playstyles: PlayStyleId[];
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  base_overall?: number;
  performance_bonus?: number;
  overall: number;
  created_at: string;
}

export type MatchStatus = "scheduled" | "voting_open" | "finished";

export type TeamColorId =
  | "white"
  | "black"
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "purple";

export const TEAM_COLORS: Record<
  TeamColorId,
  { id: TeamColorId; label: string; hex: string; border: string; bgSoft: string }
> = {
  white: {
    id: "white",
    label: "Blanco",
    hex: "#F8FAFC",
    border: "rgba(248, 250, 252, 0.35)",
    bgSoft: "rgba(248, 250, 252, 0.06)",
  },
  black: {
    id: "black",
    label: "Negro",
    hex: "#1E293B",
    border: "rgba(148, 163, 184, 0.35)",
    bgSoft: "rgba(15, 23, 42, 0.45)",
  },
  red: {
    id: "red",
    label: "Rojo",
    hex: "#EF4444",
    border: "rgba(239, 68, 68, 0.4)",
    bgSoft: "rgba(239, 68, 68, 0.08)",
  },
  blue: {
    id: "blue",
    label: "Azul",
    hex: "#3B82F6",
    border: "rgba(59, 130, 246, 0.4)",
    bgSoft: "rgba(59, 130, 246, 0.08)",
  },
  green: {
    id: "green",
    label: "Verde",
    hex: "#10B981",
    border: "rgba(16, 185, 129, 0.4)",
    bgSoft: "rgba(16, 185, 129, 0.08)",
  },
  yellow: {
    id: "yellow",
    label: "Amarillo",
    hex: "#FACC15",
    border: "rgba(250, 204, 21, 0.4)",
    bgSoft: "rgba(250, 204, 21, 0.08)",
  },
  orange: {
    id: "orange",
    label: "Naranja",
    hex: "#F97316",
    border: "rgba(249, 115, 22, 0.4)",
    bgSoft: "rgba(249, 115, 22, 0.08)",
  },
  purple: {
    id: "purple",
    label: "Morado",
    hex: "#A855F7",
    border: "rgba(168, 85, 247, 0.4)",
    bgSoft: "rgba(168, 85, 247, 0.08)",
  },
};

export const TEAM_COLOR_LIST = Object.values(TEAM_COLORS);

export interface Match {
  id: string;
  match_date: string; // ISO string
  location: string;
  status: MatchStatus;
  max_players?: number;
  team_a_name: string;
  team_b_name: string;
  team_a_color?: TeamColorId;
  team_b_color?: TeamColorId;
  score_a: number;
  score_b: number;
  mvp_player_id: string | null;
  created_at: string;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  team: "A" | "B";
  goals: number;
  assists: number;
}

export interface MatchVote {
  id: string;
  match_id: string;
  voter_fingerprint: string;
  voter_player_id?: string | null;
  mvp_vote_player_id: string;
  created_at: string;
}

export interface MatchRating {
  id: string;
  match_id: string;
  rater_player_id: string;
  target_player_id: string;
  score: number; // 1 - 10
  created_at: string;
}

export interface PlayerRatingHistory {
  id: string;
  player_id: string;
  match_id: string;
  previous_overall: number;
  new_overall: number;
  delta: number;
  previous_tier: CardTier;
  new_tier: CardTier;
  avg_match_score: number;
  reason?: string;
  created_at: string;
}

export interface Subscriber {
  id: string;
  email: string;
  player_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PlayerCareerStats {
  matchesPlayed: number;
  goals: number;
  assists: number;
  mvpAwards: number;
  wins: number;
  winRate: number;
}

export const PLAYSTYLES: Record<PlayStyleId, PlayStyleMeta> = {
  speedster: {
    id: "speedster",
    label: "Velocista",
    shortLabel: "VEL",
    description: "Aceleración explosiva al espacio",
  },
  finisher: {
    id: "finisher",
    label: "Francotirador",
    shortLabel: "GOL",
    description: "Definición letal dentro y fuera del área",
  },
  wall: {
    id: "wall",
    label: "Muro",
    shortLabel: "MUR",
    description: "Impone respeto en cada duelo defensivo",
  },
  playmaker: {
    id: "playmaker",
    label: "Mago del Pase",
    shortLabel: "PAS",
    description: "Visión de juego y último pase filtrado",
  },
  mvp: {
    id: "mvp",
    label: "MVP Vigente",
    shortLabel: "MVP",
    description: "Elegido mejor jugador de la última jornada",
  },
  engine: {
    id: "engine",
    label: "Pulmón",
    shortLabel: "PUL",
    description: "No deja de correr los 90 minutos",
  },
  dribbler: {
    id: "dribbler",
    label: "Malabarista",
    shortLabel: "REG",
    description: "Regate en baldosa y fantasía",
  },
  keeper: {
    id: "keeper",
    label: "Gato",
    shortLabel: "PAR",
    description: "Reflejos imposibles bajo palos",
  },
};

export const CARD_TIER_LABELS: Record<CardTier, string> = {
  tots: "TOTY / TOTS",
  icon: "Leyenda",
  totw: "TOTW / MVP",
  gold: "Oro",
  silver: "Plata",
  bronze: "Bronce",
};

export const SPECIAL_CARD_TIERS: CardTier[] = ["tots", "icon", "totw"];

export function isSpecialTier(tier: CardTier): boolean {
  return SPECIAL_CARD_TIERS.includes(tier);
}

/**
 * FIFA / EA FC standard tier rule strictly driven by overall rating:
 * - 1..64  -> bronze
 * - 65..74 -> silver
 * - 75..99 -> gold
 */
export function standardTierFromOverall(
  overall: number
): "bronze" | "silver" | "gold" {
  if (overall < 65) return "bronze";
  if (overall < 75) return "silver";
  return "gold";
}

export const CARD_TIER_ORDER: CardTier[] = [
  "tots",
  "icon",
  "totw",
  "gold",
  "silver",
  "bronze",
];

export function computeOverall(
  stats: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  },
  performanceBonus = 0
): number {
  const base = Math.floor(
    (stats.pace +
      stats.shooting +
      stats.passing +
      stats.dribbling +
      stats.defending +
      stats.physical) /
      6
  );
  return Math.min(99, base + Math.max(0, performanceBonus));
}
