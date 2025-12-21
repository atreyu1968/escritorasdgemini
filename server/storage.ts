import { db } from "./db";
import { 
  projects, chapters, worldBibles, thoughtLogs, agentStatuses,
  type Project, type InsertProject, type Chapter, type InsertChapter,
  type WorldBible, type InsertWorldBible, type ThoughtLog, type InsertThoughtLog,
  type AgentStatus, type InsertAgentStatus
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  createProject(data: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  updateProject(id: number, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  createChapter(data: InsertChapter): Promise<Chapter>;
  getChaptersByProject(projectId: number): Promise<Chapter[]>;
  updateChapter(id: number, data: Partial<Chapter>): Promise<Chapter | undefined>;

  createWorldBible(data: InsertWorldBible): Promise<WorldBible>;
  getWorldBibleByProject(projectId: number): Promise<WorldBible | undefined>;
  updateWorldBible(id: number, data: Partial<WorldBible>): Promise<WorldBible | undefined>;

  createThoughtLog(data: InsertThoughtLog): Promise<ThoughtLog>;
  getThoughtLogsByProject(projectId: number): Promise<ThoughtLog[]>;

  createAgentStatus(data: InsertAgentStatus): Promise<AgentStatus>;
  getAgentStatusesByProject(projectId: number): Promise<AgentStatus[]>;
  updateAgentStatus(projectId: number, agentName: string, data: Partial<AgentStatus>): Promise<AgentStatus | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async createChapter(data: InsertChapter): Promise<Chapter> {
    const [chapter] = await db.insert(chapters).values(data).returning();
    return chapter;
  }

  async getChaptersByProject(projectId: number): Promise<Chapter[]> {
    return db.select().from(chapters).where(eq(chapters.projectId, projectId)).orderBy(chapters.chapterNumber);
  }

  async updateChapter(id: number, data: Partial<Chapter>): Promise<Chapter | undefined> {
    const [updated] = await db.update(chapters).set(data).where(eq(chapters.id, id)).returning();
    return updated;
  }

  async createWorldBible(data: InsertWorldBible): Promise<WorldBible> {
    const [worldBible] = await db.insert(worldBibles).values(data).returning();
    return worldBible;
  }

  async getWorldBibleByProject(projectId: number): Promise<WorldBible | undefined> {
    const [worldBible] = await db.select().from(worldBibles).where(eq(worldBibles.projectId, projectId));
    return worldBible;
  }

  async updateWorldBible(id: number, data: Partial<WorldBible>): Promise<WorldBible | undefined> {
    const [updated] = await db.update(worldBibles).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(worldBibles.id, id)).returning();
    return updated;
  }

  async createThoughtLog(data: InsertThoughtLog): Promise<ThoughtLog> {
    const [log] = await db.insert(thoughtLogs).values(data).returning();
    return log;
  }

  async getThoughtLogsByProject(projectId: number): Promise<ThoughtLog[]> {
    return db.select().from(thoughtLogs).where(eq(thoughtLogs.projectId, projectId)).orderBy(desc(thoughtLogs.createdAt));
  }

  async createAgentStatus(data: InsertAgentStatus): Promise<AgentStatus> {
    const [status] = await db.insert(agentStatuses).values(data).returning();
    return status;
  }

  async getAgentStatusesByProject(projectId: number): Promise<AgentStatus[]> {
    return db.select().from(agentStatuses).where(eq(agentStatuses.projectId, projectId));
  }

  async updateAgentStatus(projectId: number, agentName: string, data: Partial<AgentStatus>): Promise<AgentStatus | undefined> {
    const [existing] = await db.select().from(agentStatuses)
      .where(and(eq(agentStatuses.projectId, projectId), eq(agentStatuses.agentName, agentName)));
    
    if (!existing) {
      const [created] = await db.insert(agentStatuses).values({
        projectId,
        agentName,
        ...data,
      } as InsertAgentStatus).returning();
      return created;
    }

    const [updated] = await db.update(agentStatuses).set({
      ...data,
      lastActivity: new Date(),
    }).where(eq(agentStatuses.id, existing.id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
