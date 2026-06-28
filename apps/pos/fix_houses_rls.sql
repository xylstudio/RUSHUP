-- Drop the insert policy if it exists just to be clean
DROP POLICY IF EXISTS "Users can insert own houses" ON public.houses;

-- Recreate the insert policy
CREATE POLICY "Users can insert own houses"
  ON public.houses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = customer_id);

-- Make sure they have read access
DROP POLICY IF EXISTS "Users can read own houses" ON public.houses;
CREATE POLICY "Users can read own houses"
  ON public.houses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = customer_id);
