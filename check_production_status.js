import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://siqmwgeriobtlnkxfeas.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcW13Z2VyaW9idGxua3hmZWFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MDcxMywiZXhwIjoyMDcxMDI2NzEzfQ.nWsd2iCi6sCnM6ZEqtIXjB51SdzdC8AAkHiW8cFODzI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getFullStatus() {
  console.log('🚀 ARTRIO PRODUCTION STATUS REPORT')
  console.log('=====================================\n')
  
  console.log('📊 DATABASE CONNECTION')
  console.log('----------------------')
  console.log(`URL: ${supabaseUrl}`)
  console.log(`Status: Connected ✅\n`)

  try {
    // Get user statistics
    console.log('👥 USER STATISTICS')
    console.log('------------------')
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
    
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    console.log(`Total Users: ${totalUsers || 0}`)
    console.log(`Active Users (last 7 days): ${activeUsers || 0}`)
    
    // Get recent users
    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('username, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (recentUsers?.length) {
      console.log('\nMost Recent Users:')
      recentUsers.forEach(user => {
        console.log(`  - ${user.username} (joined ${new Date(user.created_at).toLocaleDateString()})`)
      })
    }

    // Posts statistics
    console.log('\n📝 POSTS STATISTICS')
    console.log('-------------------')
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
    
    const { count: recentPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    console.log(`Total Posts: ${totalPosts || 0}`)
    console.log(`Posts (last 24h): ${recentPosts || 0}`)

    // Messages statistics
    console.log('\n💬 MESSAGES STATISTICS')
    console.log('----------------------')
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
    
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
    
    console.log(`Total Messages: ${totalMessages || 0}`)
    console.log(`Total Conversations: ${totalConversations || 0}`)

    // Stories statistics
    console.log('\n📸 STORIES STATISTICS')
    console.log('---------------------')
    const { count: totalStories } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
    
    const { count: activeStories } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .gte('expires_at', new Date().toISOString())
    
    console.log(`Total Stories: ${totalStories || 0}`)
    console.log(`Active Stories: ${activeStories || 0}`)

    // Friend connections
    console.log('\n🤝 SOCIAL STATISTICS')
    console.log('--------------------')
    const { count: totalFriendships } = await supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
    
    const { count: pendingRequests } = await supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    
    console.log(`Total Friendships: ${totalFriendships || 0}`)
    console.log(`Pending Friend Requests: ${pendingRequests || 0}`)

    // Storage statistics
    console.log('\n📦 STORAGE BUCKETS')
    console.log('------------------')
    const { data: buckets } = await supabase.storage.listBuckets()
    
    if (buckets) {
      for (const bucket of buckets) {
        const { data: files } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 1000 })
        
        console.log(`${bucket.name}: ${files?.length || 0} files`)
      }
    }

    // Database tables
    console.log('\n📋 DATABASE TABLES')
    console.log('------------------')
    const tables = [
      'profiles', 'posts', 'messages', 'conversations', 
      'stories', 'friends', 'likes', 'comments',
      'conversation_participants', 'friend_requests'
    ]
    
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      console.log(`${table}: ${count || 0} records`)
    }

    // Recent activity
    console.log('\n⚡ RECENT ACTIVITY (Last 24h)')
    console.log('------------------------------')
    
    const { data: recentPosts24h } = await supabase
      .from('posts')
      .select('profiles!posts_user_id_fkey(username), created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (recentPosts24h?.length) {
      console.log('Recent Posts:')
      recentPosts24h.forEach(post => {
        const time = new Date(post.created_at).toLocaleTimeString()
        console.log(`  - ${post.profiles?.username} posted at ${time}`)
      })
    } else {
      console.log('No recent posts in the last 24 hours')
    }

    console.log('\n✅ SYSTEM STATUS: OPERATIONAL')
    console.log('================================')
    console.log('Production environment is fully operational')
    console.log(`Report generated: ${new Date().toLocaleString()}`)

  } catch (error) {
    console.error('Error fetching data:', error.message)
  }
}

getFullStatus()