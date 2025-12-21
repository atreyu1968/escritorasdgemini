import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface AgentResponse {
  content: string;
  thoughtSignature?: string;
}

export interface AgentConfig {
  name: string;
  role: string;
  systemPrompt: string;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected ai = ai;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  get role(): string {
    return this.config.role;
  }

  protected async generateContent(prompt: string): Promise<AgentResponse> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: [
          { role: "user", parts: [{ text: this.config.systemPrompt }] },
          { role: "model", parts: [{ text: "Entendido. Estoy listo para cumplir mi rol." }] },
          { role: "user", parts: [{ text: prompt }] },
        ],
        config: {
          temperature: 1.0,
          topP: 0.95,
          thinkingConfig: {
            thinkingBudget: 8192,
          },
        },
      });

      const candidate = response.candidates?.[0];
      let content = "";
      let thoughtSignature = "";

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.thought) {
            thoughtSignature += part.text || "";
          } else if (part.text) {
            content += part.text;
          }
        }
      }

      return { content, thoughtSignature };
    } catch (error) {
      console.error(`[${this.config.name}] Error generating content:`, error);
      throw error;
    }
  }

  abstract execute(input: any): Promise<AgentResponse>;
}
