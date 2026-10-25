import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { renderSeoHead } from "@/lib/seo";

export function RouteSeo() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const template = document.createElement("template");
    template.innerHTML = renderSeoHead(pathname);

    document.head.querySelectorAll("[data-seo]").forEach((node) => {
      node.remove();
    });

    document.head.append(template.content);
  }, [pathname]);

  return null;
}
