# Claude 3: Integration & Quality Assurance

## Working Directory
`/Users/tyler/Library/CloudStorage/Dropbox/artrio-claude3`

## Primary Task: Integration Testing & Quality Assurance

### Core Responsibilities:

#### 1. Integration Testing
- [ ] Test dummy accounts from Claude 1:
  - Login flow for all 10 accounts
  - Profile creation and editing
  - Password reset functionality
  - Session management
- [ ] Verify TestFlight build from Claude 2:
  - Build compiles without errors
  - All required assets are included
  - Proper versioning is applied
  - Beta testing groups are configured

#### 2. End-to-End Testing
Create comprehensive test scenarios:
- [ ] User registration flow
- [ ] Login/logout cycles
- [ ] Profile management
- [ ] Core app features with dummy accounts
- [ ] Push notification testing
- [ ] Offline mode handling
- [ ] Data sync verification

#### 3. Performance Testing
- [ ] App launch time (<3 seconds)
- [ ] Screen transition smoothness
- [ ] Memory usage monitoring
- [ ] Network request optimization
- [ ] Battery usage assessment

#### 4. Bug Tracking
Create a BUG_TRACKER.md with:
- Bug ID
- Severity (Critical/High/Medium/Low)
- Steps to reproduce
- Expected vs Actual behavior
- Affected accounts (if applicable)
- Status (Open/In Progress/Fixed/Verified)

#### 5. Test Automation
- [ ] Create basic UI tests for critical paths
- [ ] Set up unit tests for core functions
- [ ] Configure CI/CD test runs

### Coordination Tasks:
- Review Claude 1's dummy accounts implementation
- Validate Claude 2's TestFlight configuration
- Create integration test suite combining both deliverables
- Report blocking issues immediately

### Quality Metrics to Track:
- Test coverage percentage
- Number of bugs by severity
- Time to first meaningful paint
- API response times
- Crash-free sessions rate

### Deliverables:
- [ ] TEST_RESULTS.md with all test outcomes
- [ ] BUG_TRACKER.md with discovered issues
- [ ] PERFORMANCE_REPORT.md with metrics
- [ ] Automated test suite
- [ ] Final QA sign-off document

### Beta Release Criteria:
Before approving beta release, ensure:
- Zero critical bugs
- <5 high-priority bugs
- All dummy accounts functional
- TestFlight build passes all smoke tests
- Performance metrics meet standards

Commit all changes to your branch `claude3` and push regularly.

---

## 🎮 NEW PRIORITY TASK: Gamification Testing & Analytics

### Test & Monitor Engagement Features

Ensure the gamification features work flawlessly and track their impact:

#### 1. Streak Logic Testing
Critical test cases:
- **Timezone Transitions**: User posts at 11:59 PM and 12:01 AM
- **Grace Period**: Test 2-hour buffer after midnight
- **Freeze Tokens**: Verify 1/week allocation and usage
- **Edge Cases**: 
  - Daylight savings time changes
  - User changes timezone
  - Multiple posts in same day
  - Server downtime scenarios

#### 2. Point System & Privacy Validation
Test all scoring scenarios:
- Verify +10 for sending invite
- Verify +50 for accepted invite
- Verify +100 for friend joining Trio
- Test daily bonus cap (max 1/day)
- Validate milestone bonuses trigger correctly
- Test concurrent point updates

CRITICAL PRIVACY TESTS:
- **Points MUST be private**: User A cannot see User B's points
- **Streaks MUST be public**: User A CAN see User B's streak
- Test that /api/users/:id/sharing-score returns 403 if not own profile
- Test that /api/users/:id/streak returns data for any user
- Verify points don't leak in API responses or UI

#### 3. Performance Testing
Monitor impact of gamification:
- Database query performance with scoring tables
- Real-time update latency for scores
- Notification delivery speed
- Memory usage with streak tracking
- API response times under load

#### 4. Analytics Dashboard
Create monitoring for:
- **Engagement Metrics**:
  - Daily Active Users (DAU)
  - Average session length
  - Posts per user per day
  - Streak retention rates
- **Viral Metrics**:
  - Invites sent per user
  - Invite acceptance rate
  - K-factor (viral coefficient)
- **Feature Adoption**:
  - % users with active streaks
  - % users who've earned badges
  - Personal stats page views

#### 5. A/B Testing Framework
Set up tests for:
- Different point values
- Notification timing
- Badge designs
- Streak reminder copy
- Celebration animations

#### 6. Bug Scenarios to Test
- User deletes post (streak impact?)
- Invite link expires (points awarded?)
- User blocks sender (points reversed?)
- Account deletion (personal scores removed?)
- Network failure during point award

#### 7. User Flow Testing
Complete journeys:
- New user → First share → First points (visible only to them)
- Streak start → 7 days → Badge unlock (streak visible to all)
- Invite friend → Friend joins → Both get points (private)
- Lose streak → Use freeze → Maintain streak
- View own profile → See both points and streak
- View friend's profile → See ONLY their streak, NOT their points

See GAMIFICATION_FEATURES.md for specifications.

**Priority**: These features will make or break user retention - they MUST be bulletproof!