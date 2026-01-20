# Growth App - Complete Page Structure

## 🔐 Authentication Flow

### 1. Sign In (`/sign-in`)
- **Purpose**: Initial entry point for users
- **Features**:
  - Phone number input field
  - "Continue" button sends OTP
  - Heart icon with warm welcome message
  - Privacy disclaimer
- **Navigation**: Sends to Verify screen

### 2. Verify OTP (`/verify`)
- **Purpose**: Confirm phone number with verification code
- **Features**:
  - 6-digit code input
  - "Verify" button
  - "Resend code" option
  - Shows phone number being verified
- **Navigation**: Sends to Complete Profile screen

### 3. Complete Profile (`/complete-profile`)
- **Purpose**: Capture user's full name
- **Features**:
  - Name input field
  - "Get Started" button
  - Sparkles icon with encouraging message
  - Explains name helps with recognition
- **Navigation**: Redirects to main app tabs

---

## 📱 Main App (Tab Navigation)

### 4. Home Tab (`/tabs/index`)
- **Purpose**: Dashboard showing current feedback cycle status
- **Features**:
  - Personalized greeting with user's name
  - Heart icon in header
  - **Empty State** (no active cycle):
    - "Start New Cycle" button
    - Explanation of feedback process
    - Cooldown period notice (if applicable)
  - **Active Cycle**:
    - Two stat cards: Requests Sent & Responses Received
    - Progress bar to next milestone (10/20/30/40/50)
    - "Send More Requests" action card
    - "View Your Growth" card (appears after 10+ responses)
  - Encouraging info card at bottom
- **Navigation**: Links to Feedback and Growth tabs

### 5. Feedback Tab (`/tabs/feedback`)
- **Purpose**: Manage feedback requests and view status
- **Features**:
  - Stats overview (Sent/Remaining/Responses)
  - **Send New Request Section**:
    - Phone number input
    - "Create Feedback Link" button
    - Generates unique, single-use link
    - Shows link in alert for sharing
  - **Your Requests List**:
    - Shows all sent requests
    - Displays phone number and send date
    - Status badges (Pending/Completed)
    - "Copy Link" button for pending requests
  - Privacy & safety info card
- **Limits**: Max 50 requests per cycle
- **Link Expiry**: 30 days

### 6. Growth Tab (`/tabs/growth`)
- **Purpose**: View feedback summaries and growth recommendations
- **Features**:
  - **Empty State**: Shows when less than 10 responses
  - **Strengths Card** (green theme):
    - Top 3 traits with highest scores
    - Average ratings displayed
    - Sparkles icons
  - **Growth Opportunities Card** (blue theme):
    - Areas for development
    - Constructive notes
    - Encouraging language
  - **Consistent Themes Section**:
    - Patterns across all feedback
    - Overall insights
  - **Your Progress Section**:
    - Comparison to previous summary
    - Shows changes over time
  - **Growth Recommendations**:
    - Actionable suggestions
    - Three types: Strength, Growth, Habit
    - Checkboxes to mark complete
    - Can be completed/uncompleted
  - Encouraging reminder card at bottom
- **Milestones**: New summary every 10 responses (10, 20, 30, 40, 50)

### 7. Profile Tab (`/tabs/profile`)
- **Purpose**: View account info, stats, and cycle history
- **Features**:
  - Profile header with name and phone
  - User icon
  - **About Growth Section**:
    - Explains app purpose
    - Privacy information
  - **Feedback Cycle History**:
    - All past cycles with dates
    - Status badges (Active/Completed/Cooldown)
    - Request and response counts per cycle
    - Next cycle availability date (if in cooldown)
  - **Your Stats**:
    - Total cycles completed
    - Total requests sent (all-time)
    - Total responses received (all-time)
  - "Sign Out" button
  - Encouraging footer message

---

## 🎯 Public Pages (No Auth Required)

### 8. Feedback Submission Form (`/feedback/submit?token=xxx`)
- **Purpose**: Public form for raters to submit anonymous feedback
- **Features**:
  - **Validation**:
    - Checks if token is valid
    - Verifies link hasn't expired (30 days)
    - Ensures feedback not already submitted
  - **Privacy Messaging**:
    - Reassurance that responses are anonymous
    - Explains aggregation process
  - **Feedback Form** (for each of 12 traits):
    - Trait name and description
    - 5-star rating selector (1-5 scale)
    - Optional text reflection field
  - **Traits Evaluated**:
    1. Personal Hygiene - Maintaining cleanliness, grooming, and care for one's body and environment
    2. Approachability - How open, warm, and safe others feel when interacting with them
    3. Trustworthiness - Being reliable, honest, and consistent in words and actions
    4. Friendliness - Demonstrating warmth, openness, and positive social engagement
    5. Kindness - Acting with empathy, compassion, and consideration toward others
    6. Thoughtfulness - Being intentional and considerate
    7. Gentleness - Using softness in speech, behaviour, and correction
    8. Patience - The ability to tolerate delays, mistakes, or differences without irritation
    9. Helpfulness - Willingness to offer assistance and support
    10. Listening Ability - Giving full attention to others, seeking to understand
    11. Teachability - Remaining receptive to new ideas, feedback, and perspectives
    12. Selflessness - Considering others' needs and well-being alongside one's own
  - "Submit Feedback" button
  - Thank you message after submission
  - **Auto-triggers**: Calls edge function when milestone reached (10, 20, 30, 40, 50)
- **Access**: Anyone with valid token, no login required
- **Single Use**: Link disabled after submission

---

## 🎨 Design System

### Color Palette
- **Primary**: `#FF6B6B` (Coral red - warm, encouraging)
- **Success**: `#10B981` (Green - growth, positive)
- **Info**: `#3B82F6` (Blue - calm, informational)
- **Warning**: `#F59E0B` (Amber - attention)
- **Background**: `#F9FAFB` (Light gray)
- **Text Dark**: `#111827`
- **Text Medium**: `#6B7280`
- **Text Light**: `#9CA3AF`

### Typography
- **Titles**: 32px, bold (700)
- **Section Titles**: 20px, semi-bold (600)
- **Body**: 16px, regular (400)
- **Small**: 14px, regular (400)
- **Tiny**: 12px, regular (400)

### UI Elements
- **Buttons**: Rounded (12px), 16px padding
- **Cards**: White background, 16px border radius
- **Inputs**: White background, 1px border, 12px radius
- **Icons**: Lucide React Native (consistent style)

### Emotional Design
- 💝 Heart icons for love/care
- ✨ Sparkles for growth/achievement
- 📊 Charts for progress
- 🎯 Target for goals
- 👤 User for profile
- 📨 Send for requests

---

## 🔄 User Journey Examples

### First-Time User
1. Sign In → Enter phone
2. Verify → Enter OTP
3. Complete Profile → Enter name
4. Home → See "Start New Cycle"
5. Start Cycle → Goes to Feedback tab
6. Send Requests → Enter contacts, share links
7. Wait for 10 responses → Notification available
8. Growth Tab → See first summary
9. Continue until 50 responses or choose to stop

### Returning User
1. Sign In → Redirects to Home (if authenticated)
2. Home → See active cycle stats
3. Feedback → Send more requests or view status
4. Growth → Review summaries as milestones reached
5. Profile → View history and stats

### Feedback Giver (Rater)
1. Receives unique link via SMS/message
2. Opens link → Feedback submission form
3. Reads privacy notice
4. Rates all 7 traits (1-5 stars)
5. Optionally adds written reflections
6. Submits → Thank you message
7. Link becomes invalid (single-use)

---

## 🔒 Security & Privacy Features

### Authentication
- Phone-based OTP verification
- Secure session storage (SecureStore on mobile, localStorage on web)
- Auto-refresh tokens

### Data Protection
- **Row Level Security (RLS)** on all database tables
- Users can only read their own data
- Feedback submitters can't see who else responded
- Individual feedback never shown to requester
- Only aggregated summaries visible

### Feedback Anonymity
- No individual responses visible
- Only averages and patterns shown
- Minimum 10 responses before any summary
- Reflections combined without attribution

### Link Security
- Unique tokens per request
- 30-day expiration
- Single-use (disabled after submission)
- Cannot be forwarded/reused

---

## 📊 Backend Architecture

### Database Tables
1. `users` - User profiles
2. `traits` - Feedback characteristics (12 personal traits)
3. `feedback_cycles` - Cycles with 50-request limit
4. `feedback_requests` - Individual links sent
5. `feedback_submissions` - Anonymous ratings
6. `feedback_summaries` - Aggregated insights
7. `growth_recommendations` - AI-generated suggestions

### Edge Functions
- `generate-summary` - Triggered at milestones (10, 20, 30, 40, 50)
  - Calculates trait averages
  - Identifies top strengths (top 3)
  - Finds growth opportunities (bottom 3)
  - Generates patterns description
  - Compares to previous summary
  - Creates 3-4 growth recommendations

### Business Rules
- Max 50 requests per cycle
- 2-month cooldown after completing cycle
- Summaries at 10-response intervals
- Links expire after 30 days
- Single-use tokens only

---

## 🎯 Key Features Summary

✅ Phone number authentication
✅ Contact-verified feedback requests
✅ Unique, single-use, expiring links
✅ Anonymous feedback submission
✅ 12 personal trait evaluation system
✅ Delayed feedback delivery (10-response intervals)
✅ Aggregated insights only
✅ AI-generated growth recommendations
✅ Cycle history tracking
✅ Progress visualization
✅ Warm, encouraging design
✅ Strong privacy protections
✅ 50-request limit per cycle
✅ 2-month cooldown enforcement

---

## 📱 Total Page Count

**10 Unique Screens:**
1. Sign In
2. Verify OTP
3. Complete Profile
4. Home (Dashboard)
5. Feedback (Request Management)
6. Growth (Summaries & Recommendations)
7. Profile (Account & History)
8. Feedback Submission Form (Public)
9. Index (Router/Redirect)
10. Not Found (Error page)

**3 Layout Wrappers:**
- Root Layout (Auth Provider)
- Auth Layout (Auth screens)
- Tabs Layout (Main app)
