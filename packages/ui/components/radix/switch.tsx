"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@rocketreplai/shared";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Base layout
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
      // Transition
      "transition-all duration-300 ease-in-out",
      // Focus ring
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      // Disabled
      "disabled:cursor-not-allowed disabled:opacity-40",
      // Unchecked — light mode: soft gray; dark mode: deeper muted surface
      "data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-white/10",
      // Checked — gradient from pink to rose in both modes
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-pink-500 data-[state=checked]:to-rose-500",
      // Checked shadow glow
      "data-[state=checked]:shadow-[0_0_10px_rgba(236,72,153,0.4)]",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // Base
        "pointer-events-none block h-4 w-4 rounded-full ring-0",
        // Transition
        "transition-all duration-300 ease-in-out",
        // Position
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
        // Unchecked thumb — light: white with subtle shadow; dark: white/80
        "data-[state=unchecked]:bg-white data-[state=unchecked]:shadow-sm dark:data-[state=unchecked]:bg-white/80",
        // Checked thumb — bright white with a stronger shadow for contrast
        "data-[state=checked]:bg-white data-[state=checked]:shadow-[0_1px_6px_rgba(0,0,0,0.25)]",
        // Slight scale on checked for a tactile feel
        "data-[state=checked]:scale-110",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
