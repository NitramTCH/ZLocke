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
test("migra localStorage y JSON antiguo, respalda y exporta versión 2", async ({
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
  ).toBe(2);
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
  expect(JSON.parse(text).version).toBe(2);
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
