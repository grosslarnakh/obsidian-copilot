#!/usr/bin/env node

/**
 * Скрипт для копирования собранных файлов в папку плагина Obsidian
 */

import { readFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Читаем путь к папке плагина
const configPath = join(projectRoot, ".obsidian-plugin-path");

if (!existsSync(configPath)) {
  console.error(`❌ Файл конфигурации не найден: ${configPath}`);
  console.error("Создайте файл .obsidian-plugin-path с путем к папке плагина Obsidian");
  process.exit(1);
}

const pluginPath = readFileSync(configPath, "utf-8").trim();

if (!pluginPath) {
  console.error("❌ Путь к папке плагина не указан в .obsidian-plugin-path");
  process.exit(1);
}

if (!existsSync(pluginPath)) {
  console.error(`❌ Папка плагина не существует: ${pluginPath}`);
  console.error("Проверьте путь в файле .obsidian-plugin-path");
  process.exit(1);
}

// Файлы для копирования
const filesToCopy = [
  { from: join(projectRoot, "dist", "main.js"), to: join(pluginPath, "main.js") },
  { from: join(projectRoot, "dist", "styles.css"), to: join(pluginPath, "styles.css") },
  { from: join(projectRoot, "manifest.json"), to: join(pluginPath, "manifest.json") },
];

console.log(`📦 Копирование файлов в: ${pluginPath}\n`);

let copiedCount = 0;
let skippedCount = 0;

for (const file of filesToCopy) {
  if (!existsSync(file.from)) {
    console.warn(`⚠️  Файл не найден, пропускаем: ${file.from}`);
    skippedCount++;
    continue;
  }

  // Создаем директорию, если её нет
  const targetDir = dirname(file.to);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  copyFileSync(file.from, file.to);
  console.log(`✅ Скопирован: ${file.from} → ${file.to}`);
  copiedCount++;
}

console.log(`\n✨ Готово! Скопировано файлов: ${copiedCount}, пропущено: ${skippedCount}`);
