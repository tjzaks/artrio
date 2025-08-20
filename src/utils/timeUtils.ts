/**
 * Formats a last seen timestamp into a human-readable relative time string
 * Following the specific requirements for Artrio's presence system
 */
export function formatLastSeen(lastSeenTimestamp: string | Date | null): string {
  if (!lastSeenTimestamp) return "Active now";
  
  const lastSeen = new Date(lastSeenTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  
  // If negative (future timestamp), treat as active now
  if (diffMs < 0) return "Active now";
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  
  // Less than 1 minute
  if (diffMinutes < 1) {
    return "Active less than a minute ago";
  }
  
  // 1-59 minutes (show every minute)
  if (diffMinutes < 60) {
    return `Active ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
  
  // 1-23 hours (but check if it crossed midnight)
  if (diffHours < 24) {
    // Check if it crossed midnight (11:59pm boundary)
    const lastSeenDay = lastSeen.toDateString();
    const todayDay = now.toDateString();
    
    if (lastSeenDay !== todayDay) {
      return "Active yesterday";
    }
    
    return `Active ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  
  // 1-6 days
  if (diffDays < 7) {
    if (diffDays === 1) {
      return "Active yesterday";
    }
    return `Active ${diffDays} days ago`;
  }
  
  // 1+ weeks (show as "Inactive")
  if (diffDays < 14) { // Less than 2 weeks
    if (diffWeeks === 1) {
      return "Inactive 1 week ago";
    }
    // This covers 8-13 days 
    return `Inactive ${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  }
  
  // 2+ weeks - just show "Offline"
  return "Offline";
}

/**
 * Determines if a user is currently active (within the last minute)
 */
export function isCurrentlyActive(lastSeenTimestamp: string | Date | null): boolean {
  if (!lastSeenTimestamp) return true; // No timestamp means active now
  
  const lastSeen = new Date(lastSeenTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  
  // Active if last seen within 1 minute (60000ms)
  return diffMs < 60000;
}