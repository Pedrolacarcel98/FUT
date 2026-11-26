#!/usr/bin/env python3
"""Resolución de la raíz del proyecto, robusta ante instalación como submódulo.

Por qué existe: los scripts no pueden asumir que la raíz del proyecto es la
carpeta padre de `scripts/`. Cuando el sistema se consume como submódulo, esa
suposición apunta al submódulo y los scripts recorren un árbol `docs/` vacío
—procesando cero ficheros y reportando éxito, que es el peor modo de fallo.

Orden de resolución:
  1. La variable de entorno AIDOC_PROJECT_ROOT, si está definida.
  2. Subiendo desde el directorio de trabajo actual.
  3. Subiendo desde la ubicación del script (caso standalone/vendored).

Si ninguna encuentra el marcador, se aborta con un mensaje explícito. Nunca se
devuelve una raíz "a la esperanza".
"""

import os
import sys

#: Marcador que identifica la raíz de un proyecto instanciado.
MARKER = "project-status.json"

#: Marcador alternativo, para proyectos que aún no tienen project-status.json.
FALLBACK_MARKER = ".babel-config.json"


def _walk_up(start):
    """Sube desde `start` buscando un marcador. Devuelve la ruta o None."""
    current = os.path.abspath(start)
    if os.path.isfile(current):
        current = os.path.dirname(current)
    while True:
        for marker in (MARKER, FALLBACK_MARKER):
            if os.path.isfile(os.path.join(current, marker)):
                return current
        parent = os.path.dirname(current)
        if parent == current:          # llegamos a la raíz del sistema de ficheros
            return None
        current = parent


def find_project_root(script_file=None, required=True):
    """Devuelve la raíz del proyecto.

    `script_file`: pasa `__file__` del script que llama, para el fallback
    standalone. `required=False` devuelve None en vez de abortar.
    """
    env = os.environ.get("AIDOC_PROJECT_ROOT")
    if env:
        root = os.path.abspath(os.path.expanduser(env))
        if not os.path.isdir(root):
            raise SystemExit(
                f"ERROR: AIDOC_PROJECT_ROOT apunta a algo que no es un directorio:\n"
                f"       {root}"
            )
        return root

    candidates = [os.getcwd()]
    if script_file:
        candidates.append(os.path.dirname(os.path.abspath(script_file)))

    for candidate in candidates:
        root = _walk_up(candidate)
        if root:
            return root

    if not required:
        return None

    raise SystemExit(
        f"ERROR: no encuentro la raíz del proyecto.\n"
        f"       Buscaba '{MARKER}' (o '{FALLBACK_MARKER}') subiendo desde:\n"
        + "".join(f"         - {c}\n" for c in candidates)
        + f"       Ejecuta el script desde la raíz del proyecto, o define\n"
        f"       AIDOC_PROJECT_ROOT con la ruta correcta."
    )


def docs_dir(root=None, script_file=None):
    """Devuelve la carpeta `docs/` del proyecto, comprobando que existe."""
    root = root or find_project_root(script_file)
    path = os.path.join(root, "docs")
    if not os.path.isdir(path):
        raise SystemExit(
            f"ERROR: no existe '{path}'.\n"
            f"       Raíz de proyecto detectada: {root}\n"
            f"       ¿Es el proyecto correcto? ¿Falta instanciar el árbol docs/?"
        )
    return path


def bootstrap_import():
    """Añade el directorio de este módulo a sys.path.

    Para que un script hermano pueda hacer `from projectroot import ...`
    sea cual sea el directorio de trabajo desde el que se lo invoque.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    if here not in sys.path:
        sys.path.insert(0, here)


if __name__ == "__main__":
    print(find_project_root())
