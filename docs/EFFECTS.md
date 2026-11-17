# Habilidades y objetos: alcance exacto

Perfil: **Reglas estándar de generación IX**. Motor de producción `@smogon/calc` **0.12.0**, fijado en package-lock. Las estadísticas son las de la ficha, antes de efectos temporales; no apliques manualmente etapas, Cinta/Pañuelo, quemadura o habilidades para después volver a aplicarlos aquí. Referencia para individuales, no garantía de compatibilidad con fangames.

El catálogo local contiene **314 habilidades y 2218 objetos** en español. Un nombre incluido no implica compatibilidad: solo los **19 + 9** de estas tablas tienen efectos habilitados, únicamente para el subconjunto de ataques simples ya existente. La descripción de PokéAPI es texto informativo; la columna «Parte implementada» define el alcance mecánico real.

## Habilidades

| Nombre español       | ID PokéAPI / slug estable | Parte implementada                                                                                                          |
| -------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Potencia             | 37 / `huge-power`         | Duplica Ataque físico; no cambia la ficha.                                                                                  |
| Energía Pura         | 74 / `pure-power`         | Duplica Ataque físico.                                                                                                      |
| Adaptable            | 91 / `adaptability`       | STAB ×2 en lugar de ×1,5.                                                                                                   |
| Levitación           | 26 / `levitate`           | Inmunidad a Tierra; Rompemoldes puede ignorarla.                                                                            |
| Absorbe Fuego        | 18 / `flash-fire`         | Inmunidad a Fuego; aumento ofensivo Fuego ×1,5 solo con activación confirmada.                                              |
| Absorbe Agua         | 11 / `water-absorb`       | Inmunidad a Agua. No cura PS en la predicción.                                                                              |
| Absorbe Electricidad | 10 / `volt-absorb`        | Inmunidad a Eléctrico. No cura PS en la predicción.                                                                         |
| Sebo                 | 47 / `thick-fat`          | Reduce daño Fuego/Hielo.                                                                                                    |
| Pelaje Recio         | 169 / `fur-coat`          | Duplica Defensa ante ataques físicos simples.                                                                               |
| Escama de Hielo      | 246 / `ice-scales`        | Reduce a la mitad daño especial.                                                                                            |
| Filtro               | 111 / `filter`            | Reduce daño supereficaz a ×0,75.                                                                                            |
| Roca Sólida          | 116 / `solid-rock`        | Reduce daño supereficaz a ×0,75.                                                                                            |
| Multiescamas         | 136 / `multiscale`        | Mitad de daño a PS completos; exige PS actuales y máximos.                                                                  |
| Rompemoldes          | 104 / `mold-breaker`      | Ignora habilidades defensivas compatibles durante el golpe, salvo Escudo Habilidad. No anula velocidad de forma permanente. |
| Agallas              | 62 / `guts`               | Ataque ×1,5 con quemadura/parálisis confirmada; evita reducción por quemadura. Otros estados no implementados.              |
| Ignorante            | 109 / `unaware`           | Ignora etapas ofensivas del rival al defender y defensivas al atacar.                                                       |
| Liviano              | 84 / `unburden`           | Velocidad ×2 tras perder objeto; requiere sin objeto confirmado y activación explícita. Se pierde al salir.                 |
| Inicio Lento         | 112 / `slow-start`        | Mitad de Ataque y velocidad mientras esté activo; no cuenta turnos.                                                         |
| Zoquete              | 103 / `klutz`             | Anula los objetos compatibles equipados. No elimina el objeto del guardado.                                                 |

## Objetos

| Nombre español   | ID PokéAPI / slug estable | Parte implementada                                                                      |
| ---------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| Cinta Elección   | 197 / `choice-band`       | Ataque físico ×1,5. No simula bloqueo de movimiento.                                    |
| Gafas Elección   | 274 / `choice-specs`      | Ataque especial ×1,5. No simula bloqueo de movimiento.                                  |
| Pañuelo Elección | 264 / `choice-scarf`      | Velocidad ×1,5. No simula bloqueo de movimiento.                                        |
| Vidasfera        | 247 / `life-orb`          | Daño ×1,3 con redondeos del motor. No resta PS por retroceso.                           |
| Cinta Experto    | 245 / `expert-belt`       | Daño supereficaz ×1,2.                                                                  |
| Chaleco Asalto   | 683 / `assault-vest`      | Defensa especial ×1,5. No impide seleccionar movimientos de estado.                     |
| Globo Helio      | 584 / `air-balloon`       | Inmunidad a Tierra mientras esté intacto/activo; no se consume en una consulta.         |
| Brazal Firme     | 192 / `macho-brace`       | Mitad de velocidad. No simula EV.                                                       |
| Escudo Habilidad | 1697 / `ability-shield`   | Protege la habilidad defensiva frente a Rompemoldes. Sin otras anulaciones automáticas. |

## Activaciones, anulaciones y datos desconocidos

- Se elige habilidad/objeto por ID de catálogo, sin relación con la especie. Entrada manual libre tiene ID nulo y efecto sin implementar, incluso si escribes el nombre de una habilidad compatible; selecciónala del buscador para asociar su identidad estable.
- Desconocido, ninguno confirmado y conocido son estados distintos. Con desconocidos o contenido no implementado se calcula una referencia sin ese efecto, señalada junto al resultado. No es una garantía de KO ni de orden real.
- Los objetos compatibles requieren confirmar activo/disponible o inactivo/consumido. No se supone su consumo. No se pide activación de Cinta Elección para velocidad ni de Pañuelo para daño simple porque esos efectos no intervienen ahí.
- Absorbe Fuego requiere confirmación de **potenciación ofensiva** para atacar con Fuego; su inmunidad defensiva no depende de esa potenciación. Liviano requiere activación y sin objeto confirmado. Inicio Lento requiere indicar si continúa activo, sin contar turnos por ti.
- «Habilidad anulada actualmente» es una confirmación manual del estado actual. No deduce la causa ni su duración. La protección automática de Escudo Habilidad implementada aquí es frente a Rompemoldes; no reconstruye otros procesos de anulación.
- Zoquete anula los objetos compatibles sin borrarlos de la partida. Rompemoldes ignora las habilidades defensivas compatibles durante el golpe, salvo protección de Escudo Habilidad; no anula de forma permanente habilidades de velocidad.
- Multiescamas exige PS actuales y máximos. Agallas contempla quemadura y parálisis, no veneno/sueño/congelación. Otros estados y escenarios de campo siguen fuera del alcance.
- No se curan PS por Absorbe Agua/Elec, no se resta retroceso por Vidasfera, no se destruye Globo Helio, no se consume objeto ni se cambian etapas por consultar. Los efectos posteriores, bloqueos de Elección/Chaleco y duración de activaciones no se simulan.

## Velocidad y orden

La referencia es `getFinalSpeed` y `getModifiedStat` de **@smogon/calc 0.12.0**, `dist/mechanics/util`: etapa −6…+6, modificadores compatibles y sus redondeos; parálisis ×0,5 en generación IX, límite de velocidad efectiva del motor 10000. Pañuelo ×1,5, Brazal Firme ×0,5, Liviano ×2 o Inicio Lento ×0,5 según activación; Zoquete anula objetos compatibles. No se necesita la especie ni IV/EV. Velocidad de ficha, etapa o parálisis desconocidas se piden explícitamente. La quemadura no reduce velocidad por sí misma.

Se comparan prioridades **introducidas** de los dos movimientos seleccionados antes de velocidad. Si falta una prioridad no se declara el orden. Se excluyen Espacio Raro, Viento Afín, Bromista/Alas Vendaval y otras modificaciones automáticas de prioridad, Cola Plúmbea/Incienso Lento, empates especiales y efectos que impidan ejecutar el ataque. Una referencia de quién actuaría antes no garantiza que actúe.

## Cambios defensivos

La cifra original sigue siendo exclusivamente efectividad por tipos. Cada celda añade una referencia desplegable que aplica el mismo motor y declara si 0 PS procede de tipos o de un efecto compatible. No se presenta una multiplicación genérica de daño como «efectividad de tipos».

El activo usa el estado introducido. Para un candidato que **entraría**, se reinician las etapas a 0 en una copia, se desactiva la potenciación de Absorbe Fuego y Liviano, e Inicio Lento queda pendiente de confirmación. No se consumen objetos ni se alteran los datos originales. Se mantienen los PS introducidos **antes** de posibles peligros de entrada; Trampa Rocas, Púas, Intimidación, activaciones de bayas y otros procesos de entrada no se simulan. La anulación manual de habilidad es el estado declarado: no se deduce si persistirá al entrar. Estas hipótesis se muestran junto al resultado; no constituyen una recomendación de cambio.

## Integración, fuentes y contraste

Se volvió a evaluar la API pública de [Smogon Damage Calculator](https://github.com/smogon/damage-calc#smogoncalc) y la distribución [@smogon/calc 0.12.0](https://www.npmjs.com/package/@smogon/calc/v/0.12.0). Su constructor normal y su `clone` reconstruyen estadísticas desde especie/IV/EV. El adaptador aislado `src/calcAdapter.ts` implementa el contrato de instancia/clonación con estadísticas finales de ficha (manuales, calculadas o de un escenario estimado explícito) y usa `calculate` en producción. No ejecuta el constructor de Pokémon ni calcula IV/EV inversos. No modifica el paquete ni sus prototipos globales. Se fija la versión: este contrato de bajo nivel y la importación del utilitario de velocidad deben revalidarse antes de actualizar.

Las estadísticas, IV, EV, pesos y estadísticas base desconocidos se representan internamente con `NaN`, no con números ficticios; no se exponen descripciones IV/EV del motor. La naturaleza neutra interna solo satisface sus funciones de texto y nunca recalcula estadísticas. Como el motor precalcula todas las etapas, las desconocidas reciben un neutro **solo para ese recorrido interno**; el validador impide utilizar un resultado dependiente de una etapa no confirmada, salvo cuando una inmunidad o Ignorante la hace irrelevante. Nunca se escribe ese neutro en la partida. Los movimientos se pasan como un ataque genérico con potencia, tipo, categoría y prioridad manuales para evitar reintroducir mecánicas especiales por el nombre. El alcance de movimientos no se amplía.

La fórmula duplicada de ZLocke se ha retirado. Las pruebas comparan las tiradas y velocidad del adaptador con instancias estándar independientes de Smogon: cada efecto ofensivo y defensivo, resistencias, inmunidades, etapas, quemadura, parálisis, activaciones y anulaciones. Los sets de prueba solo son fixtures; no se utilizan para completar partidas. Hay regresiones específicas de estadísticas ajenas al movimiento desconocidas y de inmutabilidad.

Datos de nombres/IDs/descripciones: [PokéAPI, revisión 89aa167e486774d10d1502ee60bce41dc35f04b2](https://github.com/PokeAPI/pokeapi/tree/89aa167e486774d10d1502ee60bce41dc35f04b2/data/v2/csv). `abilities.csv`, `ability_names.csv`, `ability_flavor_text.csv`, `items.csv`, `item_names.csv`, `item_flavor_text.csv`; idioma español 7, texto de la versión/grupo más reciente disponible en esa instantánea. El texto puede provenir de otros juegos y no define por sí solo mecánicas de IX. Algunos registros no tienen descripción española; se indica y, si son compatibles, se proporciona el alcance propio. JSON locales: no hay consultas de red al buscar. Regeneración: `python3 scripts/build-effects.py`. Licencia de los datos en `src/data/POKEAPI-LICENSE.md`; Smogon conserva su licencia distribuida en el paquete.

## Modos automáticos de ficha

Los efectos se aplican después de resolver el modo Manual/Calculado/Estimado, sin duplicar etapas o modificadores. Véase [STATS.md](STATS.md) para bases, naturalezas, supuestos, coherencia de escenarios y porcentajes de PS. El alcance de movimientos no cambia, pero ahora su compatibilidad se reconoce por ID sin casillas técnicas.
