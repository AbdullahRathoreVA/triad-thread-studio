import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Capture real screenshots of the running site.
 *
 * Two things matter here:
 *  - `--use-angle=swiftshader` forces a software GL backend. The default
 *    headless shell has no GPU, so every WebGL canvas would come back blank
 *    and the 3D hero and configurator — the whole point of the shots — would
 *    photograph as empty boxes.
 *  - Each page gets a settle delay before capture, because the scroll reveals
 *    and the leather texture generation both run after first paint.
 */

const firstLine = (m: string) => m.split(String.fromCharCode(10))[0];

const BASE = process.env.SHOT_BASE ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "screenshots";

const SHOTS = [
  { name: "01-home", path: "/", full: false, wait: 5000 },
  { name: "03-bulk", path: "/bulk", full: false, wait: 2500 },
  { name: "04-craft", path: "/craft", full: false, wait: 2500 },
  { name: "05-contact", path: "/contact", full: false, wait: 2000 },
  { name: "06-admin-login", path: "/admin/login", full: false, wait: 1500 },
];

async function main() {
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--disable-lcd-text",
    ],
  });

  // A fresh page per shot: a navigation that stalls cannot then interrupt the
  // next one, which is what turned one slow page into six cascading failures.
  const newDesktopPage = () =>
    browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.5, // Enough for a README without doubling WebGL fill.
      colorScheme: "dark",
    });

  for (const shot of SHOTS) {
    const url = `${BASE}${shot.path}`;
    process.stdout.write(`  ${shot.name} … `);
    const page = await newDesktopPage();

    try {
      // NOT networkidle: the dev server holds an HMR websocket open, so the
      // network never goes idle and every goto would time out.
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      // The intro curtain is once-per-session; clear it so it never lands in
      // a shot of the homepage.
      await page.evaluate(() => sessionStorage.setItem("tts:introShown", "1"));
      await page.waitForTimeout(shot.wait);

      const file = path.join(OUT, `${shot.name}.png`);
      await page.screenshot({ path: file, fullPage: shot.full, timeout: 120_000, animations: "disabled" });
      console.log("ok");
    } catch (error) {
      console.log(`FAILED — ${firstLine((error as Error).message)}`);
    }
  }

  /**
   * The configurator runs a continuous render loop, so the page never reaches
   * a stable frame and `screenshot` times out waiting for one. It ships with a
   * Pause control — use it, then capture.
   */
  async function captureStudio(name: string, jersey: boolean) {
    process.stdout.write(`  ${name} … `);
    const page = await newDesktopPage();
    try {
      await page.goto(`${BASE}/customize`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => sessionStorage.setItem("tts:introShown", "1"));

      if (jersey) {
        await page.getByRole("tab", { name: /jersey/i }).click();
      }
      // Let the material generate and the model settle into frame first.
      await page.waitForTimeout(6000);

      const pause = page.getByRole("button", { name: /^pause$/i });
      if (await pause.count()) await pause.click();
      await page.waitForTimeout(900);

      await page.screenshot({
        path: path.join(OUT, `${name}.png`),
        timeout: 120_000,
        animations: "disabled",
      });
      console.log("ok");
    } catch (error) {
      console.log(`FAILED — ${firstLine((error as Error).message)}`);
    } finally {
      await page.close();
    }
  }

  await captureStudio("02-studio-jacket", false);
  await captureStudio("07-studio-jersey", true);

  // Mobile, because most trade buyers will open this on a phone.
  try {
    process.stdout.write("  08-mobile-home … ");
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await mobile.goto(BASE, { waitUntil: "domcontentloaded" });
    await mobile.evaluate(() => sessionStorage.setItem("tts:introShown", "1"));
    await mobile.waitForTimeout(4500);
    await mobile.screenshot({
      path: path.join(OUT, "08-mobile-home.png"),
      timeout: 120_000,
      animations: "disabled",
    });
    console.log("ok");
  } catch (error) {
    console.log(`FAILED — ${firstLine((error as Error).message)}`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
