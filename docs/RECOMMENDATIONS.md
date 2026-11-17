# Sugerencia de ZLocke: criterios y límites

En **Combate**, al principio del resumen, la tarjeta presenta una **Recomendación provisional**, razones, riesgo principal y hasta dos alternativas. No promete estrategia óptima, victoria ni ejecución de una acción. Si los datos no permiten destacar una opción, lo dice y conserva alternativas sin orden artificial. Los cálculos y las opciones sin puntuar siguen accesibles en desplegables.

## Contexto y horizonte

- **Cambio voluntario:** el activo puede atacar, permanecer en campo o cambiar. El compañero recibe el ataque rival al entrar, por muy rápido que sea. Se evalúa después un único intercambio: respuesta propia y siguiente movimiento rival. Se prueban todos los pares de ataques conocidos compatibles, pudiendo ser distintos en entrada y siguiente intercambio.
- **Entrada libre tras debilitamiento:** no se cobra golpe al entrar. Solo se evalúa el intercambio posterior del compañero. No se propone atacar ni mantener al activo saliente. Con 0 PS confirmados del activo, se fuerza este contexto. La selección manual de entrada libre solo es válida si ese reemplazo realmente existe.
- Las acciones contra un rival confirmado con 0 PS no se recomiendan. Se excluyen compañeros con 0 PS confirmados; PS pendientes de revisión o desconocidos nunca equivalen a salud completa.
- El selector es estado de interfaz. Consultarlo no cambia el activo, no ejecuta cambios y no persiste un nuevo estado de combate.

El ataque del activo se evalúa en el intercambio actual. Un cambio voluntario necesita además la comprobación de entrada y respuesta: su coste temporal no se oculta. No se evalúa una secuencia más larga, cambios del rival, su decisión de jugada ni un plan de varios turnos.

## Reglas de decisión transparentes

No hay suma de PS, precisión, velocidad y porcentajes ni una puntuación de utilidad.

1. **Cobertura y supervivencia primero.** Para destacar una opción se exige evaluar todas las amenazas compatibles conocidas y demostrar que evita el debilitamiento dentro del horizonte y supuestos. No se premia una opción por tener menos datos. Una opción incompleta queda sin ordenar como superviviente; no se concluye que sea peor en el juego real. También se indica la intersección de amenazas evaluables entre todas las opciones y los datos que faltan.
2. **Conservar el activo cuando ya evita el riesgo.** Si hay ataques calculables del activo que evitan el KO y hacen daño positivo, se comparan estos antes que gastar un turno en cambiar. Si no hay ataque directo evaluable útil pero permanecer recibe los ataques conocidos sin KO, se ofrece **mantener** y revisar las opciones sin puntuar. Esto no ordena pasar turno ni selecciona un movimiento de estado. No se recomienda cambiar solo por recibir menos daño.
3. **Cambio para evitar un riesgo que el activo no descarta.** Si ningún ataque evaluado del activo ni mantener demuestran evitar el KO, se comparan compañeros cuya entrada y respuesta evitan el KO hasta finalizar el intercambio. Un candidato que resiste la entrada pero cae antes de responder, o después de responder sin debilitar al rival, no se destaca como superviviente.
4. **Comparación de opciones igualmente supervivientes.** Una opción domina a otra solo si no empeora ninguna de estas dimensiones: KO en todos los escenarios del cálculo, precisión conocida, KO previo por orden conocido y ambos extremos del daño en PS; además debe mejorar al menos una. No hay ponderación arbitraria. Los daños se comparan contra el mismo rival. Precisión desconocida impide afirmar esa dominancia. Dos opciones iguales o con ventajas contrapuestas no reciben desempate por ranura, nombre, especie ni datos ausentes: se muestran alternativas.
5. **Sin supervivencia demostrada, no se fuerza un ganador.** Se muestran las opciones disponibles, su riesgo y el dato necesario para decidir. «No hay una acción calculable que descarte el riesgo» no declara que todos los movimientos sean inútiles ni que sea imposible sobrevivir en el juego.

Estas son reglas conservadoras del asistente, no un teorema de estrategia óptima. No se compara un ataque actual con un cambio ignorando el golpe de entrada.

## Uso del motor y escenarios coherentes

`src/recommendations.ts` es lógica pura, independiente de React. Reutiliza `analyzeTactics`, `intervalDamage`, `compareActionOrder`, `statModel`, `referencePokemon`, `predictDamage`, `entryScenario`, `moveCapability` y los efectos existentes. No introduce fórmulas alternativas de daño, velocidad, estadísticas ni efectividad. La aritmética añadida solo resta el daño del motor a PS confirmados.

### Ataque del activo

Se compara cada ataque calculable frente a cada amenaza compatible conocida. Evita el golpe si el motor indica KO en todos los escenarios, actúa antes y tiene precisión estándar 100 de referencia. Si su precisión es inferior o desconocida, no se usa ese KO para descartar el riesgo de fallo. Si recibe un golpe antes o después de atacar, debe sobrevivir al máximo del motor. Un empate o solapamiento de velocidades nunca se interpreta como actuar primero.

Un KO previo siempre está condicionado a acertar, poder actuar y a las excepciones excluidas. «Precisión 100» no incluye cambios de precisión/evasión o protecciones fuera del motor. La posibilidad de KO, precisión y escenarios estadísticos no se convierten en una probabilidad combinada.

### Entrada y respuesta del compañero

Para la comprobación posterior se requieren fichas **Manual o Calculado**, datos relevantes suficientes y PS actuales confirmados. Se enumeran los daños distintos reales del motor para el golpe de entrada. Cada ruta conserva sus propios PS y recalcula el siguiente ataque con esos PS. Así, por ejemplo, Multiescamas no sigue activa a PS completos después de recibir daño. Si el orden no está determinado se consideran ambos órdenes, sin asignar probabilidades.

Se distinguen tres hechos: **sobrevivir al entrar**, **llegar a responder** y **evitar el KO hasta terminar ese intercambio**. Cuando el compañero actúa primero pero no garantiza debilitar, también se contempla el ataque posterior del rival. Con precisión menor de 100 se contempla que su ataque falle. Si actúa después, debe resistir tanto la entrada (si la hay) como el ataque que precede a la respuesta. Los rangos se muestran con el par de movimientos que los justifica, sin sumar extremos de fichas diferentes.

Con fichas **Estimado** se conservan las referencias de un golpe, daño ofensivo e intervalos de orden, pero la ruta posterior queda **sin evaluar**. No se cruzan extremos de Ataque, Defensa, PS o Velocidad que podrían pertenecer a naturalezas o EV diferentes. Un cálculo aislado de KO garantizado por `intervalDamage` sigue siendo válido dentro de todos sus escenarios; no habilita una secuencia de respuestas inventada.

### Transiciones compatibles

- Etapas del compañero a cero mediante `entryScenario`; no se heredan las del saliente. Solo copias de consulta.
- Reutiliza, dentro de sus límites actuales, los efectos estáticos: Potencia, Energía Pura, Adaptable, Levitación, Absorbe Agua, Absorbe Elec, Sebo, Pelaje Recio, Escama de Hielo, Filtro, Roca Sólida, Multiescamas, Rompemoldes, Agallas, Ignorante y Zoquete. La curación por absorción se omite explícitamente.
- Objetos estáticos en esta referencia: Cinta Elegida, Gafas Elegidas, Pañuelo Elegido, Cinta Experto, Chaleco Asalto, Brazal Firme y Escudo Habilidad. Se mantienen las activaciones y anulaciones existentes. **El bloqueo de movimiento Choice y la restricción de estado de Chaleco Asalto no están implementados**: se avisa; no se garantiza que la acción concreta esté disponible.
- La evolución entre golpes de Absorbe Fuego, Liviano e Inicio Lento no se implementa: si la habilidad conocida no está suprimida, la respuesta posterior queda sin evaluar. Globo Helio y Vidasfera activos o sin activación confirmada también bloquean esta secuencia: no se conserva ficticiamente un globo consumido ni se ignora su transición como si estuviera verificada. Las referencias independientes de un golpe permanecen visibles.
- Hay una lista explícita de transiciones estáticas en el código; añadir compatibilidad de un golpe no habilita automáticamente un efecto nuevo en esta evaluación posterior.
- Habilidad/objeto desconocido o conocido sin efecto compatible permiten una **referencia provisional sin esos efectos**, indicada. Esto no convierte la referencia en una garantía real. La posibilidad de perder la acción por parálisis y el daño residual de quemadura reciben avisos propios; el motor solo contempla las partes ya implementadas.

## Información parcial y opciones no cuantificadas

Se cuentan movimientos rivales sin identificar. El cálculo cubre los conocidos compatibles, no predice cuáles elegirá el rival. Estado, potencia variable y otros efectos excluidos siguen visibles como **opciones no evaluadas**, nunca como daño cero ni como acciones inútiles. Si faltan cálculos, se listan los datos concretos: PS actuales, estadísticas necesarias, movimiento, activación o prioridad/velocidad.

Si solo hay tipos, se ofrece orientación por efectividad identificada como tal. Sin movimientos conocidos, se pueden señalar debilidades del rival por tipos, sin suponer que el equipo tenga ataques de esos tipos. No se inventa daño, supervivencia, sets o habilidades de especie. Las inmunidades por tipos y por efectos permanecen diferenciadas en los resultados detallados existentes.

## Exclusiones y persistencia

Reglas estándar de generación IX como referencia, no garantía de compatibilidad con Añil/fangames. Mismo conjunto de ataques compatibles. No se simulan peligros de entrada, Intimidación, cambios del rival, protecciones, clima/terreno/pantallas, críticos, curación, retrocesos, daño residual, cambios de etapas/estado, efectos secundarios ni consumo de objetos entre golpes. Las rutas están condicionadas a que no ocurran esas transiciones excluidas. No se modifica la tabla estándar de naturalezas.

No se consumen objetos, activan habilidades ni modifican PS/etapas. Se conserva JSON **v5**, ambos importadores, exportación y respaldos; no cambia el esquema ni hace falta migración. La consulta, alternativas y contexto no se guardan como acciones realizadas.

## Cómo probar

1. Prepara fichas manuales con nivel 50, estadísticas 100, PS 100, etapas 0, sin estados/habilidad/objeto confirmados, y Placaje. Dale al activo velocidad 200 y al rival 100, PS rival 1. La tarjeta destaca **Atacar con Placaje**, condicionado al alcance; no cambia solo porque otro resista más.
2. Cambia PS activo a 1 y velocidad a 1. Un compañero con 100 PS y esas defensas puede recibir entrada y siguiente golpe y responder. Se destaca cambiar, con los cálculos desplegables de ambos golpes.
3. Dale al compañero 40 PS y velocidad 50. Con el Placaje de ese rival, resiste entrar pero no el segundo golpe antes de responder. No se presenta como cambio seguro. Pon velocidad 300: llegar a responder no basta si el rival sobrevive y lo debilita después.
4. Selecciona **Entrada libre** con ese compañero: no cobra golpe al entrar y se evalúa solo el intercambio. Poner PS del activo a 0 fuerza este contexto y excluye sus acciones. Un compañero con 0 PS queda fuera.
5. Vacía PS actuales: no se asume salud completa ni se destaca supervivencia. Deja únicamente tipos: aparece orientación por tipos. Revela un ataque compatible para comparar más.
6. Prueba un ataque fuerte con prioridad −1 frente a Ataque Rápido, precisión 70 frente a 100 y velocidades empatadas. No se confunden mayor daño, orden y precisión. Si hay ventajas contrapuestas se conservan ambas alternativas.
7. Abre **Opciones sin puntuar y límites**, **Qué dato ayudaría a decidir** y los cálculos. Protección sigue visible sin puntuación negativa. Asigna Globo Helio activo: su inmunidad de un golpe sigue existiendo, pero la respuesta tras entrada se marca sin evaluar.

Pruebas automatizadas: `src/recommendations.test.ts` contrasta las razones y rutas con los resultados existentes; `tests/recommendations.spec.ts` verifica tarjeta, contexto, datos incompletos, importador accesible, consulta sin cambios y móvil. Ejecutar `npm test`, `npm run build` y `npm run test:e2e`.
