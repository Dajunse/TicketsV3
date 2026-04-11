import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const contextPath = path.join(projectRoot, "CONTEXTO_PROYECTO.md");

const startMarker = "<!-- HISTORIAL_AUTO:START -->";
const endMarker = "<!-- HISTORIAL_AUTO:END -->";

function getGitHistoryLines(limit = 12) {
  const raw = execFileSync("git", ["log", "-n", String(limit), "--date=short", "--pretty=format:%h|%ad|%s"], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...subjectParts] = line.split("|");
      const subject = subjectParts.join("|");
      return `- ${date} \`${hash}\`: ${subject}`;
    });

  return lines.length > 0 ? lines : ["- sin commits encontrados"];
}

function updateTimestamp(content) {
  const timestamp = new Date().toISOString();
  return content.replace(
    /Ultima actualizacion automatica:\s*.*/g,
    `Ultima actualizacion automatica: ${timestamp}`,
  );
}

function replaceHistoryBlock(content, lines) {
  if (!content.includes(startMarker) || !content.includes(endMarker)) {
    throw new Error("No se encontraron los marcadores de historial automatico en CONTEXTO_PROYECTO.md");
  }

  const startIndex = content.indexOf(startMarker) + startMarker.length;
  const endIndex = content.indexOf(endMarker);
  const historyBlock = `\n${lines.join("\n")}\n`;
  return `${content.slice(0, startIndex)}${historyBlock}${content.slice(endIndex)}`;
}

function main() {
  if (!existsSync(contextPath)) {
    throw new Error("No existe CONTEXTO_PROYECTO.md en la raiz del proyecto.");
  }

  const content = readFileSync(contextPath, "utf8");
  const historyLines = getGitHistoryLines();
  const withTimestamp = updateTimestamp(content);
  const updated = replaceHistoryBlock(withTimestamp, historyLines);

  writeFileSync(contextPath, updated, "utf8");
  console.log("[context:update] CONTEXTO_PROYECTO.md actualizado.");
}

main();
