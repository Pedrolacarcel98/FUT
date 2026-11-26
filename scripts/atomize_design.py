#!/usr/bin/env python3
"""Atomiza SSD/SWDD (prosa+código) en un átomo por sección ## de primer nivel.

- SSD:  docs/subsystem/ssd/{ss}/{stem}.md  -> ssd/{ss}/{folder}/{ID}.md + _index.md
- SWDD: docs/software/swdd/{mod}/{stem}.md -> swdd/{mod}/{folder}/{ID}.md + _index.md

folder por aspecto:  diseno->components, modelo-datos->data, interfaces->interfaces,
                     domain->domain, service-layer->services, handlers->handlers,
                     (otro)->su propio nombre.
core tiene ficheros por componente (mmlg-diseno.md): el prefijo se conserva en el ID.
ID: {NIVEL}-{KEY}-{folder}-{comp?}{NN}-{slug}. parent/children quedan vacíos
(el enlace semántico SSD/SWDD<->requisitos es follow-up del design-agent).
"""
import re, glob, os, io, unicodedata, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from projectroot import find_project_root

# La raiz NO es la carpeta padre de scripts/: cuando el sistema se consume
# como submodulo eso apunta al submodulo. Se resuelve buscando el marcador.
ROOT = find_project_root(__file__)
GROOT = glob.escape(ROOT)
H2 = re.compile(r'^##(?!#)\s+(.*)$')          # ## de primer nivel (no ###)
NUMPFX = re.compile(r'^\s*(\d+)[\.\)]\s*')     # "1. " / "2) "
ASPECTS = [('modelo-datos', 'data'), ('service-layer', 'services'),
           ('diseno', 'components'), ('interfaces', 'interfaces'),
           ('handlers', 'handlers'), ('domain', 'domain')]

def slugify(s, maxwords=7):
    s = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return '-'.join([w for w in s.split('-') if w][:maxwords]) or 'seccion'

def classify(stem):
    for asp, folder in ASPECTS:
        if stem == asp:
            return folder, ''
        if stem.endswith('-' + asp):
            return folder, stem[:-(len(asp) + 1)]
    return stem, ''   # fallback: carpeta propia

def parse_sections(path):
    with io.open(path, encoding='utf-8') as f:
        lines = f.read().split('\n')
    title, intro, secs = None, [], []
    cur, body, in_intro, fence = None, [], True, False

    def flush():
        nonlocal cur, body
        if cur is not None:
            cur['body'] = '\n'.join(body).strip('\n')
            secs.append(cur)
        cur, body = None, []

    for line in lines:
        if line.lstrip().startswith('```'):
            fence = not fence
        if not fence:
            if title is None and line.startswith('# ') and not line.startswith('## '):
                title = line[2:].strip(); continue
            m = H2.match(line)
            if m:
                flush(); in_intro = False
                raw = m.group(1).strip()
                num = NUMPFX.match(raw)
                heading = NUMPFX.sub('', raw).strip()
                cur = {'num': num.group(1) if num else None, 'summary': heading or raw}
                body = []; continue
        if cur is not None:
            body.append(line)
        elif in_intro and line.strip() and line.strip() != '---':
            intro.append(line.strip())
    flush()
    return title, ' '.join(intro), secs

def main():
    targets = []  # (path, level, key, stem)
    for p in sorted(glob.glob(os.path.join(GROOT, 'docs/subsystem/ssd/*/*.md'))):
        base = os.path.basename(p)
        if base in ('README.md', '_index.md'):
            continue
        key = os.path.basename(os.path.dirname(p))
        targets.append((p, 'SSD', key, base[:-3]))
    for p in sorted(glob.glob(os.path.join(GROOT, 'docs/software/swdd/*/*.md'))):
        base = os.path.basename(p)
        if base in ('README.md', '_index.md'):
            continue
        key = os.path.basename(os.path.dirname(p))
        targets.append((p, 'SWDD', key, base[:-3]))

    folders = {}  # out_dir -> {'level','key','intros':[], 'atoms':[]}
    total = 0
    for path, level, key, stem in targets:
        folder, comp = classify(stem)
        base_dir = os.path.dirname(os.path.dirname(path))  # .../ssd o .../swdd? no: dir del {ss}
        out_dir = os.path.join(os.path.dirname(path), folder)
        title, intro, secs = parse_sections(path)
        if not secs:
            print(f"  (skip, 0 secciones) {os.path.relpath(path, ROOT)}"); continue
        fk = folders.setdefault(out_dir, {'level': level, 'key': key, 'intros': [], 'atoms': []})
        if intro:
            fk['intros'].append(intro)
        for i, s in enumerate(secs, 1):
            nn = (s['num'] or str(i)).zfill(2)
            cp = (comp + '-') if comp else ''
            aid = f"{level}-{key.upper()}-{folder}-{cp}{nn}-{slugify(s['summary'])}"
            fk['atoms'].append({'id': aid, 'summary': s['summary'], 'group': stem,
                                'origin': f"{os.path.relpath(path, ROOT).replace(os.sep,'/')} §{nn}",
                                'body': s['body']})
        os.remove(path)

    def yq(s):
        return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'

    for out_dir, fk in folders.items():
        os.makedirs(out_dir, exist_ok=True)
        for a in fk['atoms']:
            fm = ['---', f"id: {a['id']}", f"summary: {yq(a['summary'])}",
                  "parent: []", "children: []", "related: []",
                  f"origin: {yq(a['origin'])}", '---']
            with io.open(os.path.join(out_dir, a['id'] + '.md'), 'w', encoding='utf-8') as fh:
                fh.write('\n'.join(fm) + '\n' + a['body'].strip() + '\n')
            total += 1
        rel = os.path.relpath(out_dir, ROOT).replace(os.sep, '/')
        idx = [f"# Índice — {fk['level']} / {fk['key']} / {os.path.basename(out_dir)}", '']
        if fk['intros']:
            idx += [' '.join(fk['intros']), '']
        idx += ['| ID | Resumen | Origen |', '|----|---------|--------|']
        for a in fk['atoms']:
            idx.append(f"| {a['id']} | {a['summary']} | {a['origin']} |")
        with io.open(os.path.join(out_dir, '_index.md'), 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(idx) + '\n')
        print(f"  {fk['level']:5} {rel:42} {len(fk['atoms']):3} átomos")

    print(f"\nTOTAL: {total} átomos en {len(folders)} carpetas")

if __name__ == '__main__':
    main()
