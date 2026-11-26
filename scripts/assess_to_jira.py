#!/usr/bin/env python3
"""
assess_to_jira.py — Exporta las tareas técnicas de un assessment (docs/assessments/{tarea}/tasks/TT-*.md)
a Jira Cloud como issues, mapeando cada TT a un issue bajo su Epic existente.

Solo stdlib (json, urllib, base64, re, argparse, glob, os, sys). No requiere pyyaml ni requests.

Modo por defecto: --dry-run (no toca Jira; genera y muestra los payloads). El push real exige --push.

Config: project-status.json -> config.jira
  base_url            p.ej. "https://tuorg.atlassian.net"   (SIN barra final)
  project_key         p.ej. "MR"
  issue_type          por defecto "Task"
  story_points_field  id del custom field de Story Points, p.ej. "customfield_10016" ("" = no rellenar)
  epic_link_field     "parent" (team-managed) o el customfield del Epic Link (company-managed), p.ej. "customfield_10014"
  epic_default        nombre del Epic por defecto, p.ej. "CORE"
  epic_overrides      { "TT-017": "OTRO EPIC", "TT-018": "__transversal__", ... }
                      "__transversal__" = sin Epic (se etiqueta "transversal")
  components          lista de componentes Jira a asignar a todas las tareas, p.ej. ["MiProyecto"]
                      (deben existir en el proyecto; se resuelven por nombre)

Credenciales (solo para --push), por variable de entorno:
  JIRA_EMAIL          email de la cuenta Atlassian
  JIRA_API_TOKEN      API token (https://id.atlassian.com/manage-profile/security/api-tokens)

Uso:
  python scripts/assess_to_jira.py --task notifications                 # dry-run, escribe payloads a --out
  python scripts/assess_to_jira.py --task notifications --push          # crea/actualiza en Jira
  python scripts/assess_to_jira.py --task notifications --only TT-017   # una tarea
"""
import argparse, base64, glob, json, os, re, sys, urllib.request, urllib.error

TRANSVERSAL = "__transversal__"


# ---------------------------------------------------------------- frontmatter
def split_frontmatter(text):
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm = text[3:end].strip("\n")
    body = text[end + 4:].lstrip("\n")
    return parse_frontmatter(fm), body


def _strip_comment(s):
    # elimina un comentario '# ...' que no esté dentro de comillas/llaves ni sea parte de un id (TT-###)
    out, q = [], None
    for i, ch in enumerate(s):
        if q:
            out.append(ch)
            if ch == q:
                q = None
        elif ch in "\"'":
            q = ch
            out.append(ch)
        elif ch == "#" and (i == 0 or s[i - 1] == " "):
            break
        else:
            out.append(ch)
    return "".join(out).rstrip()


def _scalar(v):
    v = v.strip()
    if len(v) >= 2 and v[0] in "\"'" and v[-1] == v[0]:
        return v[1:-1]
    if v.lower() in ("true", "false"):
        return v.lower() == "true"
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    return v


def _parse_list(v):
    inner = v.strip()[1:-1].strip()
    if not inner:
        return []
    return [_scalar(x) for x in inner.split(",")]


def _parse_inline_dict(v):
    inner = v.strip()[1:-1].strip()
    d = {}
    if not inner:
        return d
    for pair in re.split(r",(?![^\[]*\])", inner):
        if ":" in pair:
            k, val = pair.split(":", 1)
            d[k.strip()] = _scalar(val)
    return d


def parse_frontmatter(fm):
    meta = {}
    for raw in fm.splitlines():
        line = _strip_comment(raw)
        if not line.strip() or line.strip().startswith("#") or ":" not in line:
            continue
        key, val = line.split(":", 1)
        key, val = key.strip(), val.strip()
        if not val:
            meta[key] = ""
        elif val.startswith("["):
            meta[key] = _parse_list(val)
        elif val.startswith("{"):
            meta[key] = _parse_inline_dict(val)
        else:
            meta[key] = _scalar(val)
    return meta


# ---------------------------------------------------------------- markdown -> ADF
def _inline(text):
    """Convierte **bold** y `code` a nodos ADF text con marks. Devuelve lista de nodos text."""
    nodes = []
    tokens = re.split(r"(\*\*.+?\*\*|`[^`]+`)", text)
    for tok in tokens:
        if not tok:
            continue
        if tok.startswith("**") and tok.endswith("**"):
            nodes.append({"type": "text", "text": tok[2:-2], "marks": [{"type": "strong"}]})
        elif tok.startswith("`") and tok.endswith("`"):
            nodes.append({"type": "text", "text": tok[1:-1], "marks": [{"type": "code"}]})
        else:
            nodes.append({"type": "text", "text": tok})
    return nodes or [{"type": "text", "text": text}]


def md_to_adf(md):
    """Conversor markdown->ADF acotado a lo que usan los TT: headings, párrafos, listas, code fences,
    blockquotes y tablas pipe (estas se renderizan como bloque de código monoespaciado para ser siempre válidas)."""
    lines = md.splitlines()
    content, i, n = [], 0, len(lines)
    while i < n:
        line = lines[i]
        # code fence
        if line.lstrip().startswith("```"):
            lang = line.lstrip()[3:].strip() or None
            i += 1
            buf = []
            while i < n and not lines[i].lstrip().startswith("```"):
                buf.append(lines[i]); i += 1
            i += 1  # cierre
            cb = {"type": "codeBlock", "content": [{"type": "text", "text": "\n".join(buf) or " "}]}
            if lang:
                cb["attrs"] = {"language": lang}
            content.append(cb)
            continue
        # tabla pipe -> code block (seguro; ADF tables son verbosas y frágiles)
        if line.strip().startswith("|") and line.strip().endswith("|"):
            buf = []
            while i < n and lines[i].strip().startswith("|"):
                buf.append(lines[i]); i += 1
            content.append({"type": "codeBlock", "content": [{"type": "text", "text": "\n".join(buf)}]})
            continue
        # heading
        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            content.append({"type": "heading", "attrs": {"level": min(len(m.group(1)), 6)},
                            "content": _inline(m.group(2).strip())})
            i += 1
            continue
        # blockquote
        if line.lstrip().startswith(">"):
            buf = []
            while i < n and lines[i].lstrip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i])); i += 1
            content.append({"type": "blockquote",
                            "content": [{"type": "paragraph", "content": _inline(" ".join(bl for bl in buf if bl.strip()) or " ")}]})
            continue
        # bullet list
        if re.match(r"^\s*[-*]\s+", line):
            items = []
            while i < n and re.match(r"^\s*[-*]\s+", lines[i]):
                txt = re.sub(r"^\s*[-*]\s+", "", lines[i])
                items.append({"type": "listItem", "content": [{"type": "paragraph", "content": _inline(txt)}]})
                i += 1
            content.append({"type": "bulletList", "content": items})
            continue
        # blank
        if not line.strip():
            i += 1
            continue
        # párrafo (agrupa líneas contiguas)
        buf = [line]
        i += 1
        while i < n and lines[i].strip() and not re.match(r"^(#{1,6}\s|```|\s*[-*]\s|>|\|)", lines[i]):
            buf.append(lines[i]); i += 1
        content.append({"type": "paragraph", "content": _inline(" ".join(buf))})
    if not content:
        content = [{"type": "paragraph", "content": [{"type": "text", "text": " "}]}]
    return {"version": 1, "type": "doc", "content": content}


# ---------------------------------------------------------------- issue building
def _adf_textlen(node):
    if isinstance(node, dict):
        return len(node.get("text", "")) + sum(_adf_textlen(c) for c in node.get("content", []))
    return 0


def trim_adf(adf, limit=30000):
    """Recorta la descripción ADF para no superar el límite de Jira (32767 chars de texto)."""
    total, kept = 0, []
    for block in adf.get("content", []):
        bl = _adf_textlen(block)
        if total + bl > limit:
            kept.append({"type": "paragraph", "content": [{"type": "text",
                "text": "… [descripción truncada por el límite de Jira (32767 car.). Contenido completo del TT en el repositorio docs/assessments/{tarea}/tasks/.]",
                "marks": [{"type": "em"}]}]})
            break
        kept.append(block)
        total += bl
    adf["content"] = kept
    return adf


def band_str(est):
    if not isinstance(est, dict) or "probable" not in est:
        return None
    o, p, s = est.get("optimista"), est.get("probable"), est.get("pesimista")
    u = est.get("unidad", "jornadas-persona")
    c = est.get("confianza", "?")
    return f"{o} / {p} / {s} {u} · confianza {c}"


def build_meta_panel(meta, cfg=None):
    """Bloque ADF al inicio de la descripción con los metadatos clave (incluida la banda)."""
    cfg = cfg or {}
    rows = []
    rows.append(("ID", str(meta.get("id", ""))))
    rows.append(("Capacidad", str(meta.get("capacidad", ""))))
    rows.append(("Subsistema", str(meta.get("subsistema", ""))))
    rows.append(("Estado (assessment)", str(meta.get("estado", ""))))
    b = band_str(meta.get("estimacion", {}))
    if b:
        rows.append(("Estimación (banda)", b))
    hpd = cfg.get("story_points_hours_per_day")
    est = meta.get("estimacion", {})
    if hpd and isinstance(est, dict) and isinstance(est.get("probable"), int):
        rows.append(("Story Points (Jira)", f"{est['probable'] * hpd} h (= {est['probable']} jornadas × {hpd} h/día, valor probable)"))
    if meta.get("depends_on"):
        rows.append(("Depende de", ", ".join(map(str, meta["depends_on"]))))
    if meta.get("hallazgos"):
        rows.append(("Hallazgos", ", ".join(map(str, meta["hallazgos"]))))
    if meta.get("origin_propuesta"):
        rows.append(("Origen propuesta", ", ".join(map(str, meta["origin_propuesta"]))))
    if str(meta.get("fuente")) == "manual":
        rows.append(("Origen tarea", "manual (inyectada / propuesta Babel)"))
    items = []
    for k, v in rows:
        items.append({"type": "listItem", "content": [{"type": "paragraph",
                     "content": [{"type": "text", "text": k + ": ", "marks": [{"type": "strong"}]},
                                 {"type": "text", "text": v}]}]})
    return [
        {"type": "paragraph", "content": [{"type": "text",
            "text": "Ficha generada desde el assessment pre-canónico (docs/assessments). Pre-canónico y solo-lectura sobre la base; no sustituye el diseño canónico.",
            "marks": [{"type": "em"}]}]},
        {"type": "bulletList", "content": items},
        {"type": "rule"},
    ]


def build_fields(meta, body, cfg, epic_name):
    labels = []
    for key in ("capacidad", "subsistema"):
        v = meta.get(key)
        if v:
            labels.append(re.sub(r"[^A-Za-z0-9_.-]+", "-", str(v)))
    if str(meta.get("fuente")) == "manual":
        labels.append("fuente-manual")
    labels.append("assessment-swdd")
    if epic_name == TRANSVERSAL:
        labels.append("transversal")

    adf = md_to_adf(body)
    adf["content"] = build_meta_panel(meta, cfg) + adf["content"]
    adf = trim_adf(adf)

    fields = {
        "project": {"key": cfg["project_key"]},
        "issuetype": {"name": cfg.get("issue_type", "Task")},
        "summary": f"[{meta.get('id')}] {meta.get('titulo', '')}"[:250],
        "description": adf,
        "labels": labels,
    }
    comps = cfg.get("components") or []
    if comps:
        fields["components"] = [{"name": c} for c in comps]
    spf = cfg.get("story_points_field")
    est = meta.get("estimacion", {})
    if spf and isinstance(est, dict) and isinstance(est.get("probable"), int):
        hpd = cfg.get("story_points_hours_per_day")
        fields[spf] = est["probable"] * hpd if hpd else est["probable"]
    return fields


# ---------------------------------------------------------------- jira api (push)
class Jira:
    def __init__(self, base_url, email, token, api_version=3):
        # normaliza a la RAÍZ del sitio (scheme://host): la API REST cuelga de ahí,
        # aunque el usuario pegue la URL del navegador (.../jira/software/c/projects/KEY)
        sp = urllib.parse.urlsplit(base_url.strip())
        self.base = f"{sp.scheme}://{sp.netloc}" if sp.scheme and sp.netloc else base_url.rstrip("/")
        self.v = api_version
        self._fields = None
        auth = base64.b64encode(f"{email}:{token}".encode()).decode()
        self.headers = {"Authorization": f"Basic {auth}", "Content-Type": "application/json",
                        "Accept": "application/json"}

    _SYSTEM_FIELDS = {"parent", "labels", "components", "summary", "description", "assignee",
                      "priority", "duedate", "reporter"}

    def field_id(self, name_or_id):
        """Devuelve el id de un campo. Acepta ya un id (customfield_/campo de sistema) o un NOMBRE
        de campo (p.ej. 'Story Points', 'Epic Link'), que resuelve contra /rest/api/v/field."""
        if not name_or_id or name_or_id in self._SYSTEM_FIELDS or name_or_id.startswith("customfield_"):
            return name_or_id
        if self._fields is None:
            self._fields = self._req("GET", f"/rest/api/{self.v}/field")
        matches = [f["id"] for f in self._fields if f.get("name", "").strip().lower() == name_or_id.strip().lower()]
        if not matches:
            raise SystemExit(f"No encontré el campo Jira '{name_or_id}' (ni es un customfield_ id). "
                             f"Revisa config.jira; campos con ese nombre no existen en tu instancia.")
        if len(matches) > 1:
            print(f"   [aviso] varios campos se llaman '{name_or_id}': {matches}; uso {matches[0]}")
        return matches[0]

    def _req(self, method, path, body=None):
        url = f"{self.base}{path}"
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, headers=self.headers, method=method)
        try:
            with urllib.request.urlopen(req) as r:
                raw = r.read().decode()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            raise SystemExit(f"[jira {method} {path}] HTTP {e.code}: {e.read().decode()[:800]}")

    _EPIC_TYPES = {"epic", "épica", "epica"}

    def search_epic(self, project_key, name):
        # NO se filtra por issuetype=Epic: el nombre del tipo depende del idioma de la instancia
        # (p.ej. "Épica" en español). Se busca por summary y se casa exacto (case-insensitive).
        # endpoint nuevo (el antiguo /search fue eliminado, Atlassian CHANGE-2046).
        jql = f'project = "{project_key}" AND summary ~ "\\"{name}\\""'
        res = self._req("GET", f"/rest/api/{self.v}/search/jql?jql={urllib.parse.quote(jql)}&maxResults=50&fields=summary,issuetype")
        exact = [it for it in res.get("issues", [])
                 if it["fields"]["summary"].strip().lower() == name.strip().lower()]
        if not exact:
            return None
        epicish = [it for it in exact
                   if it["fields"].get("issuetype", {}).get("name", "").strip().lower() in self._EPIC_TYPES]
        return (epicish or exact)[0]["key"]

    def create(self, fields):
        return self._req("POST", f"/rest/api/{self.v}/issue", {"fields": fields})["key"]

    def update(self, key, fields):
        self._req("PUT", f"/rest/api/{self.v}/issue/{key}", {"fields": fields})
        return key

    def link_blocks(self, blocker_key, blocked_key, link_type="Blocks"):
        self._req("POST", f"/rest/api/{self.v}/issueLink", {
            "type": {"name": link_type},
            "outwardIssue": {"key": blocker_key},
            "inwardIssue": {"key": blocked_key}})

    def blockers_of(self, key, link_type="Blocks"):
        """Claves que YA bloquean a `key` (para no duplicar enlaces al reejecutar).
        En el issue bloqueado, el bloqueador aparece como outwardIssue del enlace 'blocks'."""
        it = self._req("GET", f"/rest/api/{self.v}/issue/{key}?fields=issuelinks")
        return {l["outwardIssue"]["key"]
                for l in it.get("fields", {}).get("issuelinks", [])
                if l.get("type", {}).get("name") == link_type and "outwardIssue" in l}


# ---------------------------------------------------------------- persistencia jira_key
def write_jira_key(path, key):
    text = open(path, encoding="utf-8").read()
    if re.search(r"^jira_key:\s*.*$", text, re.M):
        text = re.sub(r"^jira_key:\s*.*$", f"jira_key: {key}", text, count=1, flags=re.M)
    else:
        # insertar antes del cierre '---' del frontmatter
        text = re.sub(r"\n---\n", f"\njira_key: {key}\n---\n", text, count=1)
    open(path, "w", encoding="utf-8", newline="").write(text)


# ---------------------------------------------------------------- main
def load_cfg(repo):
    ps = json.load(open(os.path.join(repo, "project-status.json"), encoding="utf-8"))
    cfg = ps.get("config", {}).get("jira", {})
    cfg.setdefault("issue_type", "Task")
    cfg.setdefault("epic_link_field", "parent")
    cfg.setdefault("epic_default", "")
    cfg.setdefault("epic_overrides", {})
    return cfg


def epic_for(tt_id, cfg):
    return cfg.get("epic_overrides", {}).get(tt_id, cfg.get("epic_default", ""))


def load_env_file(path):
    """Carga KEY=VALUE de un fichero local (p.ej. .jira.env, gitignored) al entorno.
    Las variables ya presentes en el entorno tienen prioridad (setdefault). No imprime valores."""
    if not path or not os.path.isfile(path):
        return False
    for raw in open(path, encoding="utf-8"):
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip()
        if len(v) >= 2 and v[0] in "\"'" and v[-1] == v[0]:
            v = v[1:-1]
        os.environ.setdefault(k.strip(), v)
    return True


def main():
    ap = argparse.ArgumentParser(description="Exporta tareas de assessment a Jira Cloud.")
    ap.add_argument("--task", required=True, help="slug de la tarea (docs/assessments/<slug>/)")
    ap.add_argument("--push", action="store_true", help="crea/actualiza en Jira (por defecto: dry-run)")
    ap.add_argument("--only", action="append", default=None, help="limitar a TT-ids concretos (repetible)")
    ap.add_argument("--out", default=None, help="dir de salida de payloads en dry-run")
    ap.add_argument("--repo", default=".", help="raíz del repo docs (con project-status.json)")
    ap.add_argument("--env-file", default=None, help="fichero KEY=VALUE con credenciales (por defecto .jira.env en la raíz)")
    args = ap.parse_args()

    repo = os.path.abspath(args.repo)
    cfg = load_cfg(repo)
    tasks_dir = os.path.join(repo, "docs", "assessments", args.task, "tasks")
    files = sorted(glob.glob(os.path.join(tasks_dir, "TT-*.md")))
    if not files:
        raise SystemExit(f"No hay tareas en {tasks_dir}")

    parsed = []
    for f in files:
        meta, body = split_frontmatter(open(f, encoding="utf-8").read())
        if not meta.get("id"):
            continue
        if args.only and meta["id"] not in args.only:
            continue
        parsed.append((f, meta, body))

    print(f"== assess_to_jira :: tarea '{args.task}' :: {len(parsed)} tareas :: modo {'PUSH' if args.push else 'DRY-RUN'} ==")
    print(f"   Jira base_url={cfg.get('base_url') or '(vacío)'} project_key={cfg.get('project_key') or '(vacío)'} "
          f"issue_type={cfg.get('issue_type')} story_points_field={cfg.get('story_points_field') or '(none)'}")
    print(f"   epic_default={cfg.get('epic_default') or '(none)'} epic_link_field={cfg.get('epic_link_field')} "
          f"components={cfg.get('components') or '(none)'}")
    print()

    if not args.push:
        outdir = args.out or os.path.join(repo, "docs", "assessments", args.task, "build", "jira")
        os.makedirs(outdir, exist_ok=True)
        for f, meta, body in parsed:
            epic = epic_for(meta["id"], cfg)
            fields = build_fields(meta, body, cfg, epic)
            payload = {"fields": fields, "_epic_target": epic, "_depends_on": meta.get("depends_on", []),
                       "_jira_key_existente": meta.get("jira_key", None)}
            json.dump(payload, open(os.path.join(outdir, f"{meta['id']}.json"), "w", encoding="utf-8"),
                      ensure_ascii=False, indent=2)
            sp = fields.get(cfg.get("story_points_field") or "", "-")
            print(f"  {meta['id']:8} SP={str(sp):>3}  epic={epic or '-':16} labels={','.join(fields['labels'])}")
            print(f"           {fields['summary']}")
        print(f"\nPayloads escritos en: {outdir}")
        print("Revisa los .json. Para crear en Jira: rellena config.jira (base_url/project_key/story_points_field),")
        print("exporta JIRA_EMAIL y JIRA_API_TOKEN, y reejecuta con --push.")
        return

    # ---- PUSH ----
    for req_key in ("base_url", "project_key"):
        if not cfg.get(req_key):
            raise SystemExit(f"Falta config.jira.{req_key} en project-status.json")
    load_env_file(args.env_file or os.path.join(repo, ".jira.env"))
    email, token = os.environ.get("JIRA_EMAIL"), os.environ.get("JIRA_API_TOKEN")
    if not (email and token):
        raise SystemExit("Faltan credenciales: define JIRA_EMAIL y JIRA_API_TOKEN (en el entorno o en .jira.env)")
    jira = Jira(cfg["base_url"], email, token, int(cfg.get("api_version", 3)))

    # resuelve nombre->id de campos si el usuario puso el NOMBRE (p.ej. "Story Points") en vez del id
    cfg["story_points_field"] = jira.field_id(cfg.get("story_points_field"))
    if cfg.get("epic_link_field") and cfg["epic_link_field"] != "parent":
        cfg["epic_link_field"] = jira.field_id(cfg["epic_link_field"])

    epic_cache, keymap = {}, {}
    # 1) crear/actualizar issues
    for f, meta, body in parsed:
        epic = epic_for(meta["id"], cfg)
        fields = build_fields(meta, body, cfg, epic)
        if epic and epic != TRANSVERSAL:
            if epic not in epic_cache:
                ek = jira.search_epic(cfg["project_key"], epic)
                if not ek:
                    raise SystemExit(f"No encontré el Epic '{epic}' en el proyecto {cfg['project_key']}")
                epic_cache[epic] = ek
            elf = cfg.get("epic_link_field", "parent")
            if elf == "parent":
                fields["parent"] = {"key": epic_cache[epic]}
            else:
                fields[elf] = epic_cache[epic]
        existing = meta.get("jira_key")
        if existing:
            key = jira.update(existing, fields)
            print(f"  ~ {meta['id']} -> {key} (actualizado)")
        else:
            key = jira.create(fields)
            write_jira_key(f, key)
            print(f"  + {meta['id']} -> {key} (creado)")
        keymap[meta["id"]] = key

    # 2) enlaces de dependencia (X bloquea a la tarea que depende de X); idempotente
    lt = cfg.get("link_type", "Blocks")
    link_cache = {}
    for f, meta, body in parsed:
        if meta["id"] not in keymap:
            continue
        bk = keymap[meta["id"]]
        for dep in meta.get("depends_on", []):
            if dep not in keymap:
                continue
            if bk not in link_cache:
                link_cache[bk] = jira.blockers_of(bk, lt)
            if keymap[dep] in link_cache[bk]:
                print(f"  = {dep} blocks {meta['id']} (ya existe)")
                continue
            jira.link_blocks(keymap[dep], bk, lt)
            link_cache[bk].add(keymap[dep])
            print(f"  + link {dep} blocks {meta['id']}")
    print("\nHecho.")


if __name__ == "__main__":
    main()
