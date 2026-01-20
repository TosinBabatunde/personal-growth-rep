/*
  # Add Email Authentication Support

  1. Changes
    - Add `email` column to `users` table
    - Make `phone_number` nullable (since we're switching to email)
    - Add unique constraint on `email` column

  2. Security
    - Maintains existing RLS policies
    - Email column is updatable by users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;
