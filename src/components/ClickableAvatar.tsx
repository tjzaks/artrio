import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ClickableAvatarProps {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showHoverEffect?: boolean;
}

export default function ClickableAvatar({ 
  userId, 
  username, 
  avatarUrl, 
  size = 'md',
  className,
  showHoverEffect = true
}: ClickableAvatarProps) {
  const navigate = useNavigate();

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const handleClick = () => {
    navigate(`/user/${userId}`);
  };

  return (
    <Avatar 
      className={cn(
        sizeClasses[size],
        'cursor-pointer transition-all duration-200',
        showHoverEffect && 'hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:scale-105',
        className
      )}
      onClick={handleClick}
    >
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback>
        {username.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}