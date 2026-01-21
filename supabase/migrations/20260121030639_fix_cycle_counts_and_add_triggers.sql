/*
  # Fix Cycle Counts and Add Automatic Update Triggers

  1. Changes
    - Add database triggers to automatically update requests_sent and submissions_received
    - Fix any existing data mismatches in feedback_cycles table
    
  2. Triggers
    - Auto-increment requests_sent when a feedback_request is inserted
    - Auto-increment submissions_received when a feedback_request status changes to 'completed'
    - Handle request deletions by decrementing counts
    
  3. Data Fix
    - Sync all existing cycle counts with actual database records
*/

-- Function to update requests_sent count
CREATE OR REPLACE FUNCTION update_cycle_requests_sent()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feedback_cycles
    SET requests_sent = requests_sent + 1
    WHERE id = NEW.cycle_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feedback_cycles
    SET requests_sent = GREATEST(0, requests_sent - 1)
    WHERE id = OLD.cycle_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update submissions_received count
CREATE OR REPLACE FUNCTION update_cycle_submissions_received()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    UPDATE feedback_cycles
    SET submissions_received = submissions_received + 1
    WHERE id = NEW.cycle_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'completed' THEN
    UPDATE feedback_cycles
    SET submissions_received = GREATEST(0, submissions_received - 1)
    WHERE id = OLD.cycle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_requests_sent ON feedback_requests;
DROP TRIGGER IF EXISTS trigger_update_submissions_received ON feedback_requests;

-- Create trigger for requests_sent (fires when request is inserted or deleted)
CREATE TRIGGER trigger_update_requests_sent
  AFTER INSERT OR DELETE ON feedback_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_cycle_requests_sent();

-- Create trigger for submissions_received (fires when request status changes to completed)
CREATE TRIGGER trigger_update_submissions_received
  AFTER UPDATE OR DELETE ON feedback_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_cycle_submissions_received();

-- Fix existing cycle counts by recalculating from actual data
UPDATE feedback_cycles fc
SET 
  requests_sent = (
    SELECT COUNT(*) 
    FROM feedback_requests fr 
    WHERE fr.cycle_id = fc.id
  ),
  submissions_received = (
    SELECT COUNT(*) 
    FROM feedback_requests fr 
    WHERE fr.cycle_id = fc.id 
    AND fr.status = 'completed'
  );
