# URGENT: Fix Admin System Controls - Claude 2 Frontend

## Your Task: Fix the Frontend Button Handlers

The admin dashboard has 4 broken system control buttons. You need to wire them up to call the backend APIs.

## Current Broken Buttons:
1. **Randomize Trios** - Purple button
2. **Cleanup Content** - Button on right
3. **Refresh Profiles** - Button in middle
4. **Delete Today's Trios** - Red button

## What You Need to Fix:

### Find the Admin Dashboard Component
Look for files like:
- `AdminDashboard.tsx` or `AdminDashboard.jsx`
- `SystemControls.tsx` or similar
- Search for "Randomize Trios" text in the codebase

### Add Click Handlers for Each Button:

```typescript
// Randomize Trios Handler
const handleRandomizeTrios = async () => {
  try {
    setLoading(true);
    const response = await fetch('/api/admin/randomize-trios', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to randomize trios');
    
    const data = await response.json();
    toast.success(`Created ${data.trios_created} new trios!`);
    
    // Refresh the page or update state
    window.location.reload();
  } catch (error) {
    toast.error('Failed to trigger trio randomization');
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// Cleanup Content Handler
const handleCleanupContent = async () => {
  try {
    setLoading(true);
    const response = await fetch('/api/admin/cleanup-content', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to cleanup content');
    
    const data = await response.json();
    toast.success(`Cleaned ${data.cleaned} expired items`);
  } catch (error) {
    toast.error('Failed to cleanup content');
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// Refresh Profiles Handler
const handleRefreshProfiles = async () => {
  try {
    setLoading(true);
    const response = await fetch('/api/admin/refresh-profiles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to refresh profiles');
    
    const data = await response.json();
    toast.success(`Updated ${data.profiles_updated} profiles`);
  } catch (error) {
    toast.error('Failed to refresh profiles');
    console.error(error);
  } finally {
    setLoading(false);
  }
};

// Delete Today's Trios Handler
const handleDeleteTodaysTrios = async () => {
  if (!confirm('Are you sure you want to delete all of today\'s trios?')) {
    return;
  }
  
  try {
    setLoading(true);
    const response = await fetch('/api/admin/delete-todays-trios', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to delete trios');
    
    const data = await response.json();
    toast.success(`Deleted ${data.trios_deleted} trios`);
    
    // Refresh the page
    window.location.reload();
  } catch (error) {
    toast.error('Failed to delete today\'s trios');
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

### Update the Button Components:

```tsx
<button 
  onClick={handleRandomizeTrios}
  disabled={loading}
  className="purple-button"
>
  {loading ? 'Processing...' : 'Randomize Trios'}
</button>

<button 
  onClick={handleCleanupContent}
  disabled={loading}
>
  Cleanup Content
</button>

<button 
  onClick={handleRefreshProfiles}
  disabled={loading}
>
  Refresh Profiles
</button>

<button 
  onClick={handleDeleteTodaysTrios}
  disabled={loading}
  className="red-danger-button"
>
  Delete Today's Trios
</button>
```

### Add Loading States:
- Show spinner or disable buttons while processing
- Display success/error toast notifications
- Update the UI after successful operations

### Error Handling:
- Catch network errors
- Display user-friendly error messages
- Log errors to console for debugging
- Handle 401/403 authorization errors

## API Endpoints Claude 1 is Creating:
- `POST /api/admin/randomize-trios`
- `POST /api/admin/cleanup-content`
- `POST /api/admin/refresh-profiles`
- `POST /api/admin/delete-todays-trios`

## Success Criteria:
- [ ] All 4 buttons have click handlers
- [ ] Loading states implemented
- [ ] Error handling with toasts
- [ ] Confirmation dialog for delete operation
- [ ] Page refreshes after trio changes
- [ ] Proper authorization headers sent

## Your Working Directory:
`/Users/tyler/Library/CloudStorage/Dropbox/artrio-claude2`

Commit all changes to branch `claude2` with message: "Fix admin system control button handlers"

## Coordinate with Claude 1:
Claude 1 is building the backend endpoints. Make sure your API calls match their implementation!