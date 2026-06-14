export function validatePdfFile(file: File): string | null {
  if (file.type !== "application/pdf") return "Only PDF files are allowed";
  if (file.size > 50 * 1024 * 1024) return "File size must be under 50 MB";
  return null;
}

export function validateMarkdownFile(file: File): string | null {
  const valid = file.type === "text/markdown" || file.name.endsWith(".md") || file.name.endsWith(".mdx");
  if (!valid) return "Only Markdown (.md / .mdx) files are allowed";
  if (file.size > 10 * 1024 * 1024) return "File size must be under 10 MB";
  return null;
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Only image files are allowed";
  if (file.size > 10 * 1024 * 1024) return "Image must be under 10 MB";
  return null;
}

export function validateCsvFile(file: File): string | null {
  const isCsv =
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.name.toLowerCase().endsWith(".csv");
  if (!isCsv) return "Only CSV files are allowed";
  if (file.size > 10 * 1024 * 1024) return "File size must be under 10 MB";
  return null;
}

