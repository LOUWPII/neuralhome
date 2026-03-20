-- FIX: RLS Policies for palaces and concepts
-- Run this in Supabase SQL Editor to ensure the user can actually insert data

-- Enable RLS
ALTER TABLE palaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

-- 1. Policy for palaces: users can do everything with their own palaces
DROP POLICY IF EXISTS "Users can insert their own palaces" ON palaces;
CREATE POLICY "Users can insert their own palaces" 
ON palaces FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own palaces" ON palaces;
CREATE POLICY "Users can view their own palaces" 
ON palaces FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own palaces" ON palaces;
CREATE POLICY "Users can update their own palaces" 
ON palaces FOR UPDATE 
USING (auth.uid() = user_id);

-- 2. Policy for concepts: users can do everything with concepts belonging to their palaces
DROP POLICY IF EXISTS "Users can insert concepts for their palaces" ON concepts;
CREATE POLICY "Users can insert concepts for their palaces" 
ON concepts FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM palaces 
    WHERE palaces.id = concepts.palace_id 
    AND palaces.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view concepts for their palaces" ON concepts;
CREATE POLICY "Users can view concepts for their palaces" 
ON concepts FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM palaces 
    WHERE palaces.id = concepts.palace_id 
    AND palaces.user_id = auth.uid()
  )
);
