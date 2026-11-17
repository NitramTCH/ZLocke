import { test, expect } from "@playwright/test";
import legacy from "./fixtures/session-v1.json" with { type: "json" };
test("búsqueda, selección y ajustes manuales sin inventar sets", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tu Pokémon: buscar especie", exact: true })
    .fill("pika");
  await page.getByRole("option", { name: "Pikachu #25", exact: true }).click();
  await expect(
    page.getByLabel("Tu Pokémon tipo 1", { exact: true }),
  ).toHaveValue("Eléctrico");
  await expect(
    page.getByLabel("Tu Pokémon tipo 2", { exact: true }),
  ).toHaveValue("none");
  await expect(
    page.getByLabel("Tu Pokémon Velocidad real", { exact: true }),
  ).toHaveValue("");
  await page.getByLabel("Tu Pokémon apodo", { exact: true }).fill("Chispa");
  await page.locator(".move-editor > summary").first().click();
  await page
    .getByRole("combobox", {
      name: "Tu Pokémon movimiento 1: buscar movimiento",
      exact: true,
    })
    .fill("surf");
  await page.getByRole("option", { name: "Surf #57", exact: true }).click();
  await expect(
    page.getByLabel("Tu Pokémon movimiento 1 tipo", { exact: true }),
  ).toHaveValue("Agua");
  await expect(
    page.getByLabel("Tu Pokémon movimiento 1 Potencia manual (fija)", {
      exact: true,
    }),
  ).toHaveValue("90");
  await page
    .getByLabel("Tu Pokémon movimiento 1 Potencia manual (fija)", {
      exact: true,
    })
    .fill("95");
  await expect(
    page.getByText("Ajuste manual.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Combate", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chispa", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Rival: buscar especie", exact: true })
    .fill("charizard");
  await page.getByRole("option", { name: "Charizard #6", exact: true }).click();
  await expect(page.getByLabel("Rival tipo 2", { exact: true })).toHaveValue(
    "Volador",
  );
  await page
    .getByLabel("Rival tipo 2", { exact: true })
    .selectOption("unknown");
  await expect(page.locator(".move-result").nth(1)).toContainText("?");
  await page.getByLabel("Rival PS máximos", { exact: true }).fill("100");
  await page.getByLabel("Rival PS actuales", { exact: true }).fill("73");
  await page.reload();
  await expect(
    page.getByLabel("Rival PS actuales", { exact: true }),
  ).toHaveValue("73");
  await expect(page.getByLabel("Rival tipo 2", { exact: true })).toHaveValue(
    "unknown",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("migra localStorage y JSON antiguo, respalda y exporta versión 3", async ({
  page,
}) => {
  await page.addInitScript(
    (value) => localStorage.setItem("zlocke-session-v1", JSON.stringify(value)),
    legacy,
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Volt · ejemplo", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("zlocke-session-v1")!).version,
    ),
  ).toBe(3);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zlocke-session-v1-backup")!).version,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await expect(
    page.getByLabel("Tu Pokémon tipo 2", { exact: true }),
  ).toHaveValue("unknown");
  await page
    .getByLabel("Tu Pokémon tipo 2", { exact: true })
    .selectOption("none");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportar JSON/ }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  expect(JSON.parse(text).team[0].secondType).toBe("none");
  expect(JSON.parse(text).version).toBe(3);
  page.on("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect(page.getByRole("status")).toContainText("Partida importada");
  await expect(
    page.getByLabel("Tu Pokémon tipo 2", { exact: true }),
  ).toHaveValue("unknown");
});
test("búsqueda por teclado y movimientos especiales no se convierten en potencia fija", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  const species = page.getByRole("combobox", {
    name: "Tu Pokémon: buscar especie",
    exact: true,
  });
  await species.fill("Bulbasaur");
  await species.press("Enter");
  await expect(
    page.getByLabel("Tu Pokémon tipo 2", { exact: true }),
  ).toHaveValue("Veneno");
  await page.locator(".move-editor > summary").first().click();
  const move = page.getByRole("combobox", {
    name: "Tu Pokémon movimiento 1: buscar movimiento",
    exact: true,
  });
  await move.fill("Patada Baja");
  await move.press("Enter");
  await expect(
    page.getByLabel("Tu Pokémon movimiento 1 clase de potencia", {
      exact: true,
    }),
  ).toHaveValue("variable");
  await expect(
    page.getByLabel("Tu Pokémon movimiento 1 Potencia manual (fija)", {
      exact: true,
    }),
  ).toHaveValue("");
  await move.fill("Proteccion");
  await move.press("Enter");
  await expect(
    page.getByLabel("Tu Pokémon movimiento 1 categoría", { exact: true }),
  ).toHaveValue("Estado");
  await expect(
    page.getByLabel("Tu Pokémon movimiento 1 Potencia manual (fija)", {
      exact: true,
    }),
  ).toHaveCount(0);
});

test("daño en ambos sentidos, etapas, quemadura y consulta sin cambiar PS", async ({
  page,
}) => {
  const { default: fixture } = await import(
    "./fixtures/session-v3-damage.json",
    { with: { type: "json" } }
  );
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("zlocke-session-v1", JSON.stringify(s)),
    fixture,
  );
  await page.reload();
  await expect(page.getByLabel("Perfil de reglas")).toHaveValue(
    "gen9-standard",
  );
  const row = page.getByTestId("damage-result").first();
  await expect(row).toContainText("92–110 PS");
  await expect(row).toContainText("46.0–55.0%");
  await expect(row).toContainText("Puede debilitar en este escenario");
  await expect(row).toContainText("Precisión separada: 85%");
  await expect(row).toContainText("Habilidad atacante: desconocido");
  await expect(page.getByTestId("damage-result").nth(4)).not.toContainText(
    "No calculable",
  );
  await page.locator(".battle-conditions > summary").first().click();
  await page
    .getByLabel("Tu Pokémon quemadura", { exact: true })
    .selectOption("burned");
  await expect(row).toContainText("46–55 PS");
  await page
    .getByLabel("Tu Pokémon etapa attack", { exact: true })
    .selectOption("2");
  await expect(row).not.toContainText("46–55 PS");
  await expect(
    page.getByLabel("Tu Pokémon PS actuales", { exact: true }),
  ).toHaveValue(String(fixture.team[0].hp));
  await expect(
    page.getByLabel("Rival PS actuales", { exact: true }),
  ).toHaveValue("100");
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await page.locator(".move-editor > summary").first().click();
  await page
    .getByLabel("Tu Pokémon movimiento 1 Potencia manual (fija)", {
      exact: true,
    })
    .fill("100");
  await page.getByRole("button", { name: "Combate", exact: true }).click();
  const changed = await row.locator(".damage-range").textContent();
  await expect(row).toContainText("Precisión separada: 85%");
  await page.reload();
  await expect(row.locator(".damage-range")).toHaveText(changed!);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("migración v2 con respaldo específico y sin inventar estados", async ({
  page,
}) => {
  const { default: fixture } = await import("./fixtures/session-v2.json", {
    with: { type: "json" },
  });
  await page.goto("/");
  await page.evaluate((s) => {
    localStorage.setItem("zlocke-session-v1", JSON.stringify(s));
    localStorage.setItem("zlocke-session-v1-backup", "respaldo anterior");
  }, fixture);
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("zlocke-session-v1")!).version,
    ),
  ).toBe(3);
  expect(
    await page.evaluate(() => localStorage.getItem("zlocke-session-v1-backup")),
  ).toBe("respaldo anterior");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zlocke-session-v1-backup-v2")!)
          .version,
    ),
  ).toBe(2);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zlocke-session-v1")!),
  );
  expect(saved.team[0].stages.attack).toBeNull();
  expect(saved.team[0].burn).toBe("unknown");
  expect(saved.team[0].abilityState).toBe("unknown");
  await expect(page.getByTestId("damage-result").first()).toContainText(
    "No calculable",
  );
});
