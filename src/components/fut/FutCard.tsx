"use client";

import React, { forwardRef } from "react";
import {
  Crosshair,
  Crown,
  Flame,
  Hand,
  Shield,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import {
  PLAYSTYLES,
  type CardTier,
  type Player,
  type PlayStyleId,
} from "@/types/fut";

interface TierPalette {
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  waveColor: string;
  outerStroke: string;
  innerStroke: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
  badgeBg: string;
  badgeBorder: string;
  badgeIcon: string;
  glowShadow: string;
  hasShimmer: boolean;
}

const TIER_PALETTES: Record<CardTier, TierPalette> = {
  bronze: {
    bgStart: "#C78E5D",
    bgMid: "#8D5631",
    bgEnd: "#522E17",
    waveColor: "rgba(255, 224, 190, 0.16)",
    outerStroke: "#E4B284",
    innerStroke: "#6E3F20",
    textPrimary: "#FFF5EA",
    textSecondary: "#F3D3B3",
    divider: "rgba(255, 232, 205, 0.35)",
    badgeBg: "rgba(56, 28, 12, 0.72)",
    badgeBorder: "#E4B284",
    badgeIcon: "#FDE2C4",
    glowShadow: "0 12px 28px rgba(141, 86, 49, 0.35)",
    hasShimmer: false,
  },
  silver: {
    bgStart: "#E8EDF2",
    bgMid: "#B4C0CC",
    bgEnd: "#717E8C",
    waveColor: "rgba(255, 255, 255, 0.28)",
    outerStroke: "#F8FAFC",
    innerStroke: "#64748B",
    textPrimary: "#111827",
    textSecondary: "#1F2937",
    divider: "rgba(17, 24, 39, 0.28)",
    badgeBg: "rgba(241, 245, 249, 0.85)",
    badgeBorder: "#475569",
    badgeIcon: "#0F172A",
    glowShadow: "0 12px 28px rgba(148, 163, 184, 0.3)",
    hasShimmer: false,
  },
  gold: {
    bgStart: "#FCE38A",
    bgMid: "#D9A436",
    bgEnd: "#946414",
    waveColor: "rgba(255, 248, 210, 0.26)",
    outerStroke: "#FEF08A",
    innerStroke: "#854D0E",
    textPrimary: "#241604",
    textSecondary: "#3D2608",
    divider: "rgba(36, 22, 4, 0.28)",
    badgeBg: "rgba(36, 22, 4, 0.78)",
    badgeBorder: "#FDE047",
    badgeIcon: "#FEF08A",
    glowShadow: "0 12px 30px rgba(217, 164, 54, 0.38)",
    hasShimmer: false,
  },
  totw: {
    bgStart: "#26221B",
    bgMid: "#11100E",
    bgEnd: "#070707",
    waveColor: "rgba(245, 197, 66, 0.24)",
    outerStroke: "#F5C542",
    innerStroke: "#9A7418",
    textPrimary: "#FCE38A",
    textSecondary: "#E5B94C",
    divider: "rgba(245, 197, 66, 0.42)",
    badgeBg: "rgba(17, 16, 14, 0.9)",
    badgeBorder: "#F5C542",
    badgeIcon: "#FCE38A",
    glowShadow: "0 14px 36px rgba(245, 197, 66, 0.34)",
    hasShimmer: true,
  },
  icon: {
    bgStart: "#FFFFFF",
    bgMid: "#EFE7D5",
    bgEnd: "#CBB88F",
    waveColor: "rgba(212, 175, 55, 0.24)",
    outerStroke: "#D4AF37",
    innerStroke: "#9E7E20",
    textPrimary: "#2C2210",
    textSecondary: "#5A451C",
    divider: "rgba(158, 126, 32, 0.4)",
    badgeBg: "rgba(255, 251, 240, 0.92)",
    badgeBorder: "#D4AF37",
    badgeIcon: "#8A6A14",
    glowShadow: "0 14px 36px rgba(212, 175, 55, 0.36)",
    hasShimmer: true,
  },
  tots: {
    bgStart: "#173C8C",
    bgMid: "#0B1F54",
    bgEnd: "#050E2B",
    waveColor: "rgba(250, 204, 21, 0.22)",
    outerStroke: "#FACC15",
    innerStroke: "#CA8A04",
    textPrimary: "#FEF08A",
    textSecondary: "#E0E7FF",
    divider: "rgba(250, 204, 21, 0.45)",
    badgeBg: "rgba(10, 24, 68, 0.9)",
    badgeBorder: "#FACC15",
    badgeIcon: "#FEF08A",
    glowShadow: "0 16px 40px rgba(37, 99, 235, 0.42)",
    hasShimmer: true,
  },
};

function PlayStyleIcon({
  id,
  size,
  color,
}: {
  id: PlayStyleId;
  size: number;
  color: string;
}) {
  const props = { size, color, strokeWidth: 2.2 };
  switch (id) {
    case "speedster":
      return <Zap {...props} />;
    case "finisher":
      return <Crosshair {...props} />;
    case "wall":
      return <Shield {...props} />;
    case "playmaker":
      return <Wand2 {...props} />;
    case "mvp":
      return <Crown {...props} />;
    case "engine":
      return <Flame {...props} />;
    case "dribbler":
      return <Sparkles {...props} />;
    case "keeper":
      return <Hand {...props} />;
  }
}

export interface FutCardProps {
  player: Player;
  size?: "xs" | "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
  disableShimmer?: boolean;
}

const SIZE_CONFIG = {
  xs: { width: 112, scale: 0.43 },
  sm: { width: 164, scale: 0.63 },
  md: { width: 214, scale: 0.823 },
  lg: { width: 260, scale: 1 },
};

/**
 * Core Ultimate Team card designed at a canonical 260x364 canvas and scaled cleanly.
 * Uses explicit hex/rgba colors internally so html2canvas exports to PNG reliably.
 */
export const FutCard = forwardRef<HTMLDivElement, FutCardProps>(
  function FutCard(
    { player, size = "sm", onClick, className = "", disableShimmer = false },
    ref
  ) {
    const palette = TIER_PALETTES[player.card_tier] ?? TIER_PALETTES.gold;
    const { width, scale } = SIZE_CONFIG[size];
    const height = Math.round(364 * scale);
    const uid = `fut-${player.id.replace(/[^a-zA-Z0-9]/g, "")}-${size}`;

    const stats = [
      { label: "PAC", value: player.pace },
      { label: "SHO", value: player.shooting },
      { label: "PAS", value: player.passing },
      { label: "DRI", value: player.dribbling },
      { label: "DEF", value: player.defending },
      { label: "PHY", value: player.physical },
    ];

    const clipPathValue =
      "polygon(50% 1.5%, 88% 7.5%, 96.5% 15.5%, 93.5% 75%, 83% 88.5%, 50% 98.5%, 17% 88.5%, 6.5% 75%, 3.5% 15.5%, 12% 7.5%)";

    return (
      <div
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        style={{
          width,
          height,
          position: "relative",
          userSelect: "none",
          cursor: onClick ? "pointer" : "default",
        }}
        className={`shrink-0 transition-transform duration-200 ${
          onClick ? "hover:scale-[1.03] active:scale-[0.98]" : ""
        } ${className}`}
      >
        <div
          ref={ref}
          style={{
            width: 260,
            height: 364,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
            filter: `drop-shadow(${palette.glowShadow})`,
          }}
        >
          {/* SVG Shield Frame + Metallic Double Borders + Dynamic Waves */}
          <svg
            viewBox="0 0 260 364"
            width={260}
            height={364}
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
            }}
          >
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor={palette.bgStart} />
                <stop offset="52%" stopColor={palette.bgMid} />
                <stop offset="100%" stopColor={palette.bgEnd} />
              </linearGradient>
              <linearGradient
                id={`${uid}-border`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor={palette.outerStroke} />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.85" />
                <stop offset="100%" stopColor={palette.outerStroke} />
              </linearGradient>
              <clipPath id={`${uid}-clip`}>
                <path d="M130 6 L228 28 L250 56 L242 272 L214 322 L130 358 L46 322 L18 272 L10 56 L32 28 Z" />
              </clipPath>
            </defs>

            {/* Main Shield Fill */}
            <path
              d="M130 6 L228 28 L250 56 L242 272 L214 322 L130 358 L46 322 L18 272 L10 56 L32 28 Z"
              fill={`url(#${uid}-bg)`}
            />

            {/* Dynamic Decorative Waves inside shield */}
            <g clipPath={`url(#${uid}-clip)`}>
              <path
                d="M-10 95 Q85 40 165 105 T280 85 L280 140 Q180 175 110 135 T-10 165 Z"
                fill={palette.waveColor}
              />
              <path
                d="M-10 215 Q95 165 180 220 T280 195 L280 245 Q175 275 100 240 T-10 270 Z"
                fill={palette.waveColor}
              />
              <circle
                cx="168"
                cy="126"
                r="82"
                fill={palette.waveColor}
                opacity="0.55"
              />
            </g>

            {/* Outer Metallic Border */}
            <path
              d="M130 6 L228 28 L250 56 L242 272 L214 322 L130 358 L46 322 L18 272 L10 56 L32 28 Z"
              fill="none"
              stroke={`url(#${uid}-border)`}
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            {/* Inner Accent Border */}
            <path
              d="M130 13 L222 33 L243 59 L235 269 L209 316 L130 350 L51 316 L25 269 L17 59 L38 33 Z"
              fill="none"
              stroke={palette.innerStroke}
              strokeWidth="1.5"
              strokeLinejoin="round"
              opacity="0.85"
            />
            {/* Top Crown Diamond Ornament */}
            <polygon
              points="130,2 140,11 130,20 120,11"
              fill={palette.outerStroke}
            />
          </svg>

          {/* Shimmer overlay for elite tiers */}
          {palette.hasShimmer && !disableShimmer && (
            <div
              className="fut-shimmer-layer"
              style={{ clipPath: clipPathValue }}
            />
          )}

          {/* Card Content Layer */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              padding: "26px 20px 18px 20px",
              boxSizing: "border-box",
            }}
          >
            {/* Top Section: Rating + Position + PlayStyles + Portrait */}
            <div
              style={{
                position: "relative",
                height: 186,
                width: "100%",
              }}
            >
              {/* Overall & Position (Top-Left) */}
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  width: 56,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  zIndex: 4,
                }}
              >
                <span
                  className="font-fut"
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    lineHeight: 0.9,
                    letterSpacing: "-0.02em",
                    color: palette.textPrimary,
                  }}
                >
                  {player.overall}
                </span>
                <span
                  className="font-fut"
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: palette.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {player.position}
                </span>
                <div
                  style={{
                    width: 28,
                    height: 1.5,
                    backgroundColor: palette.divider,
                    marginTop: 5,
                    marginBottom: 6,
                  }}
                />
                {/* PlayStyles Vertical Stack (up to 3 hexagonal badges) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    alignItems: "center",
                  }}
                >
                  {player.playstyles.slice(0, 3).map((ps) => (
                    <div
                      key={ps}
                      title={PLAYSTYLES[ps]?.label ?? ps}
                      style={{
                        width: 26,
                        height: 26,
                        backgroundColor: palette.badgeBg,
                        border: `1.5px solid ${palette.badgeBorder}`,
                        borderRadius: 6,
                        transform: "rotate(45deg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div style={{ transform: "rotate(-45deg)" }}>
                        <PlayStyleIcon
                          id={ps}
                          size={13}
                          color={palette.badgeIcon}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Player Portrait or Stylized Footballer Silhouette */}
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  right: 2,
                  width: 164,
                  height: 180,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={player.nickname}
                    crossOrigin="anonymous"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "top center",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, black 72%, transparent 100%)",
                      maskImage:
                        "linear-gradient(to bottom, black 72%, transparent 100%)",
                      borderRadius: "14px 14px 0 0",
                    }}
                  />
                ) : (
                  <svg
                    viewBox="0 0 160 176"
                    width="156"
                    height="172"
                    style={{ display: "block" }}
                  >
                    <defs>
                      <linearGradient
                        id={`${uid}-sil`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={palette.textPrimary}
                          stopOpacity="0.88"
                        />
                        <stop
                          offset="72%"
                          stopColor={palette.textPrimary}
                          stopOpacity="0.52"
                        />
                        <stop
                          offset="100%"
                          stopColor={palette.textPrimary}
                          stopOpacity="0.02"
                        />
                      </linearGradient>
                    </defs>
                    {/* Stylized head & athletic jersey shoulders */}
                    <circle cx="84" cy="52" r="28" fill={`url(#${uid}-sil)`} />
                    <path
                      d="M28 170 C30 118 52 94 84 94 C116 94 138 118 140 170 Z"
                      fill={`url(#${uid}-sil)`}
                    />
                    {/* Jersey V-neck detail */}
                    <path
                      d="M70 96 L84 114 L98 96"
                      fill="none"
                      stroke={palette.bgMid}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.7"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Nickname Banner */}
            <div
              style={{
                textAlign: "center",
                marginTop: 2,
                paddingBottom: 6,
                borderBottom: `1.5px solid ${palette.divider}`,
              }}
            >
              <div
                className="font-fut"
                style={{
                  fontSize: 25,
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: palette.textPrimary,
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {player.nickname}
              </div>
            </div>

            {/* 6-Column Horizontal Stats Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 2,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {stats.map((st) => (
                <div
                  key={st.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="font-fut"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      color: palette.textSecondary,
                      opacity: 0.9,
                      lineHeight: 1.1,
                    }}
                  >
                    {st.label}
                  </span>
                  <span
                    className="font-fut"
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: palette.textPrimary,
                      lineHeight: 1.15,
                    }}
                  >
                    {st.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Base Mini-Badges (Flag / Club Crest / Tier Star) */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {/* Mini Flag */}
              <div
                style={{
                  width: 22,
                  height: 14,
                  borderRadius: 2,
                  overflow: "hidden",
                  border: `1px solid ${palette.outerStroke}`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ flex: 1, backgroundColor: "#C60B1E" }} />
                <div style={{ flex: 2, backgroundColor: "#FFC400" }} />
                <div style={{ flex: 1, backgroundColor: "#C60B1E" }} />
              </div>

              {/* Club Crest */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  backgroundColor: palette.badgeBg,
                  border: `1.5px solid ${palette.outerStroke}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  fontWeight: 800,
                  color: palette.badgeIcon,
                }}
                className="font-fut"
              >
                FP
              </div>

              {/* Tier Status Emblem */}
              <div
                style={{
                  padding: "1px 6px",
                  borderRadius: 999,
                  backgroundColor: palette.badgeBg,
                  border: `1px solid ${palette.outerStroke}`,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  color: palette.badgeIcon,
                  textTransform: "uppercase",
                }}
                className="font-fut"
              >
                {player.card_tier.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
