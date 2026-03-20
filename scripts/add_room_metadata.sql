-- Migration Script: Add Room & Architect Metadata
-- Run this in the Supabase SQL Editor to update the tables for the Neural Architect flow.

-- 1. Add new columns to the palaces table (which acts as the Room)
ALTER TABLE public.palaces
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS objectives TEXT;

-- 2. Add anchor_id to the concepts table
-- This links the extracted concept to a predefined 3D object in the room
ALTER TABLE public.concepts
ADD COLUMN IF NOT EXISTS anchor_id TEXT;
