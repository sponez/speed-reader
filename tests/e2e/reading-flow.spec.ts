import { expect, test, type Locator } from "@playwright/test";

const readingText = [
  "This reader smoke test uses enough words to keep the session open while",
  "Playwright checks the guided window renderer and the escape return flow.",
  "The focus window should contain a phrase, blurred words should stay outside",
  "the current phrase, and the draft should return to setup after escape.",
].join(" ");
const longBookText = Array.from({ length: 28 }, (_, index) =>
  [
    `Section ${index + 1}.`,
    "Long form reading material should continue onto the next page without",
    "repeating the same visible word range on adjacent page surfaces.",
    "This sentence adds enough length for pagination in the book presentation.",
  ].join(" "),
).join("\n\n");

async function setInputValue(input: Locator, value: string) {
  await input.evaluate(
    (element, nextValue) => {
      const inputElement = element as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;

      valueSetter?.call(inputElement, nextValue);
      inputElement.dispatchEvent(new Event("input", { bubbles: true }));
      inputElement.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
  );
}

test("validates target speed without blocking keyboard input", async ({
  page,
}) => {
  await page.goto("/");

  const readingMaterial = page.getByLabel("Reading material");
  const targetSpeed = page.getByLabel("Target speed");
  const startButton = page.getByRole("button", { name: "Start" });

  await readingMaterial.fill(readingText);
  await expect(startButton).toBeEnabled();

  await targetSpeed.fill("");
  await expect(targetSpeed).toHaveValue("");
  await expect(startButton).toBeDisabled();

  await targetSpeed.fill("99");
  await expect(startButton).toBeDisabled();

  await targetSpeed.fill("100");
  await expect(startButton).toBeEnabled();

  await targetSpeed.fill("255");
  await expect(startButton).toBeEnabled();

  await targetSpeed.fill("250.5");
  await expect(startButton).toBeEnabled();

  await targetSpeed.fill("5000");
  await expect(startButton).toBeEnabled();

  await targetSpeed.fill("5001");
  await expect(startButton).toBeDisabled();
});

test("runs the guided reading flow and returns to setup with the same draft", async ({
  page,
}) => {
  await page.goto("/");

  const readingMaterial = page.getByLabel("Reading material");
  await expect(readingMaterial).toBeVisible();

  await readingMaterial.fill(readingText);
  await page.getByLabel("Target speed").fill("120");
  await page.getByLabel("Window size").fill("3");
  await setInputValue(page.getByLabel("Blur intensity"), "4");
  await setInputValue(page.getByLabel("Focus highlight"), "80");

  await page.getByRole("button", { name: "Start" }).click();

  await expect(readingMaterial).toBeHidden();
  await expect(page.getByText("Reading session")).toBeVisible();

  const metrics = page.getByLabel("Session metrics");
  await expect(metrics).toContainText("120 WPM");
  await expect(metrics).toContainText("3 words");
  await expect(metrics).toContainText("4px");
  await expect(metrics).toContainText("80%");

  const readingSurface = page.getByLabel("Reading surface");
  await expect(readingSurface).toBeVisible();
  await expect(readingSurface).toHaveAttribute(
    "data-reading-presentation",
    "continuous",
  );
  await expect(page.getByLabel("Reading text")).toContainText(
    "guided window renderer",
  );

  await expect(
    page.locator('[data-guided-presentation="continuous"]'),
  ).toBeVisible();

  await expect
    .poll(async () =>
      readingSurface.evaluate((element) => {
        const style = window.getComputedStyle(element);

        return style.overflowY;
      }),
    )
    .toBe("hidden");

  const focusedWords = page.locator(
    '[data-token-kind="word"][data-token-state~="focus"]',
  );
  await expect(focusedWords).toHaveCount(3);
  await expect(
    page.locator('[data-token-state~="active-anchor"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-token-state~="highlighted"]').first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-token-state~="blurred"]').first(),
  ).toBeVisible();

  const focusedWordInsideSurface = await focusedWords.first().evaluate(
    (element) => {
      const tokenRect = element.getBoundingClientRect();
      const surface = element.closest(".reading-surface");

      if (surface === null) {
        return false;
      }

      const surfaceRect = surface.getBoundingClientRect();

      return (
        tokenRect.top >= surfaceRect.top &&
        tokenRect.bottom <= surfaceRect.bottom
      );
    },
  );

  expect(focusedWordInsideSurface).toBe(true);

  await page.keyboard.press("Escape");

  await expect(readingMaterial).toBeVisible();
  await expect(readingMaterial).toHaveValue(readingText);
  await expect(page.getByLabel("Target speed")).toHaveValue("120");
  await expect(page.getByLabel("Window size")).toHaveValue("3");
  await expect(page.getByLabel("Blur intensity")).toHaveValue("4");
  await expect(page.getByLabel("Focus highlight")).toHaveValue("80");
});

test("applies themes to setup and reading screens", async ({ page }) => {
  await page.goto("/");

  const preparationScreen = page.locator(".preparation-screen");
  await expect(preparationScreen).toHaveAttribute("data-app-theme", "light");

  await page.getByText("Dark", { exact: true }).click();
  await expect(preparationScreen).toHaveAttribute("data-app-theme", "dark");

  const warmth = page.getByLabel("Warmth");
  await expect(warmth).toBeVisible();
  await setInputValue(warmth, "75");

  await page.getByLabel("Reading material").fill(readingText);
  await page.getByLabel("Target speed").fill("120");
  await page.getByRole("button", { name: "Start" }).click();

  const readingScreen = page.locator(".reading-screen");
  await expect(readingScreen).toHaveAttribute("data-app-theme", "dark");
  await expect(readingScreen).toHaveCSS("--app-warmth-intensity", "75%");

  await page.keyboard.press("Escape");

  await expect(page.locator(".preparation-screen")).toHaveAttribute(
    "data-app-theme",
    "dark",
  );
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(page.getByLabel("Warmth")).toHaveValue("75");
});

test("runs the flash chunks reading flow and returns to setup", async ({
  page,
}) => {
  await page.goto("/");

  const readingMaterial = page.getByLabel("Reading material");

  await readingMaterial.fill("Alpha beta. Gamma delta epsilon zeta eta theta.");
  await page.getByLabel("Target speed").fill("100");
  await page.getByLabel("Window size").fill("2");
  await page.getByText("Flash chunks", { exact: true }).click();
  await page.getByText("Dark", { exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Flash chunks" }),
  ).toBeChecked();

  await expect(page.getByLabel("Window size")).toBeVisible();

  await page.getByRole("button", { name: "Start" }).click();

  await expect(readingMaterial).toBeHidden();

  const readingSurface = page.getByLabel("Reading surface");
  await expect(readingSurface).toHaveAttribute(
    "data-reading-mode",
    "flashChunks",
  );
  await expect(readingSurface).toHaveAttribute(
    "data-reading-presentation",
    "flashChunks",
  );
  await expect(page.locator(".reading-screen")).toHaveAttribute(
    "data-app-theme",
    "dark",
  );
  await expect(page.getByLabel("Session metrics")).toContainText(
    "Flash chunks",
  );
  await expect(page.getByLabel("Session metrics")).toContainText("2 words");
  await expect(page.locator("[data-flash-chunks-renderer]")).toBeVisible();
  await expect(page.locator("[data-flash-chunk-text]")).toHaveText(
    "Alpha beta.",
  );

  await expect
    .poll(async () => page.locator("[data-flash-chunk-text]").textContent())
    .toBe("Gamma delta");

  await page.keyboard.press("Escape");

  await expect(readingMaterial).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Flash chunks" }),
  ).toBeChecked();
  await expect(page.getByLabel("Window size")).toHaveValue("2");
});

for (const presentation of [
  {
    label: "Feed",
    value: "feed",
  },
  {
    label: "Single page",
    value: "singlePage",
  },
  {
    label: "Book spread",
    value: "bookSpread",
  },
] as const) {
  test(`runs the ${presentation.value} guided presentation`, async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByLabel("Reading material").fill(readingText);
    await page.getByLabel("Target speed").fill("120");
    await page.getByLabel("Window size").fill("3");
    await page.getByText(presentation.label, { exact: true }).click();
    await expect(page.getByLabel(presentation.label)).toBeChecked();

    await page.getByRole("button", { name: "Start" }).click();

    const readingSurface = page.getByLabel("Reading surface");
    await expect(readingSurface).toHaveAttribute(
      "data-reading-presentation",
      presentation.value,
    );
    await expect(
      page.locator(`[data-guided-presentation="${presentation.value}"]`),
    ).toBeVisible();
    await expect(
      page.locator('[data-token-kind="word"][data-token-state~="focus"]').first(),
    ).toBeVisible();

    if (presentation.value === "feed") {
      await expect
        .poll(async () =>
          readingSurface.evaluate((element) => {
            const style = window.getComputedStyle(element);

            return style.overflowY;
          }),
        )
        .toBe("auto");
    }

    if (presentation.value === "singlePage") {
      await expect(page.getByRole("navigation", { name: "Pages" })).toContainText(
        "Page",
      );
    }

    if (presentation.value === "bookSpread") {
      await expect(page.getByRole("navigation", { name: "Pages" })).toContainText(
        "Spread",
      );
      await expect(
        page.locator('.guided-window-page[data-page-side="right"]'),
      ).toBeVisible();
    }

    await page.keyboard.press("Escape");

    await expect(page.getByLabel(presentation.label)).toBeChecked();
  });
}

test("paginates book spread without overlapping adjacent page ranges", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Reading material").fill(longBookText);
  await page.getByLabel("Target speed").fill("100");
  await page.getByLabel("Window size").fill("4");
  await page.getByText("Book spread", { exact: true }).click();

  await page.getByRole("button", { name: "Start" }).click();

  const pageStage = page.locator(".guided-window-page-stage");

  await expect
    .poll(async () => Number(await pageStage.getAttribute("data-page-count")))
    .toBeGreaterThan(1);

  const visiblePageRanges = await page
    .locator(".guided-window-page:not(.guided-window-page-empty)")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        firstWordIndex: Number(
          element.getAttribute("data-page-first-word-index"),
        ),
        lastWordIndex: Number(element.getAttribute("data-page-last-word-index")),
      })),
    );

  expect(visiblePageRanges.length).toBeGreaterThanOrEqual(2);
  expect(visiblePageRanges[0].lastWordIndex).toBeLessThan(
    visiblePageRanges[1].firstWordIndex,
  );
});
