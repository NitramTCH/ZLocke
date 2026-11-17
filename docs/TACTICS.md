# Resumen táctico explicativo

La tarjeta **Sugerencia de ZLocke** añade ahora una evaluación acotada de entrada e intercambio siguiente: véase [RECOMMENDATIONS.md](RECOMMENDATIONS.md). Las pestañas detalladas descritas aquí conservan su alcance original de un golpe; no son una simulación completa.

Zona visible de **Combate**, bajo el selector del activo. Es una lectura determinista de los motores existentes, sin API de IA, nuevos sets de especie ni fórmulas alternativas. Perfil visible: **Reglas estándar de generación IX**, de referencia y sin garantía de compatibilidad con fangames.

## Qué se muestra

- **Panorama:** orden del par de movimientos elegido, opciones ofensivas calculables, amenazas reveladas, referencias de cambios y datos que condicionan las conclusiones.
- **Ataques:** las cuatro ranuras propias, con daño PS/porcentaje cuando el motor lo proporciona, precisión separada, prioridad y explicación del debilitamiento. Se puede ordenar por **máximo de daño en PS**; no se evalúa estrategia óptima ni se convierte ese criterio en una recomendación. Estado, movimientos sin identificar y efectos no implementados permanecen visibles, sin asignar daño cero ni puntuar su utilidad.
- **Amenazas:** todos los movimientos rivales identificados o con información parcial. Los movimientos totalmente ocultos se cuentan, sin completarlos por especie. «Ninguna amenaza conocida calculable» incluye una advertencia explícita: no significa estar a salvo.
- **Cambios:** compañeros distintos del activo y no confirmados debilitados. Daño de cada movimiento rival conocido, PS restantes cuando pueden determinarse, cobertura de la comparación, velocidad de entrada y advertencias de efectos excluidos.
- **Datos y límites:** datos introducidos/confirmados del activo y rival, fichas calculadas o estimadas bajo sus supuestos y datos insuficientes, prioridades, activaciones o efectos no implementados.

Los selectores de movimientos del resumen están sincronizados con la comparación detallada de velocidad. Preferencias de vista, ordenación y selección son estado de interfaz: no modifican la partida exportada.

## Reutilización de los motores

`src/tactics.ts` recibe una `Session` y produce un modelo explicativo independiente de React. Usa:

- `intervalDamage`: daño manual, calculado o estimado, inmunidades, habilidades/objetos compatibles, condiciones, porcentaje coherente y clasificación de debilitamiento.
- `compareActionOrder`: resultado estructurado de la misma comparación que utiliza `intervalOrder`. Primero prioridad conocida; con igualdad, intervalos de velocidad efectiva. Los intervalos solapados/empatados no determinan orden.
- `intervalSpeed`: velocidad efectiva del activo, rival o candidato con sus efectos y supuestos.
- `currentHp`: PS actuales confirmados; un valor pendiente de revisión sigue siendo desconocido para las conclusiones.
- `entryScenario`: el comportamiento de entrada ya existente, ahora en un módulo independiente de la interfaz. No se copian etapas del activo que sale; se reinician las del compañero en una copia y se mantienen las exclusiones documentadas.

No se duplica ninguna fórmula de ficha, daño, etapas, STAB, efectividad, habilidad u objeto. La única aritmética adicional de salud es el intervalo de PS restantes tras **un golpe**: `[max(0, PS actuales − daño máximo), max(0, PS actuales − daño mínimo)]`, y solo cuando esos PS actuales están confirmados. No se escriben en el Pokémon.

## De datos a explicaciones

Las frases de debilitamiento usan directamente `ko` del motor:

- `guaranteed`: «Debilita en todos los escenarios calculados si acierta».
- `possible`: «Puede debilitar en algunos escenarios calculados si acierta; no en todos».
- `no`: ese golpe queda por debajo de los PS actuales dentro del cálculo; no garantiza sobrevivir al turno ni a efectos excluidos.
- `unknown`: faltan PS actuales; no se concluye debilitamiento ni supervivencia.
- `fainted`: objetivo ya debilitado con 0 PS confirmados.

Cada cálculo conserva las condiciones/omisiones y los efectos contemplados del motor, desplegables junto al resultado. En modo estimado se conserva la separación entre azar en la referencia, incertidumbre estadística a tirada 100 y envolvente total. No se crean probabilidades para IV, EV, naturalezas, movimientos ocultos ni resultados futuros.

Cada ataque propio se compara por prioridad/velocidad contra **todos los movimientos revelados**, incluidos los de estado, sin decidir cuál elegirá el rival. Una referencia que lo adelanta se señala por nombre y fundamento. Un orden sin determinar, ranuras sin identificar o habilidades/objetos desconocidos/no compatibles impiden descartar que el rival actúe antes. El par seleccionado en Panorama siempre es solo ese par, condicionado al mismo alcance de efectos del motor.

Una ranura con nombre o ID se considera identificada. Una ranura sin ellos, pero con tipo/categoría/potencia/prioridad/precisión, es parcial. Se muestran por separado las totalmente ocultas y las parciales; ambas permanecen «sin identificar». No se inventa su nombre ni su efecto.

## Comparación de cambios sin prometer seguridad

En un **cambio normal**, el compañero pasa a ser el objetivo del ataque rival. Ser más rápido no evita ese golpe. Su velocidad de entrada solo informa sobre una posible acción posterior si sigue en combate y no cambian estados/efectos; no se simula ese turno posterior ni se elige una respuesta.

Cada candidato recibe una referencia independiente para cada movimiento rival conocido. Se usan su modo de ficha, sus datos y la entrada compatible: etapas a 0, potenciaciones de Absorbe Fuego/Liviano reiniciadas e Inicio Lento según la limitación ya existente. No se simulan peligros de entrada, Intimidación u otros procesos excluidos, efectos del golpe sobre turnos posteriores ni efectos residuales. Con activo confirmado debilitado se advierte que un reemplazo tras KO puede tener un contexto distinto del cambio normal proyectado.

- Se excluye solo a un compañero con **0 PS actuales confirmados**. Un cero pendiente de revisión no se trata como debilitamiento confirmado.
- Con PS desconocidos se puede mostrar daño, pero no PS restantes ni supervivencia. Nunca se asumen PS completos.
- «Peor máximo» es el mayor extremo superior de daño PS entre los movimientos conocidos calculables; no suma ataques ni simula una secuencia.
- Para ordenar y afirmar «menor peor máximo», se exige que las referencias cubran **el mismo conjunto completo de movimientos conocidos compatibles**. Si faltan datos para alguno, se muestra su cobertura parcial y no se ordena como una comparación completa. Si solo hay una cobertura completa se indica sin compararla con las incompletas.
- La ordenación es por PS absolutos, no porcentaje de salud, precisión, utilidad o estrategia. Menor daño en PS no implica mayor supervivencia, y ningún candidato se califica como seguro.
- Esta comparación excluye ataques sin identificar, estado y otros efectos no cuantificados. Se declara aunque todos los golpes conocidos den inmunidad o daño bajo.

Un KO previsto no convierte al compañero en debilitado en el guardado. Globo Helio, Vidasfera y otros objetos no se consumen; tampoco se modifican PS, etapas ni activaciones.

## Compatibilidad y guardados

Se mantienen la lista de movimientos, habilidades y objetos compatibles, las fórmulas de ficha y **la tabla estándar de las 25 naturalezas**. No se generaliza ninguna discrepancia observada en Añil ni se introduce una regla especial de ese juego. Véanse [STATS.md](STATS.md) y [EFFECTS.md](EFFECTS.md).

No hay cambio de esquema: se conserva JSON **v5**, importación/exportación y respaldos existentes. Esta fase no requiere una migración nueva. Las pruebas verifican que consultar, cambiar pestañas, seleccionar pares y ordenar no altera los datos serializados.

## Cómo comprobarlo

1. Carga la demostración y abre **Combate → Resumen del enfrentamiento**. Selecciona Surf y Terremoto. Introduce velocidad rival superior a la propia y PS rivales 1: Surf puede ser letal en todos los escenarios calculados, pero el rival puede actuar antes. También puedes bajar manualmente su prioridad para comprobar que una mayor velocidad no supera una prioridad inferior.
2. En **Ataques**, ordena por daño. Protección sigue visible sin daño comparable y sin puntuación de utilidad. Patada Baja u otro especial no implementado muestra su motivo.
3. En **Amenazas**, observa el número de ranuras sin identificar. Vacía PS actuales del activo: el daño puede permanecer calculable, pero desaparece cualquier conclusión de supervivencia/KO y no se calculan PS restantes.
4. En **Cambios**, completa las defensas de un compañero si faltan y dale mucha velocidad. El golpe de entrada sigue calculándose; los PS restantes son una proyección, sin cambiar el valor guardado. Un compañero con 0 PS confirmados queda excluido; uno con PS desconocidos sigue visible con su advertencia.
5. Consulta **Datos y límites** y los fundamentos desplegables para relacionar cada frase con prioridad, intervalos, PS y condiciones del motor. Con dos velocidades iguales o intervalos estimados solapados no se determina un orden.
