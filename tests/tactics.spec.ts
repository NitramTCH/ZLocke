import { test, expect, type Page } from "@playwright/test";
import original from "./fixtures/session-v5-manual.json" with { type: "json" };
function fixture() {
  const s = structuredClone(original);
  s.demo = false;
  const active = s.team[0];
  active.name = "Activo";
  active.abilityState = "none";
  active.itemState = "none";
  active.moves[0].priority = -1;
  active.moves[0].power = 200;
  active.moves[1] = {
    ...active.moves[3],
    name: "Protección",
    catalogId: 182,
    category: "Estado",
    powerMode: "status",
    priority: 4,
  };
  active.moves[2] = {
    ...active.moves[0],
    name: "Patada Baja",
    catalogId: 67,
    power: null,
    powerMode: "variable",
  };
  active.moves[3] = structuredClone(original.rival.moves[3]);
  s.rival.name = "Rival";
  s.rival.hp = 20;
  s.rival.speed = 80;
  s.rival.spAttack = 200;
  s.rival.abilityState = "none";
  s.rival.itemState = "none";
  s.rival.moves[0].priority = 0;
  s.rival.moves[0].power = 200;
  s.rival.moves[1] = { ...active.moves[1] };
  const fast = {
    ...structuredClone(active),
    id: "fast",
    name: "Veloz",
    hp: 120,
    maxHp: 200,
    speed: 300,
    spDefense: 200,
    types: ["Normal"],
  };
  const immune = {
    ...structuredClone(active),
    id: "immune",
    name: "Tierra sin PS",
    hp: null,
    maxHp: 200,
    types: ["Tierra"],
  };
  const fainted = {
    ...structuredClone(active),
    id: "fainted",
    name: "Debilitado",
    hp: 0,
  };
  s.team = [active, fast, immune, fainted];
  return s;
}
async function seed(page: Page, s: ReturnType<typeof fixture>) {
  await page.goto("/");
  await page.evaluate(
    (value) => localStorage.setItem("zlocke-session-v1", JSON.stringify(value)),
    s,
  );
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Resumen táctico", exact: true }),
  ).toBeVisible();
}
test("resumen enlaza orden, ataques, amenazas y cambios sin alterar el guardado", async ({
  page,
}) => {
  await seed(page, fixture());
  const panel = page.getByRole("region", {
    name: "Resumen táctico",
    exact: true,
  });
  const before = await page.evaluate(() =>
    localStorage.getItem("zlocke-session-v1"),
  );
  await expect(panel).toContainText("Reglas estándar de generación IX");
  await expect(panel.getByTestId("tactical-order")).toContainText("prioridad");
  await expect(panel.getByTestId("tactical-order")).toContainText("el rival");
  await panel.getByRole("button", { name: "Ataques", exact: true }).click();
  const attack = panel.getByTestId("tactical-attack").first();
  await expect(attack).toContainText(
    "todos los escenarios calculados si acierta",
  );
  await expect(attack).toContainText("rival podría actuar antes");
  await expect(attack).toContainText("Precisión separada: 85%");
  await panel.getByLabel("Ordenar ataques del resumen").selectOption("damage");
  await expect(panel.getByTestId("tactical-attack")).toHaveCount(4);
  await expect(panel).toContainText("utilidad no puntuada");
  await expect(
    panel
      .getByTestId("tactical-attack")
      .filter({
        has: page.getByRole("heading", { name: "Protección", exact: true }),
      }),
  ).toContainText("Sin daño comparable");
  await panel.getByRole("button", { name: "Amenazas", exact: true }).click();
  await expect(panel).toContainText("2 ranuras sin identificar");
  await expect(panel.getByTestId("tactical-threat")).toHaveCount(2);
  await expect(panel.getByTestId("tactical-threat").first()).toContainText(
    "todos los escenarios calculados si acierta",
  );
  await expect(panel.getByTestId("tactical-threat").nth(1)).toContainText(
    "Movimiento de estado",
  );
  await panel.getByRole("button", { name: "Cambios", exact: true }).click();
  await panel.getByLabel("Ordenar cambios del resumen").selectOption("worst");
  await expect(panel.getByTestId("tactical-switch")).toHaveCount(2);
  await expect(panel.getByTestId("tactical-switch").first()).toContainText(
    "Tierra sin PS",
  );
  await expect(panel.getByTestId("tactical-switch").first()).toContainText(
    "Inmunidad por tipos",
  );
  await expect(panel.getByTestId("tactical-switch").first()).toContainText(
    "PS restantes no determinables",
  );
  const fast = panel.getByTestId("tactical-switch").nth(1);
  await expect(fast).toContainText("su velocidad no evita ese golpe");
  await expect(fast).toContainText("PS restantes tras este golpe");
  await expect(panel).toContainText(
    "Excluidos por 0 PS confirmados: Debilitado",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("zlocke-session-v1")),
  ).toBe(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("los selectores de orden comparten estado con la comparación detallada", async ({
  page,
}) => {
  await seed(page, fixture());
  const panel = page.getByRole("region", {
    name: "Resumen táctico",
    exact: true,
  });
  await panel.getByLabel("Tu movimiento para resumen").selectOption("1");
  await expect(
    page.getByLabel("Tu movimiento para orden", { exact: true }),
  ).toHaveValue("1");
  await expect(panel.getByTestId("tactical-order")).toContainText("tu Pokémon");
  await page
    .getByLabel("Tu movimiento para orden", { exact: true })
    .selectOption("0");
  await expect(panel.getByLabel("Tu movimiento para resumen")).toHaveValue("0");
  await expect(panel.getByTestId("tactical-order")).toContainText("el rival");
});
test("PS desconocidos y efectos no implementados no permiten concluir supervivencia", async ({
  page,
}) => {
  const s = fixture();
  s.team[0].hp = null;
  s.team[0].abilityState = "unknown";
  s.rival.itemState = "known";
  s.rival.item = "Objeto de fangame";
  await seed(page, s);
  const panel = page.getByRole("region", {
    name: "Resumen táctico",
    exact: true,
  });
  await expect(panel).toContainText("Faltan PS actuales del activo");
  await panel.getByRole("button", { name: "Amenazas", exact: true }).click();
  await expect(panel.getByTestId("tactical-threat").first()).toContainText(
    "no se concluye si debilita ni que sobreviva",
  );
  await panel
    .getByRole("button", { name: "Datos y límites", exact: true })
    .click();
  await expect(panel).toContainText("Objeto de fangame no implementado");
  await expect(panel).toContainText("habilidad desconocida");
});
test("intervalos solapados no asignan un orden y estado no equivale a estar a salvo", async ({
  page,
}) => {
  const s = fixture();
  s.team = [s.team[0]];
  for (const p of [s.team[0], s.rival]) {
    p.statMode = "estimated";
    p.species = "Pikachu";
    p.speciesId = 25;
    p.level = 50;
    p.hp = null;
    p.types = ["Eléctrico"];
    p.moves[0] = {
      ...p.moves[0],
      name: "Placaje",
      catalogId: 33,
      priority: 0,
      power: 40,
      type: "Normal",
      category: "Físico",
      powerMode: "number",
    };
  }
  await seed(page, s);
  const panel = page.getByRole("region", {
    name: "Resumen táctico",
    exact: true,
  });
  await expect(panel.getByTestId("tactical-order")).toContainText("se solapan");
  await expect(panel.getByTestId("tactical-order")).toContainText(
    "orden no queda determinado",
  );
  const statusOnly = fixture();
  statusOnly.rival.moves[0] = { ...statusOnly.rival.moves[1] };
  statusOnly.rival.moves[1] = { ...original.rival.moves[3] };
  await page.evaluate(
    (value) => localStorage.setItem("zlocke-session-v1", JSON.stringify(value)),
    statusOnly,
  );
  await page.reload();
  await expect(panel).toContainText("Ninguna amenaza conocida calculable");
  await expect(panel).toContainText("No equivale a estar a salvo");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
