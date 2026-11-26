#!/usr/bin/env python3
"""Regenera el _index.md de cada carpeta de átomos desde su frontmatter.

A diferencia de atomize_*, NO necesita el fichero agregado original: lee los
átomos ya troceados. Preserva el texto introductorio (todo lo que haya por
encima de la fila de cabecera '| ID |') y regenera solo la tabla.

Uso:
  python scripts/gen_index.py                 # todas las carpetas de nivel
  python scripts/gen_index.py docs/system/srs/gestion-datos   # solo una
"""
import re, glob, io, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from projectroot import find_project_root

# La raiz NO es la carpeta padre de scripts/: cuando el sistema se consume
# como submodulo eso apunta al submodulo. Se resuelve buscando el marcador.
ROOT = find_project_root(__file__)
GROOT = glob.escape(ROOT)
FM = re.compile(r'^---\n(.*?)\n---', re.S)
LIST = re.compile(r'\[(.*?)\]')
LEVEL_ROOTS = ['docs/system/srs', 'docs/subsystem/ssrs',
               'docs/subsystem/ssd', 'docs/software/swdd']

def field(fm, name):
    m = re.search(rf'^{name}:\s*(.*)$', fm, re.M)
    return m.group(1).strip() if m else ''

def ids(val):
    m = LIST.search(val or '')
    return [x.strip() for x in m.group(1).split(',')] if (m and m.group(1).strip()) else []

def read_atom(path):
    with io.open(path, encoding='utf-8') as f:
        m = FM.match(f.read())
    if not m:
        return None
    fm = m.group(1)
    aid = field(fm, 'id')
    if not aid:
        return None
    return {'id': aid, 'summary': field(fm, 'summary').strip('"'),
            'origin': field(fm, 'origin').strip('"'), 'children': ids(field(fm, 'children'))}

def regen(folder):
    atoms = []
    for p in sorted(glob.glob(os.path.join(glob.escape(folder), '*.md'))):
        if os.path.basename(p) in ('_index.md', 'README.md'):
            continue
        a = read_atom(p)
        if a:
            atoms.append(a)
    if not atoms:
        return False
    atoms.sort(key=lambda a: a['id'])
    idx_path = os.path.join(folder, '_index.md')
    # preservar intro (todo lo anterior a la fila de cabecera de la tabla)
    prefix = []
    if os.path.exists(idx_path):
        for line in io.open(idx_path, encoding='utf-8').read().split('\n'):
            if re.match(r'^\|\s*ID\s*\|', line):
                break
            prefix.append(line)
        while prefix and not prefix[-1].strip():
            prefix.pop()
    if not prefix:
        prefix = [f"# Índice — {os.path.basename(folder)}"]
    rows = ['| ID | Resumen | Origen | Hijos |', '|----|---------|--------|-------|']
    for a in atoms:
        rows.append(f"| {a['id']} | {a['summary']} | {a['origin']} | {' '.join(a['children'])} |")
    io.open(idx_path, 'w', encoding='utf-8').write('\n'.join(prefix) + '\n\n' + '\n'.join(rows) + '\n')
    return len(atoms)

def folders_with_atoms():
    seen = set()
    for root in LEVEL_ROOTS:
        for p in glob.glob(os.path.join(GROOT, root, '**', '*.md'), recursive=True):
            if os.path.basename(p) in ('_index.md', 'README.md'):
                continue
            seen.add(os.path.dirname(p))
    return sorted(seen)

def main():
    if len(sys.argv) > 1:
        targets = [os.path.join(ROOT, a) if not os.path.isabs(a) else a for a in sys.argv[1:]]
    else:
        targets = folders_with_atoms()
    n = tot = 0
    for folder in targets:
        c = regen(folder)
        if c:
            n += 1; tot += c
    print(f"{n} _index regenerados, {tot} átomos indexados")

if __name__ == '__main__':
    main()
