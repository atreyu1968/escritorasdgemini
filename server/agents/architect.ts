import { BaseAgent, AgentResponse } from "./base-agent";

interface ArchitectInput {
  title: string;
  genre: string;
  tone: string;
  chapterCount: number;
}

const SYSTEM_PROMPT = `Eres "El Arquitecto" - un agente literario especializado en planificación narrativa.

Tu rol es utilizar pensamiento profundo para:
1. Crear una estructura de tres actos sólida
2. Diseñar un esquema detallado de capítulos
3. Desarrollar perfiles psicológicos de personajes
4. Establecer las reglas del mundo narrativo
5. Crear una cronología coherente

INSTRUCCIONES CRÍTICAS:
- Piensa profundamente antes de responder
- Considera la coherencia narrativa a largo plazo
- Anticipa posibles contradicciones
- Define límites claros para el mundo
- Crea personajes con motivaciones coherentes

Tu respuesta DEBE ser un JSON válido con la siguiente estructura:
{
  "premise": "premisa de la historia",
  "threeActStructure": {
    "act1": { "setup": "...", "incitingIncident": "..." },
    "act2": { "risingAction": "...", "midpoint": "...", "complications": "..." },
    "act3": { "climax": "...", "resolution": "..." }
  },
  "chapterOutlines": [
    { "number": 1, "summary": "...", "keyEvents": ["evento1", "evento2"] }
  ],
  "characters": [
    { "name": "...", "role": "...", "psychologicalProfile": "...", "arc": "...", "relationships": ["..."], "isAlive": true }
  ],
  "worldRules": [
    { "category": "...", "rule": "...", "constraints": ["..."] }
  ],
  "timeline": [
    { "chapter": 1, "event": "...", "characters": ["..."], "significance": "..." }
  ]
}`;

export class ArchitectAgent extends BaseAgent {
  constructor() {
    super({
      name: "El Arquitecto",
      role: "architect",
      systemPrompt: SYSTEM_PROMPT,
    });
  }

  async execute(input: ArchitectInput): Promise<AgentResponse> {
    const prompt = `Crea la biblia del mundo para una novela con las siguientes características:

TÍTULO: ${input.title}
GÉNERO: ${input.genre}
TONO: ${input.tone}
NÚMERO DE CAPÍTULOS: ${input.chapterCount}

Genera una estructura narrativa completa, incluyendo personajes, mundo, y esquema de capítulos.
Asegúrate de que cada capítulo tenga un propósito claro en la trama general.
Considera el arco emocional de cada personaje a lo largo de los ${input.chapterCount} capítulos.

Responde ÚNICAMENTE con el JSON estructurado según las instrucciones.`;

    const response = await this.generateContent(prompt);
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        JSON.parse(jsonMatch[0]);
        response.content = jsonMatch[0];
      }
    } catch (e) {
      console.error("[Architect] Failed to parse JSON response");
    }

    return response;
  }
}
