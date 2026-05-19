/* eslint-disable react-hooks/refs */
import { ImageUp, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadViewModel } from "../../viewModel/UploadViewModel";
import { ErrorBanner, SuccessBanner } from "./UploadFeedback";

interface ImageUploadPanelProps {
  viewModel: UploadViewModel;
  onSave: () => void;
  onFileResult: (result: Promise<ReturnType<UploadViewModel["handleImgChange"]> extends Promise<infer T> ? T : never>) => void;
}

export function ImageUploadPanel({ viewModel, onSave, onFileResult }: ImageUploadPanelProps) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-rm-trip-heading font-semibold text-rm-trip-text text-base mb-0.5">Upload Image</h2>
        <p className="text-rm-trip-text-muted text-xs">
          PNG, JPG, WEBP | max 10 MB | Title and description are auto-generated
        </p>
      </div>

      <div
        className={cn(
          "relative border-2 border-dashed rounded-rm-trip-smooth text-center cursor-pointer transition-all duration-200 select-none group overflow-hidden",
          viewModel.imgDragging
            ? "border-violet-400 bg-violet-50 scale-[1.01]"
            : viewModel.selectedImg
              ? "border-violet-400/60 bg-violet-50/40"
              : "border-gray-200 hover:border-violet-400/50 hover:bg-gray-50/60",
          viewModel.imgPreview ? "p-4" : "p-10",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          viewModel.setImgDragging(true);
        }}
        onDragLeave={() => viewModel.setImgDragging(false)}
        onDrop={(event) => onFileResult(viewModel.handleImgDrop(event))}
        onClick={() =>
          viewModel.imgState === "idle" || viewModel.imgState === "error"
            ? viewModel.imgInputRef.current?.click()
            : undefined
        }
      >
        <input
          ref={viewModel.imgInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onFileResult(viewModel.handleImgChange(event))}
        />
        {viewModel.imgPreview ? (
          <div className="flex flex-col items-center gap-3">
            <img src={viewModel.imgPreview} alt="Preview" className="max-h-52 rounded-rm-trip-smooth object-contain mx-auto shadow-sm" />
            <p className="text-xs text-rm-trip-text-muted">{viewModel.selectedImg?.name}</p>
            {(viewModel.imgState === "idle" || viewModel.imgState === "error") && (
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

      {viewModel.imgState === "analyzing" && (
        <div className="flex items-center gap-2.5 text-sm text-rm-trip-text-muted bg-violet-50 border border-violet-100 rounded-rm-trip-smooth px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-violet-500 shrink-0" />
          <span>Analyzing image and preparing metadata...</span>
        </div>
      )}

      {(viewModel.imgState === "ready" || viewModel.imgState === "saving" || viewModel.imgState === "success") && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-rm-trip-text-muted">Title</label>
            <input
              type="text"
              value={viewModel.imgTitle}
              onChange={(event) => viewModel.setImgTitle(event.target.value)}
              placeholder="Image title"
              disabled={viewModel.imgState === "saving" || viewModel.imgState === "success"}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-colors duration-150 disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-rm-trip-text-muted">Description</label>
            <textarea
              value={viewModel.imgDesc}
              onChange={(event) => viewModel.setImgDesc(event.target.value)}
              placeholder="Image description"
              rows={4}
              disabled={viewModel.imgState === "saving" || viewModel.imgState === "success"}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-rm-trip-smooth text-sm text-rm-trip-text placeholder:text-gray-400 focus-rm-trip-highlight bg-gray-50 focus:bg-white transition-colors duration-150 resize-none disabled:opacity-60"
            />
          </div>
        </div>
      )}

      {viewModel.imgState === "success" && viewModel.imgResult && (
        <SuccessBanner>
          <div>
            <p className="font-semibold text-emerald-800 text-sm">{viewModel.imgResult.title}</p>
            <p className="text-xs text-emerald-700 mt-0.5">Saved to your workspace</p>
          </div>
        </SuccessBanner>
      )}
      {viewModel.imgState === "error" && <ErrorBanner msg="Something went wrong. See toast for details." />}

      <div className="flex gap-2 pt-1">
        {viewModel.imgState === "ready" && (
          <button
            onClick={onSave}
            disabled={!viewModel.imgTitle.trim() || !viewModel.imgDesc.trim()}
            className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Save className="h-4 w-4" />
            Save image
          </button>
        )}
        {viewModel.imgState === "saving" && (
          <button
            disabled
            className="flex items-center gap-2 bg-rm-trip-brand text-white font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card opacity-70 text-sm cursor-not-allowed"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </button>
        )}
        {(viewModel.selectedImg || viewModel.imgState !== "idle") && (
          <button
            onClick={viewModel.resetImage}
            className="flex items-center gap-2 border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-5 rounded-rm-trip-smooth transition-all duration-150 text-sm bg-white"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
