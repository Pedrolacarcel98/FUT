#!/usr/bin/env python3
"""Genera la materialización del sistema de IA para Codex (OpenAI).

Lo invoca `sync.py`; no se ejecuta suelto ni se copia a los proyectos. Lee las
MISMAS fuentes que el target de Claude Code y produce lo que Codex espera:

  fuente (submódulo)                    Codex (proyecto, gitignored)
  ──────────────────                    ────────────────────────────
  CLAUDE.md (método) + CLAUDE.md   ──►  AGENTS.md            (núcleo < límite)
    del proyecto                        .codex/method/*.md   (flujos largos)
  .claude/agents/*.md              ──►  .codex/agents/*.toml
  .claude/commands/*.md            ──►  .agents/skills/<n>/SKILL.md
  models.toml (+ .ai-models.local.toml del proyecto) → model / effort por agente

Por qué el núcleo: Codex trunca AGENTS.md en silencio por encima de
`project_doc_max_bytes` (~32 KiB por defecto). El método completo no cabe, así
que los flujos largos se sacan a ficheros que el modelo lee bajo demanda y en
su sitio queda un puntero. Si el núcleo resultante supera el límite, el
generador FALLA: un AGENTS.md truncado es el peor modo de fallo (el modelo
pierde reglas sin que nadie se entere).

Las traducciones de texto (rutas `.claude/`, `$ARGUMENTS`, "herramienta Agent",
`/comando`) viven aquí y solo aquí. Los ficheros generados no se editan.
"""

import io
import os
import re
import sys

try:
    import tomllib  # Python 3.11+
except ImportError:  # pragma: no cover
    try:
        import tomli as tomllib  # backport para Python < 3.11 (pip install tomli)
    except ImportError:
        tomllib = None

#: Margen bajo los 32768 bytes por defecto de Codex (deja sitio a ~/.codex/AGENTS.md).
AGENTS_MD_LIMIT = 30 * 1024

#: Secciones del método que se sacan de AGENTS.md a .codex/method/. Título exacto
#: del encabezado (## o ###). Si un título deja de existir, el generador falla:
#: mejor enterarse que externalizar de menos y truncar.
EXTERNAL_SECTIONS = [
    "Estructura de ficheros",
    "Formato de requisito",
    "Registro de decisión (ADR)",
    "Flujo de propuesta a cliente",
    "Flujo de evaluación de propuesta entrante (cliente propone)",
    "Flujo de investigación previa a la decisión (research)",
    "Reconciliación código → documentación",
    "Generación de documentación formal",
]

GENERATED_NOTE = ("<!-- GENERADO por .ai/scripts/sync.py (target Codex) desde las fuentes "
                  "del submódulo. No editar: los cambios van al submódulo. -->\n")

#: Herramientas de Claude Code que implican escritura → sandbox workspace-write.
WRITE_TOOLS = {"write", "edit", "bash", "notebookedit"}


class GenerationError(Exception):
    """Fallo de generación que debe parar el sync (nunca se materializa a medias)."""


# ─────────────────────────── utilidades ───────────────────────────

def read(path):
    with io.open(path, encoding="utf-8") as f:
        return f.read().replace("\r\n", "\n")


def split_frontmatter(text):
    """Devuelve (dict, cuerpo). Frontmatter plano `clave: valor` (sin YAML anidado)."""
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---", 4)
    if end < 0:
        return {}, text
    meta = {}
    for line in text[4:end].splitlines():
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if m:
            val = m.group(2).strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                val = val[1:-1]
            meta[m.group(1)] = val
    body = text[end + 4:].lstrip("\n")
    return meta, body


def slugify(title):
    s = title.lower()
    for a, b in zip("áéíóúüñ", "aeiouun"):
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def toml_str(s):
    """String TOML básica de una línea (escapa todo)."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'


def toml_multiline(s):
    """String TOML básica multilínea. Escapa `\\` y secuencias de comillas triples."""
    s = s.replace("\\", "\\\\").replace('"""', '""\\"')
    return '"""\n' + s.rstrip("\n") + '\n"""'


def deep_merge(base, over):
    out = dict(base)
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


# ─────────────────────────── reescrituras ───────────────────────────

def make_rewriter(command_names):
    """Traduce referencias específicas de Claude Code a su equivalente en Codex."""
    names = sorted(command_names, key=len, reverse=True)
    cmd_re = re.compile(r"(?<![\w/.\-])/(" + "|".join(map(re.escape, names)) + r")(?![\w\-])") \
        if names else None

    def rewrite(text):
        text = re.sub(r"\.claude/agents/([A-Za-z0-9_-]+)\.md", r".codex/agents/\1.toml", text)
        text = text.replace(".claude/agents/", ".codex/agents/")
        text = text.replace(".claude/commands/", ".agents/skills/")
        text = text.replace("vía la herramienta Agent", "lanzándolos como subagentes")
        text = text.replace("(herramienta Agent)", "(lánzalo como subagente)")
        text = text.replace("herramienta Agent", "subagentes")
        text = text.replace("`CLAUDE.md`", "`AGENTS.md`")
        text = text.replace("del CLAUDE.md", "del AGENTS.md")
        if cmd_re:
            # En Codex las skills se invocan con `$nombre` (no hay slash-commands propios).
            text = cmd_re.sub(r"$\1", text)
        return text

    return rewrite


# ─────────────────────────── AGENTS.md ───────────────────────────

def split_sections(text):
    """Trocea markdown por encabezados ##/### fuera de bloques de código.

    Devuelve [(nivel, titulo, texto_completo_de_la_seccion)]; nivel 0 = preámbulo.
    Una sección ### termina en el siguiente ## o ###; una ## en el siguiente ##
    o ### (sus ### son secciones propias).
    """
    sections = [[0, "", []]]
    in_fence = False
    for line in text.splitlines(keepends=True):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
        m = None if in_fence else re.match(r"^(#{2,3}) (.+?)\s*$", line)
        if m:
            sections.append([len(m.group(1)), m.group(2), []])
        sections[-1][2].append(line)
    return [(lvl, title, "".join(lines)) for lvl, title, lines in sections]


def build_agents_md(method_text, project_claude_md, sub_rel, rewrite):
    """Devuelve {rel: contenido} con AGENTS.md y los .codex/method/*.md."""
    out = {}
    sections = split_sections(method_text)
    titles = {t for _, t, _ in sections}
    missing = [t for t in EXTERNAL_SECTIONS if t not in titles]
    if missing:
        raise GenerationError(
            "secciones a externalizar que ya no existen en el método: "
            + ", ".join(missing) + ". Actualiza EXTERNAL_SECTIONS en codex_target.py.")

    core = []
    for lvl, title, body in sections:
        if title in EXTERNAL_SECTIONS:
            rel = f".codex/method/{slugify(title)}.md"
            out[rel] = GENERATED_NOTE + rewrite(body)
            core.append(f"{'#' * lvl} {title}\n\n"
                        f"→ **Detalle en `{rel}`.** Léelo entero antes de aplicar o "
                        f"ejecutar lo que describe esta sección.\n\n")
        else:
            core.append(body)
    method_core = rewrite("".join(core)).rstrip() + "\n"

    import_line = f"@{sub_rel}/CLAUDE.md"
    if project_claude_md and import_line in project_claude_md:
        before, after = project_claude_md.split(import_line, 1)
        doc = rewrite(before) + method_core + rewrite(after)
    elif project_claude_md:
        doc = method_core + "\n---\n\n" + rewrite(project_claude_md)
    else:
        doc = method_core
    # Restos de cabecera de import que no aplican en Codex.
    doc = doc.replace("<!-- ai-system:import -->\n", "")
    doc = GENERATED_NOTE + doc

    size = len(doc.encode("utf-8"))
    if size > AGENTS_MD_LIMIT:
        raise GenerationError(
            f"AGENTS.md generado ocupa {size} bytes (> {AGENTS_MD_LIMIT}). Codex lo "
            f"truncaría en silencio. Externaliza más secciones (EXTERNAL_SECTIONS).")
    out["AGENTS.md"] = doc
    return out


# ─────────────────────────── modelos ───────────────────────────

PRESET_ENV = "AI_MODELS_PRESET"


def _load_toml(path, label):
    if not os.path.isfile(path):
        return {}
    with open(path, "rb") as f:
        try:
            return tomllib.load(f)
        except tomllib.TOMLDecodeError as e:
            raise GenerationError(f"{label} inválido: {e}")


def load_models(system_root, project_root):
    """Fusiona base ← preset ← overrides locales. Anota el preset en `_preset`."""
    if tomllib is None:
        raise GenerationError("hace falta Python 3.11+ (o `pip install tomli`) "
                              "para leer models.toml")
    base = _load_toml(os.path.join(system_root, "models.toml"), "models.toml")
    local = _load_toml(os.path.join(project_root, ".ai-models.local.toml"),
                       ".ai-models.local.toml")
    presets = base.pop("presets", {})
    preset = os.environ.get(PRESET_ENV) or local.pop("preset", None) or "estandar"
    if preset not in presets:
        raise GenerationError(f"preset '{preset}' no existe en models.toml "
                              f"(disponibles: {', '.join(sorted(presets)) or 'ninguno'})")
    cfg = deep_merge(deep_merge(base, presets[preset]), local)
    cfg["_preset"] = preset
    return cfg


def resolve_tier(meta, models):
    return meta.get("tier") or models.get("legacy", {}).get(meta.get("model", ""), "")


def claude_agent(text, models):
    """Reescribe el `model:` de un agente de Claude Code según el tier y el preset.

    Sin tier resoluble (o `inherit`) se devuelve el texto tal cual: el agente
    hereda el modelo de la sesión.
    """
    meta, _ = split_frontmatter(text)
    tier, name = resolve_tier(meta, models), meta.get("name", "")
    if not tier or tier == "inherit":
        return text
    claude = models.get("claude", {})
    model = claude.get("agents", {}).get(name) or claude.get(tier)
    if not model:
        raise GenerationError(f"agente {name}: tier '{tier}' sin mapeo en [claude]")
    end = text.find("\n---", 4)
    front, rest = text[:end], text[end:]
    if re.search(r"(?m)^model:", front):
        front = re.sub(r"(?m)^model:.*$", f"model: {model}", front, count=1)
    else:
        front += f"\nmodel: {model}"
    return front + rest


def resolve_codex_model(meta, name, models):
    """Devuelve (model, effort) o (None, None) si el agente hereda."""
    tier = resolve_tier(meta, models)
    codex = models.get("codex", {})
    chosen = dict(codex.get(tier, {})) if tier and tier != "inherit" else {}
    if tier and tier != "inherit" and not chosen:
        raise GenerationError(f"agente {name}: tier '{tier}' sin mapeo en [codex.{tier}]")
    chosen.update(codex.get("agents", {}).get(name, {}))
    return chosen.get("model"), chosen.get("effort")


# ─────────────────────────── agentes y skills ───────────────────────────

def build_agent(src_text, models, rewrite):
    meta, body = split_frontmatter(src_text)
    name, desc = meta.get("name"), meta.get("description")
    if not name or not desc:
        raise GenerationError("agente sin name/description en el frontmatter")
    desc = rewrite(desc)  # la description es lo que el modelo usa para elegir: también se traduce
    tools = {t.strip().lower() for t in meta.get("tools", "").split(",") if t.strip()}
    sandbox = "read-only" if tools and not (tools & WRITE_TOOLS) else "workspace-write"
    model, effort = resolve_codex_model(meta, name, models)

    lines = [f"# GENERADO por .ai/scripts/sync.py desde .claude/agents/{name}.md. No editar.",
             f"name = {toml_str(name)}",
             f"description = {toml_str(desc)}"]
    if model:
        lines.append(f"model = {toml_str(model)}")
    if effort:
        lines.append(f"model_reasoning_effort = {toml_str(effort)}")
    lines.append(f"sandbox_mode = {toml_str(sandbox)}")
    lines.append(f"developer_instructions = {toml_multiline(rewrite(body))}")
    return name, "\n".join(lines) + "\n"


def build_skill(name, src_text, rewrite):
    meta, body = split_frontmatter(src_text)
    desc = meta.get("description")
    if not desc:
        raise GenerationError(f"comando {name} sin description en el frontmatter")
    desc = rewrite(desc)
    hint = meta.get("argument-hint", "")
    arg_note = (f"> **Argumento:** lo que el usuario escribió al invocar la skill "
                f"(`${name} {hint}`).\n> Si no lo dio, pídeselo antes de empezar.\n\n"
                if hint else "")
    body = body.replace("$ARGUMENTS", "{argumento del usuario}")
    front = f"---\nname: {name}\ndescription: {toml_str(desc)}\n---\n"
    return front + GENERATED_NOTE + "\n" + arg_note + rewrite(body)


# ─────────────────────────── entrada ───────────────────────────

def generate(system_root, project_root):
    """Devuelve {rel_path_en_proyecto: contenido_str}. Lanza GenerationError."""
    agents_dir = os.path.join(system_root, ".claude", "agents")
    cmds_dir = os.path.join(system_root, ".claude", "commands")
    cmd_files = sorted(f for f in os.listdir(cmds_dir) if f.endswith(".md")) \
        if os.path.isdir(cmds_dir) else []
    rewrite = make_rewriter([f[:-3] for f in cmd_files])
    models = load_models(system_root, project_root)
    out = {}

    if os.path.isdir(agents_dir):
        for fn in sorted(os.listdir(agents_dir)):
            if not fn.endswith(".md"):
                continue
            try:
                name, content = build_agent(read(os.path.join(agents_dir, fn)), models, rewrite)
            except GenerationError as e:
                raise GenerationError(f"{fn}: {e}")
            out[f".codex/agents/{name}.toml"] = content

    for fn in cmd_files:
        name = fn[:-3]
        out[f".agents/skills/{name}/SKILL.md"] = build_skill(
            name, read(os.path.join(cmds_dir, fn)), rewrite)

    sub_rel = os.path.relpath(system_root, project_root).replace(os.sep, "/")
    proj_md_path = os.path.join(project_root, "CLAUDE.md")
    proj_md = read(proj_md_path) if os.path.isfile(proj_md_path) else ""
    out.update(build_agents_md(read(os.path.join(system_root, "CLAUDE.md")),
                               proj_md, sub_rel, rewrite))
    return out


if __name__ == "__main__":
    sys.exit("codex_target.py lo invoca sync.py; no se ejecuta suelto.")
