"use client";

import * as React from "react";
import { Toaster as SonnerToaster } from "sonner";

// Reusable Sonner Toaster component compatible with shadcn-ui usage
// Import in your layout:  import { Toaster } from "@/components/ui/sonner"
// Then render <Toaster /> once near the root of your app.

export type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      // Sensible defaults; override via props if needed
      position="top-right"
      richColors
      closeButton
      expand
      {...props}
    />
  );
}