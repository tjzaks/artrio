#!/bin/bash

echo "🔧 Fixing remaining TypeScript any types..."

# Fix SystemControlsPanel.tsx
sed -i '' 's/} catch (error: any) {/} catch (error) {/g' src/components/admin/SystemControlsPanel.tsx

# Fix AuthContext.tsx  
sed -i '' 's/signInWithProvider: (provider: string) => Promise<any>/signInWithProvider: (provider: string) => Promise<void>/g' src/contexts/AuthContext.tsx
sed -i '' 's/updateProfile: (updates: any) => Promise<any>/updateProfile: (updates: Record<string, unknown>) => Promise<void>/g' src/contexts/AuthContext.tsx

# Fix useRealtimeNotifications.ts
sed -i '' 's/metadata?: any/metadata?: Record<string, unknown>/g' src/hooks/useRealtimeNotifications.ts

# Fix AdminDashboard.tsx
sed -i '' 's/} catch (error: any) {/} catch (error) {/g' src/pages/AdminDashboard.tsx

# Fix Health.tsx
sed -i '' 's/data?: any/data?: unknown/g' src/pages/Health.tsx
sed -i '' 's/Record<string, any>/Record<string, unknown>/g' src/pages/Health.tsx

# Fix empty interfaces
sed -i '' 's/interface CommandInputProps extends InputProps {}/type CommandInputProps = InputProps/g' src/components/ui/command.tsx
sed -i '' 's/interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}/type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>/g' src/components/ui/textarea.tsx

# Fix tailwind.config.ts require
sed -i '' "s/require('tailwindcss-animate')/import('tailwindcss-animate')/g" tailwind.config.ts

echo "✅ TypeScript types fixed!"