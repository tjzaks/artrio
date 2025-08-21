import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SafeAreaLayoutProps {
  children: ReactNode;
  className?: string;
  includeBottom?: boolean; // For pages with bottom navigation
  noPadding?: boolean; // For pages that manage their own padding
}

/**
 * SafeAreaLayout ensures content doesn't overlap with device UI elements
 * like status bar, notch, dynamic island, and home indicator
 */
export function SafeAreaLayout({ 
  children, 
  className,
  includeBottom = false,
  noPadding = false
}: SafeAreaLayoutProps) {
  return (
    <div 
      className={cn(
        "min-h-[100dvh] w-full",
        // Always apply top safe area padding
        "pt-[env(safe-area-inset-top)]",
        // Conditionally apply bottom safe area padding
        includeBottom && "pb-[env(safe-area-inset-bottom)]",
        // Apply horizontal safe area padding for landscape/iPad
        "px-[env(safe-area-inset-left)]",
        // Default padding unless noPadding is true
        !noPadding && "px-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * SafeAreaHeader for fixed headers that need to account for safe area
 */
export function SafeAreaHeader({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "pt-[env(safe-area-inset-top)]",
        "px-[env(safe-area-inset-left)]",
        "bg-background",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * SafeAreaContent for scrollable content that accounts for fixed headers
 */
export function SafeAreaContent({ 
  children, 
  className,
  hasHeader = false 
}: { 
  children: ReactNode; 
  className?: string;
  hasHeader?: boolean;
}) {
  return (
    <div 
      className={cn(
        "flex-1 w-full",
        hasHeader && "pt-16", // Adjust based on header height
        className
      )}
    >
      {children}
    </div>
  );
}