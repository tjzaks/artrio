/**
 * Clean up error messages for user display
 * Removes technical error codes and provides user-friendly messages
 */
export function cleanErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';
  
  const message = error.message || error.toString();
  
  // Remove Supabase error codes like PGRST116
  let cleanMessage = message.replace(/PGRST\d+:\s*/g, '');
  cleanMessage = cleanMessage.replace(/Error:\s*/g, '');
  
  // Map common technical errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    'Failed to fetch': 'Connection error. Please check your internet connection.',
    'NetworkError': 'Network error. Please try again.',
    'duplicate key value': 'This item already exists.',
    'violates unique constraint': 'This value is already taken.',
    'violates row-level security': 'You don\'t have permission to do this.',
    'JWT expired': 'Your session has expired. Please sign in again.',
    'invalid_grant': 'Invalid credentials. Please try again.',
    'User not found': 'No account found with these credentials.',
    'Invalid login credentials': 'Incorrect email or password.',
    'Password should be at least': 'Password must be at least 6 characters.',
    'Unable to validate email address': 'Please enter a valid email address.',
    'email rate limit exceeded': 'Too many attempts. Please wait a few minutes.',
  };
  
  // Check if message contains any of our mapped errors
  for (const [key, value] of Object.entries(errorMappings)) {
    if (cleanMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Clean up any remaining technical jargon
  cleanMessage = cleanMessage
    .replace(/\bat\b.*$/g, '') // Remove stack traces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // If message is too technical or empty, return generic message
  if (!cleanMessage || cleanMessage.length > 100 || /^[A-Z_]+$/.test(cleanMessage)) {
    return 'Something went wrong. Please try again.';
  }
  
  return cleanMessage;
}