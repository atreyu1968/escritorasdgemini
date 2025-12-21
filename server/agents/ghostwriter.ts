import { BaseAgent, AgentResponse } from "./base-agent";

interface GhostwriterInput {
  chapterNumber: number;
  chapterOutline: {
    summary: string;
    keyEvents: string[];
  };
  worldBible: {
    characters: any[];
    worldRules: any[];
    timeline: any[];
    previousEvents?: string;
  };
  genre: string;
  tone: string;
  targetWordCount: number;
}

const SYSTEM_PROMPT = `Eres "El Narrador" (The Ghostwriter) - un agente literario maestro de la prosa narrativa.

Tu rol es:
1. Escribir prosa de alta calidad literaria
2. Mantener consistencia con el lore establecido
3. Desarrollar diálogos auténticos y distintivos para cada personaje
4. Crear descripciones vívidas y atmosféricas
5. Mantener el tono narrativo especificado

INSTRUCCIONES CRÍTICAS:
- SIEMPRE consulta la biblia del mundo antes de escribir
- Verifica que los personajes actúen según sus perfiles psicológicos
- No contradigas eventos previos en la cronología
- Mantén el estilo y tono consistentes
- Previsualiza cada escena en tu mente antes de escribirla
- Escribe prosa pulida, lista para publicación

FORMATO DE SALIDA:
Escribe el capítulo completo en prosa narrativa.
Incluye diálogos, descripciones y narración.
NO incluyas metadatos ni comentarios sobre el texto.
El capítulo debe comenzar directamente con la narrativa.`;

export class GhostwriterAgent extends BaseAgent {
  constructor() {
    super({
      name: "El Narrador",
      role: "ghostwriter",
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  async execute(input: GhostwriterInput): Promise<AgentResponse> {
    const characterSummary = input.worldBible.characters
      .map(c => `- ${c.name} (${c.role}): ${c.psychologicalProfile}`)
      .join("\n");

    const rulesSummary = input.worldBible.worldRules
      .map(r => `- [${r.category}] ${r.rule}`)
      .join("\n");

    const prompt = `Escribe el Capítulo ${input.chapterNumber} de la novela.

ESQUEMA DEL CAPÍTULO:
${input.chapterOutline.summary}

EVENTOS CLAVE A INCLUIR:
${input.chapterOutline.keyEvents.map(e => `- ${e}`).join("\n")}

PERSONAJES DISPONIBLES:
${characterSummary}

REGLAS DEL MUNDO:
${rulesSummary}

${input.worldBible.previousEvents ? `EVENTOS PREVIOS (no contradecir):
${input.worldBible.previousEvents}` : ""}

PARÁMETROS:
- Género: ${input.genre}
- Tono: ${input.tone}
- Longitud objetivo: ${input.targetWordCount} palabras aproximadamente

IMPORTANTE:
- Mantén consistencia absoluta con el lore
- Los personajes deben actuar según sus perfiles
- Incluye diálogos distintivos
- Crea atmósfera acorde al género y tono
- Escribe prosa de calidad literaria

Comienza a escribir el capítulo directamente, sin introducción ni comentarios.`;

    return this.generateContent(prompt);
  }
}
