/*
  # Fix Performance and Security Issues

  1. Add Missing Indexes for Foreign Keys
    - Add index on `feedback_cycles.user_id`
    - Add index on `feedback_requests.sender_id`
    - Add index on `feedback_submissions.request_id`
    - Add index on `feedback_submissions.trait_id`
    - Add index on `feedback_summaries.cycle_id`
    - Add index on `feedback_summaries.user_id`
    - Add index on `growth_recommendations.summary_id`
    - Add index on `growth_recommendations.trait_id`
    - Add index on `growth_recommendations.user_id`

  2. Remove Unused Indexes
    - Drop `idx_feedback_submissions_cycle_id`
    - Drop `idx_feedback_submissions_sender_id`

  3. Optimize RLS Policies
    - Replace `auth.uid()` with `(select auth.uid())` in all policies to prevent re-evaluation per row

  4. Fix Function Search Path
    - Set immutable search_path for trigger functions
*/

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_feedback_cycles_user_id ON public.feedback_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_sender_id ON public.feedback_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_request_id ON public.feedback_submissions(request_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_trait_id ON public.feedback_submissions(trait_id);
CREATE INDEX IF NOT EXISTS idx_feedback_summaries_cycle_id ON public.feedback_summaries(cycle_id);
CREATE INDEX IF NOT EXISTS idx_feedback_summaries_user_id ON public.feedback_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_recommendations_summary_id ON public.growth_recommendations(summary_id);
CREATE INDEX IF NOT EXISTS idx_growth_recommendations_trait_id ON public.growth_recommendations(trait_id);
CREATE INDEX IF NOT EXISTS idx_growth_recommendations_user_id ON public.growth_recommendations(user_id);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_feedback_submissions_cycle_id;
DROP INDEX IF EXISTS idx_feedback_submissions_sender_id;

-- Optimize RLS policies for users table
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Optimize RLS policies for feedback_cycles table
DROP POLICY IF EXISTS "Users can read own cycles" ON public.feedback_cycles;
DROP POLICY IF EXISTS "Users can create own cycles" ON public.feedback_cycles;
DROP POLICY IF EXISTS "Users can update own cycles" ON public.feedback_cycles;

CREATE POLICY "Users can read own cycles"
  ON public.feedback_cycles
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own cycles"
  ON public.feedback_cycles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own cycles"
  ON public.feedback_cycles
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Optimize RLS policies for feedback_requests table
DROP POLICY IF EXISTS "Senders can read own requests" ON public.feedback_requests;
DROP POLICY IF EXISTS "Users can create feedback requests" ON public.feedback_requests;

CREATE POLICY "Senders can read own requests"
  ON public.feedback_requests
  FOR SELECT
  TO authenticated
  USING (sender_id = (select auth.uid()));

CREATE POLICY "Users can create feedback requests"
  ON public.feedback_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

-- Optimize RLS policies for feedback_submissions table
DROP POLICY IF EXISTS "Users can read own submissions" ON public.feedback_submissions;

CREATE POLICY "Users can read own submissions"
  ON public.feedback_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.feedback_requests
      WHERE id = feedback_submissions.request_id
      AND sender_id = (select auth.uid())
    )
  );

-- Optimize RLS policies for feedback_summaries table
DROP POLICY IF EXISTS "Users can read own summaries" ON public.feedback_summaries;

CREATE POLICY "Users can read own summaries"
  ON public.feedback_summaries
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Optimize RLS policies for growth_recommendations table
DROP POLICY IF EXISTS "Users can read own recommendations" ON public.growth_recommendations;
DROP POLICY IF EXISTS "Users can update own recommendations" ON public.growth_recommendations;

CREATE POLICY "Users can read own recommendations"
  ON public.growth_recommendations
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own recommendations"
  ON public.growth_recommendations
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Fix function search path for trigger functions
CREATE OR REPLACE FUNCTION public.update_cycle_requests_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.feedback_cycles
  SET requests_sent = requests_sent + 1
  WHERE id = NEW.cycle_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_cycle_submissions_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.feedback_cycles
  SET 
    submissions_received = submissions_received + 1,
    updated_at = now()
  WHERE id = (
    SELECT cycle_id 
    FROM public.feedback_requests 
    WHERE id = NEW.request_id
  );
  RETURN NEW;
END;
$$;