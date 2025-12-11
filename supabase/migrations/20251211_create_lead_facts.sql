-- Lead Facts table for semantic memory (cross-session fact storage)
CREATE TABLE IF NOT EXISTS lead_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  email TEXT NOT NULL,
  fact_text TEXT NOT NULL,
  source_message_id TEXT,
  confidence NUMERIC(3, 2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  category TEXT, -- e.g., 'constraints', 'preferences', 'stack', 'budget', 'timeline'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_lead_facts_email ON lead_facts(email);
CREATE INDEX IF NOT EXISTS idx_lead_facts_session ON lead_facts(session_id);
CREATE INDEX IF NOT EXISTS idx_lead_facts_category ON lead_facts(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_facts_created ON lead_facts(created_at DESC);

-- Enable RLS
ALTER TABLE lead_facts ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON lead_facts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_facts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_lead_facts_updated_at
  BEFORE UPDATE ON lead_facts
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_facts_updated_at();
