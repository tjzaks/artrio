-- Fix the GRANT statements for the trio queue functions
-- These need to specify the function signatures with their parameters

-- Grant permissions for join_trio_queue function (with UUID parameter)
GRANT EXECUTE ON FUNCTION public.join_trio_queue(UUID) TO authenticated;

-- Grant permissions for leave_trio_queue function (no parameters)
GRANT EXECUTE ON FUNCTION public.leave_trio_queue() TO authenticated;

-- Grant permissions for get_queue_status function (no parameters)
GRANT EXECUTE ON FUNCTION public.get_queue_status() TO authenticated;