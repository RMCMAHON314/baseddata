-- Create table to archive dynamically generated collectors
CREATE TABLE public.dynamic_collectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  api_url TEXT NOT NULL,
  api_method TEXT NOT NULL DEFAULT 'GET',
  headers JSONB DEFAULT '{}',
  params_template JSONB DEFAULT '{}',
  response_mapping JSONB NOT NULL,
  categories TEXT[] NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_by_prompt TEXT
);

-- Enable RLS
ALTER TABLE public.dynamic_collectors ENABLE ROW LEVEL SECURITY;

-- Anyone can read dynamic collectors (they're system-generated)
CREATE POLICY "Anyone can read dynamic collectors"
  ON public.dynamic_collectors
  FOR SELECT
  USING (true);

-- Create index for fast keyword matching
CREATE INDEX idx_dynamic_collectors_keywords ON public.dynamic_collectors USING GIN(keywords);
CREATE INDEX idx_dynamic_collectors_categories ON public.dynamic_collectors USING GIN(categories);

-- Add trigger for updated_at
CREATE TRIGGER update_dynamic_collectors_updated_at
  BEFORE UPDATE ON public.dynamic_collectors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();