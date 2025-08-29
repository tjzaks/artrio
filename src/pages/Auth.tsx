import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, XCircle, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, Sparkles, PartyPopper, Heart, Star, Zap, Music, Gamepad2, Palette, Book, Dumbbell, Pizza, Code, Globe, Film, Trees, Shirt, Laugh, Trophy, Users, Home, Moon, Sunrise, Plane, Dog, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateEmail, validatePassword, validateUsername, sanitize } from '@/utils/validation';
import { logger } from '@/utils/logger';
import { cleanErrorMessage } from '@/utils/errorMessages';
import { formatPhoneNumber } from '@/utils/phoneFormat';
import { validatePhoneNumber } from '@/utils/phoneValidation';
import { cn } from '@/lib/utils';
import { WelcomeModal } from '@/components/WelcomeModal';

const PERSONALITY_TYPES = [
  { value: 'creative', label: 'Creative soul', icon: Palette, color: 'from-purple-500 to-pink-500' },
  { value: 'gamer', label: 'Gamer at heart', icon: Gamepad2, color: 'from-green-500 to-blue-500' },
  { value: 'bookworm', label: 'Book nerd', icon: Book, color: 'from-amber-500 to-orange-500' },
  { value: 'fitness', label: 'Fitness enthusiast', icon: Dumbbell, color: 'from-red-500 to-pink-500' },
  { value: 'music', label: 'Music lover', icon: Music, color: 'from-indigo-500 to-purple-500' },
  { value: 'foodie', label: 'Foodie', icon: Pizza, color: 'from-yellow-500 to-red-500' },
  { value: 'tech', label: 'Tech wizard', icon: Code, color: 'from-blue-500 to-cyan-500' },
  { value: 'adventurer', label: 'Adventure seeker', icon: Globe, color: 'from-teal-500 to-green-500' },
  { value: 'movie', label: 'Movie buff', icon: Film, color: 'from-purple-500 to-blue-500' },
  { value: 'nature', label: 'Nature lover', icon: Trees, color: 'from-green-500 to-emerald-500' },
  { value: 'fashionista', label: 'Fashion forward', icon: Shirt, color: 'from-pink-500 to-rose-500' },
  { value: 'comedian', label: 'Class clown', icon: Laugh, color: 'from-amber-500 to-yellow-500' },
  { value: 'athlete', label: 'Sports fanatic', icon: Trophy, color: 'from-orange-500 to-red-500' },
  { value: 'social', label: 'Social butterfly', icon: Users, color: 'from-violet-500 to-pink-500' },
  { value: 'introvert', label: 'Homebody', icon: Home, color: 'from-blue-500 to-indigo-500' },
  { value: 'nightowl', label: 'Night owl', icon: Moon, color: 'from-slate-600 to-purple-600' },
  { value: 'earlybird', label: 'Early bird', icon: Sunrise, color: 'from-yellow-400 to-orange-400' },
  { value: 'wanderlust', label: 'World traveler', icon: Plane, color: 'from-cyan-500 to-blue-500' },
  { value: 'pet', label: 'Pet parent', icon: Dog, color: 'from-amber-500 to-brown-500' },
  { value: 'coffee', label: 'Coffee addict', icon: Coffee, color: 'from-brown-500 to-amber-600' },
];

const CARD_COLORS = [
  'bg-gradient-to-br from-trio-red/20 to-trio-red/5',
  'bg-gradient-to-br from-trio-green/20 to-trio-green/5',
  'bg-gradient-to-br from-trio-blue/20 to-trio-blue/5',
  'bg-gradient-to-br from-purple-500/20 to-purple-500/5',
  'bg-gradient-to-br from-amber-500/20 to-amber-500/5',
  'bg-gradient-to-br from-pink-500/20 to-pink-500/5',
  'bg-gradient-to-br from-teal-500/20 to-teal-500/5',
  'bg-gradient-to-br from-indigo-500/20 to-indigo-500/5',
];

const Auth = () => {
  console.log('🔐 Auth component started');
  
  const { user, signUp, signIn, loading } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [birthdayText, setBirthdayText] = useState('');
  const [description, setDescription] = useState('');
  const [personalityType, setPersonalityType] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ageError, setAgeError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameDebounceTimer, setUsernameDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [personalityPage, setPersonalityPage] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeUsername, setWelcomeUsername] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  // Session ID no longer needed - removed username reservation logic

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center overflow-hidden">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const parseBirthday = (dateString: string): Date | null => {
    // Expected format: MM/DD/YYYY
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    const month = parseInt(parts[0]) - 1; // Month is 0-indexed
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
    if (month < 0 || month > 11) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1900 || year > new Date().getFullYear()) return null;
    
    return new Date(year, month, day);
  };

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return true;
    }

    setCheckingUsername(true);
    try {
      // Simple check - just see if username exists in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', usernameToCheck.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows returned = username is available
        setUsernameAvailable(true);
        return true;
      }

      if (error) {
        logger.error('Error checking username:', error);
        setUsernameAvailable(null);
        return false;
      }

      // If we got data, username is taken
      setUsernameAvailable(false);
      return false;
    } catch (error) {
      logger.error('Error checking username:', error);
      setUsernameAvailable(null);
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const generateUniqueUsername = async (baseUsername: string): Promise<string> => {
    let attemptUsername = baseUsername;
    let counter = 1;
    
    while (counter < 100) {
      const isAvailable = await checkUsernameAvailability(attemptUsername);
      if (isAvailable) {
        return attemptUsername;
      }
      attemptUsername = `${baseUsername}${Math.floor(Math.random() * 9999)}`;
      counter++;
    }
    
    return `${baseUsername}_${Date.now()}`;
  };

  const checkAgeRestriction = async (birthDate: Date) => {
    const age = calculateAge(birthDate);
    
    if (age < 15) {
      const { data: attempts } = await supabase
        .from('age_verification_attempts')
        .select('*')
        .eq('birthday', format(birthDate, 'yyyy-MM-dd'));

      if (attempts && attempts.length > 0) {
        setAgeError('You have already attempted to sign up with this birthday. You must be 15 or older to use this app.');
        return false;
      }

      await supabase
        .from('age_verification_attempts')
        .insert({
          birthday: format(birthDate, 'yyyy-MM-dd'),
          ip_address: null,
          user_agent: navigator.userAgent
        });

      setAgeError('You must be 15 or older to use this app. You cannot try again until your 15th birthday.');
      return false;
    }

    setAgeError('');
    return true;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectUrl}/reset-password`,
      });

      if (error) {
        toast({
          title: 'Error',
          description: cleanErrorMessage(error),
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Check your email',
          description: 'We sent you a password reset link. Check your email inbox (and spam folder).',
        });
        setEmail('');
        setIsForgotPassword(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reset email',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    setIsSubmitting(true);
    setAgeError('');

    try {
      if (password !== confirmPassword) {
        toast({
          title: 'Error',
          description: 'Passwords do not match',
          variant: 'destructive'
        });
        return;
      }

      if (!birthdayText.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter your birthday',
          variant: 'destructive'
        });
        return;
      }

      const birthday = parseBirthday(birthdayText);
      if (!birthday) {
        toast({
          title: 'Error',
          description: 'Please enter a valid birthday in MM/DD/YYYY format',
          variant: 'destructive'
        });
        return;
      }

      const isAgeValid = await checkAgeRestriction(birthday);
      if (!isAgeValid) {
        return;
      }

      // Just use the username directly - let database handle uniqueness
      const phoneToSend = phone ? phone.replace(/\D/g, '') : null;
      console.log('📱 Auth.tsx - Phone being sent to signUp:', phoneToSend, 'from original:', phone);
      const { error } = await signUp(email, password, {
        username: username.toLowerCase(),
        birthday: format(birthday, 'yyyy-MM-dd'),
        bio: description || '',
        phone: phoneToSend,
        personality_type: personalityType,
        first_name: firstName,
        last_name: lastName
      });

      if (error) {
        logger.error('Signup error details:', error);
        
        let errorMessage = error.message;
        
        if (error.message.includes('phone number is already registered')) {
          errorMessage = 'This phone number is already registered to another account.';
        } else if (error.message.includes('username') && (error.message.includes('duplicate') || error.message.includes('unique'))) {
          errorMessage = 'That username is already taken. Please choose another.';
        } else if (error.message.includes('email') && (error.message.includes('duplicate') || error.message.includes('unique') || error.message.includes('already registered'))) {
          errorMessage = 'This email is already registered. Try signing in instead.';
        } else if (error.message.includes('duplicate') || error.message.includes('unique') || error.message.includes('already registered')) {
          // Generic duplicate error - could be email or phone
          errorMessage = 'This information is already registered. Please check your email and phone number.';
        } else if (error.message.includes('Database error') || error.message.includes('profiles')) {
          errorMessage = 'Database error. Please try again in a moment.';
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password format.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }
        
        toast({
          title: 'Sign Up Error',
          description: errorMessage,
          variant: 'destructive'
        });
      } else {
        const { error: signInError } = await signIn(email, password);
        
        if (signInError) {
          toast({
            title: 'Account created!',
            description: 'Please sign in with your new account.'
          });
          setIsSignUp(false);
        } else {
          // Show welcome modal for new signups
          setWelcomeUsername(username);
          setShowWelcomeModal(true);
        }
        
        // Clear session ID after successful signup
        // Session cleanup no longer needed
        
        setEmail('');
        setPassword('');
        setUsername('');
        setPhone('');
        setBirthdayText('');
        setDescription('');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isForgotPassword) {
      return handleForgotPassword(e);
    }
    
    setIsSubmitting(true);

    try {
      let emailToUse = loginIdentifier;
      
      if (!loginIdentifier.includes('@')) {
        const usernameToEmail: Record<string, string> = {
          'beth_jackson_12': 'beth@example.com',
          'dylan_thomas_12': 'dylan@example.com',
          'emma_johnson_12': 'emma@example.com',
          'ethan_davis_12': 'ethan@example.com',
          'isabella_anderson_12': 'isabella@example.com',
          'jake_thompson_12': 'jake@example.com',
          'jonny b': 'jonnyb@example.com',
          'joshy b': 'marcher_windier.0o@icloud.com',
          'logan_taylor_12': 'logan@example.com',
          'mason_wilson_12': 'mason@example.com',
          'olivia_moore_12': 'olivia@example.com',
          'sophia_miller_12': 'sophia@example.com',
          'tobyszaks': 'tobyszakacs@icloud.com',
          'tyler': 'szakacsmediacompany@gmail.com',
        };
        
        const email = usernameToEmail[loginIdentifier.toLowerCase()];
        
        if (!email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .ilike('username', loginIdentifier)
            .single();
          
          if (profile) {
            toast({
              title: 'Please use email to login',
              description: 'New users should login with their email address',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Username not found',
              description: 'Please check your username or login with email',
              variant: 'destructive'
            });
          }
          setIsSubmitting(false);
          return;
        }
        
        emailToUse = email;
      }
      
      const { error } = await signIn(emailToUse, password);
      
      if (error) {
        // Enhanced error logging for iOS Simulator
        const isIOSApp = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Artrio iOS App');
        
        if (isIOSApp) {
          console.error('📱 iOS Sign In Failed');
          console.error('📱 Error:', error);
          console.error('📱 Error Type:', typeof error);
          console.error('📱 Error Message:', error?.message || error);
          
          // Show more detailed error in iOS
          const errorMsg = error?.message || cleanErrorMessage(error);
          
          // Special handling for common iOS issues
          if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('Load failed')) {
            toast({
              title: 'Connection Error',
              description: 'Cannot connect to server. Check Xcode console for details.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Sign In Error',
              description: errorMsg,
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Sign In Error',
            description: cleanErrorMessage(error),
            variant: 'destructive'
          });
        }
      }
    } catch (error: any) {
      console.error('📱 Unexpected error in handleSignIn:', error);
      
      const isIOSApp = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Artrio iOS App');
      
      if (isIOSApp && error?.message === 'Load failed') {
        toast({
          title: 'Network Error',
          description: 'Failed to connect to Artrio servers. This is a known iOS Simulator issue. Check Xcode console.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: error?.message || 'An unexpected error occurred',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const signupSteps = [
    { title: "What's your name?", fields: ['name'] },
    { title: "How can we reach you?", fields: ['email'] },
    { title: "Your phone number", fields: ['phone'] },
    { title: "Create your username", fields: ['username'] },
    { title: "Secure your account", fields: ['password'] },
    { title: "When's your birthday?", fields: ['birthday'] },
    { title: "What's your vibe?", fields: ['personality'] },
    { title: "Tell us about yourself", fields: ['bio'] },
  ];

  const currentStepData = signupSteps[currentStep];
  const totalSteps = signupSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const validatePhone = (phoneNumber: string): boolean => {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    console.log('📱 validatePhone called with:', phoneNumber, 'digits only:', digitsOnly);
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      console.log('📱 Phone validation failed: length', digitsOnly.length);
      return false;
    }
    if (digitsOnly.length === 10 && (digitsOnly[0] === '0' || digitsOnly[0] === '1')) {
      console.log('📱 Phone validation failed: invalid area code');
      return false;
    }
    console.log('📱 Phone validation passed');
    return true;
  };


  const handlePhoneChange = async (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhone(formatted);
    
    // Only validate if we have a reasonably complete phone number
    if (value.replace(/\D/g, '').length >= 10) {
      const validation = await validatePhoneNumber(value);
      if (!validation.isValid) {
        setPhoneError(validation.error || 'Invalid phone number');
      } else {
        setPhoneError(null);
      }
    } else if (value.replace(/\D/g, '').length > 0) {
      // Show error if they've started typing but haven't entered enough digits
      setPhoneError('Please enter a complete phone number');
    } else {
      setPhoneError(null);
    }
  };

  const canProceed = () => {
    switch (currentStepData?.fields[0]) {
      case 'name': return firstName && lastName;
      case 'email': return email;
      case 'phone': {
        // Phone must be entered and no error message should be present
        const hasPhone = phone && phone.replace(/\D/g, '').length >= 10;
        const noError = !phoneError;
        console.log('📱 canProceed phone check - phone:', phone, 'hasPhone:', hasPhone, 'noError:', noError);
        return hasPhone && noError;
      }
      case 'username': return username && username.length >= 3;
      case 'password': return password && password.length >= 6 && confirmPassword && password === confirmPassword;
      case 'birthday': return birthdayText;
      case 'personality': return personalityType;
      case 'bio': return description;
      default: return false;
    }
  };

  const handleNext = async () => {
    // Simply move to next step - no username reservation needed
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSignUp();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isSignUp) {
    // Regular login form
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-background p-4 overflow-hidden">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <img src="/artrio-logo-smooth.png" alt="Artrio" className="h-16 sm:h-20 w-auto" />
            </div>
            <CardDescription className="text-center">
              {isForgotPassword 
                ? 'Reset your password' 
                : 'Welcome back to Artrio'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              {!isForgotPassword ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="loginIdentifier">Email or Username</Label>
                    <Input
                      id="loginIdentifier"
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      required
                      placeholder="Enter your email or username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        minLength={6}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting 
                  ? 'Please wait...' 
                  : isForgotPassword 
                    ? 'Send Reset Email' 
                    : 'Sign In'}
              </Button>

              <div className="text-center space-y-2">
                {!isForgotPassword && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm w-full"
                  >
                    Forgot your password?
                  </Button>
                )}
                
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    if (isForgotPassword) {
                      setIsForgotPassword(false);
                    } else {
                      setIsSignUp(true);
                      setCurrentStep(0);
                    }
                  }}
                  className="text-sm w-full"
                >
                  {isForgotPassword 
                    ? 'Back to sign in' 
                    : "Don't have an account? Sign up"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Card-based signup flow
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4 sm:p-6 md:p-8 overflow-hidden">
      <div className="w-full max-w-lg px-4 sm:px-0">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/artrio-logo-smooth.png" alt="Artrio" className="h-16 sm:h-20 md:h-24 w-auto" />
        </div>

        {/* Card */}
        <div className="relative">
          <Card className={cn(
            "transition-all duration-500 transform",
            CARD_COLORS[currentStep % CARD_COLORS.length],
            "border-2"
          )}>
            <CardContent className="p-4 sm:p-6 md:p-8">
              {/* Step indicator */}
              <div className="flex justify-between items-center mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="opacity-70 hover:opacity-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm font-medium text-muted-foreground">
                  {currentStep + 1} of {totalSteps}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsSignUp(false);
                    setCurrentStep(0);
                  }}
                  className="opacity-70 hover:opacity-100"
                >
                  Sign In
                </Button>
              </div>

              {/* Dynamic content based on step */}
              <div className="space-y-6">
                <h2 className="text-xl sm:text-2xl font-bold text-center">
                  {currentStepData.title}
                </h2>

                {/* Name Fields */}
                {currentStepData.fields[0] === 'name' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                          className="text-base sm:text-lg p-4 sm:p-5 md:p-6"
                                                  />
                      </div>
                      <div>
                        <Input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                          className="text-base sm:text-lg p-4 sm:p-5 md:p-6"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground">
                      (Your real name stays private)
                    </p>
                  </div>
                )}

                {/* Email Field */}
                {currentStepData.fields[0] === 'email' && (
                  <div className="space-y-4">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="text-lg p-6 text-center"
                                          />
                  </div>
                )}

                {/* Phone Field */}
                {currentStepData.fields[0] === 'phone' && (
                  <div className="space-y-4">
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(555) 123-4567"
                      className={cn(
                        "text-lg p-6 text-center",
                        phoneError && "border-red-500 focus:border-red-500"
                      )}
                                          />
                    {phoneError && (
                      <p className="text-xs text-red-500 text-center">{phoneError}</p>
                    )}
                    <p className="text-xs text-center text-muted-foreground">
                      We'll use this to notify you about your trios
                    </p>
                  </div>
                )}

                {/* Username Field */}
                {currentStepData.fields[0] === 'username' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => {
                          let newUsername = e.target.value
                            .toLowerCase() // Auto-lowercase
                            .replace(/\s+/g, '_') // Replace spaces with underscores
                            .replace(/[^a-z0-9_]/g, ''); // Remove invalid characters
                          
                          // Don't allow starting with underscore or number
                          if (newUsername.startsWith('_') || /^\d/.test(newUsername)) {
                            newUsername = newUsername.slice(1);
                          }
                          
                          // Limit length
                          if (newUsername.length > 20) {
                            newUsername = newUsername.slice(0, 20);
                          }
                          
                          setUsername(newUsername);
                          
                          if (usernameDebounceTimer) {
                            clearTimeout(usernameDebounceTimer);
                          }
                          
                          if (newUsername.length >= 3) {
                            const timer = setTimeout(() => {
                              checkUsernameAvailability(newUsername);
                            }, 500);
                            setUsernameDebounceTimer(timer);
                          } else {
                            setUsernameAvailable(null);
                          }
                        }}
                        placeholder="@username"
                        className="text-lg p-6 text-center pr-12"
                                              />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername && (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                        {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {!checkingUsername && usernameAvailable === false && (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    </div>
                    {usernameAvailable === false && (
                      <p className="text-sm text-center text-destructive">That username is taken</p>
                    )}
                    {usernameAvailable === true && username.length >= 3 && (
                      <p className="text-sm text-center text-green-600">Nice! That username is available</p>
                    )}
                    {username.length > 0 && username.length < 3 && (
                      <p className="text-sm text-center text-muted-foreground">Keep typing... (3+ characters needed)</p>
                    )}
                  </div>
                )}

                {/* Password Fields */}
                {currentStepData.fields[0] === 'password' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="text-lg p-6 pr-12"
                                              />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-2">
                        {/* Strength Bar */}
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => {
                            const strength = (() => {
                              let score = 0;
                              if (password.length >= 6) score++;
                              if (password.length >= 10) score++;
                              if (/[0-9]/.test(password)) score++;
                              if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
                              return score;
                            })();
                            
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "h-1.5 flex-1 rounded-full transition-all",
                                  i < strength
                                    ? strength === 1
                                      ? "bg-red-500"
                                      : strength === 2
                                      ? "bg-amber-500"
                                      : strength === 3
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                    : "bg-muted"
                                )}
                              />
                            );
                          })}
                        </div>
                        
                        {/* Requirements Checklist */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className={cn(
                            "flex items-center gap-1.5",
                            password.length >= 6 ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {password.length >= 6 ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span>6+ characters</span>
                          </div>
                          
                          <div className={cn(
                            "flex items-center gap-1.5",
                            /[0-9]/.test(password) ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {/[0-9]/.test(password) ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span>Has numbers</span>
                          </div>
                          
                          <div className={cn(
                            "flex items-center gap-1.5",
                            /[a-z]/.test(password) && /[A-Z]/.test(password) ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {/[a-z]/.test(password) && /[A-Z]/.test(password) ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span>Mixed case</span>
                          </div>
                          
                          <div className={cn(
                            "flex items-center gap-1.5",
                            password.length >= 10 ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {password.length >= 10 ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span>10+ (strong)</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className={cn(
                          "text-lg p-6",
                          confirmPassword && confirmPassword !== password && "border-destructive"
                        )}
                      />
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-xs text-destructive mt-1">Passwords don't match</p>
                      )}
                      {confirmPassword && confirmPassword === password && password.length >= 6 && (
                        <div className="flex items-center gap-1.5 text-xs text-green-600 mt-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Passwords match!</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Birthday Field */}
                {currentStepData.fields[0] === 'birthday' && (
                  <div className="space-y-4">
                    <Input
                      type="text"
                      value={birthdayText}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                        
                        // Auto-format as MM/DD/YYYY
                        if (value.length >= 2) {
                          value = value.slice(0, 2) + '/' + value.slice(2);
                        }
                        if (value.length >= 5) {
                          value = value.slice(0, 5) + '/' + value.slice(5);
                        }
                        
                        // Limit to MM/DD/YYYY format (10 chars)
                        if (value.length > 10) {
                          value = value.slice(0, 10);
                        }
                        
                        setBirthdayText(value);
                      }}
                      onKeyDown={(e) => {
                        // Allow backspace to work naturally
                        if (e.key === 'Backspace' && birthdayText.endsWith('/')) {
                          e.preventDefault();
                          setBirthdayText(birthdayText.slice(0, -1));
                        }
                      }}
                      placeholder="MM/DD/YYYY"
                      className="text-lg p-6 text-center font-mono"
                      maxLength={10}
                                          />
                    <p className="text-sm text-center text-muted-foreground">
                      We'll celebrate with you! 🥳
                    </p>
                    {ageError && (
                      <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {ageError}
                      </div>
                    )}
                  </div>
                )}

                {/* Personality Type */}
                {currentStepData.fields[0] === 'personality' && (() => {
                  // Paginate personality types - show 8 at a time  
                  const itemsPerPage = 8;
                  const totalPages = Math.ceil(PERSONALITY_TYPES.length / itemsPerPage);
                  const currentTypes = PERSONALITY_TYPES.slice(
                    personalityPage * itemsPerPage,
                    (personalityPage + 1) * itemsPerPage
                  );

                  return (
                    <div className="space-y-4">
                      {/* Grid of personality types - no scrolling */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentTypes.map((type) => {
                          const Icon = type.icon;
                          const isSelected = personalityType === type.value;
                          return (
                            <div
                              key={type.value}
                              onClick={() => setPersonalityType(type.value)}
                              className={cn(
                                "relative h-20 rounded-lg border-2 cursor-pointer transition-all duration-200",
                                "hover:scale-[1.02] hover:shadow-md",
                                isSelected 
                                  ? "border-primary bg-primary/5 shadow-sm" 
                                  : "border-border hover:border-muted-foreground/50"
                              )}
                            >
                              {/* Background gradient effect */}
                              {isSelected && (
                                <div className={cn(
                                  "absolute inset-0 rounded-md opacity-10",
                                  `bg-gradient-to-br ${type.color}`
                                )} />
                              )}
                              
                              {/* Content */}
                              <div className="relative h-full flex flex-col items-center justify-center gap-1.5 p-2">
                                <Icon className={cn(
                                  "h-6 w-6 transition-colors",
                                  isSelected && "text-primary"
                                )} />
                                <span className={cn(
                                  "text-[11px] font-medium text-center",
                                  isSelected && "text-primary"
                                )}>{type.label}</span>
                              </div>
                              
                              {/* Selected checkmark */}
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5">
                                  <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => setPersonalityPage(Math.max(0, personalityPage - 1))}
                            disabled={personalityPage === 0}
                            className={cn(
                              "p-1.5 rounded-full transition-all",
                              personalityPage === 0 
                                ? "text-muted-foreground/30" 
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                          
                          <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setPersonalityPage(i)}
                                className={cn(
                                  "h-1.5 rounded-full transition-all",
                                  i === personalityPage
                                    ? "w-5 bg-primary"
                                    : "w-1.5 bg-border hover:bg-muted-foreground/50"
                                )}
                              />
                            ))}
                          </div>
                          
                          <button
                            onClick={() => setPersonalityPage(Math.min(totalPages - 1, personalityPage + 1))}
                            disabled={personalityPage === totalPages - 1}
                            className={cn(
                              "p-1.5 rounded-full transition-all",
                              personalityPage === totalPages - 1
                                ? "text-muted-foreground/30"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Bio Field */}
                {currentStepData.fields[0] === 'bio' && (
                  <div className="space-y-4">
                    <textarea
                      value={description}
                      onChange={(e) => {
                        const text = e.target.value;
                        // Basic client-side content check
                        const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
                        if (capsRatio > 0.7 && text.length > 5) {
                          toast({
                            title: 'Easy on the caps!',
                            description: 'Please avoid using too many capital letters.',
                            variant: 'destructive'
                          });
                          return;
                        }
                        setDescription(text);
                      }}
                      placeholder="Tell your trio something fun about yourself..."
                      className="w-full min-h-[120px] p-4 text-base rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      maxLength={150}
                                          />
                    <div className="space-y-1">
                      <p className="text-xs text-center text-muted-foreground">
                        {description.length}/150 characters
                      </p>
                      <p className="text-[10px] text-center text-muted-foreground">
                        Keep it clean and friendly - inappropriate content will be blocked
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isSubmitting || !!ageError}
                  className={cn(
                    "w-full py-6 text-lg font-semibold transition-all",
                    currentStep === totalSteps - 1 
                      ? "bg-gradient-to-r from-trio-red via-trio-green to-trio-blue hover:opacity-90"
                      : ""
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating your account...
                    </>
                  ) : currentStep === totalSteps - 1 ? (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Join Artrio!
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress bar */}
        <div className="mt-8">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-trio-red via-trio-green to-trio-blue transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Welcome Modal */}
      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onClose={() => setShowWelcomeModal(false)}
        username={welcomeUsername}
      />
    </div>
  );
};

export default Auth;