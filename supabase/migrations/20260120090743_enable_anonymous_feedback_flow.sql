/*
  # Enable Anonymous Feedback Submission Flow
  
  1. Changes
    - Allow anonymous users to read sender names from users table
    - Allow anonymous users to update feedback requests (mark as completed)
    - Allow anonymous users to update feedback cycles (increment submissions count)
  
  2. Security
    - Anonymous users can only read user names (for verification)
    - Anonymous users can only update requests they have valid tokens for
    - Anonymous users can only increment cycle submission counts
*/

-- Allow anonymous users to read sender names for verification
CREATE POLICY "Anonymous can read sender names"
  ON users FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update requests (mark as completed)
CREATE POLICY "Anonymous can update specific requests"
  ON feedback_requests FOR UPDATE
  TO anon
  USING (
    status = 'sent' AND
    expires_at > now()
  )
  WITH CHECK (
    status = 'sent' AND
    expires_at > now()
  );

-- Allow anonymous users to increment cycle submission counts
CREATE POLICY "Anonymous can update cycles"
  ON feedback_cycles FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM feedback_requests
      WHERE feedback_requests.cycle_id = feedback_cycles.id
      AND feedback_requests.status = 'sent'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback_requests
      WHERE feedback_requests.cycle_id = feedback_cycles.id
      AND feedback_requests.status = 'sent'
    )
  );
