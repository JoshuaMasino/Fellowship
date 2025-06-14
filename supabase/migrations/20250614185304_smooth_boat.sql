/*
  # Fix Guest User Pin Creation

  1. Problem Resolution
    - Updates RLS policy on pins table to allow both authenticated and guest users to create pins
    - Ensures the `is_authenticated` column is set correctly based on user authentication status
    - Removes the restriction that was blocking guest users from creating pins

  2. Changes Made
    - Drop existing restrictive INSERT policy on pins table
    - Create new INSERT policy that allows both authenticated and guest users
    - Add WITH CHECK clause to ensure `is_authenticated` column is set correctly

  3. Security
    - Maintains data integrity by enforcing correct `is_authenticated` values
    - Preserves existing SELECT and DELETE policies
    - Ensures guest users can create pins while authenticated users get proper attribution
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON pins;

-- Create new INSERT policy that allows both authenticated and guest users
CREATE POLICY "Anyone can create pins"
  ON pins
  FOR INSERT
  TO public
  WITH CHECK (
    -- Ensure is_authenticated is set correctly based on auth status
    (auth.uid() IS NOT NULL AND is_authenticated = true) OR
    (auth.uid() IS NULL AND is_authenticated = false)
  );

-- Ensure RLS is enabled
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;