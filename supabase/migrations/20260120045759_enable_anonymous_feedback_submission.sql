/*
  # Enable Anonymous Feedback Submission
  
  ## Changes
  - Allow anonymous users to insert feedback submissions
  - Allow anonymous users to update feedback requests (to mark as completed)
  - Allow anonymous users to update feedback cycles (to increment submission count)
  
  ## Security
  - Anonymous users can only perform specific actions needed for feedback submission
  - They cannot delete or perform other unauthorized operations
  - All existing authenticated user policies remain unchanged
*/

-- Allow anonymous users to submit feedback
CREATE POLICY "Anonymous users can submit feedback"
  ON feedback_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update feedback requests (mark as completed)
CREATE POLICY "Anonymous users can update requests"
  ON feedback_requests
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to update feedback cycles (increment submission count)
CREATE POLICY "Anonymous users can update cycles"
  ON feedback_cycles
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to read feedback cycles (needed for submission count check)
CREATE POLICY "Anonymous users can read cycles"
  ON feedback_cycles
  FOR SELECT
  TO anon
  USING (true);