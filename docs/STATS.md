# Estadísticas de ficha, estimaciones y movimientos

Perfil: **Reglas estándar de generación IX**. Referencia para individuales; no garantiza compatibilidad con fangames. Las estadísticas de ficha no incluyen etapas, habilidades, objetos ni estados: esos efectos se aplican después, una sola vez, por el motor de combate.

## Fuentes fijas y fórmulas

[PokéAPI/pokeapi, revisión 89aa167e486774d10d1502ee60bce41dc35f04b2](https://github.com/PokeAPI/pokeapi/tree/89aa167e486774d10d1502ee60bce41dc35f04b2/data/v2/csv): `pokemon.csv`, `pokemon_species_names.csv`, `pokemon_types.csv`, **`pokemon_stats.csv`**, **`natures.csv` y `nature_names.csv`** (idioma español 7). Se incluyen seis bases de las 1025 especies/entradas por defecto y las 25 naturalezas, con sus aumentos/reducciones. Se conserva la misma revisión de datos del proyecto. Regeneración: `python3 scripts/build-catalog.py`. No descarga datos al consultar o compilar. Licencia de la fuente en `src/data/POKEAPI-LICENSE.md`.

Las bases son referencias de especie, nunca estadísticas finales. Formas no incluidas se introducen manualmente y pueden tener una copia de bases personalizadas; esa copia prevalece hasta pulsar «Volver a bases del catálogo» y nunca modifica el catálogo.

Para nivel L entre 1 y 100, base B, IV entre 0 y 31 y EV entre 0 y 252:

```text
x = floor((2 B + IV + floor(EV / 4)) L / 100)
PS máximos = x + L + 10
Otras estadísticas = floor((x + 5) × naturaleza)
Naturaleza = 1,1 / 0,9 / 1 según la estadística
```

El multiplicador de naturaleza se aplica con aritmética entera 110/100, 90/100 o 100/100 para respetar truncamientos. El total de EV no supera 510; valores EV no múltiplos de 4 son legales y se contabilizan completos en el presupuesto. Shedinja (ID 292) tiene 1 PS en la regla automática. La configuración avanzada permite forzar fórmula normal o excepción de 1 PS para contenido modificado.

Contraste: `calcStat` de **@smogon/calc 0.12.0**, con niveles 1/50/100, las 25 naturalezas, IV 0/31 y EV 0/252 para las seis estadísticas, además de la excepción de Shedinja. Fuente de referencia: [Smogon Damage Calculator](https://github.com/smogon/damage-calc) y versión fijada en package-lock. La fórmula de ficha está en `src/stats.ts`; daño y velocidad siguen usando el adaptador Smogon.

## Tres modos, sin borrar datos

- **Manual:** se usan las estadísticas reales introducidas. Naturaleza/IV/EV no son necesarios ni se reconstruyen. Los valores manuales siempre permanecen en sus campos, incluso al cambiar de modo.
- **Calculado:** requiere especie/base personalizada, nivel, naturaleza e IV/EV conocidos; la configuración explícita «EV a cero» también sirve como dato confirmado. Recalcula al cambiar parámetros. Si faltan datos para este modo, se indican: puedes pasar a Estimado.
- **Estimado:** requiere especie/base y nivel. Naturaleza/IV/EV ausentes permanecen desconocidos. Muestra mínimo, referencia y máximo por estadística, con supuestos editables y datos conocidos que estrechan los límites.

Nivel y PS actuales son datos del Pokémon compartidos entre modos. Naturaleza, IV, EV, intervalos y bases personalizadas se guardan aparte de las estadísticas manuales. Cambiar de modo no sustituye los números manuales por la referencia calculada. Si vuelves a Manual después de subir de nivel, sus cifras anteriores siguen conservadas y debes actualizar las que hayan cambiado en el juego.

Los Pokémon nuevos parten de Estimado, de forma visible. Los guardados antiguos se migran a Manual; si no tienen estadísticas, aparece «Activar modo estimado». No se inicia una estimación para un Pokémon antiguo sin elegirla.

## Supuestos predeterminados y datos conocidos

- No se supone un nivel: sin él se pide introducirlo. Nunca se utiliza 100 como relleno.
- Configuración inicial de EV de partida: **Personalizados/desconocidos**. Cada EV desconocido considera 0–252 y el conjunto mantiene total ≤510. «EV confirmados a cero» es una elección explícita de la partida; los EV conocidos no nulos no se borran ni se convierten a cero: se muestra un conflicto hasta revisar los parámetros o la política.
- IV desconocidos consideran 0–31; naturaleza desconocida considera las 25 posibles. Puedes fijar un IV/EV concreto o cambiar los límites de los desconocidos. Los límites no sustituyen un dato ya conocido.
- La **referencia no probabilística** usa naturaleza neutra Fuerte, IV 15 y EV 0 cuando son desconocidos. Con límites personalizados, usa IV 15 ajustado al intervalo y EV mínimos permitidos; con datos conocidos usa esos valores. Si PS actuales confirmados requieren más PS máximos que la referencia, se elige una referencia legal que los admita. Sus parámetros efectivos se pueden desplegar.
- No es una media, promedio, percentil ni set más probable. No se asignan probabilidades a naturalezas o IV. Cada intervalo es marginal: todos los máximos de la tabla no forman necesariamente un único Pokémon legal.
- Etapas, quemadura, parálisis, habilidades y objetos siguen siendo entradas separadas con los controles y advertencias existentes. La estimación de estadísticas no confirma que no haya estados, efectos o activaciones desconocidos.

## Escenarios legales en combate

`src/uncertainty.ts` toma el modo elegido y transforma únicamente una copia de cada Pokémon antes de llamar al motor. Los valores manuales y los parámetros almacenados no se modifican.

Para cada naturaleza posible se generan los valores alcanzables de las estadísticas necesarias. Cada valor conserva IV/EV legales que lo producen, con el menor coste EV posible para ese valor. Los EV mínimos/conocidos de las demás estadísticas también consumen presupuesto. Así, un par Defensa/PS solo se acepta si sus EV conjuntos y los ya conocidos suman ≤510. Cada escenario conserva **una sola naturaleza** y recalcula coherentemente las seis estadísticas. No se construye un Pokémon con varias naturalezas favorables ni se presume que puede tener 252 EV en todas las estadísticas.

El conjunto de ataques compatibles continúa siendo el de daño directo simple de potencia fija. En ese alcance, el daño es monótono en la estadística ofensiva y defensiva, con condiciones de efectos fijas. Se evalúan los extremos ofensivos legales y los pares defensivos/PS legales; las llamadas equivalentes al motor se reutilizan. La cache distingue salud completa para Multiescamas. Un control conservador rechaza intervalos que puedan llegar a desbordamientos numéricos: pide estrechar supuestos en lugar de dar un límite no verificado. Al ampliar efectos, deben revisarse estas dependencias y la monotonicidad antes de habilitarlos.

Los resultados separan:

1. **Azar con la referencia:** las tiradas del motor con un escenario fijo y explícito.
2. **Solo estadísticas:** mínimo/máximo entre escenarios fijando la tirada del daño en 100.
3. **Envolvente total:** extremos de todas las estadísticas legales y tiradas contempladas. No es una distribución de probabilidad conjunta.

Los escenarios que alcanzan los extremos de daño se pueden consultar, con naturaleza, IV, EV y estadísticas. Para porcentajes se recorre cada par Defensa/PS coherente: no se divide simplemente un daño extremo por un máximo de PS incompatible. Los escenarios de movimientos diferentes pueden corresponder a naturalezas diferentes; sus límites no identifican un set único para una estrategia.

Las habilidades/objetos compatibles se aplican después de la ficha. Se conservan las referencias condicionadas para efectos desconocidos/no implementados. Multiescamas sigue necesitando PS actuales conocidos; la estimación no supone salud completa para activarla. Potencia variable, daño fijo/proporcional, impactos múltiples y otras mecánicas no verificadas siguen fuera del alcance.

## PS actuales y cambios de nivel

Cambiar nivel, modo, naturaleza, IV/EV, bases o política EV en un modo automático **no cura ni cambia PS actuales**. Si ya había un valor, queda pendiente de revisión: no se utiliza para KO ni para comprobar salud completa. Puedes introducir el valor correcto o confirmarlo si no supera el máximo posible. Si supera el máximo nuevo, debes corregirlo; no se recorta ni se sustituye por el nuevo máximo.

Con PS actuales confirmados, solo se consideran escenarios cuyo máximo de PS admita ese valor. Un cambio de nivel puede modificar el máximo calculado y pedir revisión aunque los actuales sigan siendo numéricamente válidos. Con PS desconocidos/revisión pendiente no se declara KO garantizado ni se supone que sean los PS máximos.

Si se conocen los PS actuales, la conclusión «garantiza/puede/no debilita en este escenario» respeta toda la envolvente estadística además del azar, y sigue condicionada a acertar y a los efectos contemplados. El porcentaje usa la incertidumbre de PS máximos. Consultar nunca cambia PS, etapas, activaciones ni objetos.

## Velocidad efectiva y prioridad

Los extremos y la referencia de velocidad de ficha pasan por los efectos ya compatibles (etapas, parálisis, objetos y habilidades) una sola vez. Si el mínimo de uno supera **estrictamente** el máximo del otro, se indica; si los intervalos se solapan o puede haber empate, no se determina un orden por velocidad. Primero se compara prioridad **conocida** de los movimientos elegidos; se mantienen las excepciones no contempladas documentadas en `EFFECTS.md`. No se asignan probabilidades a un empate o una naturaleza.

## Reconocimiento automático de movimientos

Se guarda `catalogId` estable. `moveCapability` decide por ID y propiedades si aparece «Calculable», «Calculable con limitaciones», «Movimiento de estado» o «Efecto todavía no implementado». No hay casilla para declarar un ataque «en alcance».

- La lista cerrada `SIMPLE_MOVE_IDS` sigue sin ampliarse. Cambiar un legado `damageKind` o introducir potencia fija a un especial no habilita su cálculo.
- Se respetan ajustes de tipo, categoría y potencia de un ID compatible, bajo la mecánica de su base de catálogo. Renombrarlo no cambia esa base; se muestra su nombre/ID.
- Una entrada manual sin identidad verificada queda fuera del cálculo. Para un ataque modificado a partir de uno compatible, selecciónalo del buscador y ajusta sus datos; esto no garantiza representar mecánicas especiales de un fangame.
- Estado y potencia variable/fija especial mantienen su motivo específico; no se necesita completar estadísticas para saber que no están implementados.

## Guardados y límites

JSON **v5**, con importación v1–v5 y respaldo específico por versión (`zlocke-session-v1-backup-v4`, etc.), sin reemplazar copias previas. Se conservan números reales antiguos en Manual y datos ausentes como desconocidos. Si la especie previa coincide exactamente con una entrada se conserva su ID como identidad, pero no se activan estadísticas automáticas. El ID de movimiento previo solo se recupera de su procedencia explícita `movimiento #ID`, no de un nombre ni de una casilla. Los demás IDs quedan nulos y se pide reseleccionar una base verificada. `damageKind` antiguo se conserva como dato legado pero ya no decide compatibilidad.

Se guardan modo, naturaleza, IV/EV, intervalos, bases personalizadas, regla de PS, revisión de PS y política EV de partida. Los límites de edición/persistencia se validan; un presupuesto de mínimos EV imposible se explica sin convertirlo en un set válido. No hay importación Showdown, inferencia de habilidades/movimientos por especie ni asesor automático de estrategia.
