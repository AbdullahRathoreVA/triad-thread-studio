import { chromium } from "playwright-core";
import path from "node:path";

/**
 * Studio shots only.
 *
 * The configurator drives a permanent rAF loop (orbit damping, model
 * rotation), so Playwright's screenshot never observes a stable frame and
 * times out. Clicking Pause stops the model but not the control damping, so
 * the reliable fix is to neuter requestAnimationFrame once the scene has
 * rendered: the last painted frame stays on the canvas, and capture is
 * instant.
 */
const OUT = process.argv[2] ?? "screenshots";
const BASE = "http://localhost:3000";

async function shot(name: string, jersey: boolean) {
  const browser = await chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--use-gl=angle"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    colorScheme: "dark",
  });
  try {
    process.stdout.write(`  ${name} … `);
    await page.goto(`${BASE}/customize`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.setItem("tts:introShown", "1"));
    if (jersey) await page.getByRole("tab", { name: /jersey/i }).click();

    // Pause FIRST. The model spins at 0.22 rad/s, so waiting for the material
    // to generate and then freezing lands it near 90 degrees — edge-on, where
    // the sleeves point at the camera and the garment reads as a column.
    // Pausing immediately holds it near front-on.
    const pause = page.getByRole("button", { name: /^pause$/i });
    await pause.click();

    // Now let the procedural material finish generating.
    await page.waitForTimeout(7000);
    await page.evaluate(() => {
      window.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
    });
    await page.waitForTimeout(400);

    await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 30_000 });
    console.log("ok");
  } catch (e) {
    console.log("FAILED — " + (e as Error).message.split(String.fromCharCode(10))[0]);
  } finally {
    await browser.close();
  }
}

(async () => {
  await shot("02-studio-jacket", false);
  await shot("07-studio-jersey", true);
})();
