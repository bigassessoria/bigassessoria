-- =============================================================================
-- Tabela de Licenças
-- Para controle de instalações e integração com n8n/pagamentos
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'used', 'expired', 'revoked')),
  email text,
  purchase_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  expires_at timestamptz,
  -- Dados coletados no wizard (logs/controle)
  github_username text,
  github_fork_url text,
  vercel_project_id text,
  supabase_project_ref text,
  admin_name text,
  admin_email text,
  company_name text,
  install_data_json jsonb
);

CREATE INDEX IF NOT EXISTS licenses_code_idx ON public.licenses (code);
CREATE INDEX IF NOT EXISTS licenses_status_idx ON public.licenses (status);
CREATE INDEX IF NOT EXISTS licenses_created_at_idx ON public.licenses (created_at DESC);

-- RLS: apenas service_role tem acesso total (API usa getSupabaseAdmin)
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to licenses"
  ON public.licenses
  FOR ALL
  USING (auth.role() = 'service_role');
