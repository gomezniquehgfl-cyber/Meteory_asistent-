# Meteory Wake Word

Detector de palabra de activación **100 % local y offline** para:

- **Meteory**
- **Hey Meteory**

Sin cuentas, sin API keys, sin internet, sin empresas.

---

## Instalación (una sola vez)

```bash
# 1. Entra en la carpeta
cd meteory-wake

# 2. (Recomendado) Crea un entorno virtual
python3 -m venv venv
source venv/bin/activate        # En Windows: venv\Scripts\activate

# 3. Instala las dependencias
pip install -r requirements.txt
```

> En Linux puede que necesites:
> ```bash
> sudo apt install libportaudio2 portaudio19-dev
> ```

---

## Uso

### 1. Grabar tus muestras (solo la primera vez)

```bash
python meteory_wake.py --setup
```

Te pedirá que digas **4 veces** “Meteory” y **4 veces** “Hey Meteory”.  
Habla claro y cerca del micrófono.

### 2. Activar el detector

```bash
python meteory_wake.py
```

Cuando digas la palabra verás:

```
>>> ¡METEORY detectado! <<<
```
o
```
>>> ¡HEY METEORY detectado! <<<
```

Pulsa `Ctrl+C` para parar.

---

## Personalizar qué hace al detectar

Abre `meteory_wake.py` y busca la función `on_detection`.  
Ahí puedes poner el código que quieras ejecutar (abrir una app, enviar un mensaje, etc.).

Ejemplo simple para Linux (notificación):

```python
import subprocess
subprocess.Popen(["notify-send", "Meteory", "¡Activado!"])
```

---

## Ajustar sensibilidad

Si detecta demasiado (falsos positivos) o demasiado poco:

Abre `meteory_wake.py` y cambia esta línea:

```python
threshold = 0.12
```

- Más **bajo** (ej. 0.08) → más sensible
- Más **alto** (ej. 0.18) → menos falsos positivos

---

## Notas

- Funciona mejor si las muestras se graban con el mismo micrófono que usarás después.
- Es especialmente bueno para uso personal (tu propia voz).
- Todo el audio se procesa en tu ordenador. Nada se envía a internet.

¡Listo!
