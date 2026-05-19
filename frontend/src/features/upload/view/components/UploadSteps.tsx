const steps = [
  "Content is prepared and organized for search",
  "Chat can answer questions using the approved content",
];

export function UploadSteps() {
  return (
    <div className="border-t border-gray-100 pt-5">
      <h3 className="font-rm-trip-heading font-semibold text-rm-trip-text text-sm mb-4 flex items-center gap-2">
        <span className="h-5 w-5 rounded-full bg-rm-trip-brand/10 text-rm-trip-brand flex items-center justify-center text-xs font-bold">
          ?
        </span>
        What happens after upload?
      </h3>
      <ol className="space-y-2.5">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-sm text-rm-trip-text-muted">
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-rm-trip-brand text-white text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
