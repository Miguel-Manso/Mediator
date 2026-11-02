import * as React from "react";
import { cn } from "@/lib/utils";

export interface SharedLayoutBgProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  inset?: number;
  pillClassName?: string;
  pillContainerClassName?: string;
  children?: React.ReactNode;
}

export const SharedLayoutBg = React.forwardRef<HTMLElement, SharedLayoutBgProps>(
  function SharedLayoutBg(
    { as: Component = "ul", children, className, inset, pillClassName, pillContainerClassName, ...props },
    ref
  ) {
    return (
      <Component
        ref={ref}
        className={cn("relative", className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

