"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useState } from "react";

type ClientOnlyProps = PropsWithChildren<{
  fallback?: ReactNode;
}>;

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
