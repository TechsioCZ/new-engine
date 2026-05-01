"use client";

import { Button, type ButtonProps } from "@techsio/ui-kit/atoms/button";

type AsideFilterButtonProps = {
  checked: boolean;
  count: number;
  disabled?: boolean;
  label: string;
  onClick: ButtonProps["onClick"];
};

const baseClassName =
  "h-650 max-w-full gap-0 rounded-sm px-200 py-150 text-sm leading-tight whitespace-nowrap disabled:bg-bg-disabled disabled:hover:bg-bg-disabled";

const checkedClassName =
  "bg-primary font-semibold text-fg-reverse hover:bg-primary-hover active:bg-primary-active";

const uncheckedClassName =
  "bg-primary/5 font-normal text-primary hover:bg-primary/10 active:bg-primary/15";

export function AsideFilterButton({
  checked,
  count,
  disabled,
  label,
  onClick,
}: AsideFilterButtonProps) {
  return (
    <Button
      aria-pressed={checked}
      className={`${baseClassName} ${
        checked ? checkedClassName : uncheckedClassName
      }`}
      disabled={disabled}
      onClick={onClick}
      size="current"
      theme="unstyled"
      type="button"
    >
      {`${label} (${count})`}
    </Button>
  );
}
