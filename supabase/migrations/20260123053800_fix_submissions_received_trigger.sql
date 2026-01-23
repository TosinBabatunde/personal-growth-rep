/*
  # Fix submissions_received trigger function

  1. Changes
    - Drop the existing trigger that references wrong columns
    - Create a new trigger function that correctly increments submissions_received
    - The trigger should fire when feedback_requests.status changes from 'sent' to 'completed'
    - Access NEW.cycle_id directly instead of trying to access NEW.request_id
  
  2. Security
    - Maintains SECURITY DEFINER for proper permissions
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_submissions_received ON feedback_requests;

-- Create corrected trigger function
CREATE OR REPLACE FUNCTION update_cycle_submissions_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Only increment when status changes from 'sent' to 'completed'
  IF OLD.status = 'sent' AND NEW.status = 'completed' THEN
    UPDATE public.feedback_cycles
    SET 
      submissions_received = submissions_received + 1
    WHERE id = NEW.cycle_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger only for UPDATE operations
CREATE TRIGGER trigger_update_submissions_received
  AFTER UPDATE ON feedback_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_cycle_submissions_received();