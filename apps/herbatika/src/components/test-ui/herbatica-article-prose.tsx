import type { HTMLAttributes, ReactNode } from "react";

type HerbaticaArticleProseProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function HerbaticaArticleProse({
  children,
  className,
  ...props
}: HerbaticaArticleProseProps) {
  return (
    <article
      className={[
        "space-y-350 rounded-2xl border border-border-secondary bg-surface p-450",
        "[&_blockquote]:rounded-xl [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-highlight [&_blockquote]:px-300 [&_blockquote]:py-250",
        "[&_blockquote]:text-sm [&_blockquote]:leading-relaxed [&_blockquote]:text-fg-primary",
        "[&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:font-bold [&_h2]:text-fg-primary",
        "[&_h3]:text-lg [&_h3]:leading-snug [&_h3]:font-semibold [&_h3]:text-fg-primary",
        "[&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-fg-secondary",
        "[&_ol]:space-y-150 [&_ol]:ps-400 [&_ol]:list-decimal",
        "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-fg-secondary",
        "[&_strong]:font-semibold [&_strong]:text-fg-primary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </article>
  );
}
