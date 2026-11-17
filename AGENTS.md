# Reglas de ZLocke

- Interfaz y mensajes en español. Mantén la estética oscura con rojo eléctrico y accesibilidad por teclado.
- Separa la lógica de combate de React. Añade pruebas relevantes al modificarla.
- Nunca infieras habilidades ni movimientos por especie en un randomlocke. Calcula o estima estadísticas solo en el modo explícito elegido, con bases documentadas y supuestos visibles; conserva aparte los valores manuales.
- Distingue datos confirmados, desconocidos y supuestos. No conviertas datos ausentes en neutralidad.
- No llames daño a la efectividad ni recomiendes una mejor jugada sin datos suficientes.
- Explica junto al resultado los efectos sin implementar. No supongas un juego concreto.
- Valida importaciones antes de reemplazar datos. Mantén exportaciones versionadas.
- Ejecuta `npm test` y `npm run build` antes de entregar cambios.
- Usa el checkout existente de la tarea aislada; no crees worktrees salvo petición explícita.

- Antes de ampliar efectos o movimientos, comprueba las dependencias de estadísticas y los intervalos: cada escenario debe tener una sola naturaleza y EV legales (≤510). Nunca asignes probabilidades a IV/naturalezas desconocidos.
