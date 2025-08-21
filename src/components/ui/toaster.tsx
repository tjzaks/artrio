import { useToast } from "@/hooks/use-toast"
import {
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { SwipeableToast } from "@/components/ui/swipeable-toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <SwipeableToast 
            key={id} 
            {...props}
            onSwipeAway={() => dismiss(id)}
            onOpenChange={(open) => {
              if (!open) dismiss(id);
            }}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </SwipeableToast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
