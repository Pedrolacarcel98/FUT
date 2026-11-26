#!/usr/bin/env python3
"""Regenera el registro de `.babel-config.json` desde los ficheros reales.

`.babel-config.json` mezcla dos cosas de naturaleza distinta:

  REGISTRO  (agents, commands, scripts)  -> DERIVADO de los ficheros del sistema
  INSTANCIA (typology, display_name,     -> del PROYECTO, se mantiene a mano
             version, doc_folder, axes)

Mantener el registro a mano lo condena a desincronizarse: en cuanto el sistema
se consume como submódulo, el registro del proyecto describe una versión del
sistema que ya no es la instalada. Así que se genera, igual que los `_index.md`
y el RTM: mismo principio, mismo motivo.

Qué es autoritativo y qué se preserva:

  - `name`, `description`, `tools`, `model`, `file` -> DERIVADOS. Se sobrescriben.
    Fuente: el frontmatter de cada agente/comando y el docstring de cada script.
  - `display_name` -> se PRESERVA el del config existente si lo hay (están
    escritos a mano y aportan), y se deriva del nombre solo para entradas nuevas.
  - Todo campo de instancia -> se preserva intacto.

Valida y falla ruidosamente: un agente o comando sin `name`/`description` en el
frontmatter no lo registra el harness, así que es un error, no un aviso. Este
script es el que impide que eso vuelva a colarse en silencio.

Uso:
    python scripts/gen_registry.py                  # regenera en el proyecto
    python scripts/gen_registry.py --check          # exit 1 si está desfasado
    python scripts/gen_registry.py --dry-run
    python scripts/gen_registry.py --target <ruta>  # config concreto
"""

import argparse
import ast
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from projectroot import find_project_root

#: Campos de instancia: del proyecto, nunca se tocan.
INSTANCE_KEYS = ("typology", "display_name", "version", "doc_folder", "axes")

#: Scripts que operan sobre el sistema, no dentro de un proyecto. No se registran.
SYSTEM_ONLY = {"bootstrap.py", "sync.py", "attach.py", "codex_target.py", "gen_registry.py", "projectroot.py"}

SCRIPT_EXTS = (".py", ".sh", ".ps1")

FRONTMATTER = re.compile(r"\A﻿?---\r?\n(.*?)\r?\n---\r?\n", re.S)


def parse_frontmatter(path):
    """Devuelve el dict del frontmatter YAML plano, o None si no hay."""
    with io.open(path, encoding="utf-8") as f:
        text = f.read()
    m = FRONTMATTER.match(text)
    if not m:
        return None
    data, key = {}, None
    for line in m.group(1).splitlines():
        if not line.strip():
            continue
        mk = re.match(r"^([A-Za-z][\w-]*):\s*(.*)$", line)
        if mk:
            key = mk.group(1)
            data[key] = mk.group(2).strip()
        elif key and line.startswith((" ", "\t")):
            data[key] = (data[key] + " " + line.strip()).strip()
    return data


def titleize(slug):
    small = {"de", "del", "a", "y", "por", "en", "the", "of", "to", "from"}
    words = slug.replace("_", "-").split("-")
    out = []
    for i, w in enumerate(words):
        out.append(w if (i and w.lower() in small) else w.capitalize())
    return " ".join(out)


def script_description(path):
    """Párrafo de resumen: docstring (.py) o comentarios de cabecera (.sh/.ps1)."""
    with io.open(path, encoding="utf-8", errors="replace") as f:
        text = f.read()

    if path.endswith(".py"):
        try:
            doc = ast.get_docstring(ast.parse(text))
        except SyntaxError:
            doc = None
        if doc:
            para = doc.strip().split("\n\n")[0]
            para = " ".join(l.strip() for l in para.splitlines() if l.strip())
            # Los docstrings a veces empiezan repitiendo el nombre del fichero.
            return re.sub(r"^%s\s*[-–—·:]\s*" % re.escape(os.path.basename(path)),
                          "", para).strip()
        return None

    lines, out = text.splitlines(), []
    for line in lines:
        s = line.strip()
        if s.startswith("#!"):
            continue
        if s.startswith("#"):
            body = s.lstrip("#").strip()
            if body:
                out.append(body)
        elif out or s:
            break
    return " ".join(out).strip() or None


def build_registry(system_root):
    """Deriva las tres listas del registro. Devuelve (registry, errores)."""
    errors = []

    def collect_md(subdir, kind):
        items, base = [], os.path.join(system_root, ".claude", subdir)
        if not os.path.isdir(base):
            return items
        for fn in sorted(os.listdir(base)):
            if not fn.endswith(".md"):
                continue
            path = os.path.join(base, fn)
            slug = fn[:-3]
            fm = parse_frontmatter(path)
            if fm is None:
                errors.append(f"{kind} '{slug}': sin frontmatter. El harness no lo "
                              f"registra, asi que no es invocable. Anade name y description "
                              f"a .claude/{subdir}/{fn}")
                continue
            desc = fm.get("description")
            if not desc:
                errors.append(f"{kind} '{slug}': frontmatter sin 'description' en "
                              f".claude/{subdir}/{fn}")
                continue
            entry = {"name": fm.get("name") or slug, "description": desc}
            if kind == "agente":
                for k in ("tools", "model"):
                    if fm.get(k):
                        entry[k] = fm[k]
            else:
                entry["file"] = f".claude/{subdir}/{fn}"
                if fm.get("argument-hint"):
                    entry["argument_hint"] = fm["argument-hint"]
            if fm.get("name") and fm["name"] != slug:
                errors.append(f"{kind} '{slug}': el campo name es '{fm['name']}' y no "
                              f"coincide con el nombre del fichero. El harness usa el "
                              f"fichero; corrige uno de los dos")
            items.append(entry)
        return items

    agents = collect_md("agents", "agente")
    commands = collect_md("commands", "comando")

    scripts, base = [], os.path.join(system_root, "scripts")
    if os.path.isdir(base):
        for fn in sorted(os.listdir(base)):
            if fn in SYSTEM_ONLY or not fn.endswith(SCRIPT_EXTS):
                continue
            desc = script_description(os.path.join(base, fn))
            if not desc:
                errors.append(f"script '{fn}': sin docstring ni comentario de cabecera "
                              f"del que derivar la descripcion")
                continue
            scripts.append({
                "name": os.path.splitext(fn)[0].replace("_", "-"),
                "description": desc,
                "file": f"scripts/{fn}",
            })

    return {"agents": agents, "commands": commands, "scripts": scripts}, errors


def merge(existing, registry):
    """Aplica el registro derivado preservando instancia y display_name."""
    out = {}
    for k in INSTANCE_KEYS:
        if k in existing:
            out[k] = existing[k]
    for k, v in existing.items():
        if k not in registry and k not in out:
            out[k] = v            # cualquier otro campo del proyecto se conserva

    for section in ("scripts", "agents", "commands"):
        prev = {e.get("name"): e for e in existing.get(section, []) if isinstance(e, dict)}
        merged = []
        for entry in registry[section]:
            e = dict(entry)
            old = prev.get(e["name"], {})
            e["display_name"] = old.get("display_name") or titleize(e["name"])
            ordered = {"name": e.pop("name"), "display_name": e.pop("display_name")}
            ordered.update(e)
            merged.append(ordered)
        out[section] = merged
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--target", default=None, help="ruta del .babel-config.json a regenerar")
    ap.add_argument("--project", default=None, help="raiz del proyecto (autodetectada)")
    ap.add_argument("--check", action="store_true", help="no escribe; exit 1 si esta desfasado")
    ap.add_argument("--dry-run", action="store_true", help="muestra el resultado sin escribir")
    ap.add_argument("--quiet", action="store_true", help="informa por stderr en vez de stdout")
    args = ap.parse_args()

    def log(msg):
        print(msg, file=sys.stderr if args.quiet else sys.stdout)

    system_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    registry, errors = build_registry(system_root)

    if errors:
        print(f"ERROR: el registro no se puede generar ({len(errors)} problema(s)):",
              file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 2

    if args.target:
        target = os.path.abspath(args.target)
    else:
        root = os.path.abspath(args.project) if args.project else find_project_root(__file__)
        target = os.path.join(root, ".babel-config.json")

    existing = {}
    if os.path.isfile(target):
        try:
            with io.open(target, encoding="utf-8") as f:
                existing = json.load(f)
        except ValueError as e:
            print(f"ERROR: {target} no es JSON valido: {e}", file=sys.stderr)
            return 2

    result = merge(existing, registry)
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"

    counts = (f"{len(registry['agents'])} agentes, {len(registry['commands'])} comandos, "
              f"{len(registry['scripts'])} scripts")

    current = ""
    if os.path.isfile(target):
        with io.open(target, encoding="utf-8") as f:
            current = f.read()

    if args.check:
        if current.replace("\r\n", "\n") != rendered:
            log(f"DESFASADO: {os.path.basename(target)} no coincide con los ficheros "
                f"reales ({counts}). Ejecuta gen_registry.py.")
            return 1
        log(f"registro al dia · {counts}")
        return 0

    if args.dry_run:
        log(f"--- dry-run · {counts} ---")
        log(rendered)
        return 0

    if current.replace("\r\n", "\n") == rendered:
        log(f"registro ya al dia · {counts}")
        return 0

    with io.open(target, "w", encoding="utf-8", newline="\n") as f:
        f.write(rendered)
    log(f"registro regenerado en {os.path.basename(target)} · {counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
