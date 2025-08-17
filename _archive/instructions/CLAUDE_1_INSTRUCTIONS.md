# Claude 1: Dummy Account Creation

## Working Directory
`/Users/tyler/Library/CloudStorage/Dropbox/artrio-claude1`

## Primary Task: Create 10 Dummy High School Student Accounts

### Account Requirements
Create 10 realistic high school student accounts with the following:

**5 Male Students:**
1. Jake Thompson - Senior, Basketball player
2. Ethan Rodriguez - Junior, Drama club
3. Mason Chen - Sophomore, Chess club
4. Tyler Brooks - Senior, Student council
5. Dylan Martinez - Junior, Band (drums)

**5 Female Students:**
1. Emma Johnson - Senior, Volleyball captain
2. Sophia Williams - Junior, Debate team
3. Olivia Davis - Sophomore, Art club
4. Isabella Garcia - Senior, Yearbook editor
5. Ava Mitchell - Junior, Track and field

### For Each Account Create:
- Realistic profile with:
  - Age (14-18)
  - Grade level
  - Interests/activities
  - Bio (2-3 sentences)
  - Profile picture placeholder description
- Email format: firstname.lastname.artrio@test.com
- Password: ArtrioTest2025!
- Username: firstname_lastname_grade (e.g., jake_thompson_12)

### Implementation Steps:
1. Create a `dummy_accounts.json` file with all account data
2. Create a seed script to populate Supabase
3. Ensure accounts work with authentication flow
4. Test login for each account
5. Document any issues or blockers

### Deliverables:
- [ ] dummy_accounts.json with all 10 accounts
- [ ] seed_accounts.js script
- [ ] Test results document
- [ ] Any database migration files needed

Commit all changes to your branch `claude1` and push regularly.

---

## 🎮 NEW PRIORITY TASK: Gamification Backend

### Implement Sharing Score & Streak System Backend

You need to create the backend infrastructure for engagement features:

#### 1. Database Schema
Create migrations for:
- `sharing_scores` table (track user sharing points)
- `sharing_events` table (log all sharing activities)
- `user_streaks` table (track daily posting streaks)
- `streak_milestones` table (achievement tracking)

#### 2. Point Calculation System
Implement logic for:
- Award points for sending invites (+10)
- Award points for accepted invites (+50)
- Award points when friends join Trios (+100)
- Daily share bonus (+5, max 1/day)
- Milestone bonuses (5, 10, 25, 50 invites)

#### 3. Streak Tracking Logic
Build system to:
- Track daily posts in Trios
- Calculate current streak
- Handle timezone considerations
- Implement freeze tokens (1/week)
- Grace period (2 hours after midnight)

#### 4. API Endpoints
Create endpoints for:
- GET /api/users/:id/sharing-score (PRIVATE - only accessible by the user themselves)
- GET /api/users/:id/streak (PUBLIC - anyone can see anyone's streak)
- POST /api/sharing-events
- GET /api/users/me/stats (personal stats - points visible only to self)
- GET /api/users/:id/public-profile (returns streak but NOT points)
- PUT /api/streaks/freeze
- NO PUBLIC LEADERBOARD ENDPOINTS

#### 5. Background Jobs
Set up:
- Daily streak checker (cron job)
- Personal milestone tracker
- Notification triggers for streak warnings

See GAMIFICATION_FEATURES.md for full specifications.

**Priority**: This is HIGH PRIORITY - users need reasons to engage daily!