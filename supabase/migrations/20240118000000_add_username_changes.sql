-- Add username change tracking
ALTER TABLE public.profiles 
ADD COLUMN username_change_count INTEGER DEFAULT 0,
ADD COLUMN last_username_change TIMESTAMP WITH TIME ZONE;

-- Create a function to track username changes
CREATE OR REPLACE FUNCTION track_username_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if username actually changed
  IF OLD.username IS DISTINCT FROM NEW.username THEN
    NEW.username_change_count = COALESCE(OLD.username_change_count, 0) + 1;
    NEW.last_username_change = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for username changes
CREATE TRIGGER on_username_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION track_username_change();