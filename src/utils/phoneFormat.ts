/**
 * Format phone number to (123) 456-7890 format
 * @param phone - Phone number string (may contain digits only or be formatted)
 * @returns Formatted phone number or original if not 10 digits
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Format as (123) 456-7890 if it's exactly 10 digits
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  // For 11 digits starting with 1 (US country code), format without country code
  if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    return `(${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }
  
  // Return original for international or non-standard numbers
  return phone;
};

/**
 * Check if a phone number string is valid
 * @param phone - Phone number to validate
 * @returns Boolean indicating if phone is valid
 */
export const isValidPhone = (phone: string): boolean => {
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check basic length requirements
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return false;
  }
  
  // For US numbers (10 or 11 digits), check if it's a dummy number
  if (digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly[0] === '1')) {
    const phoneToCheck = digitsOnly.length === 11 ? digitsOnly.slice(1) : digitsOnly;
    
    // Check for invalid patterns
    if (isDummyPhoneNumber(phoneToCheck)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Check if a phone number is a dummy/test number
 * @param phone - 10-digit phone number string
 * @returns Boolean indicating if phone is a dummy number
 */
export const isDummyPhoneNumber = (phone: string): boolean => {
  // Common dummy patterns
  const dummyPatterns = [
    '0000000000',
    '1111111111',
    '2222222222',
    '3333333333',
    '4444444444',
    '5555555555',
    '6666666666',
    '7777777777',
    '8888888888',
    '9999999999',
    '1234567890',
    '0123456789',
    '9876543210',
    '5555551212', // Directory assistance
    '5555550100', // Common test range start
  ];
  
  if (dummyPatterns.includes(phone)) {
    return true;
  }
  
  // Check for sequential patterns (e.g., 1234567890)
  const isSequential = phone.split('').every((digit, index) => {
    if (index === 0) return true;
    return parseInt(digit) === parseInt(phone[index - 1]) + 1;
  });
  
  if (isSequential) {
    return true;
  }
  
  // Check for reverse sequential (e.g., 9876543210)
  const isReverseSequential = phone.split('').every((digit, index) => {
    if (index === 0) return true;
    return parseInt(digit) === parseInt(phone[index - 1]) - 1;
  });
  
  if (isReverseSequential) {
    return true;
  }
  
  // Check if area code is invalid (starts with 0 or 1)
  const areaCode = phone.substring(0, 3);
  if (areaCode[0] === '0' || areaCode[0] === '1') {
    return true;
  }
  
  // Check for 555-01XX pattern (reserved for fictional use)
  const exchange = phone.substring(3, 6);
  const lastFour = phone.substring(6);
  if (exchange === '555' && lastFour.startsWith('01')) {
    return true;
  }
  
  return false;
};