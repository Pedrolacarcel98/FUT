#!/usr/bin/env python3
"""Cablea un proyecto al sistema de IA consumido como submódulo de git.

Hace las cuatro cosas que hacen falta para que el proyecto tire del submódulo
sin acoplarse a él:

  1. CLAUDE.md      → añade `@<submódulo>/CLAUDE.md` (import nativo del harness).
                      Preserva el contenido propio del proyecto que ya hubiera.
  2. hooks          → SessionStart que ejecuta sync.py en cada arranque, en
                      .claude/settings.json y en .codex/hooks.json (Codex),
                      así el materializado nunca se queda viejo.
  3. .gitignore     → ignora lo materializado (la fuente es el submódulo).
  4. sync           → materializa agentes, comandos y scripts.

Uso, desde la raíz del proyecto:
    python .ai/scripts/attach.py
    python .ai/scripts/attach.py --dry-run
    python .ai/scripts/attach.py --url <git-url>    # añade también el submódulo

Idempotente: se puede volver a ejecutar sin duplicar nada.
"""

import argparse
import difflib
import glob
import io
import json
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bootstrap import fill_placeholders, iter_files


def project_root_from_here():
    """La raíz del proyecto, deducida de dónde vive este script.

    attach.py está siempre en `<proyecto>/<submódulo>/scripts/attach.py`, así que
    la raíz es tres niveles arriba. Es determinista y —a diferencia de buscar un
    marcador— funciona en un proyecto recién creado, que todavía no tiene
    `project-status.json` porque es justo lo que venimos a instalar.
    """
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def needs_init(project_root):
    """Devuelve qué falta para que el proyecto esté instanciado."""
    missing = []
    for marker in ("project-status.json", ".babel-config.json"):
        if not os.path.isfile(os.path.join(project_root, marker)):
            missing.append(marker)
    if not os.path.isdir(os.path.join(project_root, "docs")):
        missing.append("docs/")
    return missing


def install_template(system_root, project_root, name, typology, typology_display,
                     dry_run, report):
    """Instala `template/` en el proyecto. NUNCA sobrescribe lo que ya exista."""
    template = os.path.join(system_root, "template")
    if not os.path.isdir(template):
        report.append(("!", "template/", "no existe en el sistema"))
        return False

    created, skipped = [], 0
    for src, rel in iter_files(template):
        dst = os.path.join(project_root, rel)
        if os.path.exists(dst):
            skipped += 1
            continue
        created.append((src, dst, rel))

    report.append(("+", "template/",
                   f"{len(created)} fichero(s) a crear"
                   + (f", {skipped} ya existentes que se respetan" if skipped else "")))
    if dry_run:
        return True

    for src, dst, _ in created:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)

    touched = fill_placeholders(project_root, name, typology, typology_display)
    if touched is None:
        report.append(("!", "configs", "fallo al sustituir placeholders"))
        return False
    if touched:
        report.append(("~", ", ".join(touched), f"placeholders rellenados (proyecto: {name})"))
    return True

IMPORT_MARK = "<!-- ai-doc-system:import -->"

# Bloque GESTIONADO: delimitado por BEGIN/END para poder reemplazarlo cuando el
# sistema cambie qué materializa. Con un solo marcador, un proyecto ya cableado
# nunca recibía las reglas nuevas — y las copias materializadas acababan
# versionadas sin que nadie se diera cuenta.
GITIGNORE_BEGIN = "# --- BEGIN sistema de IA (gestionado por .ai/scripts/attach.py) ---"
GITIGNORE_END = "# --- END sistema de IA ---"

#: Marcador de la versión antigua, de un solo delimitador. Se migra al ver'lo.
GITIGNORE_LEGACY = "# --- sistema de IA (materializado por .ai/scripts/sync.py) ---"

GITIGNORE_BODY = """# No edites dentro de este bloque: attach.py lo reemplaza entero.
# La fuente de verdad es el submodulo; estas copias se regeneran con sync.py.
/.claude/agents/
/.claude/commands/
/.claude/.ai-sync.json
/scripts/
# Target Codex (generado desde las mismas fuentes por codex_target.py)
/AGENTS.md
/.codex/agents/
/.codex/method/
/.agents/skills/
# Override personal de modelos (cada persona elige los suyos)
/.ai-models.local.toml
# Convenciones de nivel servidas por el metodo. El README.md de cada nivel SI se
# versiona: es del proyecto y lleva su taxonomia.
docs/**/_convenciones.md"""


def find_codex():
    """Ruta al binario de Codex (CLI en PATH o el que trae la extensión de VS Code)."""
    found = shutil.which("codex")
    if found:
        return found
    pattern = os.path.join(os.path.expanduser("~"), ".vscode", "extensions",
                           "openai.chatgpt-*", "bin", "*", "codex*")
    hits = sorted(h for h in glob.glob(pattern)
                  if os.path.basename(h) in ("codex", "codex.exe"))
    return hits[-1] if hits else None


def print_codex_notes(sub_rel):
    """Pasos de arranque en Codex: lo que attach.py no puede hacer por la persona."""
    print("\nCodex:")
    if sys.version_info < (3, 11):
        print(f"  !  Python {sys.version_info.major}.{sys.version_info.minor}: el target Codex y "
              f"los presets de modelos necesitan Python 3.11+ (o `pip install tomli`).")
    codex = find_codex()
    print(f"  ·  {'detectado: ' + codex if codex else 'no detectado (opcional)'}")
    print("  ·  Primera vez: abre `codex` en la raíz y marca el proyecto como confiable.")
    print("     Luego ejecuta `/hooks` y aprueba el hook de sync (solo una vez).")
    print("  ·  Skills con `$nombre` (p. ej. `$intake <tarea>`); agentes en .codex/agents/.")
    print(f"  ·  Modelos: preset en .ai-models.local.toml (ver {sub_rel}/models.toml).")


def submodule_rel(system_root, project_root):
    return os.path.relpath(system_root, project_root).replace(os.sep, "/")


#: Por encima de esta similitud, el CLAUDE.md del proyecto se considera una copia
#: del método y se sustituye en vez de preservarse. Conservarlo cargaría el método
#: dos veces, en dos versiones distintas: instrucciones contradictorias, y el
#: modelo elige una arbitrariamente.
DUPLICATE_THRESHOLD = 0.75


def _normalize(text):
    """Normaliza para comparar: sin CR, sin blancos redundantes, en minúsculas."""
    text = text.replace("\r\n", "\n").replace("\r", "\n").lower()
    return re.sub(r"\s+", " ", text).strip()


def method_similarity(existing, method):
    """Similitud 0..1 entre el CLAUDE.md del proyecto y el método del submódulo."""
    if not existing.strip() or not method.strip():
        return 0.0
    return difflib.SequenceMatcher(
        None, _normalize(existing), _normalize(method)
    ).quick_ratio()


def wire_claude_md(project_root, sub_rel, system_root, dry_run, report,
                   force_replace=False, force_keep=False):
    """Añade el import del método.

    Si el CLAUDE.md del proyecto es una copia del método (caso típico al migrar
    de vendored a submódulo), se SUSTITUYE: preservarlo duplicaría el método en
    contexto. Si es contenido propio, se preserva debajo del import.
    """
    path = os.path.join(project_root, "CLAUDE.md")
    import_line = f"@{sub_rel}/CLAUDE.md"

    existing = ""
    if os.path.isfile(path):
        with io.open(path, encoding="utf-8") as f:
            existing = f.read()

    if import_line in existing:
        report.append(("=", "CLAUDE.md", "ya importa el método"))
        return

    method = ""
    method_path = os.path.join(system_root, "CLAUDE.md")
    if os.path.isfile(method_path):
        with io.open(method_path, encoding="utf-8") as f:
            method = f.read()

    similarity = method_similarity(existing, method)
    is_duplicate = force_replace or (
        not force_keep and similarity >= DUPLICATE_THRESHOLD
    )

    header = (
        f"{IMPORT_MARK}\n"
        f"# Instrucciones del proyecto\n\n"
        f"El **método** de documentación técnica asistida por IA vive en el submódulo\n"
        f"`{sub_rel}/` y se importa entero aquí abajo. No lo copies: edítalo en el\n"
        f"submódulo y propaga con `git submodule update --remote`.\n\n"
        f"{import_line}\n\n"
        f"---\n\n"
        f"## Específico de este proyecto\n\n"
        f"Lo que solo aplica aquí va debajo de esta línea. La taxonomía de componentes\n"
        f"se declara en `docs/system/sad/vision-general.md`, no aquí.\n"
    )

    if not existing.strip():
        body = header
        report.append(("+", "CLAUDE.md", "creado con el import del método"))
    elif is_duplicate:
        body = header
        pct = int(similarity * 100)
        why = ("forzado con --replace-claude-md" if force_replace
               else f"era una copia del método ({pct}% similar)")
        report.append(("~", "CLAUDE.md",
                       f"SUSTITUIDO: {why}. Recupéralo con: git show HEAD:CLAUDE.md"))
    else:
        body = f"{header}\n{existing.rstrip()}\n"
        pct = int(similarity * 100)
        report.append(("~", "CLAUDE.md",
                       f"import añadido; contenido previo preservado ({pct}% similar al método)"))

    if not dry_run:
        with io.open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(body)


def wire_settings(project_root, sub_rel, dry_run, report,
                  rel=os.path.join(".claude", "settings.json"), status_message=True):
    """Añade el hook SessionStart, fusionando con los settings existentes.

    Sirve a los dos harness: `.claude/settings.json` (Claude Code) y
    `.codex/hooks.json` (Codex), que comparten el esquema hooks→evento→matcher.
    En Codex el hook de proyecto solo corre si el proyecto es *trusted* y la
    persona lo aprueba una vez con `/hooks`.
    """
    path = os.path.join(project_root, rel)
    label = rel.replace(os.sep, "/")
    command = f"python {sub_rel}/scripts/sync.py"

    settings = {}
    if os.path.isfile(path):
        try:
            with io.open(path, encoding="utf-8") as f:
                settings = json.load(f)
        except ValueError:
            report.append(("!", label,
                           "JSON inválido — NO se toca; arréglalo y reejecuta"))
            return

    hooks = settings.setdefault("hooks", {})
    session_start = hooks.setdefault("SessionStart", [])

    for entry in session_start:
        for h in entry.get("hooks", []):
            if "sync.py" in str(h.get("command", "")):
                report.append(("=", label, "hook de sync ya presente"))
                return

    handler = {"type": "command", "command": command, "timeout": 30}
    if status_message:
        handler["statusMessage"] = "Sincronizando sistema de IA..."
    session_start.append({"matcher": "startup|resume|clear", "hooks": [handler]})
    report.append(("~", label, "hook SessionStart -> sync.py añadido"))

    if not dry_run:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with io.open(path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
            f.write("\n")


def wire_gitignore(project_root, dry_run, report):
    """Instala o ACTUALIZA el bloque gestionado del `.gitignore`."""
    path = os.path.join(project_root, ".gitignore")
    existing = ""
    if os.path.isfile(path):
        with io.open(path, encoding="utf-8") as f:
            existing = f.read()

    block = f"{GITIGNORE_BEGIN}\n{GITIGNORE_BODY}\n{GITIGNORE_END}\n"
    normalized = existing.replace("\r\n", "\n")

    # 1. Bloque gestionado ya presente: se reemplaza si difiere.
    pattern = re.compile(
        re.escape(GITIGNORE_BEGIN) + r".*?" + re.escape(GITIGNORE_END) + r"\n?",
        re.S,
    )
    if pattern.search(normalized):
        updated = pattern.sub(block, normalized)
        if updated == normalized:
            report.append(("=", ".gitignore", "bloque del sistema al día"))
            return
        report.append(("~", ".gitignore", "bloque del sistema ACTUALIZADO"))
        if not dry_run:
            with io.open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(updated)
        return

    # 2. Versión antigua de un solo marcador: se migra al bloque delimitado.
    if GITIGNORE_LEGACY in normalized:
        lines, out, skipping = normalized.split("\n"), [], False
        for line in lines:
            if line.strip() == GITIGNORE_LEGACY:
                skipping = True
                continue
            if skipping:
                # El bloque antiguo terminaba en la primera linea en blanco o en
                # un comentario que no fuera suyo.
                if not line.strip() or (line.startswith("#")
                                        and "sistema de IA" not in line
                                        and "fuente de verdad" not in line
                                        and "Convenciones de nivel" not in line
                                        and "versiona" not in line):
                    skipping = False
                    out.append(line)
                continue
            out.append(line)
        migrated = "\n".join(out).rstrip("\n") + "\n\n" + block
        report.append(("~", ".gitignore", "bloque antiguo MIGRADO al formato gestionado"))
        if not dry_run:
            with io.open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(migrated)
        return

    # 3. No hay nada: se añade.
    report.append(("~", ".gitignore", "bloque del sistema añadido"))
    if not dry_run:
        with io.open(path, "a", encoding="utf-8", newline="\n") as f:
            if normalized and not normalized.endswith("\n"):
                f.write("\n")
            f.write("\n" + block)


def add_submodule(project_root, url, sub_rel, dry_run, report):
    target = os.path.join(project_root, sub_rel)
    if os.path.isdir(os.path.join(target, ".git")) or os.path.isfile(os.path.join(target, ".git")):
        report.append(("=", sub_rel, "el submódulo ya existe"))
        return True
    report.append(("+", sub_rel, f"git submodule add {url}"))
    if dry_run:
        return True
    out = subprocess.run(["git", "-C", project_root, "submodule", "add", url, sub_rel],
                         capture_output=True, text=True)
    if out.returncode != 0:
        report.append(("!", sub_rel, f"git submodule add falló: {out.stderr.strip()}"))
        return False
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", default=None,
                    help="raíz del proyecto (por defecto, la carpeta que contiene el submódulo)")
    ap.add_argument("--url", default=None,
                    help="URL del repo del sistema; si se pasa, añade el submódulo")
    ap.add_argument("--name", default=None,
                    help="nombre del proyecto; solo se usa al instanciar uno nuevo "
                         "(por defecto, el nombre de la carpeta)")
    ap.add_argument("--typology", default="generic",
                    help="tipología del proyecto nuevo (web-backend, mobile, firmware…)")
    ap.add_argument("--typology-display", default=None,
                    help="nombre legible de la tipología")
    ap.add_argument("--no-init", action="store_true",
                    help="no instanciar el árbol docs/ ni las configs si faltan")
    ap.add_argument("--dry-run", action="store_true", help="muestra qué haría")
    ap.add_argument("--replace-claude-md", action="store_true",
                    help="sustituye el CLAUDE.md del proyecto en vez de preservarlo debajo")
    ap.add_argument("--keep-claude-md", action="store_true",
                    help="preserva el CLAUDE.md del proyecto aunque parezca una copia del método")
    args = ap.parse_args()
    if args.replace_claude_md and args.keep_claude_md:
        raise SystemExit("ERROR: --replace-claude-md y --keep-claude-md se excluyen.")

    system_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_root = (os.path.abspath(args.project) if args.project
                    else project_root_from_here())

    if os.path.abspath(system_root) == os.path.abspath(project_root):
        raise SystemExit(
            "ERROR: el sistema y el proyecto son el mismo directorio.\n"
            "       attach.py se ejecuta desde el submódulo de un proyecto consumidor:\n"
            "       python .ai/scripts/attach.py"
        )

    sub_rel = submodule_rel(system_root, project_root)
    if sub_rel.startswith(".."):
        raise SystemExit(
            f"ERROR: el sistema está FUERA del proyecto ({sub_rel}).\n"
            f"       Como submódulo debe vivir dentro: p.ej. <proyecto>/.ai/\n"
            f"       Si querías la instalación vendored, usa bootstrap.py."
        )

    print(f"Proyecto  : {project_root}")
    print(f"Submódulo : {sub_rel}")
    if args.dry_run:
        print("Modo      : dry-run (no se escribe nada)\n")
    else:
        print()

    report = []
    if args.url and not add_submodule(project_root, args.url, sub_rel, args.dry_run, report):
        for mark, target, note in report:
            print(f"  {mark}  {target:<32} {note}")
        return 1

    missing = needs_init(project_root)
    if missing and not args.no_init:
        name = args.name or os.path.basename(project_root)
        print(f"Proyecto sin instanciar (falta: {', '.join(missing)}).")
        print(f"Instanciando como '{name}' (tipología: {args.typology}).\n")
        if not install_template(system_root, project_root, name, args.typology,
                                args.typology_display, args.dry_run, report):
            for mark, target, note in report:
                print(f"  {mark}  {target:<32} {note}")
            return 1
    elif missing:
        report.append(("!", "instanciación",
                       f"falta {', '.join(missing)} y se pidió --no-init; "
                       f"los scripts del método no funcionarán"))

    wire_claude_md(project_root, sub_rel, system_root, args.dry_run, report,
                   force_replace=args.replace_claude_md,
                   force_keep=args.keep_claude_md)
    wire_settings(project_root, sub_rel, args.dry_run, report)
    wire_settings(project_root, sub_rel, args.dry_run, report,
                  rel=os.path.join(".codex", "hooks.json"), status_message=False)
    wire_gitignore(project_root, args.dry_run, report)

    for mark, target, note in report:
        print(f"  {mark}  {target:<32} {note}")

    if any(mark == "!" for mark, _, _ in report):
        return 1

    print()
    if args.dry_run:
        print("Quedaría por materializar: python %s/scripts/sync.py" % sub_rel)
        return 0

    sync = os.path.join(system_root, "scripts", "sync.py")
    out = subprocess.run([sys.executable, sync, "--verbose", "--project", project_root],
                         capture_output=True, text=True)
    print(out.stdout.strip() or out.stderr.strip())
    if out.returncode != 0:
        return out.returncode

    print("\nCableado. A partir de ahora:")
    print("  · El hook SessionStart mantiene el materializado al día solo.")
    print("  · Para traer cambios del sistema: git submodule update --remote " + sub_rel)
    print("  · Los cambios al método se hacen EN el submódulo, no en las copias.")
    print_codex_notes(sub_rel)
    return 0


if __name__ == "__main__":
    sys.exit(main())
