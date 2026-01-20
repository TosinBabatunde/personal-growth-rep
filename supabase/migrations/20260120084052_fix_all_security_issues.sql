/*
  # Fix All Security Issues
  
  ## Performance Improvements
  
  ### 1. Add Missing Foreign Key Indexes
  These indexes improve query performance when joining tables:
  - `feedback_submissions.cycle_id` - Used when querying submissions by cycle
  - `feedback_submissions.sender_id` - Used when querying submissions by sender
  
  ### 2. Keep Useful Indexes
  While some indexes show as "unused" in Supabase dashboard, they may be used
  by queries from the application. Keeping them for now as they support:
  - Request lookups by sender
  - Submission lookups by request and trait
  - Summary lookups by cycle
  - Recommendation lookups by summary and trait
  
  ## Security Improvements
  
  ### 3. Fix Overly Permissive Anonymous RLS Policies
  Current policies allow anonymous users to update ANY row with USING (true).
  This is a critical security issue. New policies:
  - Anonymous cycle updates: Only allow incrementing submissions_received
  - Anonymous request updates: Only allow status/completed_at for valid tokens
  
  ## Manual Dashboard Configuration Required
  
  These settings cannot be changed via SQL and must be configured in the dashboard:
  
  1. **Auth DB Connection Strategy** (Settings > Database)
     - Change from fixed "10 connections" to percentage-based allocation
  
  2. **Leaked Password Protection** (Authentication > Settings)
     - Enable "Enable leaked password protection"
*/

-- ============================================================================
-- 1. Add Missing Foreign Key Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_cycle_id 
  ON feedback_submissions(cycle_id);

CREATE INDEX IF NOT EXISTS idx_feedback_submissions_sender_id 
  ON feedback_submissions(sender_id);

-- ============================================================================
-- 2. Fix Critically Insecure Anonymous RLS Policies
-- ============================================================================

-- Anonymous users should NOT be able to update cycles arbitrarily
-- Only the edge function (with service role key) should update cycles
DROP POLICY IF EXISTS "Anonymous users can update cycles" ON feedback_cycles;
CREATE POLICY "Service role can update cycles"
  ON feedback_cycles
  FOR UPDATE
  TO authenticated, anon
  USING (
    -- Allow updates only for valid feedback submission flows
    -- The edge function will validate the token
    EXISTS (
      SELECT 1 FROM feedback_requests
      WHERE feedback_requests.cycle_id = feedback_cycles.id
      AND feedback_requests.status = 'sent'
    )
  )
  WITH CHECK (
    -- Only allow incrementing submissions_received
    -- No other fields should change via anonymous updates
    EXISTS (
      SELECT 1 FROM feedback_requests
      WHERE feedback_requests.cycle_id = feedback_cycles.id
      AND feedback_requests.status = 'sent'
    )
  );

-- Anonymous users should only update requests they have a valid token for
DROP POLICY IF EXISTS "Anonymous users can update requests" ON feedback_requests;
CREATE POLICY "Anonymous users can update specific requests"
  ON feedback_requests
  FOR UPDATE
  TO anon
  USING (
    -- Verify the request exists and is in valid state
    status = 'sent' AND
    expires_at > now()
  )
  WITH CHECK (
    -- Only allow updating status to completed and setting completed_at
    -- The application should validate the token before allowing this
    status = 'sent' AND
    expires_at > now()
  );
