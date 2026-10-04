/* eslint-disable react-hooks/refs */
import { File, FileUp, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadViewModel } from "../../viewModel/UploadViewModel";
import { ErrorBanner, ProgressBar, SuccessBanner } from "./UploadFeedback";

interface PdfUploadPanelProps {
  viewModel: UploadViewModel;
  onUpload: () => void;
  onFileResult: (result: ReturnType<UploadViewModel["handlePdfChange"]>) => void;
}

export function PdfUploadPanel({ viewModel, onUpload, onFileResult }: PdfUploadPanelProps) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-rm-trip-heading font-semibold text-rm-trip-text text-base mb-0.5">Upload PDF</h2>
        <p className="text-rm-trip-text-muted text-xs">PDF only | max 50 MB</p>
      </div>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-rm-trip-smooth p-10 text-center cursor-pointer transition-all duration-200 select-none group",
          viewModel.pdfDragging
            ? "border-rm-trip-brand bg-rm-trip-brand-light scale-[1.01]"
            : viewModel.selectedPdf
              ? "border-rm-trip-brand/60 bg-rm-trip-brand/6"
              : "border-gray-200 hover:border-rm-trip-brand/50 hover:bg-gray-50/60",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          viewModel.setPdfDragging(true);
        }}
        onDragLeave={() => viewModel.setPdfDragging(false)}
        onDrop={(event) => onFileResult(viewModel.handlePdfDrop(event))}
        onClick={() => viewModel.pdfInputRef.current?.click()}
      >
        <input
          ref={viewModel.pdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(event) => onFileResult(viewModel.handlePdfChange(event))}
        />
        {viewModel.selectedPdf ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-rm-trip-smooth bg-rm-trip-brand/10 flex items-center justify-center">
              <File className="h-7 w-7 text-rm-trip-brand" />
            </div>
            <div>
              <p className="font-semibold text-rm-trip-text text-sm">{viewModel.selectedPdf.name}</p>
              <p className="text-rm-trip-text-muted text-xs mt-0.5">
                {(viewModel.selectedPdf.size / 1024 / 1024).toFixed(2)} MB
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
      {viewModel.pdfState === "uploading" && <ProgressBar value={viewModel.pdfProgress} />}
      {viewModel.pdfState === "success" && viewModel.pdfResult && (
        <SuccessBanner>
          <div>
            <p className="font-semibold text-emerald-800 text-sm">{viewModel.pdfResult.fileName}</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {viewModel.pdfResult.chunksCreated} content sections created | ID:{" "}
              {viewModel.pdfResult.pdfId.slice(0, 8)}...
            </p>
          </div>
        </SuccessBanner>
      )}
      {viewModel.pdfState === "error" && <ErrorBanner msg="Upload failed. See the toast for details." />}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onUpload}
          disabled={!viewModel.selectedPdf || viewModel.pdfState === "uploading"}
          className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-rm-trip-on-brand font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Upload className="h-4 w-4" />
          {viewModel.pdfState === "uploading" ? "Processing..." : "Upload document"}
        </button>
        {(viewModel.selectedPdf || viewModel.pdfState !== "idle") && (
          <button
            onClick={viewModel.resetPdf}
            className="flex items-center gap-2 border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-5 rounded-rm-trip-smooth transition-all duration-150 text-sm bg-white"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
