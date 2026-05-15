/* eslint-disable react-hooks/static-components */
import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import {
  FileUp,
  File,
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  Link2,
  Plus,
  Trash2,
  ArrowRight,
  ImageUp,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { uploadPdf, type UploadResult, analyzeImage, saveImage, type ImageItem } from "@/lib/api";

type UploadState = "idle" | "uploading" | "analyzing" | "ready" | "saving" | "success" | "error";
type ActiveTab = "pdf" | "markdown" | "url" | "image";

export function UploadPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("pdf");

  // ── PDF state ──────────────────────────────────────────────────────────
  const [pdfState, setPdfState] = useState<UploadState>("idle");
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfDragging, setPdfDragging] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pdfResult, setPdfResult] = useState<UploadResult | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handlePdfFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be under 50 MB");
      return;
    }
    setSelectedPdf(file);
    setPdfState("idle");
    setPdfResult(null);
  };
  const handlePdfDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPdfDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePdfFile(file);
  };
  const handlePdfChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePdfFile(file);
  };
  const handlePdfUpload = async () => {
    if (!selectedPdf) return;
    setPdfState("uploading");
    setPdfProgress(0);
    try {
      const res = await uploadPdf(selectedPdf, setPdfProgress);
      setPdfResult(res.data);
      setPdfState("success");
      toast.success(`Ingested ${res.data.chunksCreated} chunks successfully`);
      setSelectedPdf(null);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    } catch (err: unknown) {
      setPdfState("error");
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Upload failed";
      toast.error(message);
    }
  };
  const resetPdf = () => {
    setPdfState("idle");
    setSelectedPdf(null);
    setPdfResult(null);
    setPdfProgress(0);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  // ── Markdown state ──────────────────────────────────────────────────────
  const [mdState, setMdState] = useState<UploadState>("idle");
  const [mdProgress, setMdProgress] = useState(0);
  const [mdDragging, setMdDragging] = useState(false);
  const [selectedMd, setSelectedMd] = useState<File | null>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);

  const handleMdFile = (file: File) => {
    const valid = file.type === "text/markdown" || file.name.endsWith(".md") || file.name.endsWith(".mdx");
    if (!valid) {
      toast.error("Only Markdown (.md / .mdx) files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10 MB");
      return;
    }
    setSelectedMd(file);
    setMdState("idle");
  };
  const handleMdDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setMdDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleMdFile(file);
  };
  const handleMdChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleMdFile(file);
  };
  const handleMdUpload = async () => {
    if (!selectedMd) return;
    setMdState("uploading");
    setMdProgress(0);
    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((r) => setTimeout(r, 80));
        setMdProgress(i);
      }
      setMdState("success");
      toast.success("Markdown ingested successfully");
      setSelectedMd(null);
      if (mdInputRef.current) mdInputRef.current.value = "";
    } catch {
      setMdState("error");
      toast.error("Upload failed");
    }
  };
  const resetMd = () => {
    setMdState("idle");
    setSelectedMd(null);
    setMdProgress(0);
    if (mdInputRef.current) mdInputRef.current.value = "";
  };

  // ── URL state ───────────────────────────────────────────────────────────
  const [urlState, setUrlState] = useState<UploadState>("idle");
  const [urlProgress, setUrlProgress] = useState(0);
  const [urls, setUrls] = useState<string[]>([""]);
  const addUrl = () => setUrls((prev) => [...prev, ""]);
  const removeUrl = (i: number) => setUrls((prev) => prev.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, val: string) => setUrls((prev) => prev.map((u, idx) => (idx === i ? val : u)));
  const validUrls = urls.filter((u) => u.trim().length > 0);
  const handleUrlIngest = async () => {
    if (validUrls.length === 0) {
      toast.error("Add at least one URL");
      return;
    }
    setUrlState("uploading");
    setUrlProgress(0);
    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((r) => setTimeout(r, 100));
        setUrlProgress(i);
      }
      setUrlState("success");
      toast.success(`${validUrls.length} URL(s) ingested successfully`);
      setUrls([""]);
    } catch {
      setUrlState("error");
      toast.error("Ingestion failed");
    }
  };
  const resetUrl = () => {
    setUrlState("idle");
    setUrls([""]);
    setUrlProgress(0);
  };

  // ── Image state ─────────────────────────────────────────────────────────
  const [imgState, setImgState] = useState<UploadState>("idle");
  const [imgDragging, setImgDragging] = useState(false);
  const [selectedImg, setSelectedImg] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgTitle, setImgTitle] = useState("");
  const [imgDesc, setImgDesc] = useState("");
  const [imgResult, setImgResult] = useState<ImageItem | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImgFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }
    setSelectedImg(file);
    setImgTitle("");
    setImgDesc("");
    setImgResult(null);
    setImgState("analyzing");
    const reader = new FileReader();
    reader.onload = (e) => setImgPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const base64 = await toBase64(file);
      const analysis = await analyzeImage(base64, file.type);
      setImgTitle(analysis.title);
      setImgDesc(analysis.description);
      setImgState("ready");
    } catch {
      toast.error("Failed to analyze image");
      setImgState("error");
    }
  };
  const handleImgDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setImgDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleImgFile(file);
  };
  const handleImgChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleImgFile(file);
  };
  const handleImgSave = async () => {
    if (!selectedImg || !imgTitle.trim() || !imgDesc.trim()) return;
    setImgState("saving");
    try {
      const saved = await saveImage(selectedImg, imgTitle.trim(), imgDesc.trim());
      setImgResult(saved);
      setImgState("success");
      toast.success("Image saved to knowledge base");
    } catch {
      setImgState("error");
      toast.error("Failed to save image");
    }
  };
  const resetImg = () => {
    setImgState("idle");
    setSelectedImg(null);
    setImgPreview(null);
    setImgTitle("");
    setImgDesc("");
    setImgResult(null);
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  // ── Tab config ──────────────────────────────────────────────────────────
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; hint: string }[] = [
    { id: "pdf", label: "PDF", icon: <FileUp className="h-3.5 w-3.5" />, hint: "max 50 MB" },
    { id: "markdown", label: "Markdown", icon: <FileText className="h-3.5 w-3.5" />, hint: "max 10 MB" },
    { id: "url", label: "URL", icon: <Link2 className="h-3.5 w-3.5" />, hint: "web pages" },
    { id: "image", label: "Image", icon: <ImageUp className="h-3.5 w-3.5" />, hint: "max 10 MB" },
  ];

  // ── Shared sub-components ───────────────────────────────────────────────
  const ProgressBar = ({ value, color = "bg-rm-trip-brand" }: { value: number; color?: string }) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-rm-trip-text-muted font-medium">
        <span>Processing…</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className={`h-1.5 bg-gray-100 [&>div]:${color}`} />
    </div>
  );

  const SuccessBanner = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-3 rounded-rm-trip-smooth bg-emerald-50 border border-emerald-200 p-4">
      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
      {children}
    </div>
  );

  const ErrorBanner = ({ msg }: { msg: string }) => (
    <div className="flex items-center gap-3 rounded-rm-trip-smooth bg-red-50 border border-red-200 p-4">
      <XCircle className="h-5 w-5 text-rm-trip-state-error shrink-0" />
      <p className="text-sm text-rm-trip-state-error">{msg}</p>
    </div>
  );

  const steps = [
    "Text is extracted and cleaned of invalid characters",
    "Content is split into overlapping chunks (1 000 chars · 200 overlap)",
    "Each chunk is indexed for semantic search",
    "Chunks and vectors are stored in pgvector (Supabase)",
    "The Chat page can now answer questions about this content",
  ];

  return (
    <div className="min-h-screen bg-rm-trip-surface px-4 py-10 sm:px-8">
      <div className="mx-auto">
        {/* ── Page header ── */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-rm-trip-brand/10 text-rm-trip-brand text-xs font-semibold px-3 py-1 rounded-rm-trip-pill mb-3 uppercase tracking-wider">
            Knowledge Base
          </div>
          <h1 className="font-rm-trip-heading text-rm-trip-h2 font-bold text-rm-trip-text mb-2">Ingest Content</h1>
          <p className="text-rm-trip-text-muted text-rm-trip-body-sm leading-relaxed">
            Add documents, notes, images, or web pages to your knowledge base. Content is automatically parsed, chunked,
            and embedded for semantic search.
          </p>
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex gap-1 mb-6 bg-white rounded-rm-trip-smooth p-1 shadow-rm-trip-card border border-gray-100 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center gap-1 py-1.5 px-3 rounded-[0.4rem] text-xs font-semibold transition-all duration-200",
                activeTab === tab.id
                  ? "bg-rm-trip-brand text-white shadow-rm-trip-card"
                  : "text-rm-trip-text-muted hover:text-rm-trip-text hover:bg-gray-50",
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Panel card ── */}
        <div className="bg-white rounded-rm-trip-smooth shadow-rm-trip-card border border-gray-100 overflow-hidden">
          {/* ════════ PDF PANEL ════════ */}
          {activeTab === "pdf" && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="font-rm-trip-heading font-semibold text-rm-trip-text text-base mb-0.5">Upload PDF</h2>
                <p className="text-rm-trip-text-muted text-xs">PDF only · max 50 MB</p>
              </div>
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-rm-trip-smooth p-10 text-center cursor-pointer transition-all duration-200 select-none group",
                  pdfDragging
                    ? "border-rm-trip-brand bg-blue-50 scale-[1.01]"
                    : selectedPdf
                      ? "border-rm-trip-brand/60 bg-blue-50/40"
                      : "border-gray-200 hover:border-rm-trip-brand/50 hover:bg-gray-50/60",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setPdfDragging(true);
                }}
                onDragLeave={() => setPdfDragging(false)}
                onDrop={handlePdfDrop}
                onClick={() => pdfInputRef.current?.click()}
              >
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handlePdfChange}
                />
                {selectedPdf ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-rm-trip-smooth bg-rm-trip-brand/10 flex items-center justify-center">
                      <File className="h-7 w-7 text-rm-trip-brand" />
                    </div>
                    <div>
                      <p className="font-semibold text-rm-trip-text text-sm">{selectedPdf.name}</p>
                      <p className="text-rm-trip-text-muted text-xs mt-0.5">
                        {(selectedPdf.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <span className="text-xs text-rm-trip-brand font-medium">Click to change file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-rm-trip-text-muted">
                    <div className="h-14 w-14 rounded-rm-trip-smooth bg-gray-100 flex items-center justify-center group-hover:bg-rm-trip-brand/10 transition-colors duration-200">
                      <FileUp className="h-7 w-7 group-hover:text-rm-trip-brand transition-colors duration-200" />
                    </div>
                    <div>
                      <p className="font-semibold text-rm-trip-text text-sm">Drop your PDF here</p>
                      <p className="text-xs mt-0.5">
                        or <span className="text-rm-trip-brand font-medium">click to browse</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {pdfState === "uploading" && <ProgressBar value={pdfProgress} />}
              {pdfState === "success" && pdfResult && (
                <SuccessBanner>
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">{pdfResult.fileName}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {pdfResult.chunksCreated} chunks created · ID: {pdfResult.pdfId.slice(0, 8)}…
                    </p>
                  </div>
                </SuccessBanner>
              )}
              {pdfState === "error" && <ErrorBanner msg="Upload failed. See the toast for details." />}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handlePdfUpload}
                  disabled={!selectedPdf || pdfState === "uploading"}
                  className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Upload className="h-4 w-4" />
                  {pdfState === "uploading" ? "Processing…" : "Upload & Ingest"}
                </button>
                {(selectedPdf || pdfState !== "idle") && (
                  <button
                    onClick={resetPdf}
                    className="flex items-center gap-2 border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-5 rounded-rm-trip-smooth transition-all duration-150 text-sm bg-white"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ════════ MARKDOWN PANEL ════════ */}
          {activeTab === "markdown" && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="font-rm-trip-heading font-semibold text-rm-trip-text text-base mb-0.5">
                  Upload Markdown
                </h2>
                <p className="text-rm-trip-text-muted text-xs">.md / .mdx only · max 10 MB</p>
              </div>
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-rm-trip-smooth p-10 text-center cursor-pointer transition-all duration-200 select-none group",
                  mdDragging
                    ? "border-rm-trip-accent bg-teal-50 scale-[1.01]"
                    : selectedMd
                      ? "border-rm-trip-accent/60 bg-teal-50/40"
                      : "border-gray-200 hover:border-rm-trip-accent/50 hover:bg-gray-50/60",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setMdDragging(true);
                }}
                onDragLeave={() => setMdDragging(false)}
                onDrop={handleMdDrop}
                onClick={() => mdInputRef.current?.click()}
              >
                <input
                  ref={mdInputRef}
                  type="file"
                  accept=".md,.mdx,text/markdown"
                  className="hidden"
                  onChange={handleMdChange}
                />
                {selectedMd ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-rm-trip-smooth bg-rm-trip-accent/10 flex items-center justify-center">
                      <FileText className="h-7 w-7 text-rm-trip-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-rm-trip-text text-sm">{selectedMd.name}</p>
                      <p className="text-rm-trip-text-muted text-xs mt-0.5">{(selectedMd.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <span className="text-xs text-rm-trip-accent font-medium">Click to change file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-rm-trip-text-muted">
                    <div className="h-14 w-14 rounded-rm-trip-smooth bg-gray-100 flex items-center justify-center group-hover:bg-rm-trip-accent/10 transition-colors duration-200">
                      <FileText className="h-7 w-7 group-hover:text-rm-trip-accent transition-colors duration-200" />
                    </div>
                    <div>
                      <p className="font-semibold text-rm-trip-text text-sm">Drop your Markdown file here</p>
                      <p className="text-xs mt-0.5">
                        or <span className="text-rm-trip-accent font-medium">click to browse</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {mdState === "uploading" && <ProgressBar value={mdProgress} color="bg-rm-trip-accent" />}
              {mdState === "success" && (
                <SuccessBanner>
                  <p className="text-sm font-semibold text-emerald-800">Markdown ingested successfully</p>
                </SuccessBanner>
              )}
              {mdState === "error" && <ErrorBanner msg="Upload failed. See the toast for details." />}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleMdUpload}
                  disabled={!selectedMd || mdState === "uploading"}
                  className="flex items-center gap-2 bg-rm-trip-accent hover:bg-rm-trip-accent-dark text-white font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Upload className="h-4 w-4" />
                  {mdState === "uploading" ? "Processing…" : "Upload & Ingest"}
                </button>
                {(selectedMd || mdState !== "idle") && (
                  <button
                    onClick={resetMd}
                    className="flex items-center gap-2 border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-5 rounded-rm-trip-smooth transition-all duration-150 text-sm bg-white"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ════════ URL PANEL ════════ */}
          {activeTab === "url" && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="font-rm-trip-heading font-semibold text-rm-trip-text text-base mb-0.5">
                  Ingest from URLs
                </h2>
                <p className="text-rm-trip-text-muted text-xs">
                  Add one or more web pages to extract and embed content
                </p>
              </div>
              <div className="space-y-2.5">
                {urls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rm-trip-text-muted pointer-events-none" />
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateUrl(i, e.target.value)}
                        placeholder="https://example.com/docs/page"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-colors duration-150"
                      />
                    </div>
                    {urls.length > 1 && (
                      <button
                        onClick={() => removeUrl(i)}
                        className="h-9 w-9 flex items-center justify-center rounded-rm-trip-smooth border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-state-error hover:border-red-200 hover:bg-red-50 transition-all duration-150"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addUrl}
                className="flex items-center gap-2 text-rm-trip-brand hover:text-rm-trip-brand-dark text-sm font-semibold transition-colors duration-150"
              >
                <Plus className="h-4 w-4" />
                Add another URL
              </button>
              {urlState === "uploading" && <ProgressBar value={urlProgress} />}
              {urlState === "success" && (
                <SuccessBanner>
                  <p className="text-sm font-semibold text-emerald-800">URLs ingested successfully</p>
                </SuccessBanner>
              )}
              {urlState === "error" && <ErrorBanner msg="Ingestion failed. See the toast for details." />}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleUrlIngest}
                  disabled={validUrls.length === 0 || urlState === "uploading"}
                  className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <ArrowRight className="h-4 w-4" />
                  {urlState === "uploading"
                    ? "Processing…"
                    : `Ingest ${validUrls.length > 0 ? validUrls.length : ""} URL${validUrls.length !== 1 ? "s" : ""}`}
                </button>
                {urlState !== "idle" && (
                  <button
                    onClick={resetUrl}
                    className="flex items-center gap-2 border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-5 rounded-rm-trip-smooth transition-all duration-150 text-sm bg-white"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ════════ IMAGE PANEL ════════ */}
          {activeTab === "image" && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="font-rm-trip-heading font-semibold text-rm-trip-text text-base mb-0.5">Upload Image</h2>
                <p className="text-rm-trip-text-muted text-xs">
                  PNG, JPG, WEBP · max 10 MB · Title and description are auto-generated
                </p>
              </div>

              {/* Drop zone */}
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-rm-trip-smooth text-center cursor-pointer transition-all duration-200 select-none group overflow-hidden",
                  imgDragging
                    ? "border-violet-400 bg-violet-50 scale-[1.01]"
                    : selectedImg
                      ? "border-violet-400/60 bg-violet-50/40"
                      : "border-gray-200 hover:border-violet-400/50 hover:bg-gray-50/60",
                  imgPreview ? "p-4" : "p-10",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setImgDragging(true);
                }}
                onDragLeave={() => setImgDragging(false)}
                onDrop={handleImgDrop}
                onClick={() => (imgState === "idle" || imgState === "error" ? imgInputRef.current?.click() : undefined)}
              >
                <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImgChange} />
                {imgPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={imgPreview}
                      alt="Preview"
                      className="max-h-52 rounded-lg object-contain mx-auto shadow-sm"
                    />
                    <p className="text-xs text-rm-trip-text-muted">{selectedImg?.name}</p>
                    {(imgState === "idle" || imgState === "error") && (
                      <span className="text-xs text-violet-600 font-medium">Click to change image</span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-rm-trip-text-muted">
                    <div className="h-14 w-14 rounded-rm-trip-smooth bg-gray-100 flex items-center justify-center group-hover:bg-violet-100 transition-colors duration-200">
                      <ImageUp className="h-7 w-7 group-hover:text-violet-500 transition-colors duration-200" />
                    </div>
                    <div>
                      <p className="font-semibold text-rm-trip-text text-sm">Drop an image here</p>
                      <p className="text-xs mt-0.5">
                        or <span className="text-violet-600 font-medium">click to browse</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Analyzing state */}
              {imgState === "analyzing" && (
                <div className="flex items-center gap-2.5 text-sm text-rm-trip-text-muted bg-violet-50 border border-violet-100 rounded-rm-trip-smooth px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500 shrink-0" />
                  <span>Analyzing image and preparing metadata...</span>
                </div>
              )}

              {/* Editable fields — shown once analysis is done */}
              {(imgState === "ready" || imgState === "saving" || imgState === "success") && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-rm-trip-text-muted uppercase tracking-wide">
                      Title
                    </label>
                    <input
                      type="text"
                      value={imgTitle}
                      onChange={(e) => setImgTitle(e.target.value)}
                      placeholder="Image title"
                      disabled={imgState === "saving" || imgState === "success"}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-colors duration-150 disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-rm-trip-text-muted uppercase tracking-wide">
                      Description
                    </label>
                    <textarea
                      value={imgDesc}
                      onChange={(e) => setImgDesc(e.target.value)}
                      placeholder="Image description"
                      rows={4}
                      disabled={imgState === "saving" || imgState === "success"}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-colors duration-150 resize-none disabled:opacity-60"
                    />
                  </div>
                </div>
              )}

              {/* Success */}
              {imgState === "success" && imgResult && (
                <SuccessBanner>
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">{imgResult.title}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Saved · ID: {imgResult.id.slice(0, 8)}…</p>
                  </div>
                </SuccessBanner>
              )}

              {/* Error */}
              {imgState === "error" && <ErrorBanner msg="Something went wrong. See toast for details." />}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {imgState === "ready" && (
                  <button
                    onClick={() => void handleImgSave()}
                    disabled={!imgTitle.trim() || !imgDesc.trim()}
                    className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Save className="h-4 w-4" />
                    Save to Knowledge Base
                  </button>
                )}
                {imgState === "saving" && (
                  <button
                    disabled
                    className="flex items-center gap-2 bg-rm-trip-brand text-white font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card opacity-70 text-sm cursor-not-allowed"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </button>
                )}
                {(selectedImg || imgState !== "idle") && (
                  <button
                    onClick={resetImg}
                    className="flex items-center gap-2 border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-5 rounded-rm-trip-smooth transition-all duration-150 text-sm bg-white"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── What happens after upload ── */}
        <div className="mt-5 bg-white rounded-rm-trip-smooth shadow-rm-trip-card border border-gray-100 p-6">
          <h3 className="font-rm-trip-heading font-semibold text-rm-trip-text text-sm mb-4 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-rm-trip-brand/10 text-rm-trip-brand flex items-center justify-center text-xs font-bold">
              ?
            </span>
            What happens after upload?
          </h3>
          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-rm-trip-text-muted">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-rm-trip-brand text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
