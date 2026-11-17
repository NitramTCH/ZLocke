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

Las pruebas verifican búsqueda con ratón y teclado, selección libre de movimientos, tipos incompletos, ajustes manuales, PS rápidos, persistencia, migración local/JSON y exportación v4. Playwright arranca su propio servidor en el puerto 5174.

El workflow existente `.github/workflows/pages.yml` se conserva: prueba, compila con `--base=/ZLocke/` y publica desde `work` en GitHub Pages. La activación y el estado del despliegue se consultan en GitHub Actions / Settings → Pages.

## Uso

- **Equipo:** añade hasta seis Pokémon y edita todos sus datos. Busca la especie y selecciónala para aplicar sus tipos. Especie y apodo son independientes; las formas no incluidas se escriben manualmente con sus tipos.
- **Movimientos:** abre una fila, busca por nombre español (con o sin tildes) o escribe sus datos manualmente. Cualquier especie admite cualquier movimiento. Seleccionar un resultado rellena tipo, categoría, potencia, precisión y prioridad disponibles; todos se pueden ajustar para juegos modificados. Una edición manual se identifica y conserva la procedencia del catálogo.
- **Combate:** selecciona el activo, actualiza PS y velocidad real, registra especie, tipos y movimientos revelados del rival y consulta las comparaciones. Los demás datos rivales se despliegan cuando hagan falta.
- **Tipos:** «Sin segundo tipo» significa monotipo confirmado. «Segundo tipo desconocido» significa incompleto: no se muestra una efectividad exacta ni un STAB exacto dependiente de esos datos. También se pueden desmarcar los tipos como no confirmados.
- **Demostración:** datos ficticios, identificados y editables; no son sets habituales de ninguna especie. Cargarla requiere confirmar el reemplazo de la partida.

## Daño de referencia: generación IX

Perfil explícito **«Reglas estándar de generación IX»**, visible junto a los resultados de Combate. Es una referencia para individuales, **no garantiza compatibilidad con fangames**. Calcula cada movimiento del activo contra el rival y cada movimiento rival contra el activo. No cambia PS ni ordena movimientos por conveniencia.

- Daño directo simple de un impacto y potencia fija: nivel atacante, Ataque/Defensa para físico o At. especial/Def. especial para especial, etapas −6…+6, STAB 1,5×, tipos defensivos e inmunidades, quemadura física y 16 tiradas enteras 85…100. Estadísticas reales antes de aplicar etapas; nunca se buscan estadísticas por especie ni se reconstruyen IV/EV.
- Min/máx en PS; porcentaje solo si se conocen los PS máximos defensores. Con PS actuales se indica si garantiza debilitar, puede hacerlo o no lo hace **en ese escenario, condicionado a acertar**. Sin esos PS, el daño sigue siendo calculable. Defensor a 0 PS se identifica como ya debilitado.
- Cada resultado declara que es condicionado. Habilidad/objeto distinguen desconocido, ausencia confirmada y dato indicado. Solo se aplican los efectos compatibles, identificados por ID y con activación confirmada cuando corresponde; los demás se omiten con una advertencia junto al resultado. La ausencia/anulación confirmada la declara el usuario; no se infiere de un campo vacío ni de un texto como «ninguno».
- Precisión se muestra por separado, sin multiplicarla por el daño ni inventar probabilidades de KO. No se aplican cambios de precisión/evasión, habilidades o clima a ese dato de referencia.
- Se necesita nivel atacante y solo la pareja de estadísticas/etapas que usa el movimiento; ni nivel defensor, ni velocidad ni estadísticas de la otra categoría bloquean el cálculo. Quemadura desconocida bloquea físico, pero no especial; Agallas puede necesitar confirmar parálisis. La inmunidad por tipos del escenario permite devolver 0 sin pedir nivel, STAB o estadísticas irrelevantes.
- «No calculable» enumera los datos o mecánicas que faltan. Estado, daño fijo/proporcional/de respuesta, KO directo y potencia variable no se convierten en ataques ordinarios.
- Una lista conservadora de ataques simples (`SIMPLE_MOVE_IDS` en `src/catalog.ts`) se habilita al seleccionarlos del catálogo. Los demás quedan fuera del alcance hasta verificarlos; no se decide la mecánica por un nombre escrito a mano. Para un movimiento manual/modificado, confirma explícitamente **«daño directo simple, un impacto»**. Cambiar su nombre vuelve a marcar su comportamiento sin verificar. Ajustes de potencia, tipo y categoría se respetan; cambiar la potencia de un movimiento especial no lo convierte automáticamente en simple.
- Límites validados del motor: nivel 1–100, estadísticas reales 1–999 y potencia 1–250. Se rechazan resultados fuera de 16 bits en lugar de simular desbordamientos del juego. La edición conserva valores mayores para no perder guardados, pero no se calcula fuera de este alcance.

**Escenario y exclusiones:** sin crítico, clima, terreno, pantallas, protección, teracristalización ni otros efectos. No se simulan habilidades/objetos ajenos a la lista compatible, impactos múltiples, estadísticas alternativas usadas por ciertos movimientos (Plancha Corporal, Juego Sucio, etc.), efectos de movimientos que ignoran etapas, críticos garantizados, tipos/potencias dinámicos e inmunidades especiales fuera de la lista, efectos al entrar al campo ni efectos secundarios/posteriores al golpe (retroceso, drenaje, cambios de estadísticas, estados…). Los cambios defensivos conservan el factor de tipos y añaden referencias separadas del motor con sus condiciones. La velocidad efectiva se calcula por separado con etapas, parálisis y efectos compatibles; la prioridad se compara entre dos movimientos elegidos, sin automatizar estrategia.

### Motor de producción y efectos

Se ha integrado **@smogon/calc 0.12.0 en producción**, sustituyendo la fórmula propia por un adaptador de estadísticas finales y clonación aislado. No se reconstruyen IV/EV ni se toman estadísticas de la especie. El alcance de movimientos se conserva.

Consulta [la lista exacta de efectos compatibles, fuentes, activaciones y limitaciones](docs/EFFECTS.md): **19 habilidades y 9 objetos** aplicados al daño, inmunidades y/o velocidad. Los buscadores contienen 314 habilidades y 2218 objetos españoles con ID estable; el resto de efectos se identifica como no implementado. La velocidad efectiva incorpora etapas, parálisis y efectos compatibles; el orden compara la prioridad conocida de dos movimientos y enumera excepciones.

### Cómo probar el daño

1. Carga la demostración (reemplaza tras confirmar). Sus cifras son ficticias y explícitas. Rayo contra Agua/Tierra muestra 0 PS; Surf y Puño Hielo muestran rangos; Protección aparece «No calculable». Hay movimientos rivales para comprobar el sentido inverso.
2. En Equipo, cambia una potencia fija de un ataque simple. En Combate comprueba que cambia el rango sin modificar los PS guardados.
3. En «Etapas y quemadura», modifica el Ataque y marca quemadura: cambia daño físico; el especial no depende de esas dos entradas.
4. Vacía la Defensa rival: solo se bloquean tus movimientos físicos. Vacía PS máximos: desaparece el porcentaje, no el rango.
5. Cambia habilidad/objeto entre desconocido, ausencia confirmada e indicado: las condiciones se actualizan y los compatibles se aplican y los desconocidos/no implementados se omiten con una advertencia.

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

El almacenamiento conserva la clave `zlocke-session-v1` para encontrar partidas existentes, pero escribe **JSON versión 4**. Se aceptan importaciones v1, v2, v3 y v4, hasta 1 MB; se validan antes de reemplazar la partida. Las versiones posteriores se rechazan.

La migración v1 conserva equipo, rival, apodos, PS, estadísticas, habilidades, objetos y movimientos. No deduce especie por apodo ni rellena metadatos de movimientos por nombre. El antiguo selector «Ninguno / desconocido» se migra siempre a segundo tipo desconocido, incluso si se había marcado la combinación como confirmada. Dos tipos explícitos conservan su estado de confirmación. Los nuevos metadatos quedan desconocidos. Antes de migrar un guardado local se guarda una copia del original en `zlocke-session-v1-backup` si aún no existe. Si el guardado no se puede leer o respaldar, se detiene la escritura automática para no sobrescribirlo.

La migración de v1/v2 a v3 añade el perfil de referencia explícito, pero **no inventa etapas, quemadura, habilidad/objeto ausentes ni comportamiento de movimientos**: quedan desconocidos/sin verificar hasta confirmación. Los nombres y todos los valores antiguos permanecen. Antes de escribir v3 se conserva además `zlocke-session-v1-backup-v1` o `zlocke-session-v1-backup-v2` según la versión original, sin reemplazar respaldos anteriores. Las partidas nuevas muestran etapas 0 explícitas; las migradas de v1/v2 muestran ?. Los guardados v3 mantienen sus etapas.

La migración v3 → v4 conserva habilidad/objeto escritos y sus estados, pero deja los IDs nulos (contenido manual no verificado) y activaciones desconocidas. No deduce identidad por el nombre: vuelve a elegir del buscador para habilitar su efecto. Parálisis queda desconocida, salvo con quemadura confirmada (no pueden coexistir ambos estados mayores). Se conserva `zlocke-session-v1-backup-v3`, además de los respaldos anteriores. Se valida la correspondencia ID/nombre de los registros v4. Los estados y activaciones elegidos se incluyen en exportaciones.

No hay cuentas ni sincronización. Exporta respaldos: borrar los datos del navegador elimina la partida. Al cambiar de origen web (por ejemplo, del servidor de desarrollo a GitHub Pages) debes exportar/importar JSON. Las fuentes tipográficas externas son opcionales; se usan fuentes de sistema si no cargan.

## Rigor y límites

- Tabla moderna de 18 tipos desde generación VI, con dobles tipos e inmunidades. STAB estándar 1,5×. El daño simple de generación IX se presenta separado de la comparación de tipos; no se recomienda una «mejor jugada».
- Estadísticas reales siempre manuales. Los campos vacíos son desconocidos. No se deducen estadísticas, habilidades ni movimientos por especie.
- La potencia fija y categoría manuales se usan en daño simple; precisión y prioridad siguen separadas. La velocidad incorpora el subconjunto documentado; el orden de actuación usa prioridad conocida y mantiene advertencias de excepciones.
- Estado y daño especial no se evalúan como ataques ordinarios. Para potencia variable solo se pueden consultar factores de tipo bajo los tipos nominales introducidos; la potencia y efectos no se resuelven.
- Los cambios defensivos solo comparan tipos, sin PS, defensas ni efectos al entrar al campo. No garantizan menos daño.
- PS coherentes y números enteros positivos (PS actuales permiten 0) hasta 99999. Potencia manual positiva, precisión 1–100 y prioridad −7 a +7. Al reducir PS máximos por debajo de los actuales, reduce primero los actuales.
- Pendientes: reglas por juego, daño completo, más efectos de movimientos, habilidades/objetos/estados, campo e integración externa.

## Estructura

- `src/battle.ts`: modelo, tabla, análisis de tipos, validación y migración, independiente de React.
- `src/damage.ts`, `src/calcAdapter.ts`: validación y adaptador del motor Smogon para estadísticas manuales.
- `src/effects.ts`, `src/speed.ts`, `docs/EFFECTS.md`: lista cerrada de efectos, activaciones, velocidad y limitaciones.
- `src/DamagePanel.tsx`, `src/BattleConditions.tsx`: resultados, omisiones y controles de etapas/quemadura.
- `src/catalog.ts`, `src/data/`, `scripts/build-catalog.py`: catálogo local versionado, búsqueda y selección.
- `src/Editor.tsx`, `src/Search.tsx`: edición y buscadores accesibles por teclado.
- `src/main.tsx`: vistas, persistencia e importación/exportación.
- `src/*.test.ts`, `tests/`: pruebas unitarias y de navegador con fixtures v1, v2 y v3.
- `src/style.css`: identidad original y controles adaptables a móvil.

## Ejemplos de habilidades y objetos

1. Con datos de daño y tipos confirmados, asigna **Levitación** al defensor desde el buscador: Tierra muestra 0 por efecto, aunque su factor por tipos sea 1×. Asigna **Rompemoldes** al atacante: esa inmunidad se ignora. Añade **Escudo Habilidad** activo al defensor: vuelve a protegerla.
2. Selecciona **Cinta Elección** y confirma activa: aumenta daño físico. Selecciona **Zoquete** en el mismo Pokémon: el objeto queda guardado, pero no se aplica.
3. Con velocidad de ficha 100, etapa +1 y sin parálisis, **Pañuelo Elección** activo da 225; con parálisis da 112 por el redondeo estándar. No cambies la ficha a 225: se aplicaría dos veces.
4. **Absorbe Fuego** mantiene la inmunidad defensiva, pero la potenciación ofensiva necesita activación explícita. **Liviano** requiere activación y sin objeto confirmado. Los cambios defensivos distinguen el activo de una entrada que reinicia etapas.
5. Escribe una habilidad de fangame manualmente: aparece «no implementado» y la referencia se identifica sin ese efecto. Recarga y exporta/importa para comprobar IDs y activaciones.
