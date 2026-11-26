#!/usr/bin/env python3
"""Materializa el sistema de IA del submódulo en las rutas que lee cada harness.

Claude Code y Codex descubren agentes, comandos/skills e instrucciones en rutas
fijas de la raíz del proyecto. Un submódulo vive en su propia carpeta, así que
hace falta un puente. Este script es ese puente, y sirve a los DOS harness
siempre (lo materializado es pequeño y está gitignored):

  submódulo (fuente de verdad)          proyecto (materializado, gitignored)
  ────────────────────────────          ───────────────────────────────────
  .claude/agents/*.md            ──►    .claude/agents/*.md
  .claude/commands/*.md          ──►    .claude/commands/*.md
  scripts/*                      ──►    scripts/*
  (target Codex, generado por codex_target.py)
  CLAUDE.md método + proyecto    ──►    AGENTS.md + .codex/method/*.md
  .claude/agents/*.md            ──►    .codex/agents/*.toml
  .claude/commands/*.md          ──►    .agents/skills/<n>/SKILL.md

Los destinos van en `.gitignore`: la única fuente de verdad es el submódulo.
`scripts/` se materializa (en vez de invocarse desde el submódulo) para que las
referencias `scripts/...` que hay dentro de los agentes sigan resolviendo sin
acoplar el sistema a la ruta en la que esté montado.

Idempotente: copia solo lo que cambió. Poda lo que desapareció del sistema,
pero SOLO ficheros que él mismo instaló — nunca toca ficheros propios del
proyecto. El registro de lo instalado vive en `.claude/.ai-sync.json`.

Uso:
    python .ai/scripts/sync.py              # sincroniza (silencioso por stdout)
    python .ai/scripts/sync.py --verbose    # informa por stdout
    python .ai/scripts/sync.py --check      # solo comprueba; exit 1 si desincronizado
    python .ai/scripts/sync.py --dry-run    # muestra qué haría

Silencio por stdout a propósito: se invoca desde un hook SessionStart, y el
stdout de ese hook se inyecta en el contexto de Claude. Los mensajes van a
stderr salvo que se pida --verbose.
"""

import argparse
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from projectroot import find_project_root

MANIFEST = os.path.join(".claude", ".ai-sync.json")

#: Qué se materializa: (ruta en el sistema, ruta en el proyecto)
SYNC_MAP = [
    (os.path.join(".claude", "agents"), os.path.join(".claude", "agents")),
    (os.path.join(".claude", "commands"), os.path.join(".claude", "commands")),
    ("scripts", "scripts"),
    # Convenciones de nivel: el método las sirve como `_convenciones.md` junto al
    # `README.md` de cada nivel, que sí es del proyecto (lleva su taxonomía).
    ("conventions", "docs"),
]

#: Scripts que operan SOBRE el sistema, no dentro de un proyecto. No se copian.
SYSTEM_ONLY = {"bootstrap.py", "sync.py", "attach.py", "codex_target.py"}

#: Prefijos de lo que genera el target Codex (para no podarlo si la generación falla).
CODEX_PREFIXES = ("AGENTS.md", ".codex/agents/", ".codex/method/", ".agents/skills/")

#: Ficheros generados en la raíz que pueden existir ya como contenido PROPIO del
#: proyecto. Si existen y no los instaló este script, no se tocan.
PROTECTED_IF_UNMANAGED = {"AGENTS.md"}

SKIP_DIRS = {"__pycache__", ".pytest_cache"}


def log(msg, verbose):
    """Los mensajes van a stderr salvo --verbose (ver docstring del módulo)."""
    print(msg, file=sys.stdout if verbose else sys.stderr)


def system_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def codex_items(sys_root, project_root, verbose):
    """[(rel, bytes, None)] del target Codex, o None si la generación falla."""
    try:
        import codex_target
        generated = codex_target.generate(sys_root, project_root)
    except Exception as e:  # GenerationError u otro: no tumbar el target de Claude
        log(f"ERROR target Codex: {e}. Se conservan los ficheros Codex previos.", True)
        return None
    return [(rel.replace("/", os.sep), content.encode("utf-8"), None)
            for rel, content in sorted(generated.items())]


def system_version(root):
    """SHA corto del submódulo, para dejar rastro de qué versión se materializó."""
    try:
        out = subprocess.run(
            ["git", "-C", root, "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=10,
        )
        if out.returncode == 0:
            return out.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        pass
    return "unknown"


def collect(src_root, dst_root, project_root):
    """Devuelve [(src_abs, rel_dest)] de todo lo que hay que materializar."""
    items = []
    src_abs = os.path.join(system_root(), src_root)
    if not os.path.isdir(src_abs):
        return items
    for dirpath, dirnames, filenames in os.walk(src_abs):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if fn in SYSTEM_ONLY or fn.endswith((".pyc", ".pyo")):
                continue
            src = os.path.join(dirpath, fn)
            rel_inside = os.path.relpath(src, src_abs)
            items.append((src, os.path.join(dst_root, rel_inside)))
    return items


def run_registry(sys_root, project_root, verbose, check=False):
    """Regenera (o comprueba) el registro de `.babel-config.json` del proyecto.

    Se delega en gen_registry.py en vez de duplicar la lógica: ese script es el
    único que sabe qué es derivado y qué es instancia. Un fallo aquí no revienta
    el sync — lo importante ya está materializado — pero se reporta.
    """
    gen = os.path.join(sys_root, "scripts", "gen_registry.py")
    if not os.path.isfile(gen):
        return 0
    cmd = [sys.executable, gen, "--project", project_root, "--quiet"]
    if check:
        cmd.append("--check")
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.SubprocessError) as e:
        log(f"registro: no se pudo ejecutar gen_registry.py ({e})", verbose)
        return 0
    msg = (out.stderr or out.stdout).strip()
    if msg:
        log(f"registro: {msg}", verbose or out.returncode != 0)
    return out.returncode if check else 0


def read_manifest(project_root):
    path = os.path.join(project_root, MANIFEST)
    try:
        with io.open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def write_manifest(project_root, data):
    path = os.path.join(project_root, MANIFEST)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--verbose", "-v", action="store_true",
                    help="informar por stdout (por defecto va a stderr)")
    ap.add_argument("--check", action="store_true",
                    help="no escribe; exit 1 si el proyecto está desincronizado")
    ap.add_argument("--dry-run", action="store_true", help="muestra qué haría")
    ap.add_argument("--project", default=None,
                    help="raíz del proyecto (por defecto, se autodetecta)")
    ap.add_argument("--no-registry", action="store_true",
                    help="no regenerar el registro de .babel-config.json")
    args = ap.parse_args()
    verbose = args.verbose or args.check or args.dry_run

    sys_root = system_root()
    try:
        project_root = (os.path.abspath(args.project) if args.project
                        else find_project_root(__file__))
    except SystemExit as e:
        # En modo hook no se puede reventar la sesión: avisar y salir en verde.
        log(str(e), verbose)
        return 0 if not (args.check or args.dry_run) else 1

    if os.path.abspath(sys_root) == os.path.abspath(project_root):
        log("ERROR: el sistema y el proyecto son el mismo directorio. "
            "sync.py se ejecuta desde el submódulo de un proyecto consumidor.", True)
        return 2

    # Modelos (preset + overrides) para los agentes de Claude Code. Si falla, se
    # copian tal cual: mejor el modelo de fábrica que dejar el proyecto sin agentes.
    models = None
    try:
        import codex_target
        models = codex_target.load_models(sys_root, project_root)
    except Exception as e:
        log(f"ERROR modelos: {e}. Agentes de Claude con el modelo del fuente.", True)
    claude_agents_dir = os.path.join(".claude", "agents") + os.sep

    plan = []  # [(rel, contenido_bytes, src_o_None)]
    for src_root, dst_root in SYNC_MAP:
        for src, rel in collect(src_root, dst_root, project_root):
            with open(src, "rb") as f:
                content = f.read()
            if models and rel.startswith(claude_agents_dir) and rel.endswith(".md"):
                try:
                    text = content.decode("utf-8").replace("\r\n", "\n")
                    content = codex_target.claude_agent(text, models).encode("utf-8")
                except Exception as e:
                    log(f"ERROR modelos en {rel}: {e}. Se copia tal cual.", True)
            plan.append((rel, content, src))

    if not plan:
        log(f"ERROR: nada que sincronizar desde {sys_root}. ¿Submódulo sin inicializar?\n"
            f"       Prueba: git submodule update --init --recursive", True)
        return 2

    previous = read_manifest(project_root)
    prev_files = previous.get("files", {})

    codex = codex_items(sys_root, project_root, verbose)
    codex_failed = codex is None
    skipped = []
    for item in codex or []:
        rel = item[0]
        if (rel in PROTECTED_IF_UNMANAGED and rel not in prev_files
                and os.path.isfile(os.path.join(project_root, rel))):
            skipped.append(rel)
            continue
        plan.append(item)
    for rel in skipped:
        log(f"AVISO: {rel} existe y no lo gestiona el sistema; no se sobrescribe. "
            f"Renómbralo o bórralo para que Codex reciba el método.", True)

    to_copy, unchanged, edited = [], [], []
    for rel, content, src in plan:
        dst = os.path.join(project_root, rel)
        src_hash = sha256_bytes(content)
        if os.path.isfile(dst):
            dst_hash = sha256(dst)
            if dst_hash == src_hash:
                unchanged.append(rel)
                continue
            # ¿Alguien editó la copia materializada? Su cambio se perderia.
            installed_hash = prev_files.get(rel.replace(os.sep, "/"))
            if installed_hash and dst_hash != installed_hash:
                edited.append(rel)
        to_copy.append((rel, content, src))

    # Poda: solo lo que ESTE script instaló y ya no existe en el sistema. Si el
    # target Codex falló, sus ficheros previos se conservan (viejos > ausentes).
    current_rels = {rel.replace(os.sep, "/") for rel, _, _ in plan}
    to_prune = [rel for rel in prev_files if rel not in current_rels
                and not (codex_failed and rel.startswith(CODEX_PREFIXES))
                and os.path.isfile(os.path.join(project_root, rel))]

    version = system_version(sys_root)
    preset = models["_preset"] if models else "?"

    if args.check:
        drift = len(to_copy) + len(to_prune)
        rc = 1 if codex_failed else 0
        if drift:
            log(f"DESINCRONIZADO ({len(to_copy)} por actualizar, "
                f"{len(to_prune)} por podar). Ejecuta sync.py.", True)
            rc = 1
        else:
            log(f"sincronizado · sistema {version} · modelos {preset} · {len(unchanged)} ficheros", True)
        if not args.no_registry:
            rc = run_registry(sys_root, project_root, verbose, check=True) or rc
        return rc

    if edited:
        log(f"AVISO: {len(edited)} fichero(s) materializado(s) fueron editados a mano "
            f"y se van a sobrescribir. Los cambios permanentes van en el submódulo:", True)
        for rel in edited[:10]:
            log(f"       {rel}", True)

    if args.dry_run:
        log(f"--- dry-run · sistema {version} ---", True)
        for rel, _, _ in to_copy:
            log(f"  escribir  {rel}", True)
        for rel in to_prune:
            log(f"  podar     {rel}", True)
        log(f"  (sin cambios: {len(unchanged)})", True)
        return 0

    for rel, content, src in to_copy:
        dst = os.path.join(project_root, rel)
        os.makedirs(os.path.dirname(dst) or project_root, exist_ok=True)
        with open(dst, "wb") as f:
            f.write(content)
        if src:
            shutil.copymode(src, dst)  # conserva +x de los .sh

    for rel in to_prune:
        try:
            os.remove(os.path.join(project_root, rel))
        except OSError:
            pass

    files = {}
    for rel, content, _ in plan:
        files[rel.replace(os.sep, "/")] = sha256_bytes(content)
    if codex_failed:  # mantener el registro de lo Codex previo para poder podarlo luego
        for rel, h in prev_files.items():
            if rel.startswith(CODEX_PREFIXES) and rel not in files:
                files[rel] = h
    write_manifest(project_root, {
        "_comment": "Generado por scripts/sync.py del sistema de IA. No editar a mano.",
        "system_version": version,
        "models_preset": preset,
        "system_root": os.path.relpath(sys_root, project_root).replace(os.sep, "/"),
        "files": files,
    })

    if to_copy or to_prune:
        log(f"sistema de IA sincronizado · {version} · modelos {preset} · "
            f"{len(to_copy)} actualizado(s), {len(to_prune)} podado(s), "
            f"{len(unchanged)} sin cambios", verbose)
    else:
        log(f"sistema de IA ya sincronizado · {version} · modelos {preset} · {len(unchanged)} ficheros", verbose)

    if not args.no_registry:
        run_registry(sys_root, project_root, verbose)
    return 0


if __name__ == "__main__":
    sys.exit(main())
