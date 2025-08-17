# Artrio Gamification Features - Implementation Guide

## 🎯 Overview
Add engagement mechanics to make users WANT to use Artrio daily through sharing scores and streak systems.

---

## 📊 Feature 1: Sharing Score System

### Concept
Users earn points for growing the Artrio community through invites and shares.

### Point System
- **Send Invite**: +10 points
- **Invite Accepted**: +50 points  
- **Friend Joins Your Trio**: +100 points
- **Daily Share Bonus**: +5 points (max 1/day)
- **Milestone Shares** (cumulative):
  - 5 invites sent: +25 bonus
  - 10 invites sent: +50 bonus
  - 25 invites sent: +100 bonus
  - 50 invites sent: +250 bonus

### Leaderboard Categories
- **Weekly Top Sharers** - Resets every Sunday
- **Monthly Ambassadors** - Top 10 sharers/month
- **All-Time Leaders** - Hall of fame

### Visual Elements
- Share score badge on profile
- Animation when earning points
- Progress bar to next milestone
- Confetti effect at milestones

### Database Schema
```sql
-- sharing_scores table
user_id (FK)
total_score (integer)
weekly_score (integer) 
monthly_score (integer)
invites_sent (integer)
invites_accepted (integer)
last_share_date (timestamp)
created_at (timestamp)
updated_at (timestamp)

-- sharing_events table
id (PK)
user_id (FK)
event_type (enum: 'invite_sent', 'invite_accepted', 'friend_joined_trio', 'daily_share')
points_earned (integer)
recipient_id (FK, nullable)
created_at (timestamp)
```

---

## 🔥 Feature 2: Streak System

### Concept
Encourage daily engagement by rewarding consistent posting in Trios.

### Streak Rules
- **Start Streak**: Post in any Trio = Day 1
- **Maintain Streak**: Post at least once within 24 hours
- **Streak Window**: Midnight to midnight (user's timezone)
- **Grace Period**: 2-hour buffer after midnight
- **Freeze Tokens**: Earn 1 freeze/week (skip a day without losing streak)

### Streak Rewards
- **3-day streak**: 🔥 Fire emoji appears
- **7-day streak**: 🔥🔥 Double fire + profile badge
- **14-day streak**: 🔥🔥🔥 Triple fire + "Dedicated" title
- **30-day streak**: 💎 Diamond streak + "Artrio Legend" badge
- **50-day streak**: 👑 Crown + custom profile border
- **100-day streak**: 🌟 Star status + exclusive features

### Streak Notifications
- **Morning Reminder**: "Keep your streak alive! Post in a Trio today 🔥"
- **Evening Warning**: "2 hours left to maintain your 15-day streak!"
- **Streak Saved**: "Streak maintained! You're on fire! 🔥"
- **Milestone Alert**: "Amazing! You've reached a 7-day streak!"

### Social Recognition
- Streak counter visible on profile
- Friends get notified of milestone streaks
- Trio members see streak badges in chat
- Weekly streak champions highlighted

### Database Schema
```sql
-- user_streaks table
user_id (FK)
current_streak (integer)
longest_streak (integer)
last_post_date (date)
streak_start_date (date)
freeze_tokens (integer)
total_days_active (integer)
created_at (timestamp)
updated_at (timestamp)

-- streak_milestones table
user_id (FK)
milestone_type (enum: '3_day', '7_day', '14_day', '30_day', '50_day', '100_day')
achieved_at (timestamp)
acknowledged (boolean)
```

---

## 🎮 Feature 3: Combined Engagement Score

### Overall "Artrio Score"
Combines both metrics for ultimate bragging rights:
- **Formula**: (Sharing Score × 0.4) + (Streak Days × 10) + (Trio Activity × 0.3)
- Updates in real-time
- Displayed prominently on profile

### Achievement Badges
- **Social Butterfly**: 10+ accepted invites
- **Streak Master**: 30+ day streak
- **Trio Champion**: Active in 3+ Trios
- **Rising Star**: Top 10% growth this week
- **Community Builder**: 50+ total invites sent

---

## 👥 Implementation Assignments

### Claude 1 - Backend Database & Logic
- Create database migrations for scoring tables
- Implement point calculation system
- Build streak tracking logic
- Create API endpoints for scores/streaks
- Add timezone handling for streaks

### Claude 2 - Frontend UI/UX
- Design sharing score display
- Create streak counter component
- Build leaderboard screens
- Add achievement badges
- Implement animations/celebrations
- Create notification system for streaks

### Claude 3 - Testing & Analytics
- Test point calculations
- Verify streak logic edge cases
- Test timezone transitions
- Monitor performance impact
- Create analytics dashboard
- Test social features

---

## 📱 UI/UX Priorities

### Profile Enhancement
- Prominent streak counter (top of profile)
- Sharing score with progress bar
- Achievement showcase section
- Recent activity feed

### Home Screen Widget
- Today's streak status
- Points earned today
- Quick share button
- Friend activity summary

### Notifications That Matter
- Smart timing (not spam)
- Celebration moments
- Gentle reminders
- Social validation

---

## 🚀 Success Metrics

Track these KPIs:
- Daily Active Users (DAU)
- Average session length
- Streak retention rate
- Viral coefficient (invites sent/accepted)
- User lifetime value
- Churn reduction

---

## ⚡ Quick Implementation Steps

1. **Phase 1** (MVP):
   - Basic streak counter
   - Simple point system
   - Manual share tracking

2. **Phase 2** (Enhanced):
   - Automated tracking
   - Leaderboards
   - Badges

3. **Phase 3** (Social):
   - Friend comparisons
   - Team challenges
   - Seasonal events

---

*Make Artrio addictive through positive reinforcement and social validation!*