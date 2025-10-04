"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        style: {
          background: "white",
          color: "black",
          border: "1px solid #e5e7eb",
        },
        classNames: {
          description: "text-gray-700",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "white",
          "--normal-text": "black",
          "--normal-border": "#e5e7eb",
          "--success-bg": "#10b981",
          "--success-text": "white",
          "--error-bg": "#ef4444",
          "--error-text": "white",
          "--info-bg": "#3b82f6",
          "--info-text": "white",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
