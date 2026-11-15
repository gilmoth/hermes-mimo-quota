# MiMo Quota for Hermes Desktop

Panel visual para consultar la cuota oficial de Xiaomi MiMo TokenPlan desde Hermes Desktop.

## Funciones

- Gráfico circular del porcentaje de créditos consumidos.
- Créditos consumidos, restantes y totales.
- Tiempo transcurrido del periodo y fecha final en horario de Madrid.
- Estado de renovación automática y hora de la última lectura.
- Actualización cada 60 segundos mientras la página está abierta.
- Consulta desde el backend conectado, también con Desktop en Windows y Hermes por SSH en macOS.

Los créditos del TokenPlan no son tokens del modelo. Esta API no devuelve desglose por modelo ni una curva diaria. Los días restantes se redondean hacia arriba.

## Requisitos

- Hermes Agent 0.23 o posterior y Hermes Desktop con el SDK de plugins.
- TokenPlan individual y su clave dedicada `tp-`.
- Región AMS. El plugin consulta únicamente `https://token-plan-ams.xiaomimimo.com/v1/platform/token_plan`.

Probado manualmente en una instalación Hermes 0.23.1, con backend macOS y Desktop Windows. No se ha validado en todas las versiones ni regiones.

## Instalación

### Backend del agente

1. Guarda el paquete en `<HERMES_HOME>/plugins/mimo-quota/`.
2. Añade `MIMO_QUOTA_API_KEY` a la configuración de secretos `.env` del perfil correspondiente. No publiques ese archivo. Usa tu clave completa de TokenPlan como valor.
3. En macOS/Linux, restringe los permisos de ese `.env` a su propietario, por ejemplo `chmod 600 ~/.hermes/.env` para el perfil predeterminado.
4. Valida y activa el plugin.

```sh
hermes plugins doctor ~/.hermes/plugins/mimo-quota
hermes plugins enable mimo-quota
```

Para un perfil distinto, usa su propio directorio y los comandos `hermes -p NOMBRE_DEL_PERFIL ...`. Después reconecta o reinicia el backend utilizado por Desktop para montar la API.

### Interfaz Desktop

Copia o clona este repositorio en la máquina de Desktop. Para instalar únicamente la interfaz local desde el checkout:

```sh
python3 install_desktop.py
```

En Windows usa `python install_desktop.py`. Puedes indicar `--home RUTA` si utilizas un Hermes Home distinto. Este instalador no accede a claves ni a la red y guarda una copia si ya existe la interfaz.

Copia `desktop/plugin.js` en `<HERMES_HOME_DE_DESKTOP>/desktop-plugins/mimo-quota/plugin.js` de la máquina que ejecuta Desktop. Si el backend es remoto, esta parte se instala en el equipo cliente.

En Windows, el directorio habitual es `%LOCALAPPDATA%\hermes\desktop-plugins\mimo-quota\plugin.js`; confirma la ruta desde el gestor de plugins si utilizas otro Hermes Home.

Activa **MiMo · Cuota del plan** en el gestor de plugins y abre **MiMo · Cuota** desde la barra lateral o **Abrir cuota MiMo** desde la paleta de comandos.

La cuota representa toda la cuenta MiMo asociada a la clave, no solo el consumo de ese perfil ni el de Hermes.

### Desktop de Windows y de Mac con el mismo backend

Instala la interfaz en ambos equipos y conéctalos al mismo usuario/perfil del Mac. El backend y la clave de MiMo se configuran una sola vez en el Mac. Ambos Desktop consultan esa cuenta; sus cachés pueden diferir hasta un minuto.

## Privacidad y límites

- El código lee exclusivamente el secreto dedicado `MIMO_QUOTA_API_KEY` mediante el resolvedor de Hermes.
- No inspecciona conversaciones, bases de sesiones ni credenciales de otros proveedores.
- Solo realiza un GET HTTPS a la ruta AMS fija. No sigue redirecciones ni utiliza servicios intermediarios.
- La clave no se devuelve a Desktop. Los errores y cuerpos remotos no se reenvían a la interfaz.
- Caché en memoria de 60 segundos; ante un fallo muestra explícitamente la última lectura válida si existe.
- No registra herramientas, hooks, procesos en segundo plano ni llamadas a modelos.
- Es un plugin personal/comunitario, no un producto oficial de Xiaomi ni Nous Research. Los plugins de Hermes ejecutan código con los permisos de Hermes: estas limitaciones son propiedades del código, no una sandbox.

## Pruebas

```sh
python test_quota.py
```

Pruebas offline de cuotas coherentes, fechas UTC, caché, redacción de errores y rechazo de redirecciones. Usan dobles para FastAPI y Hermes; no sustituyen una comprobación dentro de una instalación real. No utilizan claves ni red.

## API utilizada

[Documentación oficial de consulta de créditos TokenPlan](https://mimo.mi.com/docs/en-US/api/asset/credits-get).

## Licencia

GPLv2, conservando la licencia elegida para este repositorio. No se incluyen claves, datos de cuenta, direcciones privadas ni instaladores personalizados.
