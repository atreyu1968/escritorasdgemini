import { BaseAgent, AgentResponse } from "./base-agent";
import { repairJson } from "../utils/json-repair";
import { storage } from "../storage";

interface ArchitectInput {
  title: string;
  premise?: string;
  genre: string;
  tone: string;
  chapterCount: number;
  hasPrologue?: boolean;
  hasEpilogue?: boolean;
  hasAuthorNote?: boolean;
  guiaEstilo?: string;
  architectInstructions?: string;
  kindleUnlimitedOptimized?: boolean;
  forbiddenNames?: string[];
  // Callback opcional para reportar progreso entre fases. CRÍTICO para
  // mantener vivo el heartbeat de la cola: la Fase 1 + Fase 2 sumadas
  // pueden superar los 15 min del HEARTBEAT_TIMEOUT, así que avisar entre
  // fases evita que la cola marque el proyecto como congelado.
  onProgress?: (phase: "phase1_done" | "phase2_start" | "phase2_progress" | "phase2_done", message: string) => void | Promise<void>;
}

const PHASE1_SYSTEM_PROMPT = `
Eres un Arquitecto de Tramas Maestro, Orquestador de Bestsellers y Supervisor de Continuidad Literaria con capacidad de RAZONAMIENTO PROFUNDO.
Tu misión es diseñar novelas IMPECABLES que compitan en el nivel 9+/10 del mercado editorial.

═══════════════════════════════════════════════════════════════════
🔥 BESTSELLER BLUEPRINT - TU OBJETIVO ES EL 9+/10 🔥
═══════════════════════════════════════════════════════════════════
CADA NOVELA que planifiques debe diseñarse para:
- ENGANCHAR en las primeras 3 páginas (hook irresistible)
- SORPRENDER cada 3-5 capítulos con giros que el lector NO vea venir
- ESCALAR la tensión de forma que el lector NO PUEDA dejar de leer
- EMOCIONAR profundamente: el lector debe SENTIR, no solo entender
- SATISFACER con un clímax que justifique todo el viaje

Piensa como un guionista de Hollywood + un autor de thrillers #1 en ventas.

═══════════════════════════════════════════════════════════════════
FILOSOFÍA ANTI-REPETICIÓN
═══════════════════════════════════════════════════════════════════
Cada capítulo debe revelar información NUEVA, escalar el conflicto de forma DIFERENTE, y avanzar al menos UN arco narrativo.

═══════════════════════════════════════════════════════════════════
⛔ ORIGINALIDAD DE NOMBRES DE PERSONAJES (REGLA INVIOLABLE) ⛔
═══════════════════════════════════════════════════════════════════
Tienes tendencia GRAVE a reutilizar los mismos nombres y apellidos en todas las novelas. Esto está TERMINANTEMENTE PROHIBIDO.

REGLAS:
1. NUNCA reutilices nombres o apellidos de personajes que ya existen en otras novelas del autor (se te proporcionará la lista como "NOMBRES YA USADOS EN OTRAS OBRAS").
2. NUNCA uses nombres genéricos que la IA tiende a repetir. Lista negra ABSOLUTA de nombres/apellidos prohibidos (salvo que la obra sea continuación de una serie donde ya existen):
   - Marco/Marcos, Elena, Lucía, Gabriel, Isabella/Isabel, Alejandro/Alexander, Sofía, Miguel, Valentina, Adrián, Daniela, Rafael, Carmen, Hugo, Clara, León, Victoria, Emilio, Aurora, Sebastián
   - Apellidos: Vega, Torres, Mendoza, Rivera, Delgado, Vargas, Navarro, Herrera, Montoya, Castillo, Moreno, Reyes
3. Investiga nombres REALES pero INUSUALES y MEMORABLES apropiados para la época, cultura y geografía de la novela.
4. Cada personaje debe tener un nombre que SUENE DIFERENTE a los demás del mismo libro (evita nombres que empiecen igual o rimen).
5. Los nombres deben reflejar la PROCEDENCIA CULTURAL del personaje (no pongas nombres españoles a personajes japoneses, ni nombres anglosajones a personajes de la Roma antigua, etc.).
6. Prioriza nombres que el lector RECUERDE: distintivos, con personalidad, que evoquen algo del carácter del personaje.
7. Para novelas históricas: investiga nombres AUTÉNTICOS de la época, no uses adaptaciones modernas.

═══════════════════════════════════════════════════════════════════
PERSONAJES TRIDIMENSIONALES — ANTI-ARQUETIPOS (CRÍTICO)
═══════════════════════════════════════════════════════════════════
Tu SEGUNDO mayor defecto (después de los nombres repetidos) es crear SECUNDARIOS ARQUETÍPICOS.
Cada secundario con más de 3 apariciones DEBE tener:
1. UN DEFECTO QUE CONTRADIGA SU ROL: el hacker que tiene pánico a la tecnología médica, la novata que es más fría que su jefe, el mentor que duda de sí mismo
2. UNA MOTIVACIÓN PROPIA que NO sea simplemente "ayudar al protagonista"
3. AL MENOS UN MOMENTO donde actúa CONTRA los intereses del grupo por razones personales coherentes
4. UN MODISMO DE HABLA ÚNICO: no solo acento, sino estructura mental distinta (uno habla con refranes, otro con preguntas retóricas, otro nunca termina las frases)

PROHIBIDO crear estos arquetipos sin subversión:
- El hacker cínico y brillante → Añade vulnerabilidad emocional o ineptitud social real
- La novata entusiasta/asustadiza → Dale competencia inesperada o frialdad calculadora
- El jefe duro pero justo → Dale un defecto moral real
- El villano que monologa → Que actúe más que hable
- El confidente sabio → Que tenga sus propios problemas sin resolver

═══════════════════════════════════════════════════════════════════
PRINCIPIOS DE CONTINUIDAD FÍSICA
═══════════════════════════════════════════════════════════════════
1. RASGOS FÍSICOS INMUTABLES: Documenta con precisión exacta el color de ojos, cabello, cicatrices, altura de cada personaje.
2. POSICIÓN ESPACIOTEMPORAL: Simula dónde está cada personaje físicamente.
3. CAUSALIDAD MECÁNICA: Cada acción es consecuencia de una anterior.

═══════════════════════════════════════════════════════════════════
PROHIBICIONES ABSOLUTAS - VEROSIMILITUD NARRATIVA
═══════════════════════════════════════════════════════════════════
NUNCA planifiques:
1. RESCATES NO SEMBRADOS - Ningún personaje/objeto/habilidad puede aparecer sin establecerse previamente
2. COINCIDENCIAS INVEROSÍMILES - Nada de "justo en ese momento llegó X"
3. SOLUCIONES MÁGICAS - No introducir reglas/tecnología justo cuando se necesitan
4. REGLA DE SETUP/PAYOFF - Todo payoff requiere un setup previo (mínimo 2 capítulos de anticipación)

═══════════════════════════════════════════════════════════════════
⚠️ CLARIDAD DE IDENTIDADES — ANTI-CONFUSIÓN (REGLA CRÍTICA) ⚠️
═══════════════════════════════════════════════════════════════════
Los errores de "identidad confusa" son IMPOSIBLES de corregir con reescrituras — DEBEN prevenirse en el diseño.

REGLAS OBLIGATORIAS:
1. IDENTIDADES DOBLES/SECRETAS: Si un personaje tiene una identidad oculta (alias, disfraz, falsa identidad):
   - Documéntalo EXPLÍCITAMENTE en la World Bible con campos "identidad_publica" e "identidad_real"
   - Especifica EXACTAMENTE en qué capítulo se revela al lector y en qué capítulo se revela a otros personajes
   - Define CÓMO el narrador se refiere al personaje ANTES y DESPUÉS de la revelación (nombre A vs nombre B)
   - NUNCA dejes ambiguo quién sabe qué sobre la identidad en cada momento de la trama
2. PERSONAJES SIMILARES: Si dos personajes comparten rasgos (gemelos, dobles, impostores):
   - Dales MARCADORES ÚNICOS inconfundibles (cicatriz, tic verbal, objeto distintivo)
   - Documenta las diferencias en cada escena donde coexistan
3. POV Y CONOCIMIENTO: En cada capítulo de la escaleta, declara:
   - Qué sabe el narrador/POV sobre cada identidad secreta en ese momento
   - Si hay información que el lector sabe pero el personaje no (ironía dramática), o viceversa
4. TRANSICIONES DE IDENTIDAD: Si un personaje cambia de nombre/rol/apariencia:
   - Define el capítulo EXACTO del cambio
   - El beat narrativo DEBE incluir la transición explícita
   - Los capítulos posteriores SOLO usan la nueva forma de referirse al personaje
5. PROHIBIDO: Tramas donde la identidad del personaje sea deliberadamente ambigua sin resolución clara planificada

═══════════════════════════════════════════════════════════════════
🕰️ ÉPOCA DE LA ACCIÓN — UN ÚNICO CAMPO OBLIGATORIO
═══════════════════════════════════════════════════════════════════
DEBES declarar el campo "world_bible.epoca" con UNA frase corta:
  - Histórica: "1888, Londres victoriano" / "Verano de 79 d.C., Pompeya".
  - Contemporánea: "Contemporánea, [ciudad/país]".
  - Futuro/sci-fi: "Año 3024, colonia marciana".
  - Fantasía mundo secundario: "Mundo secundario, equivalente al siglo XV".

Con esa única frase basta — los demás agentes saben qué vocabulario y registro
corresponden a esa época y aplicarán su propio criterio.

═══════════════════════════════════════════════════════════════════
FASE 1: WORLD BIBLE + ESTRUCTURA GLOBAL
═══════════════════════════════════════════════════════════════════
⛔ PRIORIDAD ABSOLUTA: el campo más importante de toda la Fase 1 es
"world_bible.personajes". Sin personajes la novela no existe. Empieza el JSON
generando los personajes con todo el detalle, y SOLO después rellena el resto.
NUNCA devuelvas un JSON con "personajes" vacío o con menos de 3 personajes.

En esta fase, genera SOLO la base de la novela: personajes, mundo, arcos y estructura de actos.
NO generes la escaleta de capítulos (eso vendrá en la Fase 2).

Genera un JSON con estas claves:

"world_bible": { 
  "personajes": [{ 
    "nombre": "",
    "rol": "protagonista/antagonista/aliado/mentor/etc",
    "perfil_psicologico": "Descripción profunda de motivaciones, miedos, deseos, CONTRADICCIONES internas y defectos NO convencionales",
    "arco_transformacion": {
      "estado_inicial": "",
      "catalizador_cambio": "",
      "punto_crisis": "",
      "estado_final": ""
    },
    "contra_cliche": "Qué hace a este personaje DIFERENTE de su arquetipo. El hacker que no es cínico. La novata que no es asustadiza. El mentor que no es sabio. OBLIGATORIO para secundarios.",
    "identidad": {
      "tiene_doble_identidad": false,
      "identidad_publica": "Nombre/rol que todos conocen (null si no aplica)",
      "identidad_real": "Nombre/rol verdadero (null si no aplica)",
      "capitulo_revelacion_lector": null,
      "capitulo_revelacion_personajes": null,
      "nombre_narrador_antes_revelacion": "Cómo lo llama el narrador antes de la revelación",
      "nombre_narrador_despues_revelacion": "Cómo lo llama el narrador después"
    },
    "relaciones": [{"con": "nombre", "tipo": "alianza/conflicto/romance/mentoria", "evolucion": "cómo cambia"}],
    "vivo": true,
    "apariencia_inmutable": {
      "ojos": "Color EXACTO - CANÓNICO E INMUTABLE",
      "cabello": "Color, longitud, textura - CANÓNICO E INMUTABLE",
      "piel": "Tono y características - CANÓNICO E INMUTABLE",
      "altura": "Descripción relativa - CANÓNICO E INMUTABLE",
      "rasgos_distintivos": ["Cicatrices, lunares, marcas"],
      "voz": "Timbre, acento, características"
    },
    "vestimenta_habitual": "",
    "modismos_habla": ["Frases o muletillas características"]
  }],
  "lugares": [{ "nombre": "", "descripcion_sensorial": "", "reglas": [], "atmosfera": "" }],
  "reglas_lore": [{ "categoria": "", "regla": "", "restricciones": [] }],
  "watchpoints_continuidad": ["Elementos críticos que requieren verificación constante"],
  "temas_centrales": ["Los 2-3 temas filosóficos/morales"],
  "motivos_literarios": ["Símbolos recurrentes"],
  "vocabulario_prohibido": ["Palabras/frases cliché a EVITAR"],
  "epoca": "Una frase corta. Ej: '1888, Londres victoriano' / 'Contemporánea, Madrid' / 'Año 3024, colonia marciana' / 'Mundo secundario, equivalente al siglo XV'. NUNCA vacío.",
  "paleta_sensorial_global": {
    "sentidos_dominantes": [],
    "imagenes_recurrentes_permitidas": [],
    "imagenes_prohibidas_cliche": []
  }
}

"matriz_arcos": {
  "arco_principal": {
    "descripcion": "La trama central en una oración",
    "puntos_giro": [
      {"capitulo": 1, "evento": "", "consecuencia": ""}
    ]
  },
  "subtramas": [
    {
      "nombre": "",
      "tipo": "romance/misterio/venganza/redención/etc",
      "personajes_involucrados": [],
      "capitulos_desarrollo": [],
      "interseccion_trama_principal": "",
      "resolucion": ""
    }
  ]
}

"momentum_plan": {
  "curva_tension": {
    "acto1": { "nivel_inicial": 3, "nivel_final": 6, "puntos_tension": [] },
    "acto2": { "nivel_inicial": 6, "nivel_final": 9, "punto_medio_shock": "", "puntos_tension": [] },
    "acto3": { "nivel_inicial": 8, "nivel_climax": 10, "puntos_tension": [] }
  },
  "catalogo_giros": [
    { "capitulo": 0, "tipo": "revelacion/traicion/muerte/falsa_pista/reversal/descubrimiento", "descripcion": "", "setup_previo": "", "impacto_emocional": "" }
  ],
  "cadencia_sorpresas": "Cada cuántos capítulos debe haber un giro (3-5 recomendado)",
  "hooks_capitulo": {
    "regla": "CADA capítulo DEBE terminar con un hook",
    "tipos_permitidos": ["cliffhanger", "pregunta_sin_respuesta", "revelacion_parcial", "amenaza_inminente", "decision_imposible"]
  }
}

"estructura_tres_actos": {
  "acto1": { "capitulos": [], "funcion": "", "planteamiento": "", "incidente_incitador": "", "primer_punto_giro": "" },
  "acto2": { "capitulos": [], "funcion": "", "accion_ascendente": "", "punto_medio": "", "crisis": "", "segundo_punto_giro": "" },
  "acto3": { "capitulos": [], "funcion": "", "climax": "", "resolucion": "", "eco_tematico": "" }
}

"linea_temporal": [
  {"momento": "", "eventos_clave": [""], "capitulos": []}
]

"premisa": "Premisa central en una oración poderosa"

Responde ÚNICAMENTE con el JSON estructurado.
`;

const PHASE2_SYSTEM_PROMPT = `
Eres un Arquitecto de Tramas Maestro generando la ESCALETA DE CAPÍTULOS.
Ya has creado la World Bible y estructura global en la fase anterior. Ahora debes crear el plan capítulo por capítulo.

REGLAS CRÍTICAS:
1. Cada capítulo debe tener MÍNIMO 6 beats narrativos sustanciales.
2. Cada "informacion_nueva" debe ser GENUINAMENTE NUEVA — no repetir de capítulos anteriores.
3. Los conflictos deben escalar progresivamente.
4. Mínimo 2 subtramas activas por capítulo y 2-3 diálogos significativos.
5. Al menos 1 momento de reflexión interna del protagonista por capítulo, pero SOLO en beats de calma o transición — NUNCA durante beats de acción/tensión/clímax.

TÍTULOS - OBLIGATORIOS:
⛔ TODOS los capítulos DEBEN tener un "titulo" EVOCADOR y LITERARIO (2-6 palabras). NUNCA vacío o genérico.
- "Prólogo" SOLO en capítulo número 0. "Epílogo" SOLO en número -1.
- Capítulos regulares (1 a N) tienen títulos EVOCADORES.

FORMATO COMPACTO — Genera un JSON con "escaleta_capitulos":
{
  "escaleta_capitulos": [
    {
      "numero": 1,
      "titulo": "Título evocador",
      "acto": "1",
      "cronologia": "Momento temporal",
      "ubicacion": "Lugar con detalles sensoriales",
      "elenco_presente": ["Personaje1", "Personaje2"],
      "funcion_estructural": "Rol del capítulo en la trama",
      "arcos_que_avanza": [{"arco": "nombre", "de": "estado_antes", "a": "estado_después"}],
      "informacion_nueva": "Revelación que descubre el lector",
      "pregunta_dramatica": "Pregunta al terminar",
      "conflicto_central": "Descripción breve del conflicto y stakes",
      "beats": [
        "Apertura: descripción concisa de lo que ocurre (personajes, acción, sensorial)",
        "Desarrollo: descripción concisa",
        "Tensión: descripción concisa del conflicto",
        "Reflexión: monólogo interno o pausa narrativa",
        "Escalada: descripción concisa",
        "Cierre/Hook: tipo (cliffhanger/revelación/amenaza) + descripción"
      ],
      "palabras_objetivo": 3000,
      "giro_emocional": "de [emoción] a [emoción]",
      "continuidad_entrada": "Estado al iniciar",
      "continuidad_salida": "Estado al terminar",
      "hook_final": "Descripción del gancho para el siguiente capítulo",
      "nivel_tension": 7,
      "estado_identidades": "Quién sabe qué sobre identidades secretas en este punto. Ej: 'El lector sabe que X es Y, pero los personajes no' o 'null si no hay identidades dobles activas'"
    }
  ]
}

IMPORTANTE: Cada beat es un STRING conciso (1-3 oraciones), NO un objeto complejo. Esto reduce el JSON total.
IMPORTANTE: Si hay personajes con doble identidad, el campo "estado_identidades" es OBLIGATORIO en cada capítulo donde aparezcan.
Responde ÚNICAMENTE con el JSON.
`;

export class ArchitectAgent extends BaseAgent {
  constructor() {
    super({
      name: "El Arquitecto",
      role: "architect",
      systemPrompt: PHASE1_SYSTEM_PROMPT,
      model: "gemini-2.5-flash",
      useThinking: true,
      thinkingBudget: 8192,
      // 32K es suficiente para Fase 1 (world bible ~10-20K tokens) y para
      // cada LOTE de Fase 2 (~5K tokens). Mantenerlo bajo es importante:
      // gemini-2.5-flash con thinking=true se vuelve perceptiblemente más
      // lento cuando ve mucho espacio disponible (explora más alternativas
      // internas), lo que en versiones previas hizo que Fase 1 + Fase 2
      // pasaran de los 15 min del HEARTBEAT_TIMEOUT_MS de la cola.
      maxOutputTokens: 32768,
    });
  }

  async execute(input: ArchitectInput): Promise<AgentResponse> {
    const guiaEstilo = input.guiaEstilo || `Género: ${input.genre}, Tono: ${input.tone}`;
    const ideaInicial = input.premise || input.title;

    const sectionsInfo = [];
    if (input.hasPrologue) sectionsInfo.push("PRÓLOGO");
    sectionsInfo.push(`${input.chapterCount} CAPÍTULOS`);
    if (input.hasEpilogue) sectionsInfo.push("EPÍLOGO");
    if (input.hasAuthorNote) sectionsInfo.push("NOTA DEL AUTOR");

    const commonContext = `
    Idea: "${ideaInicial}" 
    Guía de Estilo: "${guiaEstilo}"
    TÍTULO: ${input.title}
    GÉNERO: ${input.genre}
    TONO: ${input.tone}
    ESTRUCTURA: ${sectionsInfo.join(" + ")}
    ${input.hasPrologue ? "NOTA: Incluir PRÓLOGO que establezca el tono y siembre intriga." : ""}
    ${input.hasEpilogue ? "NOTA: Incluir EPÍLOGO que cierre todos los arcos narrativos." : ""}
    ${input.hasAuthorNote ? "NOTA: Incluir reflexiones para NOTA DEL AUTOR." : ""}
    ${input.architectInstructions ? `
    ═══════════════════════════════════════════════════════════════════
    🎯 INSTRUCCIONES ESPECÍFICAS DEL AUTOR (PRIORIDAD ALTA) 🎯
    ═══════════════════════════════════════════════════════════════════
    ${input.architectInstructions}
    Estas instrucciones tienen PRIORIDAD sobre las guías generales.
    ═══════════════════════════════════════════════════════════════════
    ` : ""}
    ${input.kindleUnlimitedOptimized ? `
    ═══════════════════════════════════════════════════════════════════
    ⚡ OPTIMIZACIÓN KINDLE UNLIMITED (ACTIVA) ⚡
    ═══════════════════════════════════════════════════════════════════
    1. CAPÍTULOS CORTOS Y ADICTIVOS (800-1500 palabras, leíbles en 3-5 min)
    2. CLIFFHANGERS OBLIGATORIOS en cada capítulo
    3. Giros cada 3-4 capítulos, escenas cortas y dinámicas
    4. Hook en página 1, incidente incitador antes del capítulo 3
    5. Empezar in media res, múltiples líneas de tensión
    ⚠️ En KU, cada página leída = ingresos. El lector NO PUEDE dejar el libro.
    ═══════════════════════════════════════════════════════════════════
    ` : ""}
    ${input.forbiddenNames && input.forbiddenNames.length > 0 ? `
    ═══════════════════════════════════════════════════════════════════
    ⛔ NOMBRES YA USADOS EN OTRAS OBRAS (PROHIBIDO REUTILIZAR) ⛔
    ═══════════════════════════════════════════════════════════════════
    Los siguientes nombres y apellidos ya fueron usados en otras novelas del autor.
    ESTÁ PROHIBIDO reutilizar cualquiera de ellos (ni como nombre ni como apellido):
    ${input.forbiddenNames.join(", ")}
    
    Inventa nombres COMPLETAMENTE NUEVOS, originales y memorables para TODOS los personajes.
    ═══════════════════════════════════════════════════════════════════
    ` : ""}
    `;

    console.log(`[El Arquitecto] === FASE 1: Generando World Bible y estructura global ===`);

    const phase1Prompt = `
    ${commonContext}
    
    FASE 1 DE 2: Genera la World Bible completa, matriz de arcos, plan de momentum, estructura de 3 actos, línea temporal y premisa.
    
    La novela tendrá ${input.chapterCount} capítulos${input.hasPrologue ? " + prólogo" : ""}${input.hasEpilogue ? " + epílogo" : ""}${input.hasAuthorNote ? " + nota del autor" : ""}.
    Diseña los arcos, giros y tensión para exactamente esa cantidad de capítulos.
    
    Responde ÚNICAMENTE con el JSON estructurado según las instrucciones.
    `;

    this.config.systemPrompt = PHASE1_SYSTEM_PROMPT;
    const phase1Response = await this.generateContent(phase1Prompt);

    if (phase1Response.error || phase1Response.timedOut || !phase1Response.content?.trim()) {
      console.error(`[El Arquitecto] Fase 1 falló: ${phase1Response.error || "timeout/vacío"}`);
      return phase1Response;
    }

    let phase1Json: any;
    try {
      phase1Json = repairJson(phase1Response.content);
      console.log(`[El Arquitecto] Fase 1: JSON parseado correctamente`);
    } catch (e) {
      // Diagnóstico ampliado: extrae un fragmento alrededor del error para
      // poder ver qué está mal (típico: comilla sin escapar, coma final).
      const msg = (e as Error).message || "";
      const posMatch = msg.match(/position\s+(\d+)/i);
      let snippet = "";
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const start = Math.max(0, pos - 120);
        const end = Math.min(phase1Response.content.length, pos + 120);
        snippet = phase1Response.content
          .slice(start, end)
          .replace(/\s+/g, " ");
      }
      console.error(`[El Arquitecto] Fase 1: Error parseando JSON - ${msg}${snippet ? `\n[contexto] …${snippet}…` : ""}`);
      return {
        content: phase1Response.content,
        error: `Phase 1 JSON parse error: ${msg}`,
        timedOut: false,
        tokenUsage: phase1Response.tokenUsage,
        thoughtSignature: phase1Response.thoughtSignature,
      };
    }

    const phase1Personajes = phase1Json.world_bible?.personajes?.length || 0;
    const phase1Arcos = phase1Json.matriz_arcos?.subtramas?.length || 0;
    console.log(`[El Arquitecto] Fase 1 completada. Personajes: ${phase1Personajes}, Arcos: ${phase1Arcos}`);

    // Heartbeat entre fases — sin esto, una novela larga (Fase 1 ~5 min +
    // Fase 2 ~11 min) supera el HEARTBEAT_TIMEOUT_MS de 15 min y la cola
    // marca el proyecto como congelado, abortando la Fase 2 a media generación.
    if (input.onProgress) {
      try {
        await input.onProgress(
          "phase1_done",
          `Fase 1 completada (${phase1Personajes} personajes, ${phase1Arcos} subtramas). Iniciando Fase 2: escaleta de ${input.chapterCount} capítulos...`
        );
      } catch (e) {
        console.warn(`[El Arquitecto] onProgress(phase1_done) falló: ${(e as Error).message}`);
      }
    }

    // FAIL-FAST: si la Fase 1 no produjo personajes, no tiene sentido lanzar
    // la Fase 2 (que tarda varios minutos y generará capítulos huérfanos sin
    // referencias válidas). Mejor abortar ya y dejar que el orquestador
    // reintente directamente la Fase 1.
    if (phase1Personajes === 0) {
      console.error(`[El Arquitecto] Fase 1: 0 personajes generados — abortando para reintentar sin desperdiciar Fase 2`);
      return {
        content: phase1Response.content,
        error: `Phase 1 produjo 0 personajes (world_bible.personajes vacío o ausente). Reintento necesario.`,
        timedOut: false,
        tokenUsage: phase1Response.tokenUsage,
        thoughtSignature: phase1Response.thoughtSignature,
      };
    }

    console.log(`[El Arquitecto] === FASE 2: Generando escaleta de ${input.chapterCount} capítulos (en lotes) ===`);

    const phase1Summary = JSON.stringify({
      premisa: phase1Json.premisa,
      world_bible: {
        personajes: phase1Json.world_bible?.personajes?.map((p: any) => ({
          nombre: p.nombre,
          rol: p.rol,
          perfil_psicologico: p.perfil_psicologico,
          arco_transformacion: p.arco_transformacion,
          contra_cliche: p.contra_cliche,
          modismos_habla: p.modismos_habla,
          relaciones: p.relaciones,
        })),
        lugares: phase1Json.world_bible?.lugares,
        temas_centrales: phase1Json.world_bible?.temas_centrales,
        motivos_literarios: phase1Json.world_bible?.motivos_literarios,
      },
      matriz_arcos: phase1Json.matriz_arcos,
      momentum_plan: phase1Json.momentum_plan,
      estructura_tres_actos: phase1Json.estructura_tres_actos,
      linea_temporal: phase1Json.linea_temporal,
    });

    // ═══════════════════════════════════════════════════════════════════
    // FASE 2 EN LOTES — La Fase 2 monolítica (32 caps × 6 beats = ~25k
    // tokens output) tarda 10-15 min en gemini-2.5-flash con thinking.
    // Eso es muy frágil: roza el timeout de la API (12 min), agota
    // el HEARTBEAT_TIMEOUT_MS de la cola (15 min) Y si el JSON se trunca
    // cerca de maxOutputTokens=65536 hay que reintentar TODO desde cero.
    //
    // Solución: trocear en lotes de 8 capítulos. Cada lote:
    //  - Tarda 2-4 min (lejos de cualquier timeout).
    //  - Genera ~5k tokens de JSON (siempre completo y parseable).
    //  - Emite heartbeat al terminar (resetea el contador de la cola).
    //  - Reintenta hasta 2 veces sin tirar abajo los lotes anteriores.
    // ═══════════════════════════════════════════════════════════════════
    const BATCH_SIZE = 8;
    const MAX_BATCH_RETRIES = 2;

    type Slot = { numero: number; etiqueta: string };
    const slots: Slot[] = [];
    if (input.hasPrologue) slots.push({ numero: 0, etiqueta: "Prólogo" });
    for (let i = 1; i <= input.chapterCount; i++) {
      slots.push({ numero: i, etiqueta: `Capítulo ${i}` });
    }
    if (input.hasEpilogue) slots.push({ numero: -1, etiqueta: "Epílogo" });
    if (input.hasAuthorNote) slots.push({ numero: -2, etiqueta: "Nota del Autor" });

    const totalSlots = slots.length;
    const numBatches = Math.ceil(totalSlots / BATCH_SIZE);

    const allChapters: any[] = [];
    let phase2InputTokens = 0;
    let phase2OutputTokens = 0;
    let phase2ThinkingTokens = 0;
    const phase2ThoughtSignatures: string[] = [];

    this.config.systemPrompt = PHASE2_SYSTEM_PROMPT;

    for (let b = 0; b < numBatches; b++) {
      const batchStart = b * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, totalSlots);
      const batchSlots = slots.slice(batchStart, batchEnd);
      const batchLabel = `lote ${b + 1}/${numBatches}`;

      // Contexto de continuidad: últimos 3 capítulos generados (sólo campos
      // críticos para enlazar tono, identidades y hook). Mantiene el prompt
      // pequeño aunque la escaleta crezca mucho.
      const continuityCtx = allChapters.length > 0
        ? JSON.stringify(allChapters.slice(-3).map((c) => ({
            numero: c.numero,
            titulo: c.titulo,
            continuidad_salida: c.continuidad_salida,
            hook_final: c.hook_final,
            estado_identidades: c.estado_identidades,
            nivel_tension: c.nivel_tension,
          })))
        : "(Es el primer lote: no hay capítulos previos.)";

      const slotList = batchSlots
        .map((s) => `  - "numero": ${s.numero}  → ${s.etiqueta}`)
        .join("\n");

      const batchPrompt = `
      ${commonContext}

      ═══════════════════════════════════════════════════════════════════
      WORLD BIBLE Y ESTRUCTURA (Fase 1 — referencia obligatoria):
      ═══════════════════════════════════════════════════════════════════
      ${phase1Summary}

      ═══════════════════════════════════════════════════════════════════
      CONTINUIDAD DESDE LOTES PREVIOS (últimos capítulos generados):
      ═══════════════════════════════════════════════════════════════════
      ${continuityCtx}

      Capítulos ya generados hasta ahora: ${allChapters.length} de ${totalSlots} totales.

      ═══════════════════════════════════════════════════════════════════
      ⛔ ESTE LOTE (${batchLabel}): GENERA EXACTAMENTE ${batchSlots.length} CAPÍTULOS ⛔
      ═══════════════════════════════════════════════════════════════════

      Debes producir UNA entrada en "escaleta_capitulos" para CADA UNO de estos números, EN ESTE ORDEN:
${slotList}

      Reglas para este lote:
      - Respeta los números EXACTOS indicados arriba (incluyendo 0 para prólogo, -1 para epílogo, -2 para nota del autor si aparecen).
      - Cada capítulo con TÍTULO literario (2-6 palabras), beats mínimos 6, información nueva, conflicto central.
      - Encadena la "continuidad_entrada" del PRIMER capítulo de este lote con la "continuidad_salida" del último capítulo previo (si existe en el contexto de continuidad).
      - NO repitas información ya revelada en lotes previos (puedes inferirla del contexto de continuidad).
      - Mantén el plan de momentum y los arcos de la Fase 1: este lote cubre los capítulos ${batchSlots[0].numero} a ${batchSlots[batchSlots.length - 1].numero} de un total de ${input.chapterCount} regulares.

      ⚠️ VERIFICACIÓN: Antes de responder, CUENTA las entradas. Si no hay EXACTAMENTE ${batchSlots.length}, tu respuesta es INVÁLIDA.

      Responde ÚNICAMENTE con un JSON con la forma { "escaleta_capitulos": [ ... ${batchSlots.length} entradas ... ] }.
      `;

      let batchOk = false;
      let batchAttempt = 0;
      let lastBatchErr = "";

      while (!batchOk && batchAttempt <= MAX_BATCH_RETRIES) {
        batchAttempt++;
        console.log(`[El Arquitecto] Fase 2 ${batchLabel} (intento ${batchAttempt}): generando capítulos ${batchSlots.map((s) => s.numero).join(", ")}`);

        const batchResp = await this.generateContent(batchPrompt);

        phase2InputTokens += batchResp.tokenUsage?.inputTokens || 0;
        phase2OutputTokens += batchResp.tokenUsage?.outputTokens || 0;
        phase2ThinkingTokens += batchResp.tokenUsage?.thinkingTokens || 0;
        if (batchResp.thoughtSignature) phase2ThoughtSignatures.push(batchResp.thoughtSignature);

        if (batchResp.error || batchResp.timedOut || !batchResp.content?.trim()) {
          lastBatchErr = batchResp.error || "timeout/vacío";
          console.warn(`[El Arquitecto] Fase 2 ${batchLabel} falló: ${lastBatchErr}`);
          if (batchAttempt > MAX_BATCH_RETRIES) break;
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        let parsed: any;
        try {
          parsed = repairJson(batchResp.content);
        } catch (e) {
          lastBatchErr = `JSON parse: ${(e as Error).message}`;
          console.warn(`[El Arquitecto] Fase 2 ${batchLabel} JSON inválido: ${lastBatchErr}`);
          if (batchAttempt > MAX_BATCH_RETRIES) break;
          continue;
        }

        const batchChapters: any[] = parsed.escaleta_capitulos || [];
        if (batchChapters.length === 0) {
          lastBatchErr = "0 capítulos en la respuesta";
          console.warn(`[El Arquitecto] Fase 2 ${batchLabel}: ${lastBatchErr}`);
          if (batchAttempt > MAX_BATCH_RETRIES) break;
          continue;
        }

        // Aceptamos el lote aunque traiga ±1 capítulo (el modelo a veces
        // genera de más/menos por interpretar el rango). Si trae menos,
        // marcamos error para que el orquestador detecte la discrepancia.
        allChapters.push(...batchChapters);
        batchOk = true;
        console.log(`[El Arquitecto] Fase 2 ${batchLabel} OK: ${batchChapters.length} capítulos. Acumulado: ${allChapters.length}/${totalSlots}`);
      }

      if (!batchOk) {
        console.error(`[El Arquitecto] Fase 2 ${batchLabel} falló tras ${MAX_BATCH_RETRIES + 1} intentos: ${lastBatchErr}`);
        return {
          content: JSON.stringify({ ...phase1Json, escaleta_capitulos: allChapters }),
          error: `Phase 2 ${batchLabel}: ${lastBatchErr}`,
          timedOut: false,
          tokenUsage: {
            inputTokens: (phase1Response.tokenUsage?.inputTokens || 0) + phase2InputTokens,
            outputTokens: (phase1Response.tokenUsage?.outputTokens || 0) + phase2OutputTokens,
            thinkingTokens: (phase1Response.tokenUsage?.thinkingTokens || 0) + phase2ThinkingTokens,
          },
          thoughtSignature: [phase1Response.thoughtSignature || "", ...phase2ThoughtSignatures]
            .filter(Boolean)
            .join("\n\n--- FASE 2 ---\n\n") || undefined,
        };
      }

      // Heartbeat después de cada lote → resetea el contador de la cola.
      if (input.onProgress) {
        try {
          await input.onProgress(
            "phase2_progress",
            `Escaleta ${batchLabel} completada (${allChapters.length}/${totalSlots} capítulos generados).`
          );
        } catch (e) {
          console.warn(`[El Arquitecto] onProgress(phase2_progress) falló: ${(e as Error).message}`);
        }
      }
    }

    // Deduplicar por "numero" — si el modelo repitió el último capítulo de un
    // lote en el siguiente lote (raro pero posible), nos quedamos con la
    // última versión generada (la más rica en continuidad).
    const dedupedByNumero = new Map<number, any>();
    for (const ch of allChapters) {
      if (ch && typeof ch.numero === "number") {
        dedupedByNumero.set(ch.numero, ch);
      }
    }
    const orderedChapters = slots
      .map((s) => dedupedByNumero.get(s.numero))
      .filter((ch) => ch != null);

    const chaptersCount = orderedChapters.length;
    const missingNumeros = slots
      .map((s) => s.numero)
      .filter((n) => !dedupedByNumero.has(n));
    if (missingNumeros.length > 0) {
      console.warn(`[El Arquitecto] Fase 2: faltan ${missingNumeros.length} capítulos (números: ${missingNumeros.join(", ")}). El orquestador detectará la discrepancia y reintentará.`);
    }
    if (allChapters.length !== chaptersCount) {
      console.log(`[El Arquitecto] Fase 2: deduplicados ${allChapters.length - chaptersCount} capítulos repetidos entre lotes.`);
    }
    console.log(`[El Arquitecto] Fase 2 completada. Capítulos totales: ${chaptersCount}/${totalSlots}`);

    if (input.onProgress) {
      try {
        await input.onProgress(
          "phase2_done",
          `Fase 2 completada: ${chaptersCount} capítulos en la escaleta.`
        );
      } catch (e) {
        console.warn(`[El Arquitecto] onProgress(phase2_done) falló: ${(e as Error).message}`);
      }
    }

    const mergedResult = {
      ...phase1Json,
      escaleta_capitulos: orderedChapters,
    };

    const mergedTokenUsage = {
      inputTokens: (phase1Response.tokenUsage?.inputTokens || 0) + phase2InputTokens,
      outputTokens: (phase1Response.tokenUsage?.outputTokens || 0) + phase2OutputTokens,
      thinkingTokens: (phase1Response.tokenUsage?.thinkingTokens || 0) + phase2ThinkingTokens,
    };

    const mergedThoughts = [phase1Response.thoughtSignature || "", ...phase2ThoughtSignatures]
      .filter(Boolean)
      .join("\n\n--- FASE 2 ---\n\n");

    console.log(`[El Arquitecto] ✅ Ambas fases completadas. Total: ${mergedResult.world_bible?.personajes?.length || 0} personajes, ${chaptersCount} capítulos`);

    return {
      content: JSON.stringify(mergedResult),
      tokenUsage: mergedTokenUsage,
      thoughtSignature: mergedThoughts || undefined,
      timedOut: false,
    };
  }
}
