#!/bin/bash
# Generate PDF from markdown with Mermaid diagrams
# Usage: ./scripts/generate-pdf.sh docs/generated/my-document.md

set -e

INPUT="$1"
if [ -z "$INPUT" ]; then
    echo "Usage: $0 <input.md> [output.pdf]"
    echo "Example: $0 docs/generated/documento-funcional.md"
    exit 1
fi

OUTPUT="${2:-${INPUT%.md}.pdf}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== PDF Generator ==="
echo "Input:  $INPUT"
echo "Output: $OUTPUT"

# Check tools
for tool in pandoc; do
    if ! command -v $tool &> /dev/null; then
        echo "ERROR: $tool not found. Run: powershell scripts/setup-pdf-tools.ps1"
        exit 1
    fi
done

# Check for mermaid-filter or mmdc
HAS_MERMAID_FILTER=false
HAS_MMDC=false
if python -c "import pandoc_mermaid_filter" 2>/dev/null; then
    HAS_MERMAID_FILTER=true
elif command -v mmdc &> /dev/null; then
    HAS_MMDC=true
fi

# Pre-process: render mermaid blocks to images if mmdc available but no filter
PROCESSED_INPUT="$INPUT"
if [ "$HAS_MMDC" = true ] && [ "$HAS_MERMAID_FILTER" = false ]; then
    echo "Pre-processing Mermaid diagrams with mmdc..."
    TEMP_DIR=$(mktemp -d)
    PROCESSED_INPUT="$TEMP_DIR/processed.md"

    # Extract and render mermaid blocks
    python3 -c "
import re, subprocess, os, sys

input_file = sys.argv[1]
output_file = sys.argv[2]
temp_dir = sys.argv[3]

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

counter = 0
def replace_mermaid(match):
    global counter
    counter += 1
    mermaid_code = match.group(1)
    mmd_file = os.path.join(temp_dir, f'diagram_{counter}.mmd')
    svg_file = os.path.join(temp_dir, f'diagram_{counter}.svg')

    with open(mmd_file, 'w', encoding='utf-8') as f:
        f.write(mermaid_code)

    try:
        subprocess.run(['mmdc', '-i', mmd_file, '-o', svg_file, '-b', 'transparent'],
                      capture_output=True, timeout=30)
        if os.path.exists(svg_file):
            return f'![Diagram {counter}]({svg_file})'
    except:
        pass

    return match.group(0)  # Keep original if rendering fails

result = re.sub(r'\`\`\`mermaid\n(.*?)\`\`\`', replace_mermaid, content, flags=re.DOTALL)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(result)

print(f'Rendered {counter} diagrams')
" "$INPUT" "$PROCESSED_INPUT" "$TEMP_DIR"
fi

# Build pandoc command
PANDOC_ARGS=(
    "$PROCESSED_INPUT"
    "-o" "$OUTPUT"
    "--toc"
    "--number-sections"
    "-V" "geometry:margin=2.5cm"
    "-V" "fontsize=11pt"
    "-V" "documentclass=article"
    "-V" "lang=es"
    "--highlight-style=tango"
)

# Add mermaid filter if available
if [ "$HAS_MERMAID_FILTER" = true ]; then
    PANDOC_ARGS+=("--filter" "mermaid-filter")
fi

# Try xelatex first (better unicode), fall back to pdflatex
if command -v xelatex &> /dev/null; then
    PANDOC_ARGS+=("--pdf-engine=xelatex")
    PANDOC_ARGS+=("-V" "mainfont=DejaVu Sans")
elif command -v pdflatex &> /dev/null; then
    PANDOC_ARGS+=("--pdf-engine=pdflatex")
    PANDOC_ARGS+=("-V" "inputenc=utf8")
else
    echo "ERROR: No LaTeX engine found. Run: powershell scripts/setup-pdf-tools.ps1"
    exit 1
fi

echo "Running pandoc..."
pandoc "${PANDOC_ARGS[@]}"

# Cleanup temp files
if [ -d "${TEMP_DIR:-}" ]; then
    rm -rf "$TEMP_DIR"
fi

echo "Done: $OUTPUT"
