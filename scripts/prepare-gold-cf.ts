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
const js = built.outputs[0];
if (!js) throw new Error("gold demo client bundle produced no output");
await Bun.write(new URL("demo.js", publicDir), await js.text());
console.log("prepared src/gold/cf/public");
