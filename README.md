# ZLocke

**Menos azar. Más estrategia.** Asistente web en español para combates Pokémon individuales de randomlockes, en aventura o contra amigos. React + TypeScript + Vite, sin servidor ni integración con Pokelocke.

## Desarrollo y comprobaciones

Node.js 22.12+ (probado con 24) y npm:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Si la caché npm no es escribible: `npm ci --cache /workspace/.npm-cache`. Vite escucha en `0.0.0.0:5173`; su dirección local no es una URL externa.

Navegador, ordenador y móvil (390 px):

```sh
npx playwright install chromium
npm run test:e2e
# Con Chromium ya instalado en el entorno:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

El workflow `.github/workflows/pages.yml` se conserva: prueba, compila con `--base=/ZLocke/` y publica desde `work`. El despliegue se consulta en GitHub Actions / Settings → Pages.

## Uso

- **Equipo:** hasta seis Pokémon; especie y apodo separados. Elegir especie completa tipos y muestra las seis bases, sin asignar habilidades ni movimientos. Formas no incluidas admiten entrada manual y bases personalizadas.
- **Manual / Calculado / Estimado:** modos explícitos por Pokémon, con valores manuales conservados aparte de naturaleza/IV/EV. Nuevos Pokémon parten de Estimado; los guardados antiguos permanecen en Manual. [Reglas, fórmulas, supuestos e intervalos](docs/STATS.md).
- **Movimientos:** buscador español sin restricciones por especie. Completa tipo, categoría, potencia, precisión y prioridad. La compatibilidad se reconoce automáticamente por ID y propiedades; los no implementados explican el motivo, sin pedir marcar una casilla técnica. Ajustes manuales de una base compatible se respetan.
- **Combate:** activo, rival, PS rápidos, efectos, predicción en ambos sentidos, comparación de tipos, velocidad efectiva/prioridad y referencias defensivas para cambios. Los datos revelados del rival se actualizan sin inferir sets por especie.
- **Tipos:** «Sin segundo tipo» confirma monotipo; «Segundo tipo desconocido» impide una efectividad exacta dependiente de él.
- **Demostración:** datos ficticios, identificados y editables, con confirmación antes de reemplazar la partida.

## Resumen táctico explicativo

En Combate, debajo del selector del activo, el resumen determinista organiza **Panorama, Ataques, Amenazas, Cambios y Datos y límites**. Reutiliza daño, velocidad e hipótesis de entrada existentes; no utiliza IA externa ni simula varios turnos. Ordenación opcional por daño propio o peor máximo recibido, con cobertura y advertencias explícitas. Estado y efectos no calculables siguen visibles sin puntuar utilidad. Los movimientos sin revelar nunca se completan por especie y los PS desconocidos no implican salud completa.

El orden del par seleccionado se sincroniza con la comparación detallada; cada ataque propio también muestra los pares frente a los movimientos rivales revelados. Al cambiar normalmente se recibe el ataque: la velocidad del compañero no evita ese golpe. No se califican cambios seguros ni se anuncia victoria o estrategia óptima.

[Reglas de interpretación, fuentes de cada explicación y ejemplos de prueba](docs/TACTICS.md). No se cambia el esquema de guardado: sigue v5, con importación/exportación y respaldos existentes. Las naturalezas estándar no se modifican por observaciones de Añil.

## Estadísticas y supuestos predeterminados

El perfil sigue siendo **Reglas estándar de generación IX**, una referencia que no garantiza compatibilidad con fangames.

- **Manual:** estadísticas reales de la ficha introducidas por el usuario; los datos ausentes siguen desconocidos.
- **Calculado:** especie/bases, nivel, naturaleza, IV y EV conocidos. Incluye fórmulas y truncamientos estándar y excepción de Shedinja (1 PS). IV 0–31; EV 0–252 y total ≤510. Naturalezas: 25 en español con aumentos/reducciones.
- **Estimado:** especie y nivel; si falta el nivel se pide, nunca se supone 100. Mínimo, referencia y máximo por estadística, con datos conocidos e intervalos editables.
- Política EV inicial: **Personalizados/desconocidos**. Los límites consideran 0–252 por EV desconocido, manteniendo presupuesto conjunto ≤510. «EV confirmados a cero» es explícito y no borra EV conocidos no nulos: señala el conflicto.
- Referencia no probabilística: naturaleza neutra, IV 15 y EV 0 cuando son desconocidos; se ajusta a límites personalizados y respeta datos conocidos. No es un promedio ni un set probable. Los límites consideran las naturalezas e IV legales permitidos, sin asignarles probabilidades.
- Los intervalos marginales no constituyen un único set maximizado en todas las estadísticas. El daño usa escenarios conjuntos legales y permite desplegar sus parámetros.
- Cambiar nivel o parámetros no cura PS. Los actuales conocidos quedan pendientes de revisión hasta corregirlos/confirmarlos; no se usan para KO o salud completa entretanto. Cambiar de modo no borra números manuales ni parámetros.

Detalle de fuentes y algoritmo: [STATS.md](docs/STATS.md).

## Daño, efectos, velocidad y limitaciones

Motor de producción **@smogon/calc 0.12.0**, con adaptador de estadísticas finales de ficha. No reconstruye IV/EV de datos manuales ni recalcula la ficha por especie dentro del motor. En los modos automáticos se calculan escenarios explícitos antes del daño. Etapas, habilidades, objetos y estados se aplican después, una sola vez.

- Ataques simples de un impacto y potencia fija. Min/máx PS, porcentaje sobre PS máximos cuando se conocen/estiman, y debilitamiento condicionado a acertar y al escenario. Precisión separada del daño.
- En estimaciones se separan **azar con la referencia**, **incertidumbre estadística a tirada 100** y **envolvente total de estadísticas + azar**. Porcentajes usan pares Defensa/PS legales. PS actuales desconocidos nunca se tratan como salud completa ni permiten declarar KO garantizado.
- **19 habilidades y 9 objetos** compatibles: lista exacta, activaciones y exclusiones en [EFFECTS.md](docs/EFFECTS.md). Desconocidos y efectos no implementados permiten una referencia claramente condicionada sin esos efectos; algunas activaciones/datos requeridos bloquean el cálculo hasta confirmación.
- Velocidad efectiva considera etapas, parálisis y efectos compatibles. Se compara el intervalo completo; si se solapa no se determina el orden por velocidad. Prioridad conocida se trata aparte y mantiene advertencias de excepciones.
- Tabla de 18 tipos y STAB base se muestran separados de inmunidades/modificadores por habilidad u objeto. Los cambios defensivos distinguen activo y entrada, reinician etapas en una copia y declaran efectos de entrada no simulados.
- Excluidos: potencia variable, daño fijo/proporcional/de respuesta, impactos múltiples, críticos, estadísticas alternativas de ciertos movimientos, clima, terreno, pantallas, teracristalización y efectos especiales no verificados. No se amplía el conjunto de movimientos calculables en esta fase.
- Nivel 1–100, potencia 1–250 y estadísticas de ficha 1–999 dentro del alcance de daño validado. Intervalos que puedan llegar a desbordamientos se rechazan y piden estrechar supuestos. Las bases personalizadas pueden producir una ficha válida pero fuera de este alcance del motor.
- No se consumen objetos, curan/restan PS ni cambian etapas al consultar. No se presenta el mayor daño como «mejor jugada». Hay un resumen explicativo, sugerencias deterministas acotadas e importación Showdown; no se afirma estrategia óptima.

## Cómo probar esta fase

**a) Pokémon propio que sube de nivel:** en Equipo selecciona Pikachu, modo Calculado, nivel 50, naturaleza Fuerte, pulsa «Fijar todos los IV a 31» y «Confirmar todos los EV a 0». Los PS máximos son 110. Introduce 55 actuales y sube a nivel 51: el máximo pasa a 112, los actuales siguen en 55 pendientes de revisión. Confírmalos. Cambia a Manual y vuelve: sus valores manuales y los parámetros automáticos se conservan por separado.

**b) Rival solo con especie y nivel:** deja al rival en Estimado, selecciona Blastoise y nivel 50; no rellenes naturaleza ni IV/EV. Con un atacante preparado y un movimiento compatible, consulta la envolvente y sus escenarios en Combate. Deja PS actuales vacíos: no se declara salud completa ni KO garantizado. Compara política EV desconocidos frente a EV confirmados a cero para ver cómo se estrechan límites. No se asignan movimientos ni habilidades al rival.

**c) Movimiento no compatible:** busca Patada Baja. Muestra «Efecto todavía no implementado» por potencia variable. Introducir potencia fija manual o cambiar una propiedad legada no habilita esa mecánica. No hay casilla «en alcance». Con Placaje sí se reconoce compatibilidad y se respeta una potencia manual modificada.

Los ejemplos de Levitación → Rompemoldes → Escudo Habilidad activo, Cinta Elección + Zoquete y Pañuelo/etapas/parálisis siguen disponibles; exige confirmar activaciones y estados relevantes.

## Datos y persistencia

Catálogos locales, sin peticiones al buscar: **1025 especies** con tipos y seis bases; **25 naturalezas**; **920 movimientos** españoles; **314 habilidades y 2218 objetos**. Fuente fija: [PokéAPI, revisión 89aa167e486774d10d1502ee60bce41dc35f04b2](https://github.com/PokeAPI/pokeapi/tree/89aa167e486774d10d1502ee60bce41dc35f04b2/data/v2/csv). Scripts `scripts/build-catalog.py` y `scripts/build-effects.py`; fuentes detalladas en ambos documentos. Licencia de datos en `src/data/POKEAPI-LICENSE.md`. El catálogo no garantiza disponibilidad/reglas de un juego concreto.

JSON **v5**, importación v1–v5 hasta 1 MB, validada antes de reemplazar. Se conserva la clave local `zlocke-session-v1` para encontrar partidas existentes y respaldos originales por versión (`...-backup-v4`, etc.) sin sobrescribir copias previas. Los valores antiguos se mantienen en Manual, sin inventar IV/EV, naturaleza, salud ni modos estimados. El selector antiguo «ninguno/desconocido» sigue siendo desconocido hasta confirmación. La identidad del movimiento solo se migra desde una procedencia explícita `movimiento #ID`, no desde una casilla técnica; si falta, hay que reseleccionar una base de catálogo para calcular.

Se guardan modos, parámetros, bases personalizadas, intervalos, política EV, revisión de PS y efectos/activaciones existentes. Si no se puede leer o respaldar el guardado, se detiene la escritura automática. Exporta respaldos: no hay cuentas/sincronización y borrar los datos del navegador elimina la partida. Cambiar de origen web requiere exportar/importar. Las fuentes tipográficas externas son opcionales y tienen alternativa de sistema.

## Estructura

- `src/battle.ts`, `src/statTypes.ts`: modelo, validación y migración.
- `src/stats.ts`, `src/uncertainty.ts`: fórmulas de ficha, escenarios legales e intervalos de combate.
- `src/damage.ts`, `src/calcAdapter.ts`, `src/effects.ts`, `src/speed.ts`: motor compatible, dependencias y efectos.
- `src/tactics.ts`, `src/TacticalSummary.tsx`, `src/entry.ts`: interpretación determinista, presentación y escenario compartido de entrada.
- `src/StatsEditor.tsx`, `src/ScenarioView.tsx`, `src/Editor.tsx`: modos, parámetros y edición.
- `src/data/`, `scripts/`: catálogos reproducibles de revisión fija.
- `src/*.test.ts`, `tests/`: regresiones, contraste con Smogon y flujos de navegador en ordenador/móvil.

## Importar Showdown (TXT o texto)

Pulsa **Importar Showdown**, carga el TXT de Añil o pega el equipo y revisa la vista previa. Confirma los niveles, elige explícitamente conservar los EV o ponerlos a cero y corrige/excluye las entradas pendientes. Puedes reemplazar con respaldo descargable o añadir sin cambiar el rival ni la configuración. Los PS actuales quedan desconocidos salvo que marques **Equipo a PS completos**, que solo rellena máximos exactos.

Se conservan especie/apodo, movimientos, habilidad/objeto, naturaleza, IV/EV, sexo, shiny, felicidad y procedencia en JSON v5. Formas no reconocidas, parámetros ilegales y efectos no compatibles se señalan; no se sustituyen ni normalizan. Consulta [convenciones, fuentes, formato de ejemplo y limitaciones](docs/SHOWDOWN.md).

## Sugerencia de ZLocke

Al inicio del resumen de **Combate**, la tarjeta ofrece una acción provisional con razones, riesgo, hasta dos alternativas y cálculos desplegables. Indica **cambio voluntario** o **entrada libre tras debilitamiento**. Se prioriza evitar KO dentro del alcance, se conserva el activo si ya evita ese riesgo y se compara daño/precisión/orden por dominancia, sin puntuación combinada. Si no hay base para elegir, muestra alternativas y datos necesarios; solo tipos no implica daño ni supervivencia.

Para cambios, distingue entrada, llegar a responder y sobrevivir al intercambio siguiente. Las rutas posteriores requieren fichas Manual/Calculado y transiciones compatibles; no se mezclan extremos de escenarios estimados. Consulta [criterios, límites y ejemplos](docs/RECOMMENDATIONS.md). No cambia guardados v5 ni modifica datos al consultar.
