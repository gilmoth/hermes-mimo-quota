"""Install only the native Desktop UI from this checkout. No network or keys."""
import argparse
from datetime import datetime
import os
from pathlib import Path
import shutil


def install(home):
    source = Path(__file__).resolve().parent / "desktop" / "plugin.js"
    if not source.is_file():
        raise SystemExit("No se encuentra desktop/plugin.js en este checkout.")
    destination = home / "desktop-plugins" / "mimo-quota"
    if destination.is_symlink() or (home / "desktop-plugins").is_symlink():
        raise SystemExit("La ruta de destino es un enlace. Revisa tu Hermes Home.")
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / "plugin.js"
    if target.is_symlink():
        raise SystemExit("plugin.js es un enlace. No se ha modificado.")
    if target.exists():
        suffix = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
        shutil.copy2(target, destination / ("plugin.js.backup-" + suffix))
    temporary = destination / "plugin.js.installing"
    shutil.copyfile(source, temporary)
    temporary.replace(target)
    print("Interfaz instalada en " + str(target))
    print("Activa MiMo · Cuota del plan en el gestor de plugins de Hermes Desktop.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    fallback = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "hermes" if os.name == "nt" else Path.home() / ".hermes"
    parser.add_argument("--home", type=Path, default=Path(os.environ.get("HERMES_HOME", str(fallback))))
    install(parser.parse_args().home.expanduser().resolve())
