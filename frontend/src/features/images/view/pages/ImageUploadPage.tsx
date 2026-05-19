import { toast } from "sonner";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImageUploadPanel } from "@/features/upload/view/components/ImageUploadPanel";
import { UploadSteps } from "@/features/upload/view/components/UploadSteps";
import { useUploadViewModel } from "@/features/upload/viewModel/useUploadViewModel";
import type { UploadActionResult } from "@/features/upload/viewModel/UploadViewModel";

export function ImageUploadPage() {
  const vm = useUploadViewModel();

  const showActionResult = (result: UploadActionResult) => {
    if (result.message) toast.success(result.message);
    if (result.errorMessage) toast.error(result.errorMessage);
  };

  const handleAsyncFileResult = async (result: Promise<UploadActionResult>) => {
    showActionResult(await result);
  };

  const save = async () => {
    showActionResult(await vm.saveSelectedImage());
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader title="Upload Image" subtitle="ReplyMate AI drafts a title and description you can review before saving." />
      <PageContent className="max-w-3xl">
        <div className="overflow-hidden rounded-rm-trip-smooth border border-gray-100 bg-white">
          <ImageUploadPanel
            viewModel={vm}
            onSave={() => void save()}
            onFileResult={(result) => void handleAsyncFileResult(result)}
          />
        </div>
        <UploadSteps />
      </PageContent>
    </div>
  );
}
