import type { HTMLAttributes, ReactNode } from "react";

type SupportingTextProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function SupportingText({
  className,
  children,
  ...props
}: SupportingTextProps) {
  return (
    <p
      className={["text-sm leading-relaxed text-fg-secondary", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </p>
  );
}
