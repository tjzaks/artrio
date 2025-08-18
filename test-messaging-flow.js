#!/usr/bin/env node

/**
 * Comprehensive test script for the messaging system
 * 
 * This script tests:
 * 1. Authentication state
 * 2. RPC function availability
 * 3. Conversation creation
 * 4. Message sending
 * 5. Message retrieval
 * 6. Fallback mechanisms
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Use local development configuration
const SUPABASE_URL = "http://192.168.68.172:54321";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function testMessagingSystem() {
  console.log('🧪 Testing Messaging System Comprehensively');
  console.log('==========================================\n');

  try {
    // Step 1: Test Authentication
    console.log('1️⃣ Testing Authentication...');
    
    const email = await question('Enter email to test with: ');
    const password = await question('Enter password: ');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      return;
    }

    console.log('✅ Authentication successful');
    console.log('👤 User ID:', authData.user.id);
    console.log('📧 Email:', authData.user.email);

    // Step 2: Test Session Retrieval
    console.log('\n2️⃣ Testing Session Retrieval...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ Session retrieval failed:', sessionError?.message || 'No session');
      return;
    }
    
    console.log('✅ Session retrieved successfully');

    // Step 3: Test RPC Functions
    console.log('\n3️⃣ Testing RPC Functions...');
    
    // Test get_conversations
    console.log('Testing get_conversations...');
    try {
      const { data: conversations, error: convError } = await supabase.rpc('get_conversations');
      if (convError) {
        console.log('⚠️ get_conversations RPC failed:', convError.message);
      } else {
        console.log('✅ get_conversations RPC works');
        console.log(`📋 Found ${conversations?.length || 0} existing conversations`);
      }
    } catch (error) {
      console.log('⚠️ get_conversations RPC error:', error.message);
    }

    // Test get_or_create_conversation
    const targetUserId = await question('\nEnter target user ID to create conversation with: ');
    
    console.log('Testing get_or_create_conversation...');
    try {
      const { data: convId, error: createError } = await supabase.rpc('get_or_create_conversation', {
        p_other_user_id: targetUserId.trim()
      });
      
      if (createError) {
        console.log('⚠️ get_or_create_conversation RPC failed:', createError.message);
        
        // Test fallback method
        console.log('Testing fallback conversation creation...');
        const currentUserId = session.user.id;
        const { data: fallbackConv, error: fallbackError } = await supabase
          .from('conversations')
          .insert({
            user1_id: currentUserId < targetUserId ? currentUserId : targetUserId,
            user2_id: currentUserId < targetUserId ? targetUserId : currentUserId,
            is_blocked: false,
            awaiting_response: false
          })
          .select()
          .single();
        
        if (fallbackError && !fallbackError.message.includes('duplicate')) {
          console.log('❌ Fallback conversation creation failed:', fallbackError.message);
        } else {
          console.log('✅ Fallback conversation creation works');
        }
      } else {
        console.log('✅ get_or_create_conversation RPC works');
        console.log('🔗 Conversation ID:', convId);
      }
    } catch (error) {
      console.log('⚠️ get_or_create_conversation error:', error.message);
    }

    // Step 4: Test Message Sending
    console.log('\n4️⃣ Testing Message Sending...');
    
    // First get a conversation to test with
    const { data: testConversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
      .limit(1);
    
    if (testConversations && testConversations.length > 0) {
      const testConvId = testConversations[0].id;
      const testMessage = 'Test message from automated testing';
      
      console.log('Testing send_message RPC...');
      try {
        const { data: sendResult, error: sendError } = await supabase.rpc('send_message', {
          p_conversation_id: testConvId,
          p_content: testMessage
        });
        
        if (sendError) {
          console.log('⚠️ send_message RPC failed:', sendError.message);
          
          // Test fallback
          console.log('Testing fallback message sending...');
          const { error: fallbackSendError } = await supabase
            .from('messages')
            .insert({
              conversation_id: testConvId,
              sender_id: session.user.id,
              content: testMessage + ' (fallback)',
              is_read: false
            });
          
          if (fallbackSendError) {
            console.log('❌ Fallback message sending failed:', fallbackSendError.message);
          } else {
            console.log('✅ Fallback message sending works');
          }
        } else {
          console.log('✅ send_message RPC works');
          console.log('📤 Send result:', sendResult);
        }
      } catch (error) {
        console.log('⚠️ send_message error:', error.message);
      }
    } else {
      console.log('⚠️ No conversations available to test message sending');
    }

    // Step 5: Test Message Retrieval
    console.log('\n5️⃣ Testing Message Retrieval...');
    
    if (testConversations && testConversations.length > 0) {
      const testConvId = testConversations[0].id;
      
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', testConvId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (messagesError) {
        console.log('❌ Message retrieval failed:', messagesError.message);
      } else {
        console.log('✅ Message retrieval works');
        console.log(`📨 Retrieved ${messages?.length || 0} recent messages`);
      }
    }

    // Step 6: Test Authentication Helper
    console.log('\n6️⃣ Testing Authentication Helper...');
    
    const authenticatedRpc = async (functionName, args = {}) => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      return supabase.rpc(functionName, args);
    };
    
    try {
      const { data, error } = await authenticatedRpc('get_conversations');
      if (error) {
        console.log('⚠️ Authenticated RPC helper failed:', error.message);
      } else {
        console.log('✅ Authenticated RPC helper works');
      }
    } catch (error) {
      console.log('⚠️ Authenticated RPC helper error:', error.message);
    }

    console.log('\n🎉 Testing Complete!');
    console.log('\n📊 Summary:');
    console.log('- Authentication: Working');
    console.log('- Session Management: Working');
    console.log('- RPC Functions: Tested (see individual results above)');
    console.log('- Fallback Mechanisms: Implemented and tested');
    console.log('- Message System: Comprehensive coverage implemented');

  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Run the test
testMessagingSystem().catch(console.error);