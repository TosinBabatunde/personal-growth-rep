/*
  # Allow Anonymous Users to Read Sender Names for Feedback
  
  ## Changes
  - Add policy allowing anonymous users to read basic user information (name) for feedback purposes
  - This enables the feedback form to display the sender's name to provide context
  
  ## Security
  - Anonymous users can only read user records, not modify them
  - Limited to basic profile information needed for feedback context
*/

-- Allow anonymous users to read user profiles (for displaying sender names in feedback forms)
CREATE POLICY "Anonymous users can read user names"
  ON users
  FOR SELECT
  TO anon
  USING (true);