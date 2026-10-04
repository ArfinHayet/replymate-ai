/* eslint-disable react-hooks/refs */
import { FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadViewModel } from "../../viewModel/UploadViewModel";
import { ErrorBanner, ProgressBar, SuccessBanner } from "./UploadFeedback";

interface MarkdownUploadPanelProps {
  viewModel: UploadViewModel;
  onUpload: () => void;
  onFileResult: (result: ReturnType<UploadViewModel["handleMdChange"]>) => void;
}

export function MarkdownUploadPanel({ viewModel, onUpload, onFileResult }: MarkdownUploadPanelProps) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-rm-trip-heading font-semibold text-rm-trip-text text-base mb-0.5">Upload Markdown</h2>
        <p className="text-rm-trip-text-muted text-xs">.md / .mdx only | max 10 MB</p>
      </div>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-rm-trip-smooth p-10 text-center cursor-pointer transition-all duration-200 select-none group",
          viewModel.mdDragging
            ? "border-rm-trip-brand bg-rm-trip-brand-light scale-[1.01]"
            : viewModel.selectedMd
              ? "border-rm-trip-brand/60 bg-rm-trip-brand-light/40"
              : "border-gray-200 hover:border-rm-trip-brand/50 hover:bg-gray-50/60",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          viewModel.setMdDragging(true);
        }}
        onDragLeave={() => viewModel.setMdDragging(false)}
        onDrop={(event) => onFileResult(viewModel.handleMdDrop(event))}
        onClick={() => viewModel.mdInputRef.current?.click()}
      >
        <input
          ref={viewModel.mdInputRef}
          type="file"
          accept=".md,.mdx,text/markdown"
          className="hidden"
          onChange={(event) => onFileResult(viewModel.handleMdChange(event))}
        />
        {viewModel.selectedMd ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-rm-trip-smooth bg-rm-trip-brand/10 flex items-center justify-center">
              <FileText className="h-7 w-7 text-rm-trip-brand" />
            </div>
            <div>
              <p className="font-semibold text-rm-trip-text text-sm">{viewModel.selectedMd.name}</p>
              <p className="text-rm-trip-text-muted text-xs mt-0.5">
                {(viewModel.selectedMd.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <span className="text-xs text-rm-trip-brand font-medium">Click to change file</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-rm-trip-text-muted">
            <div className="h-14 w-14 rounded-rm-trip-smooth bg-gray-100 flex items-center justify-center group-hover:bg-rm-trip-brand/10 transition-colors duration-200">
              <FileText className="h-7 w-7 group-hover:text-rm-trip-brand transition-colors duration-200" />
            </div>
            <div>
              <p className="font-semibold text-rm-trip-text text-sm">Drop your Markdown file here</p>
              <p className="text-xs mt-0.5">
                or <span className="text-rm-trip-brand font-medium">click to browse</span>
              </p>
            </div>
          </div>
        )}
      </div>
      {viewModel.mdState === "uploading" && <ProgressBar value={viewModel.mdProgress} color="bg-rm-trip-brand" />}
      {viewModel.mdState === "success" && (
        <SuccessBanner>
          <p className="text-sm font-semibold text-emerald-800">Markdown file added</p>
        </SuccessBanner>
      )}
      {viewModel.mdState === "error" && <ErrorBanner msg="Upload failed. See the toast for details." />}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onUpload}
          disabled={!viewModel.selectedMd || viewModel.mdState === "uploading"}
          className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-rm-trip-on-brand font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Upload className="h-4 w-4" />
          {viewModel.mdState === "uploading" ? "Processing..." : "Upload file"}
        </button>
        {(viewModel.selectedMd || viewModel.mdState !== "idle") && (
          <button
            onClick={viewModel.resetMarkdown}
            className="flex items-center gap-2 border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-5 rounded-rm-trip-smooth transition-all duration-150 text-sm bg-white"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
