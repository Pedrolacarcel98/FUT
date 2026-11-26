#!/usr/bin/env python3
"""
plan_from_jira.py — Genera un BLOQUE para PEGAR en la hoja "Actividades" del Excel de plan/,
con una fila por tarea de assessment (que ya esté en Jira, con `jira_key` en su frontmatter).

NO escribe el .xlsx (openpyxl rompía las tablas y las fórmulas del libro). En su lugar:
  - lee la cabecera de la hoja destino con zipfile (SOLO LECTURA, no toca el fichero),
  - emite un TSV (tab-separated) en el orden real de columnas de esa hoja, con la
    "Clave de incidencia" como fórmula =HYPERLINK("{base_url}/browse/{KEY}";"{KEY}"),
  - lo escribe a plan/<slug>-actividades-paste.tsv y lo imprime.
Tú abres el .tsv, copias el bloque y lo PEGAS en la primera fila libre de "Actividades"
(Excel reparte por tabs, extiende la tabla y no toca nada más).

Config Jira en project-status.json -> config.jira (base_url, story_points_hours_per_day, components).
Solo stdlib.

Uso:
  python scripts/plan_from_jira.py --tasks-dir docs/assessments/notifications/tasks
  python scripts/plan_from_jira.py --tasks-dir docs/assessments/notifications/tasks --sep ,   # si tu Excel usa ',' en fórmulas
"""
import argparse, glob, json, os, re, sys, unicodedata, urllib.parse, zipfile
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from assess_to_jira import split_frontmatter, load_cfg

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PNS = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower().strip()
    return re.sub(r"\s+", " ", s)


COLS = {  # columna canónica -> alias de cabecera (normalizados)
    "clave":  ["clave de incidencia", "clave", "key"],
    "resumen": ["resumen", "summary"],
    "comp":   ["componentes", "componente", "components"],
    "etiq":   ["etiquetas", "labels"],
    "horas":  ["horas", "hours"],
    "p_pers": ["puntos persona"],
    "p_gest": ["puntos gestion"],
    "p_tot":  ["puntos totales"],
}


def col_letter_to_idx(ref):
    m = re.match(r"([A-Z]+)", ref)
    idx, s = 0, m.group(1)
    for ch in s:
        idx = idx * 26 + (ord(ch) - 64)
    return idx


def read_header(xlsx, sheet_name):
    """Devuelve la cabecera (fila 1) de la hoja como lista ordenada por columna: [(idx, texto), ...].
    Solo lectura via zipfile; no modifica el fichero."""
    z = zipfile.ZipFile(xlsx)
    # shared strings
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(NS + "si"):
            ss.append("".join(t.text or "" for t in si.iter(NS + "t")))
    # sheet name -> target file
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rid = None
    for sh in wb.find(NS + "sheets").findall(NS + "sheet"):
        if sh.get("name") == sheet_name:
            rid = sh.get(RNS + "id")
    if not rid:
        raise SystemExit(f"La hoja '{sheet_name}' no existe en {os.path.basename(xlsx)}")
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    target = None
    for rel in rels.findall(PNS + "Relationship"):
        if rel.get("Id") == rid:
            target = rel.get("Target")
    path = "xl/" + target.lstrip("/") if not target.startswith("xl/") else target
    sd = ET.fromstring(z.read(path)).find(NS + "sheetData")
    header = []
    row1 = next((r for r in sd.findall(NS + "row") if r.get("r") == "1"), None)
    if row1 is None:
        raise SystemExit(f"La hoja '{sheet_name}' no tiene fila de cabecera (fila 1)")
    for c in row1.findall(NS + "c"):
        v = c.find(NS + "v")
        val = ""
        if v is not None:
            val = ss[int(v.text)] if c.get("t") == "s" else v.text
        header.append((col_letter_to_idx(c.get("r")), val))
    return header


def etiquetas(meta):
    out = [meta.get("capacidad"), meta.get("subsistema")]
    if str(meta.get("fuente")) == "manual":
        out.append("manual")
    return ", ".join(x for x in out if x)


def main():
    ap = argparse.ArgumentParser(description="Genera un bloque TSV para pegar en la hoja Actividades del Excel de plan/.")
    ap.add_argument("--tasks-dir", required=True, help="carpeta con los TT-*.md (con jira_key)")
    ap.add_argument("--xlsx", default=None, help="Excel destino (por defecto, el único .xlsx en plan/)")
    ap.add_argument("--sheet", default="Actividades", help="hoja destino (por defecto Actividades)")
    ap.add_argument("--sep", default=None, help="separador de argumentos de fórmula (';' en Excel ES, ',' en EN)")
    ap.add_argument("--func", default=None, help="nombre de la función de hipervínculo (HIPERVINCULO en ES, HYPERLINK en EN)")
    ap.add_argument("--repo", default=".", help="raíz del repo docs")
    args = ap.parse_args()

    repo = os.path.abspath(args.repo)
    cfg = load_cfg(repo)
    plan_cfg = json.load(open(os.path.join(repo, "project-status.json"), encoding="utf-8")).get("config", {}).get("plan", {})
    func = args.func or plan_cfg.get("hyperlink_func") or "HYPERLINK"
    sep = args.sep or plan_cfg.get("formula_sep") or ";"
    sp = urllib.parse.urlsplit((cfg.get("base_url") or "").strip())
    root = f"{sp.scheme}://{sp.netloc}" if sp.scheme and sp.netloc else (cfg.get("base_url") or "").rstrip("/")
    hpd = cfg.get("story_points_hours_per_day") or 8
    comps = ", ".join(cfg.get("components") or [])

    xlsx = args.xlsx or (glob.glob(os.path.join(repo, "plan", "*.xlsx")) or [None])[0]
    if not xlsx or not os.path.isfile(xlsx):
        raise SystemExit("No encuentro el .xlsx de plan/ (usa --xlsx).")

    header = read_header(xlsx, args.sheet)          # [(colidx, texto)]
    maxidx = max(i for i, _ in header)
    colmap = {}                                     # canon -> colidx
    for idx, txt in header:
        h = norm(txt)
        for canon, aliases in COLS.items():
            if h in aliases:
                colmap[canon] = idx
    if "clave" not in colmap or "resumen" not in colmap:
        raise SystemExit(f"No encuentro columnas 'Clave de incidencia'/'Resumen' en la fila 1 de '{args.sheet}'. Cabecera: {[t for _,t in header]}")

    files = sorted(glob.glob(os.path.join(repo, args.tasks_dir, "TT-*.md")))
    out_rows, tasks = [], 0
    for f in files:
        meta, _ = split_frontmatter(open(f, encoding="utf-8").read())
        key = meta.get("jira_key")
        if not meta.get("id") or not key:
            continue
        tasks += 1
        est = meta.get("estimacion", {})
        prob = est.get("probable") if isinstance(est, dict) else None
        horas = prob * hpd if isinstance(prob, int) else ""
        cells = {
            "clave": f'={func}("{root}/browse/{key}"{sep}"{key}")',
            "resumen": f"[{meta['id']}] {meta.get('titulo','')}",
            "comp": comps, "etiq": etiquetas(meta),
            "horas": horas, "p_pers": horas, "p_gest": 0 if horas != "" else "", "p_tot": horas,
        }
        row = [""] * maxidx
        for canon, idx in colmap.items():
            row[idx - 1] = str(cells.get(canon, ""))
        out_rows.append("\t".join(row))

    if not out_rows:
        raise SystemExit(f"No hay tareas con jira_key en {args.tasks_dir}. ¿Se hizo /assess-jira --push?")

    slug = os.path.basename(os.path.dirname(os.path.abspath(os.path.join(repo, args.tasks_dir))))
    tsv = os.path.join(repo, "plan", f"{slug}-actividades-paste.tsv")
    open(tsv, "w", encoding="utf-8", newline="\n").write("\n".join(out_rows) + "\n")

    print(f"== plan_from_jira :: {tasks} tareas :: hoja '{args.sheet}' ({maxidx} columnas) ==")
    print(f"   Columnas mapeadas: " + ", ".join(f"{k}=col{v}" for k, v in sorted(colmap.items(), key=lambda x: x[1])))
    print(f"   Bloque para pegar escrito en: {tsv}")
    print("   PASOS: abre ese .tsv en un editor (UTF-8), copia TODO, y en 'Actividades' pega en la")
    print("   primera celda libre de la columna A (p.ej. A14). Excel reparte por tabs y extiende la tabla.")
    print("   (Función='%s', separador='%s'. Ajustables con --func / --sep o en project-status.json config.plan)" % (func, sep))
    print("\n--- vista previa (primeras 3 filas) ---")
    for r in out_rows[:3]:
        print("  " + r[:160])


if __name__ == "__main__":
    main()
