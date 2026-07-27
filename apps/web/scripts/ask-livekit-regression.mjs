import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const askUrl = new URL("/ask", baseUrl).toString();
const timeoutMs = Number(process.env.ASK_REGRESSION_TIMEOUT_MS ?? 90_000);

const browser = await chromium.launch({
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
  headless: process.env.HEADLESS !== "0",
});

let page;

try {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    permissions: ["microphone"],
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    viewport: { height: 852, width: 393 },
  });
  page = await context.newPage();
  const consoleErrors = [];
  const guestSessionResponses = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("response", async (response) => {
    if (!response.url().includes("/api/livekit/guest-session")) return;

    guestSessionResponses.push({
      body: await response.text().catch(() => ""),
      status: response.status(),
      url: response.url(),
    });
  });

  await page.goto(askUrl, { waitUntil: "networkidle" });
  await page
    .locator('input[aria-label="Message"]:visible')
    .first()
    .fill("hello from the ask regression test");
  await page.getByRole("button", { exact: true, name: "Send message" }).click();

  await page
    .getByTestId("chat-message-user")
    .getByText("hello from the ask regression test")
    .waitFor({ timeout: 10_000 });

  const aiMessages = page.getByTestId("chat-message-ai");
  await aiMessages.first().waitFor({ timeout: timeoutMs });

  try {
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('[data-testid="chat-message-ai"]'))
          .map((element) => element.textContent?.trim() ?? "")
          .some((text) => text.length > 0 && text !== "Thinking"),
      undefined,
      { timeout: timeoutMs },
    );
  } catch (error) {
    const alerts = await page
      .locator('[role="alert"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.textContent?.trim()).filter(Boolean),
      );
    const aiMessagesOnFailure = await aiMessages.evaluateAll((elements) =>
      elements.map((element) => element.textContent?.trim()).filter(Boolean),
    );

    console.log("Ask LiveKit regression failed debug:");
    console.log(
      JSON.stringify(
        { aiMessagesOnFailure, alerts, guestSessionResponses },
        null,
        2,
      ),
    );

    throw error;
  }

  await page.waitForTimeout(3_000);

  const latestAiMessage = await aiMessages.last().textContent();
  const latestAiText = latestAiMessage?.trim() ?? "";

  if (!latestAiText || latestAiText === "Thinking") {
    throw new Error(`Latest AI message is still pending: ${latestAiText}`);
  }

  const errorAlert = await page
    .locator('[role="alert"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.textContent?.trim()).filter(Boolean),
    );

  if (errorAlert.length > 0) {
    throw new Error(`Unexpected alert during ask regression: ${errorAlert}`);
  }

  console.log("Ask LiveKit regression passed.");
  console.log(`Latest AI reply: ${latestAiText}`);

  if (consoleErrors.length > 0) {
    console.log("Browser console errors:");
    for (const error of consoleErrors) {
      console.log(`- ${error}`);
    }
  }
} finally {
  if (page) {
    await page
      .evaluate(() =>
        fetch("/api/livekit/guest-session", {
          keepalive: true,
          method: "DELETE",
        }),
      )
      .catch(() => undefined);
  }

  await browser.close();
}
