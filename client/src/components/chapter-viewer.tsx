import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, Loader2 } from "lucide-react";
import type { Chapter } from "@shared/schema";

interface ChapterViewerProps {
  chapter: Chapter | null;
}

export function ChapterViewer({ chapter }: ChapterViewerProps) {
  if (!chapter) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <FileText className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground">
          Selecciona un capítulo para ver su contenido
        </p>
      </div>
    );
  }

  const isLoading = chapter.status === "writing" || chapter.status === "editing";

  return (
    <div className="h-full flex flex-col" data-testid={`viewer-chapter-${chapter.id}`}>
      <div className="flex items-center justify-between gap-4 pb-4 border-b mb-4">
        <div>
          <h2 className="text-xl font-semibold font-serif">
            Capítulo {chapter.chapterNumber}
          </h2>
          {chapter.title && (
            <p className="text-lg text-muted-foreground font-serif mt-1">
              {chapter.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {chapter.wordCount && chapter.wordCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {chapter.wordCount.toLocaleString()} palabras
            </Badge>
          )}
          {isLoading && (
            <Badge className="bg-chart-2/20 text-chart-2">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              En progreso
            </Badge>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {chapter.content ? (
          <article className="prose prose-lg dark:prose-invert max-w-prose mx-auto leading-7 font-serif">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: chapter.content
                  .replace(/\n\n/g, '</p><p>')
                  .replace(/\n/g, '<br />')
                  .replace(/^/, '<p>')
                  .replace(/$/, '</p>')
              }} 
            />
          </article>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              El contenido se está generando...
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              El capítulo aparecerá aquí cuando esté listo
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
