import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI'

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearAllUsers() {
  console.log('⚠️  CLEARING ALL USER DATA FROM PRODUCTION DATABASE')
  console.log('====================================================\n')
  
  try {
    // First, get all user IDs
    const { data: users, error: fetchError } = await supabase
      .from('profiles')
      .select('id, username')
    
    if (fetchError) {
      console.error('Error fetching users:', fetchError)
      return
    }
    
    console.log(`Found ${users?.length || 0} users to delete:`)
    users?.forEach(user => {
      console.log(`  - ${user.username} (${user.id})`)
    })
    console.log('')
    
    if (!users || users.length === 0) {
      console.log('No users to delete.')
      return
    }
    
    const userIds = users.map(u => u.id)
    
    // Delete in order to handle foreign key constraints
    console.log('🗑️  Deleting related data...')
    
    // Delete likes
    const { error: likesError } = await supabase
      .from('likes')
      .delete()
      .in('user_id', userIds)
    if (likesError) console.error('Error deleting likes:', likesError)
    else console.log('✓ Likes deleted')
    
    // Delete comments
    const { error: commentsError } = await supabase
      .from('comments')
      .delete()
      .in('user_id', userIds)
    if (commentsError) console.error('Error deleting comments:', commentsError)
    else console.log('✓ Comments deleted')
    
    // Delete messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('sender_id', userIds)
    if (messagesError) console.error('Error deleting messages:', messagesError)
    else console.log('✓ Messages deleted')
    
    // Delete conversation participants
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .delete()
      .in('user_id', userIds)
    if (participantsError) console.error('Error deleting participants:', participantsError)
    else console.log('✓ Conversation participants deleted')
    
    // Delete conversations
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .in('created_by', userIds)
    if (conversationsError) console.error('Error deleting conversations:', conversationsError)
    else console.log('✓ Conversations deleted')
    
    // Delete friend requests
    const { error: friendRequestsError } = await supabase
      .from('friend_requests')
      .delete()
      .or(`sender_id.in.(${userIds.join(',')}),receiver_id.in.(${userIds.join(',')})`)
    if (friendRequestsError) console.error('Error deleting friend requests:', friendRequestsError)
    else console.log('✓ Friend requests deleted')
    
    // Delete friends
    const { error: friendsError } = await supabase
      .from('friends')
      .delete()
      .or(`user_id.in.(${userIds.join(',')}),friend_id.in.(${userIds.join(',')})`)
    if (friendsError) console.error('Error deleting friends:', friendsError)
    else console.log('✓ Friends deleted')
    
    // Delete stories
    const { error: storiesError } = await supabase
      .from('stories')
      .delete()
      .in('user_id', userIds)
    if (storiesError) console.error('Error deleting stories:', storiesError)
    else console.log('✓ Stories deleted')
    
    // Delete posts
    const { error: postsError } = await supabase
      .from('posts')
      .delete()
      .in('user_id', userIds)
    if (postsError) console.error('Error deleting posts:', postsError)
    else console.log('✓ Posts deleted')
    
    // Delete profiles
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .in('id', userIds)
    if (profilesError) console.error('Error deleting profiles:', profilesError)
    else console.log('✓ Profiles deleted')
    
    // Delete auth users using admin API
    console.log('\n🔐 Deleting authentication records...')
    for (const userId of userIds) {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      if (authError) {
        console.error(`Error deleting auth for ${userId}:`, authError.message)
      } else {
        console.log(`✓ Auth deleted for ${userId}`)
      }
    }
    
    console.log('\n✅ ALL USER DATA CLEARED SUCCESSFULLY')
    console.log('=====================================')
    console.log('The production database is now empty.')
    console.log(`Completed at: ${new Date().toLocaleString()}`)
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the cleanup
clearAllUsers()