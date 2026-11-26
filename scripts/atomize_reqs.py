#!/usr/bin/env python3
"""Atomiza ficheros SRS/SSRS regulares (bloques ### REQ-) en un fichero por requisito.

- SRS:  docs/system/srs/{area}.md          -> docs/system/srs/{area}/{REQ-ID}.md + _index.md
- SSRS: docs/subsystem/ssrs/{ss}/requisitos.md -> docs/subsystem/ssrs/{ss}/{REQ-ID}.md + _index.md

Frontmatter mínimo: id, summary, parent, children, related, origin.
parent: en SSRS, los REQ-SYS referenciados en Origen ("Derivado de ...").
children: se rellena por inversión global tras parsear todo.
El RTM no se toca aquí.
"""
import re, glob, os, io, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from projectroot import find_project_root

# La raiz NO es la carpeta padre de scripts/: cuando el sistema se consume
# como submodulo eso apunta al submodulo. Se resuelve buscando el marcador.
ROOT = find_project_root(__file__)
TITLE_SEP = re.compile(r'\s+(?:-{2,}|—|–)\s+')
REQ_REF = re.compile(r'REQ-[A-Z0-9\-]+')
REQH = re.compile(r'^#{2,4}\s+(REQ-[A-Z0-9\-]+)\b\s*(.*)$')
SEPLEAD = re.compile(r'^\s*(?:-{2,}|—|–)\s*')

def yq(s):
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'

def parse_file(path):
    with io.open(path, encoding='utf-8') as f:
        lines = f.read().split('\n')
    title, intro, atoms = None, [], []
    cur, body, cur_group, in_intro = None, [], None, True

    def flush():
        nonlocal cur, body
        if cur is not None:
            cur['body'] = '\n'.join(body).strip('\n')
            atoms.append(cur)
        cur, body = None, []

    for line in lines:
        if title is None and line.startswith('# '):
            title = line[2:].strip(); continue
        m = REQH.match(line)
        if m:
            flush(); in_intro = False
            cur = {'id': m.group(1),
                   'summary': SEPLEAD.sub('', m.group(2)).strip(),
                   'group': cur_group or ''}
            body = []; continue
        if re.match(r'^#{2,4}\s+', line) and 'REQ-' not in line:
            flush(); in_intro = False
            g = re.sub(r'^#{2,4}\s+', '', line).strip()
            cur_group = TITLE_SEP.split(g, 1)[0].strip(); continue
        if cur is not None:
            body.append(line)
        elif in_intro and line.strip() and line.strip() != '---':
            intro.append(line.strip())
    flush()
    return title, ' '.join(intro), atoms

def extract_origin(body):
    for line in body.split('\n'):
        ls = line.strip()
        low = ls.lower()
        if low.startswith('- **origen') or low.startswith('- **origin'):
            return re.sub(r'^- \*\*[^*]+\*\*:?\s*', '', ls).strip()
    return ''

def main():
    GROOT = glob.escape(ROOT)  # el path contiene [2] -> escapar para glob
    targets = []  # (path, out_dir, level, name)
    for p in sorted(glob.glob(os.path.join(GROOT, 'docs/system/srs/*.md'))):
        base = os.path.basename(p)
        if base in ('README.md', 'glosario.md'):
            continue
        name = base[:-3]
        targets.append((p, os.path.join(ROOT, 'docs/system/srs', name), 'SRS', name))
    for p in sorted(glob.glob(os.path.join(GROOT, 'docs/subsystem/ssrs/*/requisitos.md'))):
        ss = os.path.basename(os.path.dirname(p))
        targets.append((p, os.path.dirname(p), 'SSRS', ss))

    parsed = []   # dicts with file meta + atoms
    all_atoms = {}  # id -> atom record (with parents)
    for path, out_dir, level, name in targets:
        title, intro, atoms = parse_file(path)
        if not atoms:
            print(f"  (skip, 0 reqs) {path}"); continue
        recs = []
        for a in atoms:
            origin = extract_origin(a['body'])
            parents = REQ_REF.findall(origin) if level == 'SSRS' else []
            rec = {'id': a['id'], 'summary': a['summary'], 'group': a['group'],
                   'origin': origin, 'parent': parents, 'body': a['body'],
                   'out_dir': out_dir, 'level': level}
            recs.append(rec); all_atoms[a['id']] = rec
        parsed.append({'path': path, 'out_dir': out_dir, 'level': level,
                       'name': name, 'title': title, 'intro': intro, 'recs': recs})

    # children por inversión
    children = {}
    for rec in all_atoms.values():
        for par in rec['parent']:
            children.setdefault(par, []).append(rec['id'])

    total = 0
    for f in parsed:
        os.makedirs(f['out_dir'], exist_ok=True)
        for rec in f['recs']:
            ch = sorted(children.get(rec['id'], []))
            fm = ['---',
                  f"id: {rec['id']}",
                  f"summary: {yq(rec['summary'])}",
                  f"parent: [{', '.join(rec['parent'])}]",
                  f"children: [{', '.join(ch)}]",
                  "related: []",
                  f"origin: {yq(rec['origin'])}",
                  '---']
            out = '\n'.join(fm) + '\n' + rec['body'].strip() + '\n'
            with io.open(os.path.join(f['out_dir'], rec['id'] + '.md'), 'w', encoding='utf-8') as fh:
                fh.write(out)
            total += 1
        # _index.md
        idx = [f"# Índice — {f['level']} / {f['title'] or f['name']}", '']
        if f['intro']:
            idx += [f['intro'], '']
        idx += ['| ID | Resumen | Grupo | Hijos |', '|----|---------|-------|-------|']
        for rec in f['recs']:
            ch = sorted(children.get(rec['id'], []))
            idx.append(f"| {rec['id']} | {rec['summary']} | {rec['group']} | {' '.join(ch)} |")
        with io.open(os.path.join(f['out_dir'], '_index.md'), 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(idx) + '\n')
        # eliminar fichero original agregado
        if os.path.abspath(f['path']) != os.path.abspath(os.path.join(f['out_dir'], '_index.md')):
            os.remove(f['path'])
        print(f"  {f['level']:5} {f['name']:24} {len(f['recs']):3} átomos -> {os.path.relpath(f['out_dir'], ROOT)}")

    print(f"\nTOTAL: {total} átomos en {len(parsed)} carpetas")

if __name__ == '__main__':
    main()
