import NextLink from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import type { VariantProps } from "tailwind-variants";
import { buttonVariants } from "@techsio/ui-kit/atoms/button";
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { tv } from "@techsio/ui-kit/utils";

const herbaticaFilterButtonVariants = tv({
  extend: buttonVariants,
  base: [
    "h-auto rounded-full border px-350 py-200",
    "font-open-sans text-sm leading-tight font-semibold whitespace-nowrap",
    "shadow-none",
  ],
  variants: {
    selected: {
      true: [
        "border-primary bg-primary text-fg-reverse",
        "hover:bg-primary-hover active:bg-primary-active",
      ],
      false: [
        "border-border-secondary bg-surface text-fg-primary",
        "hover:border-primary hover:bg-highlight hover:text-primary",
        "active:bg-highlight",
      ],
    },
  },
  defaultVariants: {
    size: "sm",
    theme: "borderless",
    variant: "secondary",
    selected: false,
  },
});

type SharedProps = VariantProps<typeof herbaticaFilterButtonVariants> & {
  badge?: string;
  children: ReactNode;
  className?: string;
  icon?: IconType;
};

type HerbaticaFilterLinkButtonProps = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof SharedProps> & {
    href: string;
  };

type HerbaticaFilterActionButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof SharedProps | "children"> & {
    href?: never;
  };

export type HerbaticaFilterButtonProps =
  | HerbaticaFilterLinkButtonProps
  | HerbaticaFilterActionButtonProps;

function FilterButtonContent({
  badge,
  children,
  icon,
  selected,
}: Pick<SharedProps, "badge" | "children" | "icon" | "selected">) {
  return (
    <>
      {icon ? <Icon icon={icon} size="sm" /> : null}
      <span>{children}</span>
      {badge ? (
        <span
          className={[
            "inline-flex min-w-500 items-center justify-center rounded-full px-150 py-50 text-2xs leading-none font-semibold",
            selected ? "bg-base/15 text-fg-reverse" : "bg-highlight text-fg-secondary",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}
    </>
  );
}

export function HerbaticaFilterButton(props: HerbaticaFilterButtonProps) {
  if ("href" in props && props.href) {
    const {
      badge,
      children,
      className,
      href,
      icon,
      selected,
      size,
      theme,
      variant,
      ...restProps
    } = props;

    const resolvedClassName = herbaticaFilterButtonVariants({
      className,
      selected,
      size,
      theme,
      variant,
    });

    return (
      <Link
        as={NextLink}
        className={resolvedClassName}
        href={href}
        {...restProps}
      >
        <FilterButtonContent
          badge={badge}
          icon={icon}
          selected={selected}
        >
          {children}
        </FilterButtonContent>
      </Link>
    );
  }

  const actionProps = props as HerbaticaFilterActionButtonProps;
  const {
    badge,
    children,
    className,
    icon,
    selected,
    size,
    theme,
    variant,
    ...restProps
  } = actionProps;

  const resolvedClassName = herbaticaFilterButtonVariants({
    className,
    selected,
    size,
    theme,
    variant,
  });

  return (
    <button
      className={resolvedClassName}
      type="button"
      {...restProps}
    >
      <FilterButtonContent
        badge={badge}
        icon={icon}
        selected={selected}
      >
        {children}
      </FilterButtonContent>
    </button>
  );
}
