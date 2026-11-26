# Setup PDF generation toolchain
# Run as: powershell -ExecutionPolicy Bypass -File scripts/setup-pdf-tools.ps1

Write-Host "=== PDF Toolchain Setup ===" -ForegroundColor Cyan

# 1. Check chocolatey
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Chocolatey not found. Install from https://chocolatey.org/install" -ForegroundColor Red
    Write-Host "Or install tools manually:" -ForegroundColor Yellow
    Write-Host "  - Pandoc: https://pandoc.org/installing.html"
    Write-Host "  - MiKTeX: https://miktex.org/download"
    Write-Host "  - Node.js: https://nodejs.org/"
    exit 1
}

# 2. Pandoc (markdown -> PDF converter)
Write-Host "`n[1/3] Installing Pandoc..." -ForegroundColor Green
choco install pandoc -y

# 3. MiKTeX (LaTeX engine for PDF rendering)
Write-Host "`n[2/3] Installing MiKTeX (LaTeX)..." -ForegroundColor Green
choco install miktex -y

# 4. Mermaid CLI (diagram rendering)
Write-Host "`n[3/3] Installing Mermaid CLI..." -ForegroundColor Green
npm install -g @mermaid-js/mermaid-cli

# 5. Verify
Write-Host "`n=== Verification ===" -ForegroundColor Cyan
$tools = @("pandoc", "xelatex", "mmdc")
foreach ($tool in $tools) {
    if (Get-Command $tool -ErrorAction SilentlyContinue) {
        $ver = & $tool --version 2>$null | Select-Object -First 1
        Write-Host "  OK: $tool ($ver)" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $tool" -ForegroundColor Red
    }
}

Write-Host "`nSetup complete. You can now generate PDFs with the doc-generator-agent." -ForegroundColor Cyan
