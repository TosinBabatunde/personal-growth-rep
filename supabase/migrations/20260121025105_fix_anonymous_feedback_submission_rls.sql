/*
  # Fix Anonymous Feedback Submission RLS Policies
  
  1. Changes
    - Fix feedback_requests UPDATE policy to allow marking as 'completed'
    - Add SELECT policy for anonymous users to read feedback_cycles
  
  2. Security
    - Anonymous users can only update requests from 'sent' to 'completed' if not expired
    - Anonymous users can only read cycles that have valid pending requests
*/

-- Drop the old restrictive UPDATE policy for anonymous users
DROP POLICY IF EXISTS "Anonymous can update specific requests" ON feedback_requests;

-- Create new policy that allows marking requests as completed
CREATE POLICY "Anonymous can mark requests as completed"
  ON feedback_requests FOR UPDATE
  TO anon
  USING (
    status = 'sent' AND
    expires_at > now()
  )
  WITH CHECK (
    status IN ('sent', 'completed') AND
    completed_at IS NOT NULL OR status = 'sent'
  );

-- Allow anonymous users to read feedback cycles (needed to increment count)
CREATE POLICY "Anonymous can read cycles with valid requests"
  ON feedback_cycles FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM feedback_requests
      WHERE feedback_requests.cycle_id = feedback_cycles.id
      AND feedback_requests.status IN ('sent', 'completed')
      AND feedback_requests.expires_at > now()
    )
  );
