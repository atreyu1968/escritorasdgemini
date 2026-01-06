import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  DollarSign, 
  Loader2, 
  Trash2, 
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  StopCircle,
  Star,
  Download,
  ChevronRight
} from "lucide-react";
import type { ReeditProject, ReeditChapter, ReeditAuditReport } from "@shared/schema";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ca", name: "Català" },
  { code: "es", name: "Español" },
];

function getLanguageName(code: string | null | undefined): string {
  if (!code) return "Not detected";
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code.toLowerCase());
  return lang ? lang.name : code.toUpperCase();
}

const INPUT_PRICE_PER_MILLION = 0.80;
const OUTPUT_PRICE_PER_MILLION = 6.50;
const THINKING_PRICE_PER_MILLION = 3.0;

function calculateCost(inputTokens: number, outputTokens: number, thinkingTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION;
  const thinkingCost = (thinkingTokens / 1_000_000) * THINKING_PRICE_PER_MILLION;
  return inputCost + outputCost + thinkingCost;
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
    pending: { variant: "outline", icon: Clock },
    processing: { variant: "secondary", icon: Loader2 },
    completed: { variant: "default", icon: CheckCircle },
    error: { variant: "destructive", icon: AlertCircle },
  };
  const config = variants[status] || variants.pending;
  const IconComponent = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <IconComponent className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function getStageBadge(stage: string) {
  const stageLabels: Record<string, string> = {
    uploaded: "Uploaded",
    analyzing: "Analyzing Structure",
    editing: "AI Editing",
    auditing: "QA Audit",
    reviewing: "Final Review",
    completed: "Complete",
  };
  return stageLabels[stage] || stage;
}

function ScoreDisplay({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const color = score >= 8 ? "text-green-600 dark:text-green-400" : score >= 6 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
  return (
    <div className="flex items-center gap-2">
      <Star className={`h-5 w-5 ${color}`} />
      <span className={`text-2xl font-bold ${color}`}>{score}/10</span>
    </div>
  );
}

export default function ReeditPage() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadLanguage, setUploadLanguage] = useState("en");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ReeditProject[]>({
    queryKey: ["/api/reedit-projects"],
    refetchInterval: 5000,
  });

  const { data: chapters = [] } = useQuery<ReeditChapter[]>({
    queryKey: ["/api/reedit-projects", selectedProject, "chapters"],
    enabled: !!selectedProject,
    refetchInterval: 3000,
  });

  const { data: auditReport } = useQuery<ReeditAuditReport>({
    queryKey: ["/api/reedit-projects", selectedProject, "audit-report"],
    enabled: !!selectedProject,
  });

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/reedit-projects", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Manuscript Uploaded", description: `Project "${data.title}" created successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/reedit-projects"] });
      setUploadTitle("");
      setUploadFile(null);
      setSelectedProject(data.projectId);
    },
    onError: (error: Error) => {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("POST", `/api/reedit-projects/${projectId}/start`);
    },
    onSuccess: () => {
      toast({ title: "Processing Started", description: "The manuscript is now being re-edited" });
      queryClient.invalidateQueries({ queryKey: ["/api/reedit-projects"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("POST", `/api/reedit-projects/${projectId}/cancel`);
    },
    onSuccess: () => {
      toast({ title: "Cancelled", description: "Processing has been cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/reedit-projects"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: number) => {
      return apiRequest("DELETE", `/api/reedit-projects/${projectId}`);
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Project has been deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/reedit-projects"] });
      if (selectedProject) setSelectedProject(null);
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.(docx|doc)$/i, ""));
      }
    }
  }, [uploadTitle]);

  const handleUpload = useCallback(async () => {
    if (!uploadFile || !uploadTitle.trim()) {
      toast({ title: "Missing Information", description: "Please provide a title and file", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("manuscript", uploadFile);
    formData.append("title", uploadTitle.trim());
    formData.append("language", uploadLanguage);
    try {
      await uploadMutation.mutateAsync(formData);
    } finally {
      setIsUploading(false);
    }
  }, [uploadFile, uploadTitle, uploadLanguage, uploadMutation, toast]);

  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  const progress = selectedProjectData
    ? ((selectedProjectData.processedChapters || 0) / Math.max(selectedProjectData.totalChapters || 1, 1)) * 100
    : 0;

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Manuscript Re-Editing</h1>
        <p className="text-muted-foreground">
          Upload existing manuscripts for comprehensive AI-powered editing through Editor, Copy Editor, QA Auditors, and Final Reviewer.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Manuscript
              </CardTitle>
              <CardDescription>
                Upload a Word document (.docx) for re-editing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reedit-title">Title</Label>
                <Input
                  id="reedit-title"
                  data-testid="input-reedit-title"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Manuscript title"
                />
              </div>
              <div>
                <Label htmlFor="reedit-language">Language</Label>
                <Select value={uploadLanguage} onValueChange={setUploadLanguage}>
                  <SelectTrigger data-testid="select-reedit-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reedit-file">File</Label>
                <Input
                  id="reedit-file"
                  type="file"
                  data-testid="input-reedit-file"
                  accept=".docx,.doc"
                  onChange={handleFileChange}
                />
                {uploadFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadTitle.trim() || isUploading}
                className="w-full"
                data-testid="button-upload-reedit"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload & Create Project
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : projects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No projects yet. Upload a manuscript to get started.
                </p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        data-testid={`card-reedit-project-${project.id}`}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          selectedProject === project.id
                            ? "bg-accent"
                            : "hover-elevate"
                        }`}
                        onClick={() => setSelectedProject(project.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{project.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {getLanguageName(project.detectedLanguage)} • {project.totalWordCount?.toLocaleString() || 0} words
                            </p>
                          </div>
                          {getStatusBadge(project.status)}
                        </div>
                        {project.status === "processing" && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>{getStageBadge(project.currentStage)}</span>
                              <span>{project.processedChapters}/{project.totalChapters}</span>
                            </div>
                            <Progress
                              value={(project.processedChapters || 0) / Math.max(project.totalChapters || 1, 1) * 100}
                              className="h-1"
                            />
                          </div>
                        )}
                        {project.bestsellerScore && (
                          <div className="mt-2">
                            <ScoreDisplay score={project.bestsellerScore} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedProjectData ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>{selectedProjectData.title}</CardTitle>
                    <CardDescription>
                      {getLanguageName(selectedProjectData.detectedLanguage)} • {selectedProjectData.totalWordCount?.toLocaleString() || 0} words • {selectedProjectData.totalChapters || 0} chapters
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(selectedProjectData.status)}
                    {selectedProjectData.status === "pending" && (
                      <Button
                        onClick={() => startMutation.mutate(selectedProjectData.id)}
                        disabled={startMutation.isPending}
                        data-testid="button-start-reedit"
                      >
                        {startMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Start Re-Edit
                      </Button>
                    )}
                    {selectedProjectData.status === "processing" && (
                      <Button
                        variant="destructive"
                        onClick={() => cancelMutation.mutate(selectedProjectData.id)}
                        disabled={cancelMutation.isPending}
                        data-testid="button-cancel-reedit"
                      >
                        {cancelMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <StopCircle className="h-4 w-4 mr-2" />
                        )}
                        Cancel
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(selectedProjectData.id)}
                      disabled={deleteMutation.isPending || selectedProjectData.status === "processing"}
                      data-testid="button-delete-reedit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="progress">
                  <TabsList>
                    <TabsTrigger value="progress" data-testid="tab-reedit-progress">Progress</TabsTrigger>
                    <TabsTrigger value="chapters" data-testid="tab-reedit-chapters">Chapters</TabsTrigger>
                    <TabsTrigger value="report" data-testid="tab-reedit-report">Final Report</TabsTrigger>
                  </TabsList>

                  <TabsContent value="progress" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1">Current Stage</p>
                            <Badge variant="outline" className="text-lg px-4 py-1">
                              {getStageBadge(selectedProjectData.currentStage)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-1">Progress</p>
                            <p className="text-2xl font-bold">
                              {selectedProjectData.processedChapters || 0}/{selectedProjectData.totalChapters || 0}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedProjectData.status === "processing" && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Processing chapters...</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    )}

                    {selectedProjectData.bestsellerScore && (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Bestseller Score</p>
                              <ScoreDisplay score={selectedProjectData.bestsellerScore} />
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Estimated Cost</p>
                              <p className="text-lg font-semibold flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {calculateCost(
                                  selectedProjectData.totalInputTokens || 0,
                                  selectedProjectData.totalOutputTokens || 0,
                                  selectedProjectData.totalThinkingTokens || 0
                                ).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {selectedProjectData.structureAnalysis && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Structure Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-sm bg-muted p-3 rounded-md overflow-auto max-h-[200px]">
                            {JSON.stringify(selectedProjectData.structureAnalysis as object, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="chapters">
                    <ScrollArea className="h-[400px] mt-4">
                      {chapters.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No chapters parsed yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {chapters.map((chapter) => (
                            <div
                              key={chapter.id}
                              data-testid={`card-reedit-chapter-${chapter.id}`}
                              className="p-3 border rounded-md"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Ch. {chapter.chapterNumber}</Badge>
                                  <span className="font-medium">{chapter.title || `Chapter ${chapter.chapterNumber}`}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {chapter.editorScore && (
                                    <Badge variant="secondary">
                                      Editor: {chapter.editorScore}/10
                                    </Badge>
                                  )}
                                  {getStatusBadge(chapter.status)}
                                </div>
                              </div>
                              {chapter.editedContent && chapter.originalContent && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {chapter.editedContent.split(/\s+/).length.toLocaleString()} words
                                  {chapter.copyeditorChanges && (
                                    <span className="ml-2">• Changes: {chapter.copyeditorChanges.substring(0, 100)}...</span>
                                  )}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="report">
                    {selectedProjectData.status === "completed" && selectedProjectData.finalReviewResult ? (
                      <Card className="mt-4">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" />
                            Final Review Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-sm bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                            {JSON.stringify(selectedProjectData.finalReviewResult, null, 2)}
                          </pre>
                          <div className="mt-4 flex justify-end">
                            <Button variant="outline" data-testid="button-download-reedit">
                              <Download className="h-4 w-4 mr-2" />
                              Export Edited Manuscript
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center text-muted-foreground py-12">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Final report will be available after processing completes</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a Project</h3>
                <p className="text-muted-foreground">
                  Choose a project from the list or upload a new manuscript to begin
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
