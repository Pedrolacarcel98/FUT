#!/usr/bin/env python3
"""Genera/sincroniza los artefactos nativos de Antigravity (y Codex) en modo vendored.

A partir de las fuentes canónicas del proyecto (`CLAUDE.md`, `.claude/agents/*.md`,
`.claude/commands/*.md` y `models.toml`), genera:
  - `AGENTS.md`                    (reglas de proyecto cargadas por Antigravity)
  - `.codex/method/*.md`           (secciones largas referenciadas desde AGENTS.md)
  - `.agents/skills/<n>/SKILL.md`  (skills cargadas bajo demanda por Antigravity)
  - `.codex/agents/*.toml`         (fichas de agentes referenciadas por las skills)

Uso:
    python scripts/sync_antigravity.py
"""

import io
import os
import sys

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPTS_DIR)

import codex_target  # noqa: E402
from projectroot import find_project_root  # noqa: E402


def main():
    root = find_project_root()
    agents_dir = os.path.join(root, ".claude", "agents")
    cmds_dir = os.path.join(root, ".claude", "commands")

    cmd_files = sorted(f for f in os.listdir(cmds_dir) if f.endswith(".md")) \
        if os.path.isdir(cmds_dir) else []
    rewrite = codex_target.make_rewriter([f[:-3] for f in cmd_files])
    models = codex_target.load_models(root, root)
    out = {}

    if os.path.isdir(agents_dir):
        for fn in sorted(os.listdir(agents_dir)):
            if not fn.endswith(".md"):
                continue
            name, content = codex_target.build_agent(
                codex_target.read(os.path.join(agents_dir, fn)), models, rewrite)
            out[f".codex/agents/{name}.toml"] = content

    for fn in cmd_files:
        name = fn[:-3]
        out[f".agents/skills/{name}/SKILL.md"] = codex_target.build_skill(
            name, codex_target.read(os.path.join(cmds_dir, fn)), rewrite)

    method_text = codex_target.read(os.path.join(root, "CLAUDE.md"))
    # En modo vendored CLAUDE.md ya es el método: pasamos project_claude_md="" para no duplicar.
    out.update(codex_target.build_agents_md(method_text, "", ".", rewrite))

    # Limpia agentes/skills obsoletos que ya no existan en .claude/
    expected_agents = {k for k in out if k.startswith(".codex/agents/")}
    codex_agents_dir = os.path.join(root, ".codex", "agents")
    if os.path.isdir(codex_agents_dir):
        for fn in os.listdir(codex_agents_dir):
            rel = f".codex/agents/{fn}"
            if fn.endswith(".toml") and rel not in expected_agents:
                os.remove(os.path.join(codex_agents_dir, fn))

    for rel, content in sorted(out.items()):
        dst = os.path.join(root, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with io.open(dst, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)

    print(f"Sincronizados {len(out)} ficheros para Antigravity/Codex en {root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
