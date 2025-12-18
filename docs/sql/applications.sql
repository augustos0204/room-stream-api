CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    key VARCHAR(72) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_applications_created_by ON public.applications(created_by);
CREATE INDEX IF NOT EXISTS idx_applications_key ON public.applications(key);
CREATE INDEX IF NOT EXISTS idx_applications_is_active ON public.applications(is_active);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
ON public.applications FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create own applications"
ON public.applications FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own applications"
ON public.applications FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own applications"
ON public.applications FOR DELETE
USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.applications;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
