#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "content/portfolio.json");
const dataScriptPath = join(root, "content/portfolio.js");
const imageDir = join(root, "content/images");
const categories = new Set(["desktop", "mobile", "motion"]);

function load() {
  return JSON.parse(readFileSync(dataPath, "utf8"));
}

function save(data) {
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");
  writeFileSync(dataScriptPath, "window.PORTFOLIO = " + JSON.stringify(data) + ";\n");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const cmd = argv[2];
  const positionals = [];
  const opts = {};
  for (let i = 3; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) opts[key] = "true";
      else {
        opts[key] = next;
        i += 1;
      }
    } else positionals.push(token);
  }
  return { cmd, positionals, opts };
}

function slug(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function titleOf(value) {
  return value.replace(/\\n/g, "\n");
}

function requireColor(value) {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) fail("Kolor musi być w postaci #rrggbb.");
  return value.toLowerCase();
}

function requireCategory(value) {
  if (!categories.has(value)) fail("Kategoria: desktop, mobile albo motion.");
  return value;
}

function copyImage(id, source) {
  if (!source) return null;
  const from = resolve(source);
  if (!existsSync(from)) fail(`Nie ma pliku obrazu: ${from}`);
  mkdirSync(imageDir, { recursive: true });
  const ext = extname(from).toLowerCase() || ".jpg";
  if (![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    fail("Obraz może być jpg, png, webp albo gif.");
  }
  const filename = `${id}${ext}`;
  copyFileSync(from, join(imageDir, filename));
  return `images/${filename}`;
}

function find(data, id) {
  const index = data.projects.findIndex((project) => project.id === id);
  if (index < 0) fail(`Nie ma projektu „${id}”.`);
  return index;
}

function printProject(project) {
  const title = project.title.replace(/\n/g, " / ");
  console.log(`${project.id}\t${project.category}\t${title}\t${project.label}`);
}

const { cmd, positionals, opts } = parseArgs(process.argv);

if (!cmd || cmd === "help") {
  console.log(`Użycie:
  node scripts/portfolio.mjs list
  node scripts/portfolio.mjs add --category desktop --title "Nazwa\\nDruga linia" --label "Desktop wesite" --color "#0f5d4f" --image ./plik.jpg
  node scripts/portfolio.mjs update <id> [--title] [--label] [--color] [--category] [--image]
  node scripts/portfolio.mjs remove <id>

Kolejność na stronie jest kolejnością w content/portfolio.json.
Tytuł z \\n łamie się na kolejne linie, tak jak na planszy.`);
  process.exit(cmd ? 0 : 1);
}

const data = load();

if (cmd === "list") {
  data.projects.forEach(printProject);
} else if (cmd === "add") {
  const category = requireCategory(opts.category || "");
  if (!opts.title) fail("Podaj --title.");
  if (!opts.label) fail("Podaj --label.");
  if (!opts.color) fail("Podaj --color.");
  if (!opts.image) fail("Podaj --image.");
  const title = titleOf(opts.title);
  const color = requireColor(opts.color);
  const id = opts.id ? slug(opts.id) : slug(title.split("\n")[0]);
  if (!id) fail("Nie da się zrobić id z tytułu. Podaj --id.");
  if (data.projects.some((project) => project.id === id)) fail(`Projekt „${id}” już jest. Użyj update.`);
  const image = copyImage(id, opts.image);
  data.projects.push({
    id,
    category,
    title,
    label: opts.label,
    color,
    image,
  });
  save(data);
  console.log(`Dodano ${id}.`);
} else if (cmd === "update") {
  const id = positionals[0];
  if (!id) fail("Podaj id projektu.");
  const index = find(data, id);
  const project = data.projects[index];
  if (opts.category) project.category = requireCategory(opts.category);
  if (opts.title) project.title = titleOf(opts.title);
  if (opts.label) project.label = opts.label;
  if (opts.color) project.color = requireColor(opts.color);
  if (opts.image) project.image = copyImage(id, opts.image);
  save(data);
  console.log(`Zaktualizowano ${id}.`);
} else if (cmd === "remove") {
  const id = positionals[0];
  if (!id) fail("Podaj id projektu.");
  const index = find(data, id);
  data.projects.splice(index, 1);
  save(data);
  console.log(`Usunięto ${id}. Obraz został w content/images/.`);
} else {
  fail(`Nieznane polecenie: ${cmd}`);
}
