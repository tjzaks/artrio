// Profanity filter for content moderation
// Light-touch filtering - just asterisk out explicit words

// Words to filter (replace with asterisks)
const wordsToFilter = [
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'dick', 
  'cock', 'pussy', 'piss', 'porn', 'sex'
];

// Words to completely block (hate speech, extreme content)
const wordsToBlock = [
  'nigger', 'nigga', 'faggot', 'retard', 'tranny',
  'kys', 'kms'
];

// This would be expanded with a comprehensive word list in production
// We'd likely use an external API service like Perspective API or Azure Content Moderator

export class ProfanityFilter {
  
  // Filter explicit words (replace with asterisks)
  public filterExplicitWords(text: string): string {
    let filtered = text;
    
    wordsToFilter.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const replacement = word[0] + '*'.repeat(word.length - 1);
      filtered = filtered.replace(regex, replacement);
    });
    
    return filtered;
  }
  
  // Check if content should be completely blocked
  public shouldBlock(text: string): boolean {
    const normalized = text.toLowerCase();
    
    return wordsToBlock.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(normalized);
    });
  }
  
  // Process content - either filter or block
  public processContent(text: string): { 
    processed: string; 
    blocked: boolean; 
    modified: boolean 
  } {
    // Check if it should be blocked entirely
    if (this.shouldBlock(text)) {
      return {
        processed: text,
        blocked: true,
        modified: false
      };
    }
    
    // Otherwise, filter explicit words
    const filtered = this.filterExplicitWords(text);
    
    return {
      processed: filtered,
      blocked: false,
      modified: filtered !== text
    };
  }
}

// Singleton instance
export const profanityFilter = new ProfanityFilter();

// Helper function for quick checks
export function isContentAppropriate(text: string): boolean {
  // Quick checks for obvious issues
  if (!text || text.trim().length === 0) return true;
  
  // Check for excessive caps (might indicate shouting/aggression)
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.7 && text.length > 5) return false;
  
  // Check for spam patterns
  if (/(.)\1{5,}/.test(text)) return false; // Repeated characters
  
  // Check profanity
  return !profanityFilter.containsProfanity(text);
}

// Content moderation levels
export enum ModerationLevel {
  CLEAN = 'clean',
  WARNING = 'warning', 
  BLOCKED = 'blocked'
}

export function getContentModerationLevel(text: string): ModerationLevel {
  const score = profanityFilter.getFilterScore(text);
  
  if (score < 0.3) return ModerationLevel.CLEAN;
  if (score < 0.7) return ModerationLevel.WARNING;
  return ModerationLevel.BLOCKED;
}