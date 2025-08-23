import React, { useState, useRef, useEffect } from 'react';
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface SwipeableToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>, VariantProps<typeof toastVariants> {
  onSwipeAway?: () => void;
}

export const SwipeableToast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  SwipeableToastProps
>(({ className, variant, onSwipeAway, onOpenChange, ...props }, ref) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const toastRef = useRef<HTMLLIElement>(null);

  // Minimum swipe distance (in px) to trigger dismiss
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentTouch = e.targetTouches[0].clientY;
    const diff = touchStart - currentTouch;
    
    // Only allow upward swipes
    if (diff > 0) {
      setTranslateY(-diff);
    }
    setTouchEnd(currentTouch);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;

    if (isUpSwipe) {
      // Animate out and dismiss
      setTranslateY(-300);
      setTimeout(() => {
        onOpenChange?.(false);
        onSwipeAway?.();
      }, 200);
    } else {
      // Snap back to position
      setTranslateY(0);
    }
    
    setIsDragging(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle mouse events for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchEnd(null);
    setTouchStart(e.clientY);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !touchStart) return;
    
    const currentTouch = e.clientY;
    const diff = touchStart - currentTouch;
    
    if (diff > 0) {
      setTranslateY(-diff);
    }
    setTouchEnd(currentTouch);
  };

  const handleMouseUp = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;

    if (isUpSwipe) {
      setTranslateY(-300);
      setTimeout(() => {
        onOpenChange?.(false);
        onSwipeAway?.();
      }, 200);
    } else {
      setTranslateY(0);
    }
    
    setIsDragging(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!touchStart) return;
        const diff = touchStart - e.clientY;
        if (diff > 0) {
          setTranslateY(-diff);
        }
        setTouchEnd(e.clientY);
      };

      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, touchStart]);

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className, "touch-none select-none")}
      style={{
        transform: `translateY(${translateY}px)`,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onOpenChange={onOpenChange}
      {...props}
    />
  );
});

SwipeableToast.displayName = "SwipeableToast";