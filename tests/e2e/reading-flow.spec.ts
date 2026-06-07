import { expect, test, type Locator } from "@playwright/test";

const readingText = [
  "This reader smoke test uses enough words to keep the session open while",
  "Playwright checks the guided window renderer and the escape return flow.",
  "The focus window should contain a phrase, blurred words should stay outside",
  "the current phrase, and the draft should return to setup after escape.",
].join(" ");

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
