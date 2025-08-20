import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import SplashScreen from "@/components/SplashScreen";
import { hideSplashScreen } from "@/utils/capacitor";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/Admin";
import Messages from "./pages/Messages";
import Friends from "./pages/Friends";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Health from "./pages/Health";
import Debug from "./pages/Debug";
import DebugMessages from "./pages/DebugMessages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  console.log('🚀 SIMULATOR DEBUG: App component initializing...');
  
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // Only show splash on initial app load
  useEffect(() => {
    console.log('🚀 SIMULATOR DEBUG: App useEffect starting...');
    
    try {
      // Check if we've already shown splash this session
      const hasShownSplash = sessionStorage.getItem('hasShownSplash');
      console.log('🚀 SIMULATOR DEBUG: hasShownSplash:', hasShownSplash);
      
      if (hasShownSplash) {
        console.log('🚀 SIMULATOR DEBUG: Skipping splash screen');
        setShowSplash(false);
      }
      
      // Mark app as ready and hide native splash
      console.log('🚀 SIMULATOR DEBUG: Setting app ready to true');
      setAppReady(true);
      
      // Hide the native splash screen once React app is ready
      console.log('🚀 SIMULATOR DEBUG: About to hide splash screen...');
      hideSplashScreen();
      console.log('🚀 SIMULATOR DEBUG: hideSplashScreen called successfully');
    } catch (error) {
      console.error('🚀 SIMULATOR DEBUG: Error in App useEffect:', error);
    }
  }, []);

  const handleSplashComplete = () => {
    console.log('🚀 SIMULATOR DEBUG: Splash completed');
    sessionStorage.setItem('hasShownSplash', 'true');
    setShowSplash(false);
  };

  console.log('🚀 SIMULATOR DEBUG: App render - appReady:', appReady, 'showSplash:', showSplash);

  if (!appReady) {
    console.log('🚀 SIMULATOR DEBUG: App not ready yet, returning null');
    return null; // Prevent flash of content
  }

  if (showSplash) {
    console.log('🚀 SIMULATOR DEBUG: Showing splash screen');
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  console.log('🚀 SIMULATOR DEBUG: About to render main app content...');

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/health" element={<Health />} />
              <Route path="/api/health" element={<Health />} />
              <Route path="/debug" element={<Debug />} />
              <Route path="/debug-messages" element={<DebugMessages />} />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/user/:userId" element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              } />
              <Route path="/friends" element={
                <ProtectedRoute>
                  <Friends />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
