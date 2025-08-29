import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/utils/phoneFormat';

interface SignupFlowProps {
  onComplete: (data: SignupData) => Promise<void>;
  onBack: () => void;
}

export interface SignupData {
  email: string;
  password: string;
  username: string;
  phone: string;
  birthday: string;
  vibes: string[];
  friendType: string;
  excitedAbout: string;
  conversationStyle: string;
  chatTime: string;
}

const VIBES = [
  { id: 'creative', label: '🎨 Creative soul', value: 'creative' },
  { id: 'gamer', label: '🎮 Gamer at heart', value: 'gamer' },
  { id: 'bookworm', label: '📚 Book nerd', value: 'bookworm' },
  { id: 'fitness', label: '🏃 Fitness enthusiast', value: 'fitness' },
  { id: 'music', label: '🎵 Music lover', value: 'music' },
  { id: 'foodie', label: '🍕 Foodie', value: 'foodie' },
  { id: 'tech', label: '💻 Tech wizard', value: 'tech' },
  { id: 'adventure', label: '🌍 Adventure seeker', value: 'adventure' },
];

const FRIEND_TYPES = [
  { id: 'snacks', label: 'Always has snacks 🍿', value: 'snacks' },
  { id: 'tea', label: 'Knows all the tea ☕', value: 'tea' },
  { id: 'planner', label: 'Plans the adventures 🗺️', value: 'planner' },
  { id: 'advisor', label: 'Gives the best advice 💭', value: 'advisor' },
  { id: 'comedian', label: 'Makes everyone laugh 😂', value: 'comedian' },
  { id: 'dj', label: 'DJs the road trips 🎵', value: 'dj' },
];

const CONVERSATION_STYLES = [
  { id: 'facts', label: '🎲 Random fun facts', value: 'facts' },
  { id: 'deep', label: '🤔 Deep questions', value: 'deep' },
  { id: 'memes', label: '😂 Memes & jokes', value: 'memes' },
  { id: 'hottakes', label: '💭 Hot takes', value: 'hottakes' },
  { id: 'advice', label: '🎯 Life advice', value: 'advice' },
];

const CHAT_TIMES = [
  { id: 'earlybird', label: 'Early bird 🌅', subtitle: '6am-12pm', value: 'earlybird' },
  { id: 'afternoon', label: 'Afternoon vibes ☀️', subtitle: '12pm-6pm', value: 'afternoon' },
  { id: 'nightowl', label: 'Night owl 🦉', subtitle: '6pm-12am', value: 'nightowl' },
  { id: 'vampire', label: 'Vampire hours 🦇', subtitle: '12am-6am', value: 'vampire' },
];

export default function SignupFlow({ onComplete, onBack }: SignupFlowProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<SignupData>({
    email: '',
    password: '',
    username: '',
    phone: '',
    birthday: '',
    vibes: [],
    friendType: '',
    excitedAbout: '',
    conversationStyle: '',
    chatTime: '',
  });

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onComplete(formData);
    } finally {
      setLoading(false);
    }
  };

  const toggleVibe = (vibe: string) => {
    setFormData(prev => ({
      ...prev,
      vibes: prev.vibes.includes(vibe)
        ? prev.vibes.filter(v => v !== vibe)
        : [...prev.vibes, vibe].slice(0, 3) // Max 3 vibes
    }));
  };

  const validatePhone = (phone: string): boolean => {
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check if it's a valid US phone number (10 digits) or international (7-15 digits)
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return false;
    }
    
    // For US numbers, check if it starts with valid area code (not 0 or 1)
    if (digitsOnly.length === 10 && (digitsOnly[0] === '0' || digitsOnly[0] === '1')) {
      return false;
    }
    
    return true;
  };


  const handlePhoneChange = async (value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    
    // Validate phone number
    if (value && !validatePhone(value)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }
    
    // Check if phone number is already in use
    if (validatePhone(value)) {
      setCheckingPhone(true);
      setPhoneError(null);
      
      // Extract digits only for database check
      const digitsOnly = value.replace(/\D/g, '');
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('phone_number', digitsOnly)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking phone:', error);
        } else if (data) {
          setPhoneError('This phone number is already registered');
        } else {
          setPhoneError(null);
        }
      } catch (error) {
        console.error('Error checking phone:', error);
      } finally {
        setCheckingPhone(false);
      }
    } else {
      setPhoneError(null);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.email && formData.password && formData.username && formData.phone && !phoneError;
      case 2: return formData.birthday;
      case 3: return formData.vibes.length > 0;
      case 4: return formData.friendType;
      case 5: return formData.excitedAbout.trim().length > 10;
      case 6: return formData.conversationStyle && formData.chatTime;
      default: return false;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          {step > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="absolute left-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="w-full">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
        
        <CardTitle className="text-center text-2xl">
          {step === 1 && "Let's get you started! 🚀"}
          {step === 2 && "When's your birthday? 🎂"}
          {step === 3 && "What's your vibe? ✨"}
          {step === 4 && "What kind of friend are you? 🤝"}
          {step === 5 && "What's got you excited? 🎉"}
          {step === 6 && "Almost there! 🏁"}
        </CardTitle>
        
        <CardDescription className="text-center">
          {step === 1 && "Basic info to create your account"}
          {step === 2 && "We'll celebrate with you!"}
          {step === 3 && "Pick up to 3 vibes that match your energy"}
          {step === 4 && "Help your trio understand you better"}
          {step === 5 && "Share what's on your mind right now"}
          {step === 6 && "Last few questions to perfect your profile"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="@username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                />
                {usernameAvailable !== null && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {checkingUsername ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : usernameAvailable ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={phoneError ? 'border-red-500' : ''}
                />
                {checkingPhone && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">{phoneError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                We'll use this to notify you about your trios
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Birthday */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-2">
                We'll make your birthday special with confetti! 🎊
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Vibes */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {VIBES.map((vibe) => (
                <Button
                  key={vibe.id}
                  variant={formData.vibes.includes(vibe.value) ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => toggleVibe(vibe.value)}
                >
                  {vibe.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Selected: {formData.vibes.length}/3
            </p>
          </div>
        )}

        {/* Step 4: Friend Type */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">I'm the friend who...</p>
            <div className="grid gap-3">
              {FRIEND_TYPES.map((type) => (
                <Button
                  key={type.id}
                  variant={formData.friendType === type.value ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setFormData(prev => ({ ...prev, friendType: type.value }))}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Excited About */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="excited">What are you excited about right now?</Label>
              <Textarea
                id="excited"
                placeholder="Could be anything! A new hobby, upcoming trip, favorite show, random thoughts..."
                value={formData.excitedAbout}
                onChange={(e) => setFormData(prev => ({ ...prev, excitedAbout: e.target.value }))}
                className="min-h-[100px]"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {formData.excitedAbout.length}/200 characters
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Communication Preferences */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-3">My conversation superpower:</p>
              <div className="grid gap-2">
                {CONVERSATION_STYLES.map((style) => (
                  <Button
                    key={style.id}
                    variant={formData.conversationStyle === style.value ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setFormData(prev => ({ ...prev, conversationStyle: style.value }))}
                  >
                    {style.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Best time to catch me:</p>
              <div className="grid grid-cols-2 gap-2">
                {CHAT_TIMES.map((time) => (
                  <Button
                    key={time.id}
                    variant={formData.chatTime === time.value ? "default" : "outline"}
                    className="flex-col h-auto py-3"
                    onClick={() => setFormData(prev => ({ ...prev, chatTime: time.value }))}
                  >
                    <span>{time.label}</span>
                    <span className="text-xs opacity-70">{time.subtitle}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          {step === 1 && (
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back to Login
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed()}
              className="flex-1"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!canProceed() || loading}
              className="flex-1 bg-gradient-to-r from-trio-red to-trio-blue"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your account...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Join your first trio!
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}