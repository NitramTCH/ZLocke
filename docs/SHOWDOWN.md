# Importar equipos Showdown (TXT o texto)

**Importar Showdown** prepara tu equipo sin sustituir la partida JSON. No infiere movimientos ni habilidades por especie ni añade recomendaciones tácticas. Conserva las reglas estándar de generación IX, el rival y la configuración EV. Añil y otros fangames pueden exportar datos diferentes: revisa los avisos antes de confirmar.

## Pasos para un TXT de Añil

1. Exporta el equipo del juego en formato de texto Showdown. Abre **Importar Showdown**, carga el `.txt` o pega el texto y pulsa **Revisar equipo**. No se envía el archivo a ningún servidor; el catálogo y el análisis son locales.
2. Revisa cada especie/forma, apodo, habilidad, objeto y los cuatro movimientos. Se aceptan nombres oficiales en inglés y los nombres españoles del catálogo local. Puedes corregirlos escribiendo el nombre exacto. Los nombres sin coincidencia se conservan como manuales, con ID desconocido. No se aplica ninguna restricción por especie.
3. Introduce el nivel si falta. **Aplicar este nivel a todos** reemplaza el nivel de todas las tarjetas de la vista previa, incluidas las excluidas; después puedes ajustar cada nivel individualmente. No se presume nivel 100.
4. Elige explícitamente **Usar los EV del archivo** o **Poner EV a cero**. La segunda opción muestra los EV originales/editados y los ceros que se importarán. No cambia IV ni naturaleza. La elección se exige incluso si los EV no aparecen en el archivo.
5. Revisa naturaleza y sus modificadores estándar en el selector. Mantén **Calculado** con especie/bases, nivel, naturaleza, IV y EV completos; usa **Estimado** para naturaleza o parámetros desconocidos. Se preservan los valores manuales de estadísticas como desconocidos: no se escriben los resultados de las fórmulas en esos campos. Una forma sin resolver puede importarse en Estimado, pero no producirá estadísticas hasta aportar bases o resolver la especie.
6. Los **PS actuales siguen desconocidos**. Marca voluntariamente **Equipo a PS completos** solo si corresponde a tu partida: rellena los PS únicamente donde el motor produce un máximo exacto; un intervalo o falta de bases deja los PS desconocidos. No elige un escenario estimado.
7. Elige reemplazar o añadir. Al reemplazar se guarda antes una copia local de **toda la partida**; puedes obtenerla con **Descargar respaldo Showdown** y restaurarla mediante Importar JSON. Cada reemplazo renueva este respaldo dedicado: descarga uno anterior si quieres conservarlo. Añadir mantiene los Pokémon y el activo actuales. Reemplazar selecciona como activo al primero importado. El equipo resultante admite de uno a seis miembros.
8. Corrige las entradas inválidas o desmarca **Incluir Pokémon** para importar el resto. Confirma cuando estés conforme. El resumen indica el número de Pokémon importados y cuántos tienen datos pendientes. Cancelar no modifica equipo ni guardado.

El editor muestra la procedencia, el texto original y los datos adicionales (sexo, shiny, felicidad). Las correcciones de la vista previa y los cambios posteriores en la ficha prevalecen sobre el registro original. Todos se conservan al exportar/reimportar JSON.

## Formato admitido

Un bloque por Pokémon, separado por una o más líneas vacías; admite CRLF, BOM UTF-8, Unicode, apodos con espacios/signos y apóstrofos rectos o tipográficos. Ejemplo:

```text
¡Luz amiga! (Pikachu) (F) @ King's Rock
Ability: Levitate
Level: 50
Shiny: Yes
Happiness: 123
EVs: 252 SpA / 4 SpD / 252 Spe
IVs: 0 Atk / 30 Def
Timid Nature
- Thunderbolt
- Protect
- Low Kick
- Surf

Blastoise
Level: 50
Calm Nature
- Surf
```

- La cabecera acepta `Especie`, `Apodo (Especie)`, sexo final `(M)` / `(F)` y objeto tras ` @ `. Especie y apodo quedan separados.
- `Ability` / `Habilidad`, `Level` / `Nivel`, `Happiness` / `Felicidad`, `Shiny: Yes/No` (también Sí), `EVs`, `IVs` y `English Nature` son reconocidos. También `Nombre Naturaleza` y `Naturaleza: Nombre`.
- Etiquetas de estadísticas estándar: `HP`, `Atk`, `Def`, `SpA`, `SpD`, `Spe`; se admiten algunos alias, entre ellos PS, Ataque, Defensa, Velocidad. Se muestran las seis cifras y se pueden corregir o vaciar individualmente.
- Los nombres se cotejan por igualdad tras normalizar acentos, mayúsculas y puntuación; no hay coincidencias aproximadas ni eliminación de sufijos de formas. `Nidoran-F` y `Nidoran-M` son alias explícitos. Coincidencias ambiguas permanecen manuales.
- Los movimientos con potencia variable, de estado o efectos no compatibles siguen siendo movimientos reales, con la compatibilidad indicada por `moveCapability`. Habilidades y objetos conservan el ID aun sin efecto compatible. Los nombres de fangames sin ID siguen visibles como manuales y condicionan los resultados según los motores existentes.

## Omitidos y procedencia

Cada tarjeta distingue registro explícito, convenciones y datos desconocidos. La procedencia del original se conserva junto a la ficha corregida.

| Campo omitido | Tratamiento |
| --- | --- |
| Nivel | Desconocido y obligatorio antes de incluirlo. No se usa el 100 habitual de Showdown. |
| IV (todos o algunas estadísticas) | 31 según el formato, salvo excepción de Poder Oculto descrita debajo. Se pueden vaciar y usar Estimado. |
| EV (todos o algunas estadísticas) | 0 al elegir usar EV del archivo; o todos a 0 tras elegir explícitamente esa opción. Se pueden vaciar y usar Estimado. |
| Naturaleza | Desconocida, modo Estimado; no se supone Fuerte/Hardy. |
| Habilidad | Desconocida, nunca inferida por especie. |
| Objeto | Ausencia según la convención del formato, visible y corregible; confirma que el exportador no omite objetos por información incompleta. Vaciar el campo en la vista previa lo deja desconocido; escribir «ninguno» confirma ausencia. |
| Sexo | Desconocido. |
| Shiny | No según el formato. |
| Felicidad | 255 según el formato; 0 con Frustración si no se especifica. |
| PS actuales, quemadura, parálisis y activaciones | Desconocidos. No se consumen objetos ni se activan efectos al importar. Las etapas parten de 0 como una nueva ficha; no se heredan del activo saliente. |

`Hidden Power [Ice]` / `Poder Oculto [Hielo]` conserva ID y tipo explícito; su potencia variable sigue fuera del alcance de daño. Si no hay línea IV, Showdown puede derivar un reparto para ese tipo: **este importador no implementa esa derivación**, deja los seis IV desconocidos con aviso y usa Estimado. Si hay una línea IV, se respetan los valores explícitos y la convención de 31 para los restantes. La felicidad y los datos shiny/sexo se preservan, pero no amplían el alcance del motor.

## Validaciones y límites

- Perfil estándar: nivel entero 1–100; IV enteros 0–31; EV enteros 0–252 y total ≤510; felicidad entera 0–255.
- Valores de fangames fuera del perfil se conservan en la vista previa y el texto original. No se redondean, recortan ni normalizan. Bloquean solo las entradas incluidas. Puedes corregirlos, excluirlas o elegir EV cero explícitamente; EV cero no corrige IV ilegales.
- Si la partida tiene EV cero confirmados y el archivo tiene EV no nulos, el importador señala el conflicto y conserva la configuración. Cancela y cambia esa configuración si procede, o elige EV cero conscientemente.
- Datos incompletos en modo Calculado requieren corrección o cambiar a Estimado. Tipos y bases de una forma no reconocida no se obtienen de la especie base.
- Más de cuatro movimientos, campos duplicados, líneas o campos no compatibles producen errores de la entrada. El texto se conserva. Corrige la tarjeta o **Corregir texto original → Reinterpretar bloque**; esta acción explícita reemplaza las correcciones de esa tarjeta. Puedes excluir esa entrada e importar las otras.
- No se admiten equipos empaquetados, HTML, cabeceras de backups de múltiples equipos, Tera Type, Dynamax Level ni otros campos de mecánicas fuera del alcance actual. No se simulan efectos nuevos por incluir texto. Elimina un campo solo si aceptas explícitamente dejarlo fuera; no se ignora a escondidas.
- Máximo 1 MB y 100 bloques en la vista previa; máximo seis seleccionados y dentro del límite al añadir. No se trunca el equipo.
- La confirmación construye y valida la partida completa antes de sustituir el estado; un error o fallo al crear respaldo no produce importación parcial.
- Es una extensión opcional de los Pokémon en JSON v5 (`showdown`: sexo, shiny, felicidad, registro de procedencia y texto original). Los guardados existentes no necesitan migración; no se cambia la tabla estándar de naturalezas ni se generalizan discrepancias de Añil.

## Fuentes y pruebas

- Catálogos, IDs y nombres: [PokéAPI, revisión `89aa167e486774d10d1502ee60bce41dc35f04b2`](https://github.com/PokeAPI/pokeapi/tree/89aa167e486774d10d1502ee60bce41dc35f04b2/data/v2/csv). Los alias ingleses usan `pokemon_species_names`, `move_names`, `ability_names`, `item_names` (idioma 9), asociados a los IDs de los catálogos existentes. `scripts/build-showdown-aliases.py` regenera solo los alias, sin modificar efectos, bases o naturalezas.
- Sintaxis y convenciones contrastadas con [Pokémon Showdown, `sim/teams.ts`](https://github.com/smogon/pokemon-showdown/blob/master/sim/teams.ts), consultado el 17/11/2026: `parseExportedTeamLine`, importación y valores omitidos. Implementación propia determinista, sin depender del simulador ni importar sus heurísticas de especie/sets. Las diferencias conservadoras (nivel, naturaleza, habilidad y Poder Oculto) se describen arriba.
- Se reutilizan `selectSpecies`, `selectMove`, `supportFor`, `moveCapability`, `statModel` y `parseSession`; no se duplica lógica de combate ni se añaden fórmulas.
- `npm test`: parser, convenciones, nombres, Unicode/CRLF, errores parciales, formas desconocidas, límites/EV, parámetros hacia daño, datos pendientes y persistencia JSON.
- `npm run test:e2e`: carga TXT/texto, correcciones, nivel compartido, cancelación, añadir/reemplazar, respaldo y fallo de respaldo, HP explícitos y exportación/reimportación en ordenador y móvil.
