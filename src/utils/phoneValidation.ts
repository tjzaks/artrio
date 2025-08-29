import { supabase } from '@/integrations/supabase/client';
import { isDummyPhoneNumber } from './phoneFormat';

/**
 * Check if a phone number is already in use by another user
 * @param phone - Phone number to check (will be normalized)
 * @param currentUserId - Optional current user ID to exclude from check
 * @returns Object with isAvailable boolean and error message if not available
 */
export const checkPhoneAvailability = async (
  phone: string,
  currentUserId?: string
): Promise<{ isAvailable: boolean; error?: string }> => {
  // Normalize phone number - remove all non-digits
  const normalizedPhone = phone.replace(/\D/g, '');
  
  // Check if it's a dummy number first
  if (normalizedPhone.length === 10 && isDummyPhoneNumber(normalizedPhone)) {
    return {
      isAvailable: false,
      error: 'This phone number is not valid. Please use a real phone number.'
    };
  }
  
  // For 11-digit numbers starting with 1, check the 10-digit portion
  if (normalizedPhone.length === 11 && normalizedPhone[0] === '1') {
    const phoneWithoutCountryCode = normalizedPhone.slice(1);
    if (isDummyPhoneNumber(phoneWithoutCountryCode)) {
      return {
        isAvailable: false,
        error: 'This phone number is not valid. Please use a real phone number.'
      };
    }
  }
  
  try {
    // Query the database to check if phone number exists
    let query = supabase
      .from('profiles')
      .select('user_id')
      .eq('phone_number', normalizedPhone);
    
    // Exclude current user if provided
    if (currentUserId) {
      query = query.neq('user_id', currentUserId);
    }
    
    const { data, error } = await query.single();
    
    if (error && error.code === 'PGRST116') {
      // No rows returned = phone number is available
      return { isAvailable: true };
    }
    
    if (error) {
      console.error('Error checking phone availability:', error);
      return {
        isAvailable: false,
        error: 'Unable to verify phone number. Please try again.'
      };
    }
    
    // If we got data, phone number is taken
    return {
      isAvailable: false,
      error: 'This phone number is already registered to another account.'
    };
  } catch (error) {
    console.error('Error checking phone availability:', error);
    return {
      isAvailable: false,
      error: 'Unable to verify phone number. Please try again.'
    };
  }
};

/**
 * Validate phone number format and availability
 * @param phone - Phone number to validate
 * @param currentUserId - Optional current user ID for updates
 * @returns Object with isValid boolean and error message if invalid
 */
export const validatePhoneNumber = async (
  phone: string,
  currentUserId?: string
): Promise<{ isValid: boolean; error?: string }> => {
  const normalizedPhone = phone.replace(/\D/g, '');
  
  // Check basic format
  if (normalizedPhone.length < 10) {
    return {
      isValid: false,
      error: 'Phone number must be at least 10 digits'
    };
  }
  
  if (normalizedPhone.length > 15) {
    return {
      isValid: false,
      error: 'Phone number is too long'
    };
  }
  
  // Check availability (includes dummy number check)
  const availability = await checkPhoneAvailability(phone, currentUserId);
  
  if (!availability.isAvailable) {
    return {
      isValid: false,
      error: availability.error
    };
  }
  
  return { isValid: true };
};