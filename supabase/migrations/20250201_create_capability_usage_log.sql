-- Capability usage log table for tracking AI capability usage
CREATE TABLE IF NOT EXISTS capability_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  agent TEXT,
  context JSONB,
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_capability_usage_session ON capability_usage_log(session_id);
CREATE INDEX IF NOT EXISTS idx_capability_usage_capability ON capability_usage_log(capability);
CREATE INDEX IF NOT EXISTS idx_capability_usage_first_used ON capability_usage_log(first_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_capability_usage_agent ON capability_usage_log(agent) WHERE agent IS NOT NULL;

-- Enable RLS
ALTER TABLE capability_usage_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON capability_usage_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admin read-only access
CREATE POLICY "Admin read" ON capability_usage_log
  FOR SELECT TO authenticated
  USING (true);

-- RPC function to append capability if missing (deduplicates and logs)
CREATE OR REPLACE FUNCTION append_capability_if_missing(
  p_session_id TEXT,
  p_capability TEXT
)
RETURNS void AS $$
BEGIN
  -- Check if capability already exists in conversation_contexts.ai_capabilities_shown
  IF NOT EXISTS (
    SELECT 1 
    FROM conversation_contexts 
    WHERE session_id = p_session_id 
    AND ai_capabilities_shown @> ARRAY[p_capability]::TEXT[]
  ) THEN
    -- Add capability to array
    UPDATE conversation_contexts
    SET 
      ai_capabilities_shown = COALESCE(ai_capabilities_shown, ARRAY[]::TEXT[]) || ARRAY[p_capability]::TEXT[],
      updated_at = now()
    WHERE session_id = p_session_id;
    
    -- Log to capability_usage_log (only first time)
    INSERT INTO capability_usage_log (session_id, capability, first_used_at)
    VALUES (p_session_id, p_capability, now())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

