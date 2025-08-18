// Quick diagnostic and fix for Artrio error issues
// Run this in browser console to debug current state

console.log('=== ARTRIO ERROR DIAGNOSTICS ===');

// 1. Check stored errors
console.log('1. Checking stored errors...');
const storedErrors = JSON.parse(localStorage.getItem('artrio_errors') || '[]');
if (storedErrors.length > 0) {
  console.error(`Found ${storedErrors.length} stored errors:`, storedErrors);
  storedErrors.forEach((error, i) => {
    console.error(`Error ${i + 1}:`, error);
  });
} else {
  console.log('✅ No stored errors found');
}

// 2. Check auth state
console.log('2. Checking auth state...');
const authUser = localStorage.getItem('artrio-auth-user');
const authSession = localStorage.getItem('artrio-auth-session');
const isAdmin = localStorage.getItem('artrio-is-admin');

console.log('Auth User:', authUser ? 'Stored' : 'None');
console.log('Auth Session:', authSession ? 'Stored' : 'None'); 
console.log('Is Admin:', isAdmin);

// 3. Check for any React error boundary triggers
console.log('3. Checking React state...');
const rootElement = document.getElementById('root');
if (rootElement) {
  const hasErrorBoundary = rootElement.textContent?.includes('Something went wrong');
  console.log('Error Boundary Active:', hasErrorBoundary);
} else {
  console.error('❌ Root element not found');
}

// 4. Test Supabase connection
console.log('4. Testing Supabase connection...');
if (window.supabase) {
  window.supabase.from('profiles').select('count').limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Supabase Error:', error);
      } else {
        console.log('✅ Supabase connection working');
      }
    })
    .catch(err => {
      console.error('❌ Supabase Connection Failed:', err);
    });
} else {
  console.error('❌ Supabase client not found');
}

// 5. Clear all problematic state (NUCLEAR OPTION)
function resetAppState() {
  console.log('🔄 Resetting app state...');
  localStorage.removeItem('artrio_errors');
  localStorage.removeItem('artrio-auth-user');
  localStorage.removeItem('artrio-auth-session');
  localStorage.removeItem('artrio-is-admin');
  console.log('✅ State cleared. Reloading...');
  window.location.reload();
}

// Expose reset function globally
window.resetArtrioState = resetAppState;

console.log('=== DIAGNOSTICS COMPLETE ===');
console.log('If you\'re still seeing errors, run: resetArtrioState()');