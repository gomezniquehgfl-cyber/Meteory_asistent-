#!/usr/bin/env python3
"""
Meteory Wake Word Detector
Detecta "Meteory" y "Hey Meteory" de forma 100% local y offline.
Sin cuentas, sin API keys, sin internet.
"""

import os
import sys
import time
from pathlib import Path

try:
    import lwake
except ImportError:
    print("Error: local-wake no está instalado.")
    print("Ejecuta: pip install -r requirements.txt")
    sys.exit(1)

# Carpetas de referencia
BASE_DIR = Path(__file__).parent.resolve()
REF_DIR = BASE_DIR / "ref"
METEORY_DIR = REF_DIR / "meteory"
HEY_METEORY_DIR = REF_DIR / "hey_meteory"

def ensure_dirs():
    METEORY_DIR.mkdir(parents=True, exist_ok=True)
    HEY_METEORY_DIR.mkdir(parents=True, exist_ok=True)

def count_samples(folder: Path) -> int:
    return len(list(folder.glob("*.wav")))

def record_samples(phrase: str, folder: Path, count: int = 4):
    """Graba muestras de referencia de la palabra."""
    print(f"\n=== Grabando muestras de '{phrase}' ===")
    print(f"Vas a grabar {count} muestras. Habla claro y cerca del micrófono.")
    print("Pulsa ENTER cuando estés listo para cada grabación...\n")

    for i in range(1, count + 1):
        input(f"[{i}/{count}] Pulsa ENTER y di claramente: «{phrase}»")
        filename = folder / f"sample_{i}.wav"
        print("Grabando 2.5 segundos...")
        try:
            lwake.record(str(filename), duration=2.5, trim_silence=True)
            print(f"  → Guardado: {filename.name}")
        except Exception as e:
            print(f"  Error al grabar: {e}")
            return False
        time.sleep(0.5)

    print(f"\n¡Listo! {count} muestras de '{phrase}' guardadas.\n")
    return True

def setup():
    """Modo de configuración: grabar muestras."""
    ensure_dirs()
    print("=" * 50)
    print("  CONFIGURACIÓN DE METEORY WAKE WORD")
    print("=" * 50)
    print("\nNecesitas grabar algunas muestras de tu voz.")
    print("Esto se hace solo una vez.\n")

    # Meteory
    if count_samples(METEORY_DIR) < 3:
        record_samples("Meteory", METEORY_DIR, count=4)
    else:
        print(f"Ya tienes {count_samples(METEORY_DIR)} muestras de 'Meteory'.")
        if input("¿Quieres volver a grabarlas? (s/n): ").lower().startswith("s"):
            for f in METEORY_DIR.glob("*.wav"):
                f.unlink()
            record_samples("Meteory", METEORY_DIR, count=4)

    # Hey Meteory
    if count_samples(HEY_METEORY_DIR) < 3:
        record_samples("Hey Meteory", HEY_METEORY_DIR, count=4)
    else:
        print(f"Ya tienes {count_samples(HEY_METEORY_DIR)} muestras de 'Hey Meteory'.")
        if input("¿Quieres volver a grabarlas? (s/n): ").lower().startswith("s"):
            for f in HEY_METEORY_DIR.glob("*.wav"):
                f.unlink()
            record_samples("Hey Meteory", HEY_METEORY_DIR, count=4)

    print("\nConfiguración terminada.")
    print("Ahora puedes ejecutar el detector con:")
    print("  python meteory_wake.py")
    print()

def on_detection(detection, stream):
    """Callback cuando se detecta la palabra."""
    word = detection.get("wakeword", "desconocido")
    # Extraemos el nombre limpio
    if "hey_meteory" in word.lower() or "hey" in word.lower():
        print("\n>>> ¡HEY METEORY detectado! <<<\n")
    else:
        print("\n>>> ¡METEORY detectado! <<<\n")
    # Aquí puedes poner lo que quieras que se active
    # Ejemplo: abrir una app, enviar señal, etc.
    # import subprocess
    # subprocess.Popen(["notify-send", "Meteory", "Activado"])

def listen():
    """Modo de escucha continua."""
    ensure_dirs()

    meteory_count = count_samples(METEORY_DIR)
    hey_count = count_samples(HEY_METEORY_DIR)

    if meteory_count < 2 and hey_count < 2:
        print("No hay suficientes muestras grabadas.")
        print("Ejecuta primero: python meteory_wake.py --setup")
        sys.exit(1)

    print("=" * 50)
    print("  METEORY WAKE WORD — ESCUCHANDO")
    print("=" * 50)
    print(f"Muestras 'Meteory'     : {meteory_count}")
    print(f"Muestras 'Hey Meteory' : {hey_count}")
    print("\nDi «Meteory» o «Hey Meteory»...")
    print("Pulsa Ctrl+C para salir.\n")

    # Usamos la carpeta ref completa (detecta cualquiera de las dos)
    # threshold más bajo = más sensible (0.05 - 0.25 típico)
    threshold = 0.12

    try:
        lwake.listen(
            str(REF_DIR),
            threshold=threshold,
            method="embedding",
            callback=on_detection
        )
    except KeyboardInterrupt:
        print("\nDetenido por el usuario.")
    except Exception as e:
        print(f"Error: {e}")
        print("\nConsejo: prueba bajar o subir el threshold en el código (línea threshold = 0.12)")

def main():
    if len(sys.argv) > 1 and sys.argv[1] in ("--setup", "-s", "setup"):
        setup()
    else:
        listen()

if __name__ == "__main__":
    main()
