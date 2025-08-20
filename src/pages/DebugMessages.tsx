import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DebugMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      runComprehensiveDebug();
    }
  }, [user]);

  const runComprehensiveDebug = async () => {
    if (!user) return;
    
    setLoading(true);
    const debug: any = {
      timestamp: new Date().toISOString(),
      authUser: user.id,
      issues: [],
      recommendations: []
    };

    try {
      // Step 1: Check user profile
      console.log('=== STEP 1: Checking user profile ===');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        debug.issues.push('No profile found for user');
        debug.profileError = profileError;
      } else {
        debug.profile = profile;
        console.log('Profile:', profile);
      }

      // Step 2: Get all conversations
      console.log('=== STEP 2: Getting conversations ===');
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (convError) {
        debug.issues.push('Error fetching conversations');
        debug.convError = convError;
      } else {
        debug.conversations = conversations;
        debug.conversationCount = conversations?.length || 0;
        console.log(`Found ${conversations?.length} conversations`);
      }

      // Step 3: Check unread messages using auth.uid()
      console.log('=== STEP 3: Checking unread with auth.uid() ===');
      if (conversations && conversations.length > 0) {
        const convIds = conversations.map(c => c.id);
        
        // Query exactly as Home.tsx does
        const { data: unreadMessages, count: unreadCount, error: unreadError } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, is_read, content, created_at', { count: 'exact' })
          .in('conversation_id', convIds)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        debug.unreadQuery = {
          conversationIds: convIds,
          userId: user.id,
          count: unreadCount,
          messages: unreadMessages
        };

        if (unreadError) {
          debug.issues.push('Error fetching unread messages');
          debug.unreadError = unreadError;
        } else {
          console.log(`Found ${unreadCount} unread messages`);
          debug.unreadCount = unreadCount;
          debug.unreadMessages = unreadMessages;
          
          // Group by conversation
          if (unreadMessages && unreadMessages.length > 0) {
            const byConversation: any = {};
            unreadMessages.forEach((msg: any) => {
              if (!byConversation[msg.conversation_id]) {
                byConversation[msg.conversation_id] = [];
              }
              byConversation[msg.conversation_id].push(msg);
            });
            debug.unreadByConversation = byConversation;
          }
        }
      }

      // Step 4: Check if user IDs match between auth and profiles
      console.log('=== STEP 4: Checking ID consistency ===');
      if (profile) {
        debug.idCheck = {
          authId: user.id,
          profileUserId: profile.user_id,
          profileId: profile.id,
          match: user.id === profile.user_id
        };
        
        if (user.id !== profile.user_id) {
          debug.issues.push('CRITICAL: auth.uid() does not match profile.user_id');
        }
      }

      // Step 5: Check message sender IDs
      console.log('=== STEP 5: Analyzing sender IDs ===');
      if (debug.unreadMessages && debug.unreadMessages.length > 0) {
        const senderIds = [...new Set(debug.unreadMessages.map((m: any) => m.sender_id))];
        debug.uniqueSenderIds = senderIds;
        
        // Check if sender IDs are profile IDs or auth IDs
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, username')
          .in('id', senderIds);
        
        const { data: senderAuthProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, username')
          .in('user_id', senderIds);
        
        debug.senderAnalysis = {
          senderIds,
          matchingProfileIds: senderProfiles,
          matchingAuthIds: senderAuthProfiles
        };
        
        if (senderProfiles?.length === 0 && senderAuthProfiles?.length > 0) {
          debug.issues.push('CRITICAL: Messages are using auth IDs instead of profile IDs');
          debug.recommendations.push('Need to update message queries to use profile IDs');
        }
      }

      // Step 6: Test clearing messages
      console.log('=== STEP 6: Testing clear operation ===');
      if (conversations && conversations.length > 0) {
        const convIds = conversations.map(c => c.id);
        
        // Try to clear using the same query
        const { data: clearData, error: clearError, count } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('conversation_id', convIds)
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .select();
        
        debug.clearTest = {
          attempted: true,
          count: count,
          error: clearError,
          data: clearData
        };
        
        if (count === 0 && debug.unreadCount > 0) {
          debug.issues.push('CRITICAL: Clear operation found 0 messages but unread count is > 0');
          debug.recommendations.push('The sender_id comparison might be the issue');
        }
      }

      // Step 7: Check conversations table structure
      console.log('=== STEP 7: Checking conversation participants ===');
      if (conversations && conversations.length > 0) {
        const sampleConv = conversations[0];
        debug.conversationStructure = {
          sample: sampleConv,
          user1Type: typeof sampleConv.user1_id,
          user2Type: typeof sampleConv.user2_id,
          authIdType: typeof user.id
        };
        
        // Check if conversation uses auth IDs or profile IDs
        const { data: user1Profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', sampleConv.user1_id)
          .single();
        
        const { data: user1ProfileById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sampleConv.user1_id)
          .single();
        
        debug.conversationUserCheck = {
          user1_id: sampleConv.user1_id,
          matchesAuthId: !!user1Profile,
          matchesProfileId: !!user1ProfileById
        };
        
        if (user1ProfileById && !user1Profile) {
          debug.issues.push('CRITICAL: Conversations table uses profile IDs, not auth IDs');
          debug.recommendations.push('Need to update all queries to use profile.id instead of auth.uid()');
        }
      }

    } catch (error) {
      debug.error = error;
      debug.issues.push('Unexpected error during debug');
    }

    setDebugInfo(debug);
    setLoading(false);
    console.log('=== COMPLETE DEBUG INFO ===', debug);
  };

  const fixUnreadMessages = async () => {
    if (!user) return;
    
    console.log('=== ATTEMPTING COMPREHENSIVE FIX ===');
    
    try {
      // Get user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) {
        alert('No profile found');
        return;
      }
      
      // Try both approaches
      console.log('Approach 1: Using auth ID for conversations');
      const { data: convByAuth } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      console.log('Approach 2: Using profile ID for conversations');
      const { data: convByProfile } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`);
      
      const allConvIds = [
        ...(convByAuth?.map(c => c.id) || []),
        ...(convByProfile?.map(c => c.id) || [])
      ];
      
      const uniqueConvIds = [...new Set(allConvIds)];
      
      console.log(`Found ${uniqueConvIds.length} total conversations`);
      
      if (uniqueConvIds.length > 0) {
        // Clear using both sender ID approaches
        console.log('Clearing with auth ID as sender');
        const { count: count1 } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('conversation_id', uniqueConvIds)
          .eq('is_read', false)
          .neq('sender_id', user.id)
          .select();
        
        console.log('Clearing with profile ID as sender');
        const { count: count2 } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('conversation_id', uniqueConvIds)
          .eq('is_read', false)
          .neq('sender_id', profile.id)
          .select();
        
        console.log(`Cleared ${count1} messages using auth ID, ${count2} using profile ID`);
        
        alert(`Fixed! Cleared ${(count1 || 0) + (count2 || 0)} messages total`);
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Fix error:', error);
      alert('Error fixing messages');
    }
  };

  if (loading) {
    return <div className="p-8">Running comprehensive debug...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Message Debug Panel</h1>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={runComprehensiveDebug} variant="outline">
                Re-run Debug
              </Button>
              <Button onClick={fixUnreadMessages} variant="default" className="ml-2">
                Apply Comprehensive Fix
              </Button>
            </CardContent>
          </Card>

          {debugInfo.issues && debugInfo.issues.length > 0 && (
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="text-red-500">Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                  {debugInfo.issues.map((issue: string, i: number) => (
                    <li key={i} className="text-red-600">{issue}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {debugInfo.recommendations && debugInfo.recommendations.length > 0 && (
            <Card className="border-yellow-500">
              <CardHeader>
                <CardTitle className="text-yellow-500">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                  {debugInfo.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="text-yellow-600">{rec}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Complete Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto bg-muted p-4 rounded">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}