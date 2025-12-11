-- Optional: Additional RLS policies for lead_facts table
-- These are NOT needed for current implementation (service role bypasses RLS)
-- Add these only if you implement user authentication later

-- Index on confidence for filtering (optional optimization)
CREATE INDEX IF NOT EXISTS idx_lead_facts_confidence ON lead_facts(confidence DESC) WHERE confidence >= 0.5;

-- Example RLS policy: Users can only see facts for their own email
-- Uncomment and adjust if you add authentication:
-- 
-- CREATE POLICY "Users can view their own facts" ON lead_facts
--   FOR SELECT TO authenticated
--   USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
--
-- CREATE POLICY "Users can insert their own facts" ON lead_facts
--   FOR INSERT TO authenticated
--   WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Note: Current implementation uses service_role which bypasses RLS
-- These policies would only apply if you switch to authenticated user access
