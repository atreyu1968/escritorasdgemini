import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Minus, Plus, Play, RotateCcw } from "lucide-react";

const genres = [
  { value: "fantasy", label: "Fantasía", description: "Mundos mágicos y criaturas sobrenaturales" },
  { value: "scifi", label: "Ciencia Ficción", description: "Futuros tecnológicos y exploración espacial" },
  { value: "thriller", label: "Thriller", description: "Suspense y tensión narrativa" },
  { value: "romance", label: "Romance", description: "Relaciones y conexiones emocionales" },
  { value: "horror", label: "Horror", description: "Terror y elementos sobrenaturales" },
  { value: "mystery", label: "Misterio", description: "Investigación y resolución de enigmas" },
  { value: "literary", label: "Literaria", description: "Exploración de la condición humana" },
];

const tones = [
  { value: "dramatic", label: "Dramático", description: "Emociones intensas y conflictos profundos" },
  { value: "dark", label: "Oscuro", description: "Atmósfera sombría y temas maduros" },
  { value: "satirical", label: "Satírico", description: "Crítica social con humor mordaz" },
  { value: "lyrical", label: "Lírico", description: "Prosa poética y descriptiva" },
  { value: "minimalist", label: "Minimalista", description: "Estilo conciso y directo" },
  { value: "epic", label: "Épico", description: "Grandeza y eventos monumentales" },
];

const configSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(100),
  genre: z.string().min(1, "Selecciona un género"),
  tone: z.string().min(1, "Selecciona un tono"),
  chapterCount: z.number().min(1).max(20),
});

type ConfigFormData = z.infer<typeof configSchema>;

interface ConfigPanelProps {
  onSubmit: (data: ConfigFormData) => void;
  onReset?: () => void;
  isLoading?: boolean;
  defaultValues?: Partial<ConfigFormData>;
}

export function ConfigPanel({ onSubmit, onReset, isLoading, defaultValues }: ConfigPanelProps) {
  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      genre: defaultValues?.genre || "fantasy",
      tone: defaultValues?.tone || "dramatic",
      chapterCount: defaultValues?.chapterCount || 5,
    },
  });

  const chapterCount = form.watch("chapterCount");

  const handleIncrement = () => {
    if (chapterCount < 20) {
      form.setValue("chapterCount", chapterCount + 1);
    }
  };

  const handleDecrement = () => {
    if (chapterCount > 1) {
      form.setValue("chapterCount", chapterCount - 1);
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-6"
        data-testid="config-form"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título del Proyecto</FormLabel>
              <FormControl>
                <Input 
                  placeholder="La última esperanza..." 
                  {...field}
                  data-testid="input-project-title"
                />
              </FormControl>
              <FormDescription>
                El título de tu novela o manuscrito
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="genre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Género</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-genre">
                    <SelectValue placeholder="Selecciona un género" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {genres.map((genre) => (
                    <SelectItem key={genre.value} value={genre.value}>
                      <div className="flex flex-col">
                        <span>{genre.label}</span>
                        <span className="text-xs text-muted-foreground">{genre.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tono Narrativo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-tone">
                    <SelectValue placeholder="Selecciona un tono" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tones.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      <div className="flex flex-col">
                        <span>{tone.label}</span>
                        <span className="text-xs text-muted-foreground">{tone.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="chapterCount"
          render={() => (
            <FormItem>
              <FormLabel>Número de Capítulos</FormLabel>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleDecrement}
                  disabled={chapterCount <= 1}
                  data-testid="button-decrement-chapters"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-semibold" data-testid="text-chapter-count">
                    {chapterCount}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    capítulos
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleIncrement}
                  disabled={chapterCount >= 20}
                  data-testid="button-increment-chapters"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <FormDescription>
                Cada capítulo tendrá aproximadamente 2000-3000 palabras
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button 
            type="submit" 
            className="flex-1"
            disabled={isLoading}
            data-testid="button-start-project"
          >
            <Play className="h-4 w-4 mr-2" />
            {isLoading ? "Generando..." : "Iniciar Generación"}
          </Button>
          {onReset && (
            <Button 
              type="button" 
              variant="outline"
              onClick={onReset}
              disabled={isLoading}
              data-testid="button-reset-config"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

export { configSchema };
export type { ConfigFormData };
