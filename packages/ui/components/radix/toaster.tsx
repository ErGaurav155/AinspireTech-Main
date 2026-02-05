"use client";

import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  LucideIcon,
} from "lucide-react";
import { ReactNode } from "react";
import { useToast } from "./use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

export function Toaster() {
  const { toasts } = useToast();

  const getToastStyle = (className?: string): string => {
    const styles: Record<string, string> = {
      "success-toast":
        "linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(21, 128, 61, 0.9) 100%)",
      "error-toast":
        "linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)",
    };
    return (
      styles[className || ""] ||
      "linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%)"
    );
  };

  const getIcon = (className?: string): ReactNode => {
    if (className === "success-toast") {
      return <CheckCircle className="h-5 w-5 text-white/90" />;
    }
    if (className === "error-toast") {
      return <XCircle className="h-5 w-5 text-white/90" />;
    }
    return <Info className="h-5 w-5 text-white/90" />;
  };

  const getRingClass = (className?: string): string => {
    if (className === "success-toast") {
      return "ring-1 ring-emerald-500/20";
    }
    if (className === "error-toast") {
      return "ring-1 ring-red-500/20";
    }
    return "ring-1 ring-indigo-500/20";
  };

  return (
    <ToastProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        className,
        ...props
      }) {
        return (
          <Toast
            key={id}
            {...props}
            className={`
              group relative overflow-hidden border-0 shadow-2xl backdrop-blur-md  
              before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent 
              before:content-[''] after:absolute after:inset-0 after:bg-gradient-to-tl 
              after:from-white/10 after:to-transparent after:content-['']
              ${getRingClass(className)} 
            `}
            style={{
              background: getToastStyle(className),
              backdropFilter: "blur(10px)",
              position: "relative" as const,
            }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] animate-spin-slow opacity-20">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            </div>

            <div className="relative z-10 flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getIcon(className)}</div>
              <div className="grid gap-1 flex-1">
                {title && (
                  <ToastTitle className="text-white font-light md:font-semibold text-sm md:text-base">
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-white/90 text-xs md:text-sm">
                    {description}
                  </ToastDescription>
                )}
              </div>
              {action && <div className="flex-shrink-0">{action}</div>}
              <ToastClose className="absolute -top-2 -right-2 bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-full border border-white/30 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100" />
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent">
              <div className={`h-full bg-white/60 animate-progress`}></div>
            </div>
          </Toast>
        );
      })}
      <ToastViewport className="top-6 left-6 gap-0 md:gap-3 max-w-max w-auto " />
    </ToastProvider>
  );
}
