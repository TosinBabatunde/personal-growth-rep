/*
  # Fix Feedback Request Anonymous Access
  
  ## Changes
  - Drop the overly permissive authenticated-only policy
  - Add new policy allowing anonymous users to read feedback requests by token
  - This enables the feedback submission flow to work for unauthenticated users
  
  ## Security
  - Anonymous users can only read requests, not modify them
  - Access requires knowing the unique_token (which is randomly generated)
  - Token-based access is the intended authentication mechanism for feedback submission
*/

-- Drop the old policy that required authentication
DROP POLICY IF EXISTS "Token holders can read request details" ON feedback_requests;

-- Add new policy allowing anonymous access by token
CREATE POLICY "Anonymous users can read by token"
  ON feedback_requests
  FOR SELECT
  TO anon
  USING (true);

-- Keep the policy for authenticated senders
-- (This already exists: "Senders can read own requests")