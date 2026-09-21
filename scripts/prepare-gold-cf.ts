import { mkdir } from "node:fs/promises";

const publicDir = new URL("../src/gold/cf/public/", import.meta.url);
await mkdir(publicDir, { recursive: true });

const html = await Bun.file(new URL("../src/gold/demo.html", import.meta.url)).text();
const css = await Bun.file(new URL("../src/gold/demo.css", import.meta.url)).text();
const page = html.replace(`src="./demo.ts"`, `src="./demo.js"`);

await Bun.write(new URL("index.html", publicDir), page);
await Bun.write(new URL("demo.css", publicDir), css);

const built = await Bun.build({
  entrypoints: [new URL("../src/gold/demo.ts", import.meta.url).pathname],
  target: "browser",
  minify: true,
});
if (!built.success) {
  for (const log of built.logs) console.error(log);
  throw new Error("gold demo client bundle failed");
}
const jsOut = built.outputs[0];
if (!jsOut) throw new Error("gold demo client bundle produced no output");
const js = await jsOut.text();
await Bun.write(new URL("demo.js", publicDir), js);

const pages = {
  "/": { body: page, type: "text/html;charset=utf-8" },
  "/demo.css": { body: css, type: "text/css;charset=utf-8" },
  "/demo.js": { body: js, type: "text/javascript;charset=utf-8" },
};

const pageModule = `export const GOLD_PAGES: Record<string, { body: string; type: string }> = ${JSON.stringify(pages)};\n`;
await Bun.write(new URL("../src/gold/cf/page.ts", import.meta.url), pageModule);

console.log("prepared src/gold/cf/public and src/gold/cf/page.ts");
