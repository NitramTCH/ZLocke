# ZLocke

**Menos azar. Más estrategia.** Asistente web en español para combates Pokémon individuales durante randomlockes, en aventura o contra amigos. React + TypeScript + Vite; funciona sin servidor ni integración con Pokelocke.

## Desarrollo y comprobaciones

Requiere Node.js 22.12+ (probado con 24) y npm.

```sh
npm ci
npm run dev
npm test          # Lógica, catálogo, validación y migración
npm run build    # TypeScript estricto y producción
npm run preview  # Servir dist después de compilar
```

Vite escucha en `0.0.0.0:5173`. La dirección local del servidor solo funciona en la máquina donde se ejecuta; no constituye una URL externa. Si la caché npm no es escribible: `npm ci --cache /workspace/.npm-cache`.

Pruebas de navegador, ordenador y móvil (390 px):

```sh
npx playwright install chromium
npm run test:e2e
# Alternativa si Chromium ya está instalado en el entorno:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Las pruebas verifican búsqueda con ratón y teclado, selección libre de movimientos, tipos incompletos, ajustes manuales, PS rápidos, persistencia, migración local/JSON y exportación v2. Playwright arranca su propio servidor en el puerto 5174.

El workflow existente `.github/workflows/pages.yml` se conserva: prueba, compila con `--base=/ZLocke/` y publica desde `work` en GitHub Pages. La activación y el estado del despliegue se consultan en GitHub Actions / Settings → Pages.

## Uso

- **Equipo:** añade hasta seis Pokémon y edita todos sus datos. Busca la especie y selecciónala para aplicar sus tipos. Especie y apodo son independientes; las formas no incluidas se escriben manualmente con sus tipos.
- **Movimientos:** abre una fila, busca por nombre español (con o sin tildes) o escribe sus datos manualmente. Cualquier especie admite cualquier movimiento. Seleccionar un resultado rellena tipo, categoría, potencia, precisión y prioridad disponibles; todos se pueden ajustar para juegos modificados. Una edición manual se identifica y conserva la procedencia del catálogo.
- **Combate:** selecciona el activo, actualiza PS y velocidad real, registra especie, tipos y movimientos revelados del rival y consulta las comparaciones. Los demás datos rivales se despliegan cuando hagan falta.
- **Tipos:** «Sin segundo tipo» significa monotipo confirmado. «Segundo tipo desconocido» significa incompleto: no se muestra una efectividad exacta ni un STAB exacto dependiente de esos datos. También se pueden desmarcar los tipos como no confirmados.
- **Demostración:** datos ficticios, identificados y editables; no son sets habituales de ninguna especie. Cargarla requiere confirmar el reemplazo de la partida.

## Catálogos y fuentes

Los JSON de `src/data/` se distribuyen con la aplicación: buscar no hace peticiones externas ni necesita credenciales. Fuente: [PokéAPI/pokeapi, revisión 89aa167e486774d10d1502ee60bce41dc35f04b2](https://github.com/PokeAPI/pokeapi/tree/89aa167e486774d10d1502ee60bce41dc35f04b2/data/v2/csv), instantánea incorporada el 17/11/2026. La versión se muestra en la interfaz y se registra al elegir un movimiento.

- **1025 especies por defecto:** `pokemon.csv`, `pokemon_species_names.csv` (idioma 7: español) y `pokemon_types.csv` (orden por slot). No incluye catálogo de formas alternativas/regionales; usa la entrada manual para ellas. Al elegir especie se aplican los tipos de su entrada por defecto, no los de una forma alternativa. No se cargan habilidades, sets, estadísticas base ni estadísticas reales.
- **920 movimientos con nombre español y uno de los 18 tipos:** `moves.csv` y `move_names.csv` (idioma 7). Incluye movimientos de varias generaciones y especiales; no afirma que estén disponibles en un juego concreto. Los nombres duplicados se distinguen por ID (por ejemplo, variantes físicas/especiales de movimientos Z).
- Se usa el estado actual de esos CSV fijados por SHA, **no una tabla histórica de un juego concreto**. Las diferencias entre juegos y ROM hacks deben ajustarse manualmente.
- `powerMode` distingue potencia numérica de catálogo, variable/condicionada, daño especial, estado y desconocida. No se transforma un valor vacío o centinela 1 en potencia fija 1. El generador documenta los movimientos de potencia condicionada que conservan un valor nominal en la fuente (Salpicar, Estallido, Dracoenergía, Poder Reserva, etc.). Los ataques Z sin potencia fija quedan variables. Los efectos de daño fijo, proporcional, respuesta o KO directo quedan especiales y no reciben un factor de efectividad/STAB ordinario en el análisis.
- Una precisión vacía se representa como «Especial / sin tirada estándar», sin inventar un porcentaje ni garantizar que acierte. El valor 0 de la fuente se deja desconocido. Una prioridad ausente en un guardado antiguo no se convierte en 0.
- El catálogo es una referencia: efectos adicionales, cambios de potencia por condiciones, tipos dinámicos (por ejemplo Poder Oculto/Meteorobola), precisión y prioridad **no se simulan**. Los valores numéricos de potencia son nominales; no garantizan potencia efectiva en todas las condiciones. Cambiar «Potencia manual (fija)» es una anulación explícita, no un cálculo.

Regeneración reproducible: `python3 scripts/build-catalog.py`. Descarga únicamente CSV de la revisión fijada por HTTPS; Python estándar. El build normal usa los JSON versionados y no descarga datos. Aviso y licencia BSD de la fuente en [src/data/POKEAPI-LICENSE.md](src/data/POKEAPI-LICENSE.md). Pokémon y sus nombres son marcas de Nintendo.

## Persistencia y migración

El almacenamiento conserva la clave `zlocke-session-v1` para encontrar partidas existentes, pero escribe **JSON versión 2**. Se aceptan importaciones v1 y v2, hasta 1 MB; se validan antes de reemplazar la partida. Las versiones posteriores se rechazan.

La migración v1 conserva equipo, rival, apodos, PS, estadísticas, habilidades, objetos y movimientos. No deduce especie por apodo ni rellena metadatos de movimientos por nombre. El antiguo selector «Ninguno / desconocido» se migra siempre a segundo tipo desconocido, incluso si se había marcado la combinación como confirmada. Dos tipos explícitos conservan su estado de confirmación. Los nuevos metadatos quedan desconocidos. Antes de migrar un guardado local se guarda una copia del original en `zlocke-session-v1-backup` si aún no existe. Si el guardado no se puede leer o respaldar, se detiene la escritura automática para no sobrescribirlo.

No hay cuentas ni sincronización. Exporta respaldos: borrar los datos del navegador elimina la partida. Al cambiar de origen web (por ejemplo, del servidor de desarrollo a GitHub Pages) debes exportar/importar JSON. Las fuentes tipográficas externas son opcionales; se usan fuentes de sistema si no cargan.

## Rigor y límites

- Tabla moderna de 18 tipos desde generación VI, con dobles tipos e inmunidades. STAB estándar 1,5×. No se calcula daño ni se recomienda una «mejor jugada».
- Estadísticas reales siempre manuales. Los campos vacíos son desconocidos. No se deducen estadísticas, habilidades ni movimientos por especie.
- Potencia, precisión y prioridad son datos consultables, no factores de cálculo. La comparación de velocidad ignora prioridad, estados, objetos, habilidades, cambios de estadísticas y campo, y lo advierte junto al resultado.
- Estado y daño especial no se evalúan como ataques ordinarios. Para potencia variable solo se pueden consultar factores de tipo bajo los tipos nominales introducidos; la potencia y efectos no se resuelven.
- Los cambios defensivos solo comparan tipos, sin PS, defensas ni efectos al entrar al campo. No garantizan menos daño.
- PS coherentes y números enteros positivos (PS actuales permiten 0) hasta 99999. Potencia manual positiva, precisión 1–100 y prioridad −7 a +7. Al reducir PS máximos por debajo de los actuales, reduce primero los actuales.
- Pendientes: reglas por juego, daño completo, efectos de movimientos, habilidades, objetos, estados, campo e integración externa.

## Estructura

- `src/battle.ts`: modelo, tabla, análisis de tipos, validación y migración, independiente de React.
- `src/catalog.ts`, `src/data/`, `scripts/build-catalog.py`: catálogo local versionado, búsqueda y selección.
- `src/Editor.tsx`, `src/Search.tsx`: edición y buscadores accesibles por teclado.
- `src/main.tsx`: vistas, persistencia e importación/exportación.
- `src/*.test.ts`, `tests/`: pruebas unitarias y de navegador con fixture v1.
- `src/style.css`: identidad original y controles adaptables a móvil.
