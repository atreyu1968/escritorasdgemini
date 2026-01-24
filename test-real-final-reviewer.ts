import { FinalReviewerAgent } from './server/agents/final-reviewer';
import { storage } from './server/storage';

async function testWithRealProject() {
  console.log("=== PRUEBA FINAL REVIEWER CON PROYECTO REAL (ID 32) ===\n");
  console.log("Saltando Auditor de Voz y Detector Semántico...\n");
  
  const projectId = 32;
  
  // Get project
  const project = await storage.getProject(projectId);
  if (!project) {
    console.error("Proyecto no encontrado");
    return;
  }
  console.log(`Proyecto: ${project.title}`);
  
  // Get chapters
  const chapters = await storage.getChaptersByProject(projectId);
  console.log(`Capítulos: ${chapters.length}`);
  
  // Get world bible
  const worldBible = await storage.getWorldBibleByProject(projectId);
  console.log(`World Bible: ${worldBible ? 'Sí' : 'No'}`);
  
  // Format chapters for FinalReviewer
  const chaptersForReview = chapters
    .filter(c => c.content || c.originalContent)
    .map(c => ({
      numero: c.chapterNumber,
      titulo: c.title || `Capítulo ${c.chapterNumber}`,
      contenido: c.content || c.originalContent || "",
    }));
  
  console.log(`Capítulos con contenido: ${chaptersForReview.length}`);
  
  const totalChars = chaptersForReview.reduce((sum, c) => sum + c.contenido.length, 0);
  console.log(`Total caracteres: ${totalChars.toLocaleString()}`);
  
  // Build world bible object
  const worldBibleForReview = worldBible ? {
    personajes: worldBible.characters || [],
    timeline: worldBible.timeline || [],
    reglas_mundo: worldBible.worldRules || [],
    plot_outline: worldBible.plotOutline || [],
  } : {};
  
  const agent = new FinalReviewerAgent();
  
  console.log("\n=== LLAMANDO AL FINAL REVIEWER CON DEEPSEEK ===\n");
  const startTime = Date.now();
  
  try {
    const result = await agent.execute({
      projectTitle: project.title,
      chapters: chaptersForReview,
      worldBible: worldBibleForReview,
      guiaEstilo: "Estilo de thriller policiaco con ambiente noir barcelonés",
      pasadaNumero: 1,
    } as any);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== RESULTADO (${duration}s) ===`);
    console.log(`Puntuación: ${result.result?.puntuacion_global}/10`);
    console.log(`Veredicto: ${result.result?.veredicto}`);
    console.log(`\nResumen: ${result.result?.resumen_general?.substring(0, 300)}...`);
    
    if (result.result?.issues?.length) {
      console.log(`\nIssues (${result.result.issues.length}):`);
      result.result.issues.slice(0, 5).forEach((issue, i) => {
        console.log(`  ${i+1}. [${issue.severidad}] ${issue.descripcion?.substring(0, 100)}...`);
      });
    }
  } catch (error) {
    console.error("ERROR:", error);
  }
}

testWithRealProject();
