// QUICK FIX FOR ADMIN BUTTONS
// This script adds click handlers to the admin dashboard buttons

// Run this in the browser console when on the admin page
// OR add to your frontend code

const fixAdminButtons = () => {
  console.log('🔧 Fixing admin buttons...');
  
  // Get Supabase client from window (should be available in app)
  const supabase = window.supabase || window.sb;
  
  if (!supabase) {
    console.error('Supabase client not found! Try this instead:');
    console.log(`
// Paste this in console:
import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2').then(({createClient}) => {
  window.supabase = createClient(
    'https://nqwijkvpzyadpsegvgbm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2lqa3ZwenlhZHBzZWd2Z2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODc3NjcsImV4cCI6MjA3MDk2Mzc2N30.4KWvBXCJtV8uxKvI5JXiMAvhrl-8tTZvZ3IIrmZDvqA'
  );
  console.log('Supabase ready!');
});
    `);
    return;
  }

  // Helper function to call Supabase functions
  const callFunction = async (functionName) => {
    try {
      console.log(`Calling ${functionName}...`);
      const { data, error } = await supabase.rpc(functionName);
      
      if (error) throw error;
      
      console.log(`✅ ${functionName} success:`, data);
      alert(`Success! ${JSON.stringify(data)}`);
      
      // Reload page to see changes
      if (functionName.includes('trio')) {
        setTimeout(() => window.location.reload(), 1000);
      }
      
      return data;
    } catch (error) {
      console.error(`❌ ${functionName} failed:`, error);
      alert(`Error: ${error.message}`);
    }
  };

  // Find buttons and add handlers
  const attachHandlers = () => {
    // Find buttons by their text content
    const buttons = Array.from(document.querySelectorAll('button'));
    
    buttons.forEach(btn => {
      const text = btn.textContent.toLowerCase();
      
      if (text.includes('randomize') && text.includes('trio')) {
        console.log('Found Randomize Trios button');
        btn.onclick = () => callFunction('randomize_trios');
        btn.style.cursor = 'pointer';
      }
      
      if (text.includes('delete') && text.includes('trio')) {
        console.log('Found Delete Trios button');
        btn.onclick = () => {
          if (confirm('Delete all of today\\'s trios?')) {
            callFunction('delete_todays_trios');
          }
        };
        btn.style.cursor = 'pointer';
      }
      
      if (text.includes('cleanup') || text.includes('clean')) {
        console.log('Found Cleanup button');
        btn.onclick = () => callFunction('cleanup_expired_content');
        btn.style.cursor = 'pointer';
      }
      
      if (text.includes('refresh') && text.includes('profile')) {
        console.log('Found Refresh Profiles button');
        btn.onclick = () => callFunction('refresh_profiles');
        btn.style.cursor = 'pointer';
      }
    });
  };

  // Try to attach handlers
  attachHandlers();
  
  // Also try with a delay in case page is still loading
  setTimeout(attachHandlers, 1000);
  setTimeout(attachHandlers, 2000);
  
  console.log('✅ Admin buttons should now work!');
};

// Auto-run if on admin page
if (window.location.pathname.includes('admin')) {
  fixAdminButtons();
}

// Export for manual use
window.fixAdminButtons = fixAdminButtons;