"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#1f2937", // Dark gray background
          color: "white",
          border: "1px solid #374151",
          borderRadius: "8px",
        },
        classNames: {
          description: "text-gray-300",
          actionButton:
            "bg-purple-600 text-white hover:bg-purple-700 border-none",
          cancelButton:
            "bg-gray-600 text-gray-300 hover:bg-gray-700 border-none",
          success: "border-green-500",
          error: "border-red-500",
          warning: "border-yellow-500",
          info: "border-blue-500",
        },
      }}
      style={
        {
          "--normal-bg": "#1f2937",
          "--normal-text": "white",
          "--normal-border": "#374151",
          "--success-bg": "#1f2937",
          "--success-text": "white",
          "--success-border": "#10b981",
          "--error-bg": "#1f2937",
          "--error-text": "white",
          "--error-border": "#ef4444",
          "--info-bg": "#1f2937",
          "--info-text": "white",
          "--info-border": "#3b82f6",
          "--warning-bg": "#1f2937",
          "--warning-text": "white",
          "--warning-border": "#f59e0b",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
