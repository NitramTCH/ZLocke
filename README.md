# ZLocke

**Menos azar. Más estrategia.** Asistente web en español para combates Pokémon individuales durante randomlockes, en aventura o contra amigos. React + TypeScript + Vite; datos manuales, sin servidor ni integración con Pokelocke.

## Desarrollo

Requiere Node.js 22.12+ (también probado con 24) y npm.

```sh
npm ci
npm run dev
```

Vite escucha en `0.0.0.0:5173`. Abre la dirección que muestre el terminal en tu entorno local.

```sh
npm test          # Vitest: lógica de combate y validación de partidas
npm run build    # TypeScript estricto y compilación de producción
npm run preview  # Servir dist después de compilar
```

Si la caché predeterminada no es escribible, usa `npm ci --cache /workspace/.npm-cache`.

## Cómo probar la primera versión

1. Pulsa **Cargar demostración**. Todos sus datos son ficticios; no se infieren sets por especie.
2. Volt usa Eléctrico contra Agua/Tierra: efectividad 0× y STAB 1,5×. Hielo contra Agua/Tierra da 1×. No son cifras de daño.
3. Introduce la velocidad rival para comparar el orden. Vaciarla vuelve a mostrar información insuficiente.
4. En defensa, Brasa (Fuego/Volador) recibe efectividad 0× de Tierra. No se aplican habilidades u otros efectos.
5. Edita el equipo (máximo seis), recarga y comprueba el guardado. Exporta JSON y vuelve a importarlo. La importación valida la estructura antes de reemplazar nada.
6. Empieza una partida vacía desde el aviso de demostración. Introduce tipos y marca que la combinación está completa; sin confirmar no se usa para calcular.

## Alcance y límites

- Tabla completa de 18 tipos moderna, desde generación VI; multiplica los factores de ambos tipos defensivos e incluye inmunidades.
- STAB estándar 1,5×. Efectividad y STAB se presentan por separado, sin clasificación de «mejor jugada» ni cálculo de daño.
- Nombre, tipos, nivel, PS, estadísticas reales, habilidad, objeto y cuatro movimientos por Pokémon. Los campos vacíos son desconocidos; no hay búsqueda por especie ni estadísticas inventadas.
- La categoría inicial de cada movimiento es desconocida: el usuario debe confirmarla antes de evaluar su efectividad. Estado no se evalúa. No se infiere categoría por nombre.
- Habilidades, objetos, potencia, precisión, prioridad, estados, modificadores, campo y efectos al cambiar no se calculan. Las advertencias aparecen junto a los resultados afectados. La velocidad compara únicamente los valores introducidos.
- El juego no está seleccionado. Reglas históricas, daño completo e integración externa quedan pendientes.
- Persistencia mediante localStorage (`zlocke-session-v1`), sin cuentas ni sincronización. JSON versión 1, límite de importación 1 MB. Exporta respaldos: borrar los datos del navegador elimina la partida. Las fuentes externas son opcionales; se usan fuentes de sistema si no cargan.
- PS deben ser coherentes y los números enteros no negativos (positivos salvo PS actuales), hasta 99999. Edita primero PS actuales al reducir el máximo por debajo del valor actual.

## Estructura

- `src/battle.ts`: tabla, modelo, efectividad, STAB, velocidad y validación JSON; independiente de React.
- `src/battle.test.ts`: dobles tipos, resistencias, inmunidades, STAB, desconocidos y persistencia.
- `src/main.tsx`: edición y vistas, persistencia e importación/exportación.
- `src/style.css`: interfaz oscura adaptable a móvil.
