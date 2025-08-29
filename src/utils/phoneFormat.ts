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
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};