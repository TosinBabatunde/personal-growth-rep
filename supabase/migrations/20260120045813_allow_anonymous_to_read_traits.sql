/*
  # Allow Anonymous Users to Read Traits
  
  ## Changes
  - Add policy allowing anonymous users to read active traits
  - This enables the feedback submission form to load trait information
  
  ## Security
  - Anonymous users can only read active traits, not modify them
  - Inactive traits remain hidden
*/

-- Allow anonymous users to read active traits
CREATE POLICY "Anonymous users can read active traits"
  ON traits
  FOR SELECT
  TO anon
  USING (is_active = true);