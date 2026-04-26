import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

// Extrae PHASE1_SYSTEM_PROMPT del fichero del arquitecto sin tener que
// modificar el código fuente, así testeamos el prompt EXACTO en producción.
const architectSrc = fs.readFileSync(
  path.join(process.cwd(), "server/agents/architect.ts"),
  "utf-8"
);
const m = architectSrc.match(
  /const PHASE1_SYSTEM_PROMPT = `([\s\S]*?)`;\s*\n\s*const PHASE2_SYSTEM_PROMPT/
);
if (!m) {
  console.error("No pude extraer PHASE1_SYSTEM_PROMPT del fichero.");
  process.exit(2);
}
const PHASE1_SYSTEM_PROMPT = m[1];
console.log(
  `[test] PHASE1_SYSTEM_PROMPT extraído: ${PHASE1_SYSTEM_PROMPT.length} chars`
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const input = {
  title: "El Reloj de Montserrat",
  premise:
    "En la Barcelona de 1888, durante la Exposición Universal, una relojera autodidacta descubre un mecanismo que parece predecir asesinatos.",
  genre: "thriller histórico",
  tone: "atmosférico, oscuro",
  chapterCount: 3,
};

const userPrompt = `
Idea: "${input.premise}"
TÍTULO: ${input.title}
GÉNERO: ${input.genre}
TONO: ${input.tone}
ESTRUCTURA: ${input.chapterCount} CAPÍTULOS

FASE 1 DE 2: Genera la World Bible completa, matriz de arcos, plan de momentum,
estructura de 3 actos, línea temporal y premisa.

Responde ÚNICAMENTE con el JSON estructurado según las instrucciones.
`;

async function main() {
  const t0 = Date.now();
  console.log(
    `[test] Llamando a Gemini 2.5-flash (Fase 1 sólo, thinking=2048, maxOut=24576)...`
  );

  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: PHASE1_SYSTEM_PROMPT,
      temperature: 0.85,
      maxOutputTokens: 24576,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 2048 },
    },
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const text = res.text || "";
  const usage = res.usageMetadata || ({} as any);
  console.log(
    `\n[test] Respondió en ${elapsed}s — ${text.length} chars\ntokens: in=${usage.promptTokenCount || 0} out=${usage.candidatesTokenCount || 0} thinking=${usage.thoughtsTokenCount || 0}`
  );

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.error(`[test] JSON.parse falló: ${(e as Error).message}`);
    console.log(text.slice(0, 1500));
    process.exit(1);
  }

  const wb = parsed.world_bible || {};
  const personajes = wb.personajes || [];
  const lugares = wb.lugares || [];
  const reglas = wb.reglas_lore || [];

  console.log(`\n=== ESTRUCTURA DEL OUTPUT ===`);
  console.log(`  world_bible.personajes: ${personajes.length}`);
  console.log(`  world_bible.lugares:    ${lugares.length}`);
  console.log(`  world_bible.reglas_lore: ${reglas.length}`);
  console.log(`  world_bible.epoca:      ${JSON.stringify(wb.epoca)}`);
  console.log(`  premisa presente:       ${!!parsed.premisa}`);
  console.log(`  matriz_arcos presente:  ${!!parsed.matriz_arcos}`);
  console.log(`  momentum_plan presente: ${!!parsed.momentum_plan}`);
  console.log(`  estructura_tres_actos:  ${!!parsed.estructura_tres_actos}`);

  // Higiene: comprobar que NO hay rastro del antiguo lexico_historico
  const fugas: string[] = [];
  for (const k of [
    "lexico_historico",
    "registro_linguistico",
    "vocabulario_epoca_autorizado",
    "terminos_anacronicos_prohibidos",
    "notas_voz_historica",
  ]) {
    if (wb[k] !== undefined) fugas.push(`world_bible.${k}`);
  }
  console.log(
    `\n=== HIGIENE: lexico_historico eliminado ===\n` +
      (fugas.length === 0
        ? `  ✓ OK — el modelo NO emitió ningún campo legacy`
        : `  ✗ FUGA: ${fugas.join(", ")}`)
  );

  console.log(`\n=== PERSONAJES ===`);
  for (const p of personajes.slice(0, 5)) {
    console.log(`  • ${p.nombre || "(sin nombre)"} — ${p.rol || "?"}`);
  }

  const ok =
    personajes.length >= 3 &&
    typeof wb.epoca === "string" &&
    wb.epoca.trim().length > 0 &&
    fugas.length === 0;

  console.log(`\n=== VEREDICTO: ${ok ? "✅ OK" : "❌ FALLO"} ===`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("Test crashed:", e);
  process.exit(2);
});
