import { File, FileUp, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadViewModel } from "../../viewModel/UploadViewModel";
import { ErrorBanner, ProgressBar, SuccessBanner } from "./UploadFeedback";

interface CsvUploadPanelProps {
  viewModel: UploadViewModel;
  onUpload: () => void;
  onFileResult: (result: ReturnType<UploadViewModel["handleCsvChange"]>) => void;
}

export function CsvUploadPanel({ viewModel, onUpload, onFileResult }: CsvUploadPanelProps) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-rm-trip-heading font-semibold text-rm-trip-text text-base mb-0.5">Upload CSV</h2>
        <p className="text-rm-trip-text-muted text-xs">CSV only | max 10 MB — each row is stored as a searchable entry</p>
      </div>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-rm-trip-smooth p-10 text-center cursor-pointer transition-all duration-200 select-none group",
          viewModel.csvDragging
            ? "border-rm-trip-brand bg-blue-50 scale-[1.01]"
            : viewModel.selectedCsv
              ? "border-rm-trip-brand/60 bg-blue-50/40"
              : "border-gray-200 hover:border-rm-trip-brand/50 hover:bg-gray-50/60",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          viewModel.setCsvDragging(true);
        }}
        onDragLeave={() => viewModel.setCsvDragging(false)}
        onDrop={(event) => onFileResult(viewModel.handleCsvDrop(event))}
        onClick={() => viewModel.csvInputRef.current?.click()}
      >
        <input
          ref={viewModel.csvInputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          className="hidden"
          onChange={(event) => onFileResult(viewModel.handleCsvChange(event))}
        />
        {viewModel.selectedCsv ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-rm-trip-smooth bg-rm-trip-brand/10 flex items-center justify-center">
              <File className="h-7 w-7 text-rm-trip-brand" />
            </div>
            <div>
              <p className="font-semibold text-rm-trip-text text-sm">{viewModel.selectedCsv.name}</p>
              <p className="text-rm-trip-text-muted text-xs mt-0.5">
                {(viewModel.selectedCsv.size / 1024).toFixed(1)} KB
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
              <p className="font-semibold text-rm-trip-text text-sm">Drop your CSV here</p>
              <p className="text-xs mt-0.5">
                or <span className="text-rm-trip-brand font-medium">click to browse</span>
              </p>
            </div>
          </div>
        )}
      </div>
      {viewModel.csvState === "uploading" && <ProgressBar value={viewModel.csvProgress} />}
      {viewModel.csvState === "success" && viewModel.csvResult && (
        <SuccessBanner>
          <div>
            <p className="font-semibold text-emerald-800 text-sm">{viewModel.csvResult.fileName}</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {viewModel.csvResult.rowsIngested} rows ingested | ID: {viewModel.csvResult.csvId.slice(0, 8)}...
            </p>
          </div>
        </SuccessBanner>
      )}
      {viewModel.csvState === "error" && <ErrorBanner msg="Upload failed. See the toast for details." />}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onUpload}
          disabled={!viewModel.selectedCsv || viewModel.csvState === "uploading"}
          className="flex items-center gap-2 bg-rm-trip-brand hover:bg-rm-trip-brand-dark text-white font-semibold py-2.5 px-5 rounded-rm-trip-smooth shadow-rm-trip-card transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <Upload className="h-4 w-4" />
          {viewModel.csvState === "uploading" ? "Processing..." : "Upload CSV"}
        </button>
        {(viewModel.selectedCsv || viewModel.csvState !== "idle") && (
          <button
            onClick={viewModel.resetCsv}
            className="flex items-center gap-2 border border-gray-200 text-rm-trip-text-muted hover:text-rm-trip-text hover:border-gray-300 font-semibold py-2.5 px-5 rounded-rm-trip-smooth transition-all duration-150 text-sm bg-white"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
