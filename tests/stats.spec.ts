import { test, expect } from "@playwright/test";
import fixture from "./fixtures/session-v5-manual.json" with { type: "json" };
test("calculado sube de nivel sin curar ni perder manuales; rechaza EV ilegales", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await page
    .getByLabel("Tu Pokémon modo estadísticas", { exact: true })
    .selectOption("manual");
  await page.getByLabel("Ataque real", { exact: true }).fill("123");
  await page
    .getByRole("combobox", { name: "Tu Pokémon: buscar especie", exact: true })
    .fill("Pikachu");
  await page.getByRole("option", { name: "Pikachu #25", exact: true }).click();
  await page
    .getByLabel("Tu Pokémon modo estadísticas", { exact: true })
    .selectOption("calculated");
  await page.getByLabel("Tu Pokémon nivel", { exact: true }).fill("50");
  await page
    .getByRole("button", { name: "Fijar todos los IV a 31", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar todos los EV a 0", exact: true })
    .click();
  await page
    .getByLabel("Tu Pokémon naturaleza", { exact: true })
    .selectOption("1");
  await expect(page.locator("output").first()).toContainText("110–110");
  await page.getByLabel("Tu Pokémon PS actuales", { exact: true }).fill("55");
  await page.getByLabel("Tu Pokémon nivel", { exact: true }).fill("51");
  await expect(page.locator("output").first()).toContainText("112–112");
  await expect(
    page.getByLabel("Tu Pokémon PS actuales", { exact: true }),
  ).toHaveValue("55");
  await page
    .getByRole("button", { name: "Confirmar PS actuales", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zlocke-session-v1")!).team[0].hpReview,
    ),
  ).toBe(false);
  await page.getByLabel("Tu Pokémon EV attack", { exact: true }).fill("252");
  await page.getByLabel("Tu Pokémon EV speed", { exact: true }).fill("252");
  await page.getByLabel("Tu Pokémon EV hp", { exact: true }).fill("8");
  await expect(page.getByRole("alert")).toContainText("510");
  await expect(
    page.getByLabel("Tu Pokémon EV hp", { exact: true }),
  ).toHaveValue("0");
  await page
    .getByLabel("Tu Pokémon modo estadísticas", { exact: true })
    .selectOption("manual");
  await expect(page.getByLabel("Ataque real", { exact: true })).toHaveValue(
    "123",
  );
  await page.reload();
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await expect(page.getByLabel("Ataque real", { exact: true })).toHaveValue(
    "123",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("rival solo especie/nivel usa intervalos en combate sin inventar PS o estadísticas reales", async ({
  page,
}) => {
  const s = structuredClone(fixture);
  s.rival.statMode = "estimated";
  s.rival.hp = null;
  s.rival.maxHp = null;
  s.rival.defense = null;
  s.rival.spDefense = null;
  s.rival.speciesId = null;
  s.rival.level = null;
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("zlocke-session-v1", JSON.stringify(s)),
    s,
  );
  await page.reload();
  await page
    .getByRole("combobox", { name: "Rival: buscar especie", exact: true })
    .fill("Blastoise");
  await page.getByRole("option", { name: "Blastoise #9", exact: true }).click();
  await page.getByLabel("Rival nivel", { exact: true }).fill("50");
  const row = page.getByTestId("damage-result").first();
  await expect(row).toContainText("Estimación");
  await expect(row).toContainText("Azar con el escenario de referencia");
  await expect(row).toContainText("Solo incertidumbre de estadísticas");
  await expect(row).toContainText("Faltan PS actuales");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zlocke-session-v1")!).rival.defense,
    ),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByLabel("Rival modo estadísticas", { exact: true }),
  ).toHaveValue("estimated");
  await expect(
    page.getByLabel("Rival naturaleza", { exact: true }),
  ).toHaveValue("");
  await page.locator(".party-settings > summary").click();
  await page
    .getByLabel("Configuración EV", { exact: true })
    .selectOption("zero");
  await expect(row).toContainText("EV confirmados a cero");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("reconoce movimiento por ID y no ofrece una casilla que convierta especiales en simples", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("zlocke-session-v1", JSON.stringify(s)),
    fixture,
  );
  await page.reload();
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await page.locator(".move-editor > summary").first().click();
  const search = page.getByRole("combobox", {
    name: "Tu Pokémon movimiento 1: buscar movimiento",
    exact: true,
  });
  await search.fill("Patada Baja");
  await page
    .getByRole("option", { name: "Patada Baja #67", exact: true })
    .click();
  await expect(page.locator(".move-editor").first()).toContainText(
    "Efecto todavía no implementado",
  );
  await expect(
    page.getByLabel("Tu Pokémon movimiento 1 comportamiento daño", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByLabel("Tu Pokémon movimiento 1 Potencia manual (fija)", {
      exact: true,
    })
    .fill("80");
  await page.getByRole("button", { name: "Combate", exact: true }).click();
  await expect(page.getByTestId("damage-result").first()).toContainText(
    "No calculable",
  );
  await expect(page.getByTestId("damage-result").first()).toContainText(
    "no está verificada",
  );
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await page.locator(".move-editor > summary").first().click();
  await search.fill("Placaje");
  await page.getByRole("option", { name: "Placaje #33", exact: true }).click();
  await expect(page.locator(".move-editor").first()).toContainText(
    "Calculable",
  );
  await page
    .getByLabel("Tu Pokémon movimiento 1 Potencia manual (fija)", {
      exact: true,
    })
    .fill("95");
  await page.getByRole("button", { name: "Combate", exact: true }).click();
  await expect(page.getByTestId("damage-result").first()).not.toContainText(
    "No calculable",
  );
});
test("EV cero no sobrescribe EV ya conocidos y bases personalizadas no cambian el catálogo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tu Pokémon: buscar especie", exact: true })
    .fill("Pikachu");
  await page.getByRole("option", { name: "Pikachu #25", exact: true }).click();
  await page.getByLabel("Tu Pokémon nivel", { exact: true }).fill("50");
  await page.getByLabel("Tu Pokémon EV speed", { exact: true }).fill("252");
  await page.locator(".party-settings > summary").click();
  await page
    .getByLabel("Configuración EV", { exact: true })
    .selectOption("zero");
  await expect(page.locator(".stat-editor")).toContainText(
    "entra en conflicto",
  );
  await expect(
    page.getByLabel("Tu Pokémon EV speed", { exact: true }),
  ).toHaveValue("252");
  await page
    .getByLabel("Configuración EV", { exact: true })
    .selectOption("unknown");
  await page
    .getByText("Bases personalizadas y excepción de PS", { exact: true })
    .click();
  await page
    .getByRole("button", { name: /Crear copia editable de bases/ })
    .click();
  await page.getByLabel("Tu Pokémon base attack", { exact: true }).fill("120");
  await page.reload();
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zlocke-session-v1")!).team[0]
          .statParams.customBases.attack,
    ),
  ).toBe(120);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zlocke-session-v1")!).team[0]
          .statParams.evs.speed,
    ),
  ).toBe(252);
});

test("v4 se respalda y conserva manuales; exporta modos y parámetros sin activar estimaciones", async ({
  page,
}) => {
  const { default: v4 } = await import("./fixtures/session-v4-manual.json", {
    with: { type: "json" },
  });
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("zlocke-session-v1", JSON.stringify(s)),
    v4,
  );
  await page.reload();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("zlocke-session-v1-backup-v4")!)
          .version,
    ),
  ).toBe(4);
  await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await expect(
    page.getByLabel("Tu Pokémon modo estadísticas", { exact: true }),
  ).toHaveValue("manual");
  await expect(page.getByLabel("Ataque real", { exact: true })).toHaveValue(
    "100",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportar JSON/ }).click();
  const stream = await (await downloadPromise).createReadStream();
  let data = "";
  for await (const chunk of stream!) data += chunk.toString();
  const exported = JSON.parse(data);
  expect(exported.version).toBe(5);
  expect(exported.team[0].statMode).toBe("manual");
  expect(exported.team[0].statParams.ivs.hp).toBeNull();
  expect(exported.team[0].moves[0].catalogId).toBe(33);
  page.on("dialog", (d) => d.accept());
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "v5.json",
      mimeType: "application/json",
      buffer: Buffer.from(data),
    });
  await expect(page.getByRole("status")).toContainText("Partida importada");
  await expect(
    page.getByLabel("Tu Pokémon modo estadísticas", { exact: true }),
  ).toHaveValue("manual");
});
