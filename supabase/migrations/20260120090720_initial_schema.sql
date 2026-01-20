/*
  # Initial Database Schema
  
  ## 1. Tables Created
  
  ### users
  - Core user profile information
  - Links to auth.users
  - Stores phone, email, name, and contact permissions
  
  ### traits  
  - 12 personal characteristics for evaluation
  - Used in feedback submissions
  
  ### feedback_cycles
  - Tracks user feedback collection cycles
  - 50-request limit per cycle
  - Status: active, completed, cooldown
  
  ### feedback_requests
  - Individual feedback requests with unique tokens
  - Links to specific cycle and sender
  - Single-use, expiring links
  
  ### feedback_submissions
  - Anonymous feedback ratings
  - One submission per trait per request
  - 1-5 star ratings with optional reflections
  
  ### feedback_summaries
  - Aggregated insights at milestones (10, 20, 30, 40, 50)
  - Top strengths and growth opportunities
  - Generated patterns and comparisons
  
  ### growth_recommendations
  - AI-generated actionable suggestions
  - Types: strength, growth, habit
  - Can be marked as completed
  
  ## 2. Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Anonymous users can submit feedback via valid tokens
  - Service role handles summary generation
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text UNIQUE,
  email text UNIQUE,
  full_name text NOT NULL,
  contact_permission_granted boolean DEFAULT false,
  current_cycle_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- TRAITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS traits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text NOT NULL,
  display_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE traits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active traits"
  ON traits FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- ============================================================================
-- FEEDBACK CYCLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_cycles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cooldown')),
  requests_sent integer DEFAULT 0 CHECK (requests_sent <= 50),
  submissions_received integer DEFAULT 0 CHECK (submissions_received <= 50),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  next_cycle_available_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cycles"
  ON feedback_cycles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own cycles"
  ON feedback_cycles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cycles"
  ON feedback_cycles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FEEDBACK REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id uuid NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rater_phone_number text NOT NULL,
  unique_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'completed', 'expired')),
  sent_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL,
  verification_hint text
);

ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can read own requests"
  ON feedback_requests FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can create feedback requests"
  ON feedback_requests FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Anonymous can read requests by token"
  ON feedback_requests FOR SELECT
  TO anon
  USING (true);

-- Create index on cycle_id for performance
CREATE INDEX IF NOT EXISTS idx_feedback_requests_cycle_id 
  ON feedback_requests(cycle_id);

-- ============================================================================
-- FEEDBACK SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trait_id uuid NOT NULL REFERENCES traits(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  reflection text,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own submissions"
  ON feedback_submissions FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Anonymous can submit feedback"
  ON feedback_submissions FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback_requests
      WHERE feedback_requests.id = request_id
      AND feedback_requests.status = 'sent'
      AND feedback_requests.expires_at > now()
    )
  );

CREATE POLICY "Users can submit feedback"
  ON feedback_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback_requests
      WHERE feedback_requests.id = request_id
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_cycle_id 
  ON feedback_submissions(cycle_id);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_sender_id 
  ON feedback_submissions(sender_id);

-- ============================================================================
-- FEEDBACK SUMMARIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_summaries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id uuid NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_count integer NOT NULL CHECK (submission_count IN (10, 20, 30, 40, 50)),
  top_strengths jsonb NOT NULL,
  growth_opportunities jsonb NOT NULL,
  patterns text NOT NULL,
  comparison_to_previous text,
  all_trait_scores jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE feedback_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own summaries"
  ON feedback_summaries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- GROWTH RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS growth_recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary_id uuid NOT NULL REFERENCES feedback_summaries(id) ON DELETE CASCADE,
  trait_id uuid REFERENCES traits(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('strength', 'growth', 'habit')),
  title text NOT NULL,
  description text NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE growth_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recommendations"
  ON growth_recommendations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own recommendations"
  ON growth_recommendations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
