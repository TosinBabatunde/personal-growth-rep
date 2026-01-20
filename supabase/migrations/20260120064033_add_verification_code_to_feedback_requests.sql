/*
  # Add Verification Code to Feedback Requests

  1. Changes
    - Add verification_hint column to feedback_requests table
    - This stores a hint about who the intended recipient is
    - Receiver must enter matching information to access the form

  2. Security
    - Prevents link sharing by requiring verification
    - Maintains anonymity while ensuring only intended recipient can submit
    - Case-insensitive matching for better UX
*/

-- Add verification_hint column (stores last 4 chars of phone/name as entered by sender)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_requests' AND column_name = 'verification_hint'
  ) THEN
    ALTER TABLE feedback_requests
    ADD COLUMN verification_hint text;
  END IF;
END $$;

-- Update existing requests to have a verification hint (extract last 4 chars)
UPDATE feedback_requests
SET verification_hint = LOWER(RIGHT(rater_phone_number, 4))
WHERE verification_hint IS NULL;
