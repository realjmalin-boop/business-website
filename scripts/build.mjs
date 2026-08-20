import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(projectRoot, "dist");

const websiteFiles = ["index.html", "404.html"];
const websiteDirectories = [
  "about",
  "assets",
  "contact",
  "how-it-works",
  "portfolio",
  "services"
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all([
  ...websiteFiles.map((file) =>
    cp(join(projectRoot, file), join(outputDirectory, file))
  ),
  ...websiteDirectories.map((directory) =>
    cp(join(projectRoot, directory), join(outputDirectory, directory), {
      recursive: true
    })
  )
]);

console.log("Prepared the static website in dist/ for Cloudflare Workers.");
