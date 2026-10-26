import ReactMarkdown from "react-markdown";
import { cx } from "@/lib/utils";

/** Rendu Markdown sûr : le HTML brut est ignoré (pas de skipHtml contourné). */
export function Markdown({ children, className }: { children?: string | null; className?: string }) {
  if (!children) return null;
  return (
    <div className={cx("prose-gdl", className)}>
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {children}
              </a>
            );
          },
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
