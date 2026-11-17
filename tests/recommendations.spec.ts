import { test, expect, type Page } from "@playwright/test";
import original from "./fixtures/session-v5-manual.json" with { type: "json" };
function fixture() {
  const s = structuredClone(original);
  s.demo = false;
  const blank = structuredClone(s.rival.moves[3]);
  const tackle = {
    ...blank,
    name: "Placaje",
    catalogId: 33,
    type: "Normal",
    category: "Físico",
    power: 40,
    powerMode: "number",
    accuracy: 100,
    accuracyMode: "number",
    priority: 0,
    damageKind: "direct",
    source: "Catálogo",
  };
  function mon(p: (typeof s.team)[0], name: string) {
    return {
      ...structuredClone(p),
      name,
      species: "",
      speciesId: null,
      statMode: "manual",
      hp: 100,
      maxHp: 100,
      hpReview: false,
      attack: 100,
      defense: 100,
      spAttack: 100,
      spDefense: 100,
      speed: 100,
      level: 50,
      types: ["Normal"],
      typesKnown: true,
      secondType: "none",
      abilityState: "none",
      itemState: "none",
      abilityId: null,
      itemId: null,
      ability: "",
      item: "",
      burn: "none",
      paralysis: "none",
      stages: { attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
      moves: [
        structuredClone(tackle),
        structuredClone(blank),
        structuredClone(blank),
        structuredClone(blank),
      ],
    };
  }
  const a = mon(s.team[0], "Activo"),
    b = mon(s.team[0], "Reserva");
  b.id = "reserve";
  a.hp = 1;
  a.speed = 1;
  b.speed = 50;
  return { ...s, team: [a, b], activeId: a.id, rival: mon(s.team[0], "Rival") };
}
async function seed(page: Page, s: ReturnType<typeof fixture>) {
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("zlocke-session-v1", JSON.stringify(s)),
    s,
  );
  await page.reload();
  return page.getByRole("article", {
    name: "Sugerencia de ZLocke",
    exact: true,
  });
}
async function saved(page: Page) {
  return page.evaluate(() => localStorage.getItem("zlocke-session-v1"));
}
test("destaca atacar antes del KO y mantiene cálculos y móvil accesibles", async ({
  page,
}) => {
  const s = fixture();
  s.team[0].speed = 200;
  s.rival.hp = 1;
  const card = await seed(page, s),
    before = await saved(page);
  await expect(card.getByTestId("suggested-action")).toHaveText(
    "Atacar con Placaje",
  );
  await expect(
    card.getByText("Recomendación provisional", { exact: true }),
  ).toBeVisible();
  await expect(card.locator(".recommendation-risk")).toContainText("3 ranuras");
  await card
    .getByText("Ver cálculos: Atacar con Placaje", { exact: true })
    .first()
    .click();
  await expect(card.getByText(/Daño de respuesta:/).first()).toContainText(
    "Precisión: 100%",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await saved(page)).toBe(before);
});
test("distingue cambio voluntario, doble golpe y entrada libre sin tocar guardado", async ({
  page,
}) => {
  const s = fixture();
  s.team[1].hp = 40;
  const card = await seed(page, s),
    before = await saved(page);
  await expect(card.getByTestId("suggested-action")).toContainText(
    "No hay una acción",
  );
  await card
    .getByLabel("Contexto de entrada", { exact: true })
    .selectOption("free");
  await expect(card.getByTestId("suggested-action")).toContainText(
    "Dar entrada libre a Reserva",
  );
  await card
    .getByText(/Ver cálculos: Dar entrada libre/)
    .first()
    .click();
  await expect(
    card.getByText(/Entrada libre: solo siguiente intercambio/).first(),
  ).toBeVisible();
  expect(await saved(page)).toBe(before);
  await page.reload();
  await expect(
    page.getByLabel("Contexto de entrada", { exact: true }),
  ).toHaveValue("normal");
});
test("PS desconocidos, estado y datos faltantes no se convierten en seguridad", async ({
  page,
}) => {
  const s = fixture();
  s.team[0].hp = null!;
  s.team[1].hp = null!;
  s.team[0].moves[1] = {
    ...s.team[0].moves[0],
    name: "Protección",
    catalogId: 182,
    category: "Estado",
    powerMode: "status",
    power: null!,
    priority: 4,
  };
  const card = await seed(page, s);
  await expect(card.getByTestId("suggested-action")).toContainText(
    "No hay una acción",
  );
  await card.getByText("Qué dato ayudaría a decidir", { exact: true }).click();
  await expect(
    card
      .locator("details")
      .filter({
        has: page.getByText("Qué dato ayudaría a decidir", { exact: true }),
      })
      .getByText("PS actuales del activo.", { exact: true }),
  ).toBeVisible();
  await card
    .getByText("Opciones sin puntuar y límites", { exact: true })
    .click();
  await expect(
    card.getByText(/Activo: Protección.*opción no evaluada, no inútil/),
  ).toBeVisible();
});
test("activo debilitado requiere reemplazo libre, excluye compañero KO y conserva importador", async ({
  page,
}) => {
  const s = fixture();
  s.team[0].hp = 0;
  const dead = {
    ...structuredClone(s.team[1]),
    id: "dead",
    name: "Debilitado",
    hp: 0,
  };
  s.team.push(dead);
  const card = await seed(page, s);
  await expect(
    card.getByLabel("Contexto de entrada", { exact: true }),
  ).toHaveValue("free");
  await expect(card.getByTestId("suggested-action")).toContainText(
    "Dar entrada libre a Reserva",
  );
  await card
    .getByText("Todas las opciones y sus cálculos", { exact: true })
    .click();
  await expect(card.getByText(/Ver cálculos:.*Debilitado/)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Importar Showdown", exact: true })
    .click();
  await expect(
    page.getByLabel("Texto Showdown", { exact: true }),
  ).toBeVisible();
});
