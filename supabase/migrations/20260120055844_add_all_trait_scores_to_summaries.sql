/*
  # Add All Trait Scores to Feedback Summaries

  1. Changes
    - Add `all_trait_scores` JSON column to `feedback_summaries` table
    - This will store scores for all 12 traits, not just top 3 and bottom 3
    - Enables displaying remaining trait scores in the Growth tab

  2. Column Details
    - `all_trait_scores` - JSON array containing all trait scores
    - Each item has: { trait: string, score: number }
    - Ordered by score descending

  3. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add all_trait_scores column to feedback_summaries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_summaries' AND column_name = 'all_trait_scores'
  ) THEN
    ALTER TABLE feedback_summaries ADD COLUMN all_trait_scores jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;