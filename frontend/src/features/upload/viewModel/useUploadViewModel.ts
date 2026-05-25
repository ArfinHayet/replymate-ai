import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { ActiveUploadTab } from "../model/entities/ActiveUploadTab";
import type { UploadState } from "../model/entities/UploadState";
import type { ImageUploadResult, IngestUrlResult, PdfUploadResult, UrlScanItem } from "../model/entities/UploadResults";
import { createUploadService } from "../model/services/createUploadService";
import { getUploadErrorMessage } from "../model/services/uploadErrors";
import type { UploadActionResult, UploadViewModel } from "./UploadViewModel";

export function useUploadViewModel(): UploadViewModel {
  const uploadService = useMemo(() => createUploadService(), []);
  const [activeTab, setActiveTab] = useState<ActiveUploadTab>("url");

  const [pdfState, setPdfState] = useState<UploadState>("idle");
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfDragging, setPdfDragging] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pdfResult, setPdfResult] = useState<PdfUploadResult | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [mdState, setMdState] = useState<UploadState>("idle");
  const [mdProgress, setMdProgress] = useState(0);
  const [mdDragging, setMdDragging] = useState(false);
  const [selectedMd, setSelectedMd] = useState<File | null>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);

  const [urlState, setUrlState] = useState<UploadState>("idle");
  const [urlProgress, setUrlProgress] = useState(0);
  const [urls, setUrls] = useState<string[]>([""]);
  const [urlResults, setUrlResults] = useState<IngestUrlResult[]>([]);
  const [urlScanItems, setUrlScanItems] = useState<UrlScanItem[]>([]);

  const [imgState, setImgState] = useState<UploadState>("idle");
  const [imgDragging, setImgDragging] = useState(false);
  const [selectedImg, setSelectedImg] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgTitle, setImgTitle] = useState("");
  const [imgDesc, setImgDesc] = useState("");
  const [imgResult, setImgResult] = useState<ImageUploadResult | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const validUrls = urls.filter((url) => url.trim().length > 0);

  const selectPdfFile = (file: File): UploadActionResult => {
    const errorMessage = uploadService.validatePdf(file);
    if (errorMessage) return { success: false, errorMessage };
    setSelectedPdf(file);
    setPdfState("idle");
    setPdfResult(null);
    return { success: true };
  };

  const handlePdfDrop = (event: DragEvent<HTMLDivElement>): UploadActionResult => {
    event.preventDefault();
    setPdfDragging(false);
    const file = event.dataTransfer.files[0];
    return file ? selectPdfFile(file) : { success: false };
  };

  const handlePdfChange = (event: ChangeEvent<HTMLInputElement>): UploadActionResult => {
    const file = event.target.files?.[0];
    return file ? selectPdfFile(file) : { success: false };
  };

  const uploadSelectedPdf = async (): Promise<UploadActionResult> => {
    if (!selectedPdf) return { success: false };
    setPdfState("uploading");
    setPdfProgress(0);

    try {
      const result = await uploadService.uploadPdf(selectedPdf, setPdfProgress);
      setPdfResult(result);
      setPdfState("success");
      setSelectedPdf(null);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      return { success: true, message: `Added ${result.chunksCreated} content sections` };
    } catch (error: unknown) {
      setPdfState("error");
      return { success: false, errorMessage: getUploadErrorMessage(error, "Upload failed") };
    }
  };

  const resetPdf = () => {
    setPdfState("idle");
    setSelectedPdf(null);
    setPdfResult(null);
    setPdfProgress(0);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const selectMarkdownFile = (file: File): UploadActionResult => {
    const errorMessage = uploadService.validateMarkdown(file);
    if (errorMessage) return { success: false, errorMessage };
    setSelectedMd(file);
    setMdState("idle");
    return { success: true };
  };

  const handleMdDrop = (event: DragEvent<HTMLDivElement>): UploadActionResult => {
    event.preventDefault();
    setMdDragging(false);
    const file = event.dataTransfer.files[0];
    return file ? selectMarkdownFile(file) : { success: false };
  };

  const handleMdChange = (event: ChangeEvent<HTMLInputElement>): UploadActionResult => {
    const file = event.target.files?.[0];
    return file ? selectMarkdownFile(file) : { success: false };
  };

  const uploadSelectedMarkdown = async (): Promise<UploadActionResult> => {
    if (!selectedMd) return { success: false };
    setMdState("uploading");
    setMdProgress(0);

    try {
      await uploadService.ingestMarkdown(setMdProgress);
      setMdState("success");
      setSelectedMd(null);
      if (mdInputRef.current) mdInputRef.current.value = "";
      return { success: true, message: "Markdown file added" };
    } catch {
      setMdState("error");
      return { success: false, errorMessage: "Upload failed" };
    }
  };

  const resetMarkdown = () => {
    setMdState("idle");
    setSelectedMd(null);
    setMdProgress(0);
    if (mdInputRef.current) mdInputRef.current.value = "";
  };

  const addUrl = () => setUrls((prev) => [...prev, ""]);
  const removeUrl = (index: number) => setUrls((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  const updateUrl = (index: number, value: string) =>
    setUrls((prev) => prev.map((url, currentIndex) => (currentIndex === index ? value : url)));

  const upsertScanItem = (item: UrlScanItem) => {
    setUrlScanItems((prev) => {
      const existing = prev.findIndex((scan) => scan.url === item.url);
      if (existing === -1) return [...prev, item];

      const next = [...prev];
      next[existing] = { ...next[existing], ...item };
      return next;
    });
  };

  const ingestUrls = async (): Promise<UploadActionResult> => {
    if (validUrls.length === 0) return { success: false, errorMessage: "Add at least one URL" };
    setUrlState("uploading");
    setUrlProgress(0);
    setUrlResults([]);
    setUrlScanItems([]);

    try {
      const result = await uploadService.ingestUrlsStream(validUrls, (event) => {
        if (event.type === "start") {
          setUrlProgress(5);
        } else if (event.type === "url-start") {
          setUrlProgress((prev) => Math.max(prev, 8));
        } else if (event.type === "scanning") {
          upsertScanItem({ url: event.url, rootUrl: event.rootUrl, status: "scanning" });
          setUrlProgress((prev) => Math.min(prev + 3, 92));
        } else if (event.type === "url-result") {
          setUrlResults((prev) => [...prev.filter((item) => item.url !== event.result.url), event.result]);
          upsertScanItem({
            url: event.result.url,
            status: event.result.success ? "done" : "failed",
          });
          setUrlProgress((prev) => Math.min(prev + 8, 96));
        } else if (event.type === "done") {
          setUrlResults(event.pages);
          setUrlScanItems((prev) =>
            prev.map((scan) => (scan.status === "scanning" ? { ...scan, status: "done" } : scan)),
          );
          setUrlProgress(100);
        }
      });
      setUrlState("success");
      setUrls([""]);
      const succeeded = result.pages.filter((page) => page.success).length;
      const failed = result.pages.length - succeeded;
      return {
        success: failed === 0,
        message: succeeded > 0 ? `${succeeded} URL${succeeded !== 1 ? "s" : ""} added` : undefined,
        errorMessage: failed > 0 ? `${failed} URL${failed !== 1 ? "s" : ""} could not be added` : undefined,
      };
    } catch (error: unknown) {
      setUrlState("error");
      return { success: false, errorMessage: error instanceof Error ? error.message : "Unable to add URLs" };
    }
  };

  const resetUrls = () => {
    setUrlState("idle");
    setUrls([""]);
    setUrlProgress(0);
    setUrlResults([]);
    setUrlScanItems([]);
  };

  const analyzeImageFile = async (file: File): Promise<UploadActionResult> => {
    const errorMessage = uploadService.validateImage(file);
    if (errorMessage) return { success: false, errorMessage };

    setSelectedImg(file);
    setImgTitle("");
    setImgDesc("");
    setImgResult(null);
    setImgState("analyzing");

    try {
      const { preview, analysis } = await uploadService.analyzeImage(file);
      setImgPreview(preview);
      setImgTitle(analysis.title);
      setImgDesc(analysis.description);
      setImgState("ready");
      return { success: true };
    } catch {
      setImgState("error");
      return { success: false, errorMessage: "Failed to analyze image" };
    }
  };

  const handleImgDrop = async (event: DragEvent<HTMLDivElement>): Promise<UploadActionResult> => {
    event.preventDefault();
    setImgDragging(false);
    const file = event.dataTransfer.files[0];
    return file ? analyzeImageFile(file) : { success: false };
  };

  const handleImgChange = async (event: ChangeEvent<HTMLInputElement>): Promise<UploadActionResult> => {
    const file = event.target.files?.[0];
    return file ? analyzeImageFile(file) : { success: false };
  };

  const saveSelectedImage = async (): Promise<UploadActionResult> => {
    if (!selectedImg || !imgTitle.trim() || !imgDesc.trim()) return { success: false };
    setImgState("saving");

    try {
      const result = await uploadService.saveImage(selectedImg, imgTitle, imgDesc);
      setImgResult(result);
      setImgState("success");
      return { success: true, message: "Image added" };
    } catch (error: unknown) {
      setImgState("error");
      return { success: false, errorMessage: getUploadErrorMessage(error, "Failed to save image") };
    }
  };

  const resetImage = () => {
    setImgState("idle");
    setSelectedImg(null);
    setImgPreview(null);
    setImgTitle("");
    setImgDesc("");
    setImgResult(null);
    if (imgInputRef.current) imgInputRef.current.value = "";
  };

  return {
    activeTab,
    setActiveTab,
    pdfState,
    pdfProgress,
    pdfDragging,
    selectedPdf,
    pdfResult,
    pdfInputRef,
    setPdfDragging,
    handlePdfDrop,
    handlePdfChange,
    uploadSelectedPdf,
    resetPdf,
    mdState,
    mdProgress,
    mdDragging,
    selectedMd,
    mdInputRef,
    setMdDragging,
    handleMdDrop,
    handleMdChange,
    uploadSelectedMarkdown,
    resetMarkdown,
    urlState,
    urlProgress,
    urls,
    validUrls,
    urlResults,
    urlScanItems,
    addUrl,
    removeUrl,
    updateUrl,
    ingestUrls,
    resetUrls,
    imgState,
    imgDragging,
    selectedImg,
    imgPreview,
    imgTitle,
    imgDesc,
    imgResult,
    imgInputRef,
    setImgDragging,
    setImgTitle,
    setImgDesc,
    handleImgDrop,
    handleImgChange,
    saveSelectedImage,
    resetImage,
  };
}
