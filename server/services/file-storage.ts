import fs from "fs";
import path from "path";

const DEFAULT_INBOX_DIR = process.env.LITAGENTS_INBOX_DIR || "./inbox";
const DEFAULT_EXPORTS_DIR = process.env.LITAGENTS_EXPORTS_DIR || "./exports";
const ALLOWED_EXTENSIONS = [".docx", ".doc", ".txt", ".md"];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface ServerFile {
  name: string;
  path: string;
  size: number;
  extension: string;
  modifiedAt: Date;
}

function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isValidFilename(filename: string): boolean {
  const basename = path.basename(filename);
  if (basename !== filename) return false;
  if (filename.includes("..")) return false;
  if (filename.startsWith(".")) return false;
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function isPathWithinDir(filePath: string, dir: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(dir);
  return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
}

export function getInboxDir(): string {
  ensureDirectory(DEFAULT_INBOX_DIR);
  return DEFAULT_INBOX_DIR;
}

export function getExportsDir(): string {
  ensureDirectory(DEFAULT_EXPORTS_DIR);
  return DEFAULT_EXPORTS_DIR;
}

export function listInboxFiles(): ServerFile[] {
  const inboxDir = getInboxDir();
  
  try {
    const files = fs.readdirSync(inboxDir);
    const allowedExtensions = [".docx", ".doc", ".txt", ".md"];
    
    return files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return allowedExtensions.includes(ext);
      })
      .map(file => {
        const filePath = path.join(inboxDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          extension: path.extname(file).toLowerCase(),
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  } catch (error) {
    console.error("[FileStorage] Error listing inbox files:", error);
    return [];
  }
}

export function readInboxFile(filename: string): Buffer | null {
  if (!isValidFilename(filename)) {
    console.error("[FileStorage] Security: Invalid filename:", filename);
    return null;
  }
  
  const inboxDir = getInboxDir();
  const filePath = path.join(inboxDir, path.basename(filename));
  
  if (!isPathWithinDir(filePath, inboxDir)) {
    console.error("[FileStorage] Security: Attempted path traversal:", filename);
    return null;
  }
  
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      console.error("[FileStorage] File too large:", filename, stats.size);
      return null;
    }
    return fs.readFileSync(filePath);
  } catch (error) {
    console.error("[FileStorage] Error reading file:", error);
    return null;
  }
}

export function deleteInboxFile(filename: string): boolean {
  if (!isValidFilename(filename)) {
    console.error("[FileStorage] Security: Invalid filename:", filename);
    return false;
  }
  
  const inboxDir = getInboxDir();
  const filePath = path.join(inboxDir, path.basename(filename));
  
  if (!isPathWithinDir(filePath, inboxDir)) {
    console.error("[FileStorage] Security: Attempted path traversal:", filename);
    return false;
  }
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("[FileStorage] Error deleting file:", error);
    return false;
  }
}

export function moveToProcessed(filename: string): boolean {
  if (!isValidFilename(filename)) {
    console.error("[FileStorage] Security: Invalid filename:", filename);
    return false;
  }
  
  const inboxDir = getInboxDir();
  const processedDir = path.join(inboxDir, "processed");
  ensureDirectory(processedDir);
  
  const basename = path.basename(filename);
  const sourcePath = path.join(inboxDir, basename);
  const destPath = path.join(processedDir, `${Date.now()}_${basename}`);
  
  if (!isPathWithinDir(sourcePath, inboxDir)) {
    console.error("[FileStorage] Security: Attempted path traversal:", filename);
    return false;
  }
  
  try {
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("[FileStorage] Error moving file to processed:", error);
    return false;
  }
}

export function saveExportFile(filename: string, content: string | Buffer): string | null {
  const exportsDir = getExportsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeFilename = filename.replace(/[^a-zA-Z0-9\u00C0-\u024F._-]/g, "_");
  const finalFilename = `${timestamp}_${safeFilename}`;
  const filePath = path.join(exportsDir, finalFilename);
  
  try {
    fs.writeFileSync(filePath, content, typeof content === "string" ? "utf-8" : undefined);
    return filePath;
  } catch (error) {
    console.error("[FileStorage] Error saving export file:", error);
    return null;
  }
}

export function listExportFiles(): ServerFile[] {
  const exportsDir = getExportsDir();
  
  try {
    const files = fs.readdirSync(exportsDir);
    
    return files
      .filter(file => !fs.statSync(path.join(exportsDir, file)).isDirectory())
      .map(file => {
        const filePath = path.join(exportsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          extension: path.extname(file).toLowerCase(),
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  } catch (error) {
    console.error("[FileStorage] Error listing export files:", error);
    return [];
  }
}

export function readExportFile(filename: string): Buffer | null {
  const exportsDir = getExportsDir();
  const filePath = path.join(exportsDir, filename);
  
  const normalizedPath = path.normalize(filePath);
  const normalizedExports = path.normalize(exportsDir);
  if (!normalizedPath.startsWith(normalizedExports)) {
    return null;
  }
  
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath);
  } catch (error) {
    console.error("[FileStorage] Error reading export file:", error);
    return null;
  }
}

export function deleteExportFile(filename: string): boolean {
  const exportsDir = getExportsDir();
  const filePath = path.join(exportsDir, filename);
  
  const normalizedPath = path.normalize(filePath);
  const normalizedExports = path.normalize(exportsDir);
  if (!normalizedPath.startsWith(normalizedExports)) {
    return false;
  }
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("[FileStorage] Error deleting export file:", error);
    return false;
  }
}

export function getStorageInfo(): { inboxDir: string; exportsDir: string; inboxFiles: number; exportFiles: number } {
  return {
    inboxDir: path.resolve(getInboxDir()),
    exportsDir: path.resolve(getExportsDir()),
    inboxFiles: listInboxFiles().length,
    exportFiles: listExportFiles().length,
  };
}
