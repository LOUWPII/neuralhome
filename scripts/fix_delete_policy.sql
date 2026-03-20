-- Fix Delete Policies
-- Run this in your Supabase SQL Editor

-- 1. Ensure deletion is enabled on palaces for the owner
DROP POLICY IF EXISTS "Users can delete their own palaces." ON public.palaces;
CREATE POLICY "Users can delete their own palaces."
    ON public.palaces FOR DELETE
    USING ( auth.uid() = user_id );

-- 2. Ensure deletion is enabled on concepts for the owner of the parent palace
DROP POLICY IF EXISTS "Users can delete concepts of their palaces." ON public.concepts;
CREATE POLICY "Users can delete concepts of their palaces."
    ON public.concepts FOR DELETE
    USING ( EXISTS (
        SELECT 1 FROM public.palaces 
        WHERE palaces.id = concepts.palace_id 
        AND palaces.user_id = auth.uid()
    ));

-- 3. Verify that the user_id column in palaces is indeed of type UUID (important for auth.uid() matching)
-- This was already in the schema but worth reinforcing.
ALTER TABLE public.palaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
