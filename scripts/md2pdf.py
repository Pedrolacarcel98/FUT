#!/usr/bin/env python3
"""
Markdown to PDF generator
Pipeline: Mermaid→PNG (mmdc) → Markdown+PNG → PDF (md-to-pdf)
All files in same temp dir so relative image paths resolve correctly.

The project name shown in the page header is read from project-status.json
(key: project_name); it is never hardcoded.
"""

import sys
import os
import re
import json
import subprocess
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from projectroot import find_project_root


def project_name():
    """Read project_name from project-status.json; fall back to the repo folder name."""
    root = find_project_root(__file__, required=False)
    if not root:
        return os.path.basename(os.getcwd())
    status = os.path.join(root, 'project-status.json')
    try:
        with open(status, 'r', encoding='utf-8') as f:
            name = json.load(f).get('project_name')
        if name:
            return name
    except (OSError, ValueError):
        pass
    return os.path.basename(root)

CSS_STYLE = """
body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
}
h1 { font-size: 20pt; color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; margin-top: 40px; page-break-before: always; }
h1:first-of-type { page-break-before: avoid; }
h2 { font-size: 15pt; color: #1e3a5f; margin-top: 28px; }
h3 { font-size: 12pt; color: #334155; margin-top: 20px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
th { background-color: #1e40af; color: white; padding: 8px 12px; text-align: left; }
td { padding: 6px 12px; border-bottom: 1px solid #e2e8f0; }
tr:nth-child(even) { background-color: #f8fafc; }
code { background-color: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 9.5pt; }
pre { background-color: #f1f5f9; padding: 12px; border-radius: 5px; border-left: 3px solid #3b82f6; font-size: 9pt; }
blockquote { border-left: 4px solid #f59e0b; background-color: #fffbeb; padding: 10px 15px; margin: 12px 0; }
img { max-width: 100%; height: auto; display: block; margin: 12px auto; }
"""


def extract_metadata(content):
    meta = {}
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        for line in match.group(1).split('\n'):
            if ':' in line and not line.strip().startswith('-') and not line.strip().startswith('#'):
                key, _, value = line.partition(':')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if value:
                    meta[key] = value
    return meta


def strip_yaml(content):
    return re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, count=1, flags=re.DOTALL)


def make_cover(meta):
    title = meta.get('title', 'Document')
    subtitle = meta.get('subtitle', '')
    author = meta.get('author', '')
    date = meta.get('date', '')
    version = meta.get('version', '')
    classification = meta.get('classification', '')

    html = f'<div style="text-align:center;padding-top:200px;page-break-after:always;">\n'
    html += f'<h1 style="font-size:28pt;color:#1e40af;border:none;page-break-before:avoid;">{title}</h1>\n'
    if subtitle:
        html += f'<p style="font-size:16pt;color:#475569;">{subtitle}</p>\n'
    html += '<div style="margin-top:80px;font-size:11pt;color:#64748b;line-height:2.2;">\n'
    if author:
        html += f'<strong>Author:</strong> {author}<br/>\n'
    if date:
        html += f'<strong>Date:</strong> {date}<br/>\n'
    if version:
        html += f'<strong>Version:</strong> {version}<br/>\n'
    if classification:
        html += f'<strong>Classification:</strong> {classification}<br/>\n'
    html += '</div>\n</div>\n\n'
    return html


def render_mermaid_to_png(content, work_dir, mmdc_cmd):
    counter = [0]
    ok = [0]

    def replace(m):
        counter[0] += 1
        n = counter[0]
        mmd = os.path.join(work_dir, f'd{n}.mmd')
        png = os.path.join(work_dir, f'd{n}.png')

        with open(mmd, 'w', encoding='utf-8') as f:
            f.write(m.group(1))

        try:
            subprocess.run(
                [mmdc_cmd, '-i', mmd, '-o', png, '-b', 'white', '-s', '2', '-w', '1200'],
                capture_output=True, text=True, shell=(os.name == 'nt'), timeout=60
            )
            if os.path.exists(png) and os.path.getsize(png) > 100:
                ok[0] += 1
                print(f'  OK: d{n}.png ({os.path.getsize(png)//1024} KB)')
                return f'\n![Diagram {n}](d{n}.png)\n'
        except Exception as e:
            print(f'  FAIL d{n}: {e}')

        print(f'  FAIL: d{n}.png')
        return f'\n> **[Diagram {n}]** _(rendering failed)_\n'

    result = re.sub(r'```mermaid\s*\n(.*?)```', replace, content, flags=re.DOTALL)
    print(f'  Diagrams: {ok[0]}/{counter[0]} rendered')
    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: python md2pdf.py <input.md> [output.pdf]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.md', '.pdf')

    if not os.path.exists(input_file):
        print(f"ERROR: File not found: {input_file}")
        sys.exit(1)

    md_to_pdf = shutil.which('md-to-pdf') or shutil.which('md-to-pdf.cmd')
    mmdc = shutil.which('mmdc') or shutil.which('mmdc.cmd')

    if not md_to_pdf:
        print("ERROR: md-to-pdf not found. Install with: npm install -g md-to-pdf")
        sys.exit(1)

    project = project_name()

    print(f"=== {project} PDF Generator ===")
    print(f"Input:  {input_file}")
    print(f"Output: {output_file}")

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    meta = extract_metadata(content)
    print(f"Title:  {meta.get('title', 'N/A')}")

    work_dir = tempfile.mkdtemp(prefix='md2pdf_')

    try:
        # 1. Strip YAML, add cover
        body = strip_yaml(content)
        body = make_cover(meta) + body

        # 2. Render Mermaid → PNG in work_dir
        print("\n[1/3] Rendering Mermaid diagrams...")
        if mmdc:
            body = render_mermaid_to_png(body, work_dir, mmdc)
        else:
            print("  WARNING: mmdc not found, diagrams will be plain text")

        # 3. Write markdown with md-to-pdf front matter (same dir as PNGs)
        print("\n[2/3] Preparing document...")
        title_escaped = meta.get('title', '').replace("'", "\\'")
        project_escaped = project.replace("'", "\\'")
        md_content = f"""---
pdf_options:
  format: A4
  margin:
    top: "2cm"
    bottom: "2cm"
    left: "2.5cm"
    right: "2.5cm"
  displayHeaderFooter: true
  headerTemplate: '<div style="font-size:9px;width:100%;padding:0 2.5cm;"><span>{project_escaped}</span><span style="float:right;">{title_escaped}</span></div>'
  footerTemplate: '<div style="font-size:9px;width:100%;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
css: |-
{chr(10).join('  ' + line for line in CSS_STYLE.split(chr(10)))}
---

{body}
"""
        md_file = os.path.join(work_dir, 'doc.md')
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(md_content)

        # 4. Generate PDF (cwd = work_dir so relative image paths resolve)
        print("\n[3/3] Generating PDF...")
        result = subprocess.run(
            [md_to_pdf, 'doc.md'],
            capture_output=True, text=True, shell=(os.name == 'nt'),
            timeout=180, cwd=work_dir
        )

        pdf_in_work = os.path.join(work_dir, 'doc.pdf')
        abs_output = os.path.abspath(output_file)

        if os.path.exists(pdf_in_work):
            shutil.copy2(pdf_in_work, abs_output)
            size_kb = os.path.getsize(abs_output) // 1024
            print(f"\n=== Done ===")
            print(f"PDF: {output_file} ({size_kb} KB)")
        else:
            print(f"\nERROR: PDF not generated")
            if result.stderr:
                print(f"stderr: {result.stderr[:500]}")
            sys.exit(1)

    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


if __name__ == '__main__':
    main()
