#!/usr/bin/env python3
"""Aplica el mapeo de enlaces (átomo -> parents) producido por el workflow.

Lee un JSON {"links":[{"atom": id, "parents":[ids]}, ...]}, escribe el campo
`parent` en cada átomo destino y recalcula `children` por inversión GLOBAL
(sobre todos los átomos). Valida que los parents existan. Idempotente.

Uso: python scripts/apply_links.py <mapa.json>
Después conviene: python scripts/gen_index.py && python scripts/gen_rtm.py
"""
import re, glob, io, os, sys, json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from projectroot import find_project_root

# La raiz NO es la carpeta padre de scripts/: cuando el sistema se consume
# como submodulo eso apunta al submodulo. Se resuelve buscando el marcador.
ROOT = find_project_root(__file__)
GROOT = glob.escape(ROOT)
ROOTS = ['docs/system/srs', 'docs/subsystem/ssrs', 'docs/subsystem/ssd', 'docs/software/swdd']
FM = re.compile(r'^(---\n)(.*?)(\n---)', re.S)

def all_atoms():
    m = {}
    for r in ROOTS:
        for p in glob.glob(os.path.join(GROOT, r, '**', '*.md'), recursive=True):
            if os.path.basename(p) in ('_index.md', 'README.md'):
                continue
            mm = FM.match(io.open(p, encoding='utf-8').read())
            if not mm:
                continue
            idm = re.search(r'^id:\s*(.*)$', mm.group(2), re.M)
            if idm:
                m[idm.group(1).strip()] = p
    return m

def get_parents(fm):
    pm = re.search(r'^parent:\s*\[(.*?)\]', fm, re.M)
    return [x.strip() for x in pm.group(1).split(',')] if (pm and pm.group(1).strip()) else []

def set_field(fm, name, vals):
    line = f"{name}: [{', '.join(vals)}]"
    return re.sub(rf'^{name}:.*$', line, fm, count=1, flags=re.M)

def main():
    data = json.load(io.open(sys.argv[1], encoding='utf-8'))
    idpath = all_atoms()
    parents = {}
    missing_atom, missing_parent = [], []
    for L in data.get('links', []):
        a = L.get('atom')
        if a not in idpath:
            missing_atom.append(a); continue
        valid = []
        for p in (L.get('parents') or []):
            if not p:
                continue
            (valid if p in idpath else missing_parent).append(p)
        parents[a] = valid

    # parents efectivos de cada átomo (los del mapa, o los que ya tenía)
    eff = {}
    cache = {}
    for aid, p in idpath.items():
        fm = FM.match(io.open(p, encoding='utf-8').read()).group(2)
        cache[aid] = fm
        eff[aid] = parents[aid] if aid in parents else get_parents(fm)

    children = {}
    for aid, ps in eff.items():
        for p in ps:
            children.setdefault(p, []).append(aid)

    applied = 0
    for aid, p in idpath.items():
        txt = io.open(p, encoding='utf-8').read()
        mm = FM.match(txt); fm = mm.group(2); new = fm
        if aid in parents:
            new = set_field(new, 'parent', parents[aid])
        new = set_field(new, 'children', sorted(children.get(aid, [])))
        if new != fm:
            io.open(p, 'w', encoding='utf-8').write(txt[:mm.start(2)] + new + txt[mm.end(2):])
            applied += 1
    print(f"links={len(data.get('links',[]))} parents_set={len(parents)} "
          f"ficheros_modificados={applied} atomos_no_encontrados={len(missing_atom)} "
          f"parents_inexistentes={len(set(missing_parent))}")
    if missing_atom:
        print("  átomos no encontrados (muestra):", missing_atom[:5])
    if missing_parent:
        print("  parents inexistentes (muestra):", list(set(missing_parent))[:5])

if __name__ == '__main__':
    main()
