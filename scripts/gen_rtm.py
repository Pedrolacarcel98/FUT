#!/usr/bin/env python3
"""Genera docs/traceability/rtm.md recorriendo el frontmatter de todos los átomos.

Lee id/parent/children/summary de cada átomo (excluye _index.md, README.md),
infiere el nivel desde la ruta y reporta: cobertura por nivel, requisitos SRS
sin descomposición, SSRS sin padre, referencias rotas y átomos SSD/SWDD aún
sin enlazar (enlace semántico = follow-up del design-agent).
"""
import re, glob, os, io, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from projectroot import find_project_root

# La raiz NO es la carpeta padre de scripts/: cuando el sistema se consume
# como submodulo eso apunta al submodulo. Se resuelve buscando el marcador.
ROOT = find_project_root(__file__)
GROOT = glob.escape(ROOT)
FM = re.compile(r'^---\n(.*?)\n---', re.S)
LIST = re.compile(r'\[(.*?)\]')

def level_of(path):
    p = path.replace(os.sep, '/')
    for lv in ('srs', 'ssrs', 'ssd', 'swdd'):
        if f'/{lv}/' in p:
            return lv.upper()
    return '?'

def field(fm, name):
    m = re.search(rf'^{name}:\s*(.*)$', fm, re.M)
    return m.group(1).strip() if m else ''

def ids(val):
    m = LIST.search(val)
    if not m or not m.group(1).strip():
        return []
    return [x.strip() for x in m.group(1).split(',') if x.strip()]

def main():
    atoms = {}
    for p in glob.glob(os.path.join(GROOT, 'docs/**/*.md'), recursive=True):
        base = os.path.basename(p)
        if base in ('_index.md', 'README.md', 'glosario.md'):
            continue
        lv = level_of(p)
        if lv == '?':
            continue
        with io.open(p, encoding='utf-8') as f:
            txt = f.read()
        m = FM.match(txt)
        if not m:
            continue
        fm = m.group(1)
        aid = field(fm, 'id')
        if not aid:
            continue
        atoms[aid] = {'level': lv, 'parent': ids(field(fm, 'parent')),
                      'children': ids(field(fm, 'children')),
                      'summary': field(fm, 'summary').strip('"')}

    allids = set(atoms)
    by_lv = {}
    for a in atoms.values():
        by_lv.setdefault(a['level'], 0)
        by_lv[a['level']] += 1

    srs_sin_hijos = [i for i, a in atoms.items() if a['level'] == 'SRS' and not a['children']]
    ssrs_sin_padre = [i for i, a in atoms.items() if a['level'] == 'SSRS' and not a['parent']]
    rotas = []
    for i, a in atoms.items():
        for ref in a['parent'] + a['children']:
            if ref not in allids:
                rotas.append((i, ref))
    sin_enlazar = sum(1 for a in atoms.values()
                      if a['level'] in ('SSD', 'SWDD') and not a['parent'] and not a['children'])

    out = ['# Requirements Traceability Matrix (GENERADO)', '',
           'Generado por `scripts/gen_rtm.py` desde el frontmatter de los átomos. No editar a mano.', '',
           '## Resumen por nivel', '', '| Nivel | Átomos |', '|---|---|']
    for lv in ('SRS', 'SSRS', 'SSD', 'SWDD'):
        out.append(f"| {lv} | {by_lv.get(lv, 0)} |")
    out += ['', f"**Total átomos:** {len(atoms)}", '',
            '## Cadena SRS → SSRS', '',
            f"- Requisitos SRS sin descomposición (sin hijos SSRS): **{len(srs_sin_hijos)}**",
            f"- Requisitos SSRS huérfanos (sin padre SRS): **{len(ssrs_sin_padre)}**",
            f"- Referencias rotas (parent/children a IDs inexistentes): **{len(rotas)}**", '',
            '## SSD / SWDD', '',
            f"- Átomos SSD/SWDD sin enlazar a requisitos: **{sin_enlazar}** "
            "(enlace semántico pendiente — follow-up del design-agent)", '']

    if srs_sin_hijos:
        out += ['## SRS sin descomposición', '']
        for i in sorted(srs_sin_hijos):
            out.append(f"- {i} — {atoms[i]['summary']}")
        out.append('')
    if rotas:
        out += ['## Referencias rotas', '']
        for i, ref in sorted(rotas):
            out.append(f"- {i} → `{ref}` (no existe)")
        out.append('')

    dst = os.path.join(ROOT, 'docs/traceability/rtm.md')
    with io.open(dst, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')
    print(f"RTM -> {os.path.relpath(dst, ROOT)}")
    print(f"  átomos={len(atoms)}  SRS sin hijos={len(srs_sin_hijos)}  "
          f"SSRS huérfanos={len(ssrs_sin_padre)}  rotas={len(rotas)}  SSD/SWDD sin enlazar={sin_enlazar}")

if __name__ == '__main__':
    main()
