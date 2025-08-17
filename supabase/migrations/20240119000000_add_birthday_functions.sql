-- Function to get user birthday display (month/day only, with today check)
CREATE OR REPLACE FUNCTION get_user_birthday_display(target_user_id UUID)
RETURNS TABLE(display_date TEXT, is_birthday BOOLEAN) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN s.birthday IS NOT NULL THEN 
        TO_CHAR(s.birthday::date, 'Month DD')
      ELSE NULL
    END as display_date,
    CASE 
      WHEN s.birthday IS NOT NULL THEN 
        EXTRACT(MONTH FROM s.birthday::date) = EXTRACT(MONTH FROM CURRENT_DATE) 
        AND EXTRACT(DAY FROM s.birthday::date) = EXTRACT(DAY FROM CURRENT_DATE)
      ELSE FALSE
    END as is_birthday
  FROM sensitive_user_data s
  WHERE s.user_id = target_user_id;
  
  -- If no data found, return NULL values
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::TEXT, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_birthday_display(UUID) TO authenticated;