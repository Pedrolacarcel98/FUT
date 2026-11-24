-- Esquema SQL oficial para FUT Pachangas (Supabase PostgreSQL)
-- Incluye registro de jugadores (Silver 70 inicial) y valoraciones post-partido.
-- Ejecutar en el SQL Editor de Supabase y crear el bucket público "avatars" en Storage.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Jugadores
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  notify_emails BOOLEAN NOT NULL DEFAULT TRUE,
  last_delta INT NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  position TEXT NOT NULL DEFAULT 'MED', -- POR, DEF, MED, DEL
  card_tier TEXT NOT NULL DEFAULT 'silver', -- bronze, silver, gold, totw, icon, tots
  playstyles TEXT[] DEFAULT '{}',
  pace INT NOT NULL DEFAULT 70 CHECK (pace BETWEEN 1 AND 99),
  shooting INT NOT NULL DEFAULT 70 CHECK (shooting BETWEEN 1 AND 99),
  passing INT NOT NULL DEFAULT 70 CHECK (passing BETWEEN 1 AND 99),
  dribbling INT NOT NULL DEFAULT 70 CHECK (dribbling BETWEEN 1 AND 99),
  defending INT NOT NULL DEFAULT 70 CHECK (defending BETWEEN 1 AND 99),
  physical INT NOT NULL DEFAULT 70 CHECK (physical BETWEEN 1 AND 99),
  performance_bonus INT NOT NULL DEFAULT 0 CHECK (performance_bonus BETWEEN 0 AND 10),
  overall INT GENERATED ALWAYS AS (
    LEAST(99, ((pace + shooting + passing + dribbling + defending + physical) / 6) + performance_bonus)
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Partidos
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled (abierto hasta match_date), voting_open, finished
  max_players INT NOT NULL DEFAULT 14,
  team_a_name TEXT DEFAULT 'Equipo Claro',
  team_b_name TEXT DEFAULT 'Equipo Oscuro',
  team_a_color TEXT DEFAULT 'white',
  team_b_color TEXT DEFAULT 'black',
  score_a INT DEFAULT 0,
  score_b INT DEFAULT 0,
  mvp_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Alineaciones, Convocatorias y Goles por Partido
CREATE TABLE IF NOT EXISTS match_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team TEXT NOT NULL CHECK (team IN ('A', 'B')),
  goals INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  UNIQUE(match_id, player_id)
);

-- 4. Votaciones MVP Post-Partido
CREATE TABLE IF NOT EXISTS match_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  voter_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  mvp_vote_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, voter_fingerprint)
);

-- 5. Valoraciones 1-10 entre Jugadores por Partido (sin autovotos)
CREATE TABLE IF NOT EXISTS match_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  rater_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  target_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, rater_player_id, target_player_id),
  CHECK (rater_player_id <> target_player_id)
);

-- 6. Historial de Evolución de Media por Jugador
CREATE TABLE IF NOT EXISTS player_rating_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  previous_overall INT NOT NULL,
  new_overall INT NOT NULL,
  delta INT NOT NULL,
  previous_tier TEXT NOT NULL,
  new_tier TEXT NOT NULL,
  avg_match_score NUMERIC(3,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Suscriptores de Notificaciones por Correo
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_rating_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Lectura pública
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read match_players" ON match_players FOR SELECT USING (true);
CREATE POLICY "Public read match_votes" ON match_votes FOR SELECT USING (true);
CREATE POLICY "Public read match_ratings" ON match_ratings FOR SELECT USING (true);
CREATE POLICY "Public read rating_history" ON player_rating_history FOR SELECT USING (true);

-- Registro y actualización de perfil propio
CREATE POLICY "Users insert own player" ON players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON players FOR UPDATE USING (auth.uid() = user_id);

-- Votaciones y valoraciones
CREATE POLICY "Public insert match_votes" ON match_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth insert match_ratings" ON match_ratings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Public insert subscribers" ON subscribers FOR INSERT WITH CHECK (true);
