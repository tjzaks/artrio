import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SwipeBackProvider } from "@/contexts/SwipeBackContext";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import SplashScreen from "@/components/SplashScreen";
import { hideSplashScreen } from "@/utils/capacitor";
import { withSwipeBack } from "@/components/withSwipeBack";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/AdminClean";
import Messages from "./pages/Messages";
import Friends from "./pages/Friends";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Wrap components with swipe-back functionality
const ProfileWithSwipe = withSwipeBack(Profile);
const UserProfileWithSwipe = withSwipeBack(UserProfile);
const AdminWithSwipe = withSwipeBack(Admin);
const MessagesWithSwipe = withSwipeBack(Messages);
const FriendsWithSwipe = withSwipeBack(Friends);

const App = () => {
  
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // Only show splash on initial app load
  useEffect(() => {
    
    try {
      // Check if we've already shown splash this session
      const hasShownSplash = sessionStorage.getItem('hasShownSplash');
      
      if (hasShownSplash) {
        setShowSplash(false);
      }
      
      // Mark app as ready and hide native splash
      setAppReady(true);
      
      // Hide the native splash screen once React app is ready
      hideSplashScreen();
    } catch (error) {
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasShownSplash', 'true');
    setShowSplash(false);
  };


  if (!appReady) {
    return null; // Prevent flash of content
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} isLoading={false} />;
  }


  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SwipeBackProvider>
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
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfileWithSwipe />
                </ProtectedRoute>
              } />
              <Route path="/user/:userId" element={
                <ProtectedRoute>
                  <UserProfileWithSwipe />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminWithSwipe />
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute>
                  <MessagesWithSwipe />
                </ProtectedRoute>
              } />
              <Route path="/friends" element={
                <ProtectedRoute>
                  <FriendsWithSwipe />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SwipeBackProvider>
      </AuthProvider>
    </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
