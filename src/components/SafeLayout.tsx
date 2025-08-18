import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SafeLayoutProps {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
}

/**
 * SafeLayout - Wrapper component that handles iOS safe areas
 * Use this as the root wrapper for all pages to ensure proper spacing
 * on devices with notches and home indicators
 */
export const SafeLayout = ({ 
  children, 
  className,
  fullHeight = true 
}: SafeLayoutProps) => {
  return (
    <div 
      className={cn(
        // Base styles
        "bg-background",
        // Safe area padding
        "pt-[env(safe-area-inset-top)]",
        "pb-[env(safe-area-inset-bottom)]",
        "px-[env(safe-area-inset-left)] px-[env(safe-area-inset-right)]",
        // Optional full height
        fullHeight && "min-h-screen",
        // Custom classes
        className
      )}
    >
      {children}
    </div>
  );
};

interface SafeHeaderProps {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
  transparent?: boolean;
}

/**
 * SafeHeader - Header component that accounts for iOS safe areas
 * Use this for all navigation headers to prevent status bar overlap
 */
export const SafeHeader = ({ 
  children, 
  className,
  sticky = true,
  transparent = false
}: SafeHeaderProps) => {
  return (
    <header 
      className={cn(
        // Position
        sticky && "sticky top-0 z-40",
        !sticky && "relative",
        // Background
        transparent ? "navigation-glass" : "bg-background border-b",
        // No additional padding-top here since SafeLayout handles it
        // Custom classes
        className
      )}
    >
      {children}
    </header>
  );
};

interface SafeScrollViewProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

/**
 * SafeScrollView - Scrollable content area with safe area support
 * Use for main content areas that need to scroll
 */
export const SafeScrollView = ({ 
  children, 
  className,
  noPadding = false
}: SafeScrollViewProps) => {
  return (
    <div 
      className={cn(
        "flex-1 overflow-y-auto",
        !noPadding && "px-4 py-4",
        className
      )}
    >
      {children}
    </div>
  );
};