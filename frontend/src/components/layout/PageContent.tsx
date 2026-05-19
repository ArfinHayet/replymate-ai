import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return <div className={cn("mx-auto space-y-6 px-4 py-6 sm:px-6 lg:px-8", className)}>{children}</div>;
}
