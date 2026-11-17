import { test, expect, type Page } from "@playwright/test";
import fixture from "./fixtures/session-v5-manual.json" with { type: "json" };
const KEY = "zlocke-session-v1";
const text = `¡Luz amiga! (Pikachu) (F) @ King's Rock
Ability: Levitate
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Thunderbolt
- Protect

Aliado (Charizard-FormaAñil)
Level: 45
EVs: 300 Atk / 252 HP
- Ataque del fangame`;
async function start(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ({ key, s }) => localStorage.setItem(key, JSON.stringify(s)),
    { key: KEY, s: fixture },
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Importar Showdown", exact: true })
    .click();
  return page.getByRole("region", { name: "Importar Showdown", exact: true });
}
async function stored(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), KEY);
}
test("texto, nivel compartido, errores parciales, EV explícitos, reemplazo con respaldo y JSON", async ({
  page,
}) => {
  const ui = await start(page),
    before = await stored(page);
  await ui
    .getByRole("textbox", { name: "Texto Showdown", exact: true })
    .fill(text);
  await ui.getByRole("button", { name: "Revisar equipo", exact: true }).click();
  await expect(
    ui.getByRole("button", {
      name: "Confirmar importación Showdown",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(ui.getByLabel("Apodo 1", { exact: true })).toHaveValue(
    "¡Luz amiga!",
  );
  await expect(ui.getByLabel("Especie 2", { exact: true })).toHaveValue(
    "Charizard-FormaAñil",
  );
  await ui
    .getByLabel("Tratamiento de EV", { exact: true })
    .selectOption("file");
  await ui.getByLabel("Nivel compartido", { exact: true }).fill("50");
  await ui
    .getByRole("button", { name: "Aplicar este nivel a todos", exact: true })
    .click();
  await expect(ui.getByLabel("Nivel 2", { exact: true })).toHaveValue("50");
  await ui.getByLabel("Nivel 1", { exact: true }).fill("51");
  await expect(ui.getByLabel("EV Ataque 2", { exact: true })).toHaveValue(
    "300",
  );
  await ui.getByLabel("Incluir Pokémon 2", { exact: true }).uncheck();
  await expect(
    ui.getByRole("button", {
      name: "Confirmar importación Showdown",
      exact: true,
    }),
  ).toBeEnabled();
  expect(await stored(page)).toBe(before);
  await ui
    .getByRole("button", {
      name: "Confirmar importación Showdown",
      exact: true,
    })
    .click();
  await expect(ui).toHaveCount(0);
  const after = JSON.parse((await stored(page))!);
  expect(after.team).toHaveLength(1);
  expect(after.team[0].level).toBe(51);
  expect(after.team[0].hp).toBeNull();
  expect(after.team[0].abilityId).toBe(26);
  expect(after.team[0].moves[0].catalogId).toBe(85);
  expect(after.team[0].moves[1].category).toBe("Estado");
  expect(after.rival).toEqual(JSON.parse(before!).rival);
  expect(after.evPolicy).toBe(JSON.parse(before!).evPolicy);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key + "-backup-showdown"),
      KEY,
    ),
  ).toBe(before);
  await expect(
    page.getByRole("button", {
      name: "Descargar respaldo Showdown",
      exact: true,
    }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar JSON ↓", exact: true })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.reload();
  expect(JSON.parse((await stored(page))!).team).toEqual(after.team);
  page.once("dialog", (d) => d.accept());
  await page
    .locator('input[type=file][accept=".json,application/json"]')
    .setInputFiles(path!);
  await expect(
    page.getByRole("status").filter({ hasText: "Partida importada." }),
  ).toBeVisible();
  expect(JSON.parse((await stored(page))!)).toEqual(after);
  await expect(
    page.getByLabel("Tu Pokémon PS actuales", { exact: true }),
  ).toHaveValue("");
});
test("TXT con CRLF, añadir conserva activo, HP explícitos, corrección de naturaleza y vista móvil", async ({
  page,
}) => {
  const ui = await start(page),
    before = JSON.parse((await stored(page))!);
  await ui
    .getByLabel("Cargar archivo TXT", { exact: true })
    .setInputFiles({
      name: "anil.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Pikachu (M)\r\nAbility: Huge Power\r\nLevel: 50\r\nIVs: 0 Atk\r\nEVs: 252 Atk\r\nAdamant Nature\r\n- Surf\r\n",
      ),
    });
  await ui.getByRole("button", { name: "Revisar equipo", exact: true }).click();
  await ui
    .getByLabel("Tratamiento de EV", { exact: true })
    .selectOption("zero");
  await ui
    .getByLabel("Destino Showdown", { exact: true })
    .selectOption("append");
  await ui.getByLabel("Naturaleza 1", { exact: true }).selectOption("5");
  await ui.getByLabel("Equipo a PS completos", { exact: true }).check();
  await expect(ui.getByText("→ 0", { exact: true })).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await ui
    .getByRole("button", {
      name: "Confirmar importación Showdown",
      exact: true,
    })
    .click();
  const after = JSON.parse((await stored(page))!);
  expect(after.team).toHaveLength(before.team.length + 1);
  expect(after.team.slice(0, -1)).toEqual(before.team);
  expect(after.activeId).toBe(before.activeId);
  expect(after.rival).toEqual(before.rival);
  const p = after.team.at(-1);
  expect(p.statParams.ivs.attack).toBe(0);
  expect(p.statParams.evs.attack).toBe(0);
  expect(p.statParams.natureId).toBe(5);
  expect(p.abilityId).toBe(37);
  expect(p.hp).toBeGreaterThan(0);
  expect(p.showdown.sex).toBe("M");
});
test("cancelación conserva datos; corrige coincidencias y mantiene estimados/desconocidos", async ({
  page,
}) => {
  const ui = await start(page),
    before = await stored(page);
  await ui
    .getByRole("textbox", { name: "Texto Showdown", exact: true })
    .fill(text);
  await ui.getByRole("button", { name: "Revisar equipo", exact: true }).click();
  await ui.getByLabel("Especie 2", { exact: true }).fill("Charizard");
  await ui.getByLabel("Habilidad 2", { exact: true }).fill("Levitación");
  await ui
    .getByLabel("Movimiento 1 Pokémon 2", { exact: true })
    .fill("Lanzallamas");
  await ui.getByLabel("EV Ataque 2", { exact: true }).fill("0");
  await ui
    .getByLabel("Tratamiento de EV", { exact: true })
    .selectOption("zero");
  await ui.getByLabel("Nivel 1", { exact: true }).fill("40");
  await expect(
    ui.getByRole("button", {
      name: "Confirmar importación Showdown",
      exact: true,
    }),
  ).toBeEnabled();
  await ui
    .getByRole("button", { name: "Cancelar sin cambios", exact: true })
    .click();
  expect(await stored(page)).toBe(before);
  await page
    .getByRole("button", { name: "Importar Showdown", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Texto Showdown", exact: true })
    .fill("Pikachu\nLevel: 50\n- Protección");
  await page
    .getByRole("button", { name: "Revisar equipo", exact: true })
    .click();
  await page
    .getByLabel("Tratamiento de EV", { exact: true })
    .selectOption("file");
  await page
    .getByRole("button", {
      name: "Confirmar importación Showdown",
      exact: true,
    })
    .click();
  const p = JSON.parse((await stored(page))!).team[0];
  expect(p.statMode).toBe("estimated");
  expect(p.statParams.natureId).toBeNull();
  expect(p.hp).toBeNull();
  expect(p.abilityState).toBe("unknown");
  expect(p.itemState).toBe("none");
});
test("límite de seis, bloque inválido y fallo de respaldo no causan importación parcial", async ({
  page,
}) => {
  const ui = await start(page),
    before = await stored(page);
  await ui
    .getByLabel("Texto Showdown", { exact: true })
    .fill(
      Array.from({ length: 7 }, () => `Pikachu\nLevel: 50\nTimid Nature`).join(
        "\n\n",
      ),
    );
  await ui.getByRole("button", { name: "Revisar equipo", exact: true }).click();
  await ui
    .getByLabel("Tratamiento de EV", { exact: true })
    .selectOption("file");
  await expect(
    ui.getByRole("button", {
      name: "Confirmar importación Showdown",
      exact: true,
    }),
  ).toBeDisabled();
  await ui.getByLabel("Incluir Pokémon 7", { exact: true }).uncheck();
  await expect(
    ui.getByRole("button", {
      name: "Confirmar importación Showdown",
      exact: true,
    }),
  ).toBeEnabled();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k.endsWith("-backup-showdown"))
        throw new Error("Respaldo no disponible");
      return original.call(this, k, v);
    };
  });
  await ui
    .getByRole("button", {
      name: "Confirmar importación Showdown",
      exact: true,
    })
    .click();
  await expect(ui.getByRole("alert")).toHaveText("Respaldo no disponible");
  expect(await stored(page)).toBe(before);
});
