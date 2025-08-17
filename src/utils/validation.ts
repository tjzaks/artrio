// Input validation and sanitization utilities

export class Validator {
  // Email validation
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  // Password strength validation
  static isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Username validation
  static isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(username);
  }

  // Sanitize input to prevent XSS
  static sanitizeInput(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  // Sanitize HTML (strip dangerous tags)
  static sanitizeHtml(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove script tags
    const scripts = tempDiv.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      scripts[i].remove();
    }
    
    // Remove event handlers
    const allElements = tempDiv.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const element = allElements[i];
      const attributes = element.attributes;
      for (let j = attributes.length - 1; j >= 0; j--) {
        const attr = attributes[j];
        if (attr.name.startsWith('on')) {
          element.removeAttribute(attr.name);
        }
      }
    }
    
    return tempDiv.innerHTML;
  }

  // Validate URL
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Validate UUID
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Validate file upload
  static validateFile(file: File, options: FileValidationOptions = {}): { valid: boolean; error?: string } {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm'],
    } = options;

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
      };
    }

    // Check MIME type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not allowed',
      };
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: 'File extension not allowed',
      };
    }

    return { valid: true };
  }

  // Rate limit checker
  static createRateLimiter(maxAttempts: number, windowMs: number) {
    const attempts = new Map<string, number[]>();

    return (key: string): boolean => {
      const now = Date.now();
      const userAttempts = attempts.get(key) || [];
      
      // Remove old attempts outside the window
      const validAttempts = userAttempts.filter(timestamp => now - timestamp < windowMs);
      
      // Check if limit exceeded
      if (validAttempts.length >= maxAttempts) {
        return false;
      }
      
      // Add current attempt
      validAttempts.push(now);
      attempts.set(key, validAttempts);
      
      // Cleanup old entries
      if (attempts.size > 1000) {
        const oldestKey = attempts.keys().next().value;
        attempts.delete(oldestKey);
      }
      
      return true;
    };
  }

  // Profanity filter (basic implementation)
  static containsProfanity(text: string): boolean {
    // This is a very basic implementation
    // In production, use a proper profanity filter library
    const profanityList = [
      // Add actual profanity words here if needed
      // For now, keeping it empty for the example
    ];
    
    const lowerText = text.toLowerCase();
    return profanityList.some(word => lowerText.includes(word));
  }

  // SQL injection prevention (for any direct SQL usage)
  static escapeSqlString(str: string): string {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%':
          return '\\' + char;
        default:
          return char;
      }
    });
  }

  // Validate phone number (basic)
  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  // Validate date
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Trim and normalize whitespace
  static normalizeWhitespace(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }
}

interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

// Export commonly used validators as functions
export const validateEmail = Validator.isValidEmail;
export const validatePassword = Validator.isValidPassword;
export const validateUsername = Validator.isValidUsername;
export const sanitize = Validator.sanitizeInput;
export const sanitizeHtml = Validator.sanitizeHtml;