"""Post-scaffold setup script.

Installs Python dependencies needed by the project agents (PDF reading, etc.).
Run automatically after scaffolding or manually: python scripts/setup-project.py
"""

import subprocess
import sys


def main():
    deps = [
        "pymupdf",  # PDF text extraction (fitz)
    ]

    print("=== Installing project dependencies ===")
    for dep in deps:
        print(f"  Installing {dep}...")
        try:
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "--quiet", dep],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            print(f"  OK: {dep}")
        except subprocess.CalledProcessError:
            print(f"  WARN: Failed to install {dep}, PDF extraction may not work")

    print("Setup complete.")


if __name__ == "__main__":
    main()
