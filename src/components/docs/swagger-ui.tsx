"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/toast";
import "./swagger-ui.css";

type SwaggerUiProps = {
  spec?: Record<string, unknown>;
};

type SwaggerUiWindow = Window & {
  SwaggerUIBundle?: ((options: Record<string, unknown>) => unknown) & {
    presets?: { apis?: unknown };
  };
  SwaggerUIStandalonePreset?: unknown;
};

export function SwaggerUi({ spec }: SwaggerUiProps) {
  const initializedRef = useRef(false);
  const [bundleLoaded, setBundleLoaded] = useState(false);
  const [presetLoaded, setPresetLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!bundleLoaded || !presetLoaded) return;
    if (initializedRef.current) return;

    const w = window as SwaggerUiWindow;
    if (!w.SwaggerUIBundle) return;
    if (!spec) return;

    w.SwaggerUIBundle({
      spec,
      dom_id: "#swagger-ui",
      deepLinking: true,
      filter: true,
      docExpansion: "none",
      defaultModelsExpandDepth: -1,
      displayRequestDuration: true,
      withCredentials: true,
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
      supportedSubmitMethods: [], // This disables "Try it out"
      presets: [w.SwaggerUIBundle.presets?.apis, w.SwaggerUIStandalonePreset].filter(
        Boolean
      ),
      layout: "BaseLayout",
    });

    initializedRef.current = true;
  }, [bundleLoaded, presetLoaded, spec]);

  // Handle copy toast
  useEffect(() => {
    const handleCopyClick = (e: MouseEvent) => {
      // Swipe up the DOM to find if a copy button was clicked
      // Swagger UI copy buttons often have title="Copy to clipboard" or specific classes
      let target = e.target as HTMLElement | null;
      while (target && target !== document.body) {
        if (
          target.classList.contains("copy-to-clipboard") ||
          target.getAttribute("title") === "Copy to clipboard"
        ) {
          // Trigger toast
          toast({
            title: "已复制",
            description: "内容已复制到剪贴板", 
            variant: "default",
          });
          return;
        }
        target = target.parentElement;
      }
    };

    const container = document.getElementById("swagger-ui");
    if (container) {
      container.addEventListener("click", handleCopyClick);
    }

    return () => {
      if (container) {
        container.removeEventListener("click", handleCopyClick);
      }
    };
  }, [bundleLoaded, presetLoaded, toast]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={() => setBundleLoaded(true)}
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
        onLoad={() => setPresetLoaded(true)}
      />

      <div id="swagger-ui" />
    </>
  );
}


