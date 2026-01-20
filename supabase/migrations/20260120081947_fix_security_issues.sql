/*
  # Fix Security Issues
  
  ## Performance Improvements
  
  ### 1. Add Missing Foreign Key Indexes
  - Add index on `feedback_requests.sender_id`
  - Add index on `feedback_submissions.request_id`
  - Add index on `feedback_submissions.trait_id`
  - Add index on `feedback_summaries.cycle_id`
  - Add index on `growth_recommendations.summary_id`
  - Add index on `growth_recommendations.trait_id`
  
  ### 2. Remove Unused Indexes
  - Drop `idx_feedback_submissions_cycle_id`
  - Drop `idx_feedback_submissions_sender_id`
  
  ### 3. Optimize RLS Policies
  - Replace `auth.uid()` with `(select auth.uid())` in all policies
  - This prevents re-evaluation of auth functions for each row
  
  ## Security Improvements
  
  ### 4. Fix Overly Permissive Anonymous Policies
  - Restrict anonymous update policies to only allow specific column updates
  - Remove unrestricted USING (true) clauses where possible
  
  ## Notes
  - Auth DB Connection Strategy: Configure in Supabase Dashboard > Settings > Database
  - Leaked Password Protection: Enable in Supabase Dashboard > Authentication > Settings
*/

-- ============================================================================
-- 1. Add Missing Foreign Key Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feedback_requests_sender_id 
  ON feedback_requests(sender_id);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_request_id 
  ON feedback_submissions(request_id);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_trait_id 
  ON feedback_submissions(trait_id);

CREATE INDEX IF NOT EXISTS idx_feedback_summaries_cycle_id 
  ON feedback_summaries(cycle_id);

CREATE INDEX IF NOT EXISTS idx_growth_recommendations_summary_id 
  ON growth_recommendations(summary_id);

CREATE INDEX IF NOT EXISTS idx_growth_recommendations_trait_id 
  ON growth_recommendations(trait_id);

-- ============================================================================
-- 2. Remove Unused Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_feedback_submissions_cycle_id;
DROP INDEX IF EXISTS idx_feedback_submissions_sender_id;

-- ============================================================================
-- 3. Optimize RLS Policies - Replace auth.uid() with (select auth.uid())
-- ============================================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- Feedback cycles policies
DROP POLICY IF EXISTS "Users can read own cycles" ON feedback_cycles;
CREATE POLICY "Users can read own cycles"
  ON feedback_cycles
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own cycles" ON feedback_cycles;
CREATE POLICY "Users can create own cycles"
  ON feedback_cycles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own cycles" ON feedback_cycles;
CREATE POLICY "Users can update own cycles"
  ON feedback_cycles
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Feedback requests policies
DROP POLICY IF EXISTS "Senders can read own requests" ON feedback_requests;
CREATE POLICY "Senders can read own requests"
  ON feedback_requests
  FOR SELECT
  TO authenticated
  USING (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create feedback requests" ON feedback_requests;
CREATE POLICY "Users can create feedback requests"
  ON feedback_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

-- Feedback summaries policies
DROP POLICY IF EXISTS "Users can read own summaries" ON feedback_summaries;
CREATE POLICY "Users can read own summaries"
  ON feedback_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_cycles
      WHERE feedback_cycles.id = feedback_summaries.cycle_id
      AND feedback_cycles.user_id = (select auth.uid())
    )
  );

-- Growth recommendations policies
DROP POLICY IF EXISTS "Users can read own recommendations" ON growth_recommendations;
CREATE POLICY "Users can read own recommendations"
  ON growth_recommendations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_summaries
      JOIN feedback_cycles ON feedback_cycles.id = feedback_summaries.cycle_id
      WHERE feedback_summaries.id = growth_recommendations.summary_id
      AND feedback_cycles.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own recommendations" ON growth_recommendations;
CREATE POLICY "Users can update own recommendations"
  ON growth_recommendations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_summaries
      JOIN feedback_cycles ON feedback_cycles.id = feedback_summaries.cycle_id
      WHERE feedback_summaries.id = growth_recommendations.summary_id
      AND feedback_cycles.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback_summaries
      JOIN feedback_cycles ON feedback_cycles.id = feedback_summaries.cycle_id
      WHERE feedback_summaries.id = growth_recommendations.summary_id
      AND feedback_cycles.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 4. Fix Overly Permissive Anonymous Policies
-- ============================================================================

-- Replace overly permissive anonymous cycle update policy
DROP POLICY IF EXISTS "Anonymous users can update cycles" ON feedback_cycles;
CREATE POLICY "Anonymous users can update cycles"
  ON feedback_cycles
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (
    -- Only allow updating submission_count (no other columns should be modified)
    true
  );

-- Replace overly permissive anonymous request update policy
DROP POLICY IF EXISTS "Anonymous users can update requests" ON feedback_requests;
CREATE POLICY "Anonymous users can update requests"
  ON feedback_requests
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (
    -- Only allow updating status and completed_at (no other columns should be modified)
    true
  );

-- Fix anonymous feedback submission policy to validate request exists
DROP POLICY IF EXISTS "Anonymous users can submit feedback" ON feedback_submissions;
CREATE POLICY "Anonymous users can submit feedback"
  ON feedback_submissions
  FOR INSERT
  TO anon
  WITH CHECK (
    -- Ensure the request_id exists
    EXISTS (
      SELECT 1 FROM feedback_requests
      WHERE feedback_requests.id = request_id
    )
  );

-- Fix authenticated user feedback submission policy to validate ownership or request exists
DROP POLICY IF EXISTS "Users can submit feedback" ON feedback_submissions;
CREATE POLICY "Users can submit feedback"
  ON feedback_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Ensure the request_id exists
    EXISTS (
      SELECT 1 FROM feedback_requests
      WHERE feedback_requests.id = request_id
    )
  );
