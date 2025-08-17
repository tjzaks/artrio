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