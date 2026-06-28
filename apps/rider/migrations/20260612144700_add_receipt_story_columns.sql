ALTER TABLE pos_shop_settings 
ADD COLUMN IF NOT EXISTS receipt_story_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receipt_stories JSONB DEFAULT '[]'::jsonb;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
