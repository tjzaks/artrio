import { useEffect } from 'react';
import { useSwipeBackContext } from '@/contexts/SwipeBackContext';

/**
 * Automatically disables swipe-back when a dialog/modal is open
 * Use this hook in dialog/modal components
 */
export const useDisableSwipeOnDialog = (isOpen: boolean) => {
  const { disableSwipeBack, enableSwipeBack } = useSwipeBackContext();

  useEffect(() => {
    if (isOpen) {
      disableSwipeBack();
    } else {
      enableSwipeBack();
    }

    // Cleanup on unmount
    return () => {
      enableSwipeBack();
    };
  }, [isOpen, disableSwipeBack, enableSwipeBack]);
};