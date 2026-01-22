-- OMNISCIENT Data Enrichment Schema: Cross-Source Fusion + Relationship Graph

-- Record relationships table - links records across categories
CREATE TABLE public.record_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  target_record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'near', 'affects', 'regulates', 'contains', 'overlaps'
  confidence_score DOUBLE PRECISION DEFAULT 0.5,
  distance_meters DOUBLE PRECISION, -- for spatial relationships
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_record_id, target_record_id, relationship_type)
);

-- Enrichment queue - tracks records pending enrichment
CREATE TABLE public.enrichment_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  enrichment_type TEXT NOT NULL, -- 'weather', 'demographics', 'regulations', etc.
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'complete', 'failed'
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Data fusion results - stores enriched composite records
CREATE TABLE public.fused_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  enrichment_sources TEXT[] NOT NULL DEFAULT '{}',
  fused_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  fusion_score DOUBLE PRECISION DEFAULT 0.5, -- quality/completeness score
  last_enriched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enrichment_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(base_record_id)
);

-- Knowledge graph edges - semantic relationships
CREATE TABLE public.knowledge_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_type TEXT NOT NULL, -- 'record', 'category', 'location', 'source'
  subject_id TEXT NOT NULL,
  predicate TEXT NOT NULL, -- 'locatedIn', 'hasWeather', 'regulatedBy', 'partOf'
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  weight DOUBLE PRECISION DEFAULT 1.0,
  evidence JSONB DEFAULT '[]'::jsonb, -- supporting data points
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subject_type, subject_id, predicate, object_type, object_id)
);

-- Enrichment stats tracking
CREATE TABLE public.enrichment_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  records_enriched INTEGER DEFAULT 0,
  relationships_created INTEGER DEFAULT 0,
  fusion_operations INTEGER DEFAULT 0,
  avg_enrichment_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, category)
);

-- Enable RLS
ALTER TABLE public.record_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fused_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_stats ENABLE ROW LEVEL SECURITY;

-- Public read access (data is meant to be shared)
CREATE POLICY "Anyone can read relationships" ON public.record_relationships FOR SELECT USING (true);
CREATE POLICY "Anyone can read enrichment queue" ON public.enrichment_queue FOR SELECT USING (true);
CREATE POLICY "Anyone can read fused records" ON public.fused_records FOR SELECT USING (true);
CREATE POLICY "Anyone can read knowledge edges" ON public.knowledge_edges FOR SELECT USING (true);
CREATE POLICY "Anyone can read enrichment stats" ON public.enrichment_stats FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX idx_relationships_source ON public.record_relationships(source_record_id);
CREATE INDEX idx_relationships_target ON public.record_relationships(target_record_id);
CREATE INDEX idx_relationships_type ON public.record_relationships(relationship_type);
CREATE INDEX idx_enrichment_queue_status ON public.enrichment_queue(status, priority);
CREATE INDEX idx_fused_records_base ON public.fused_records(base_record_id);
CREATE INDEX idx_knowledge_edges_subject ON public.knowledge_edges(subject_type, subject_id);
CREATE INDEX idx_knowledge_edges_object ON public.knowledge_edges(object_type, object_id);
CREATE INDEX idx_knowledge_edges_predicate ON public.knowledge_edges(predicate);

-- Function to create a relationship between records
CREATE OR REPLACE FUNCTION public.create_record_relationship(
  p_source_id UUID,
  p_target_id UUID,
  p_relationship_type TEXT,
  p_confidence DOUBLE PRECISION DEFAULT 0.5,
  p_distance DOUBLE PRECISION DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.record_relationships (source_record_id, target_record_id, relationship_type, confidence_score, distance_meters, metadata)
  VALUES (p_source_id, p_target_id, p_relationship_type, p_confidence, p_distance, p_metadata)
  ON CONFLICT (source_record_id, target_record_id, relationship_type) 
  DO UPDATE SET 
    confidence_score = GREATEST(record_relationships.confidence_score, EXCLUDED.confidence_score),
    metadata = record_relationships.metadata || EXCLUDED.metadata
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Function to upsert fused record
CREATE OR REPLACE FUNCTION public.upsert_fused_record(
  p_base_record_id UUID,
  p_sources TEXT[],
  p_properties JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.fused_records (base_record_id, enrichment_sources, fused_properties)
  VALUES (p_base_record_id, p_sources, p_properties)
  ON CONFLICT (base_record_id) DO UPDATE SET
    enrichment_sources = array_cat(fused_records.enrichment_sources, 
      (SELECT array_agg(s) FROM unnest(EXCLUDED.enrichment_sources) s WHERE s != ALL(fused_records.enrichment_sources))),
    fused_properties = fused_records.fused_properties || EXCLUDED.fused_properties,
    fusion_score = LEAST(1.0, fused_records.fusion_score + 0.1),
    enrichment_count = fused_records.enrichment_count + 1,
    last_enriched_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Function to add knowledge edge
CREATE OR REPLACE FUNCTION public.add_knowledge_edge(
  p_subject_type TEXT,
  p_subject_id TEXT,
  p_predicate TEXT,
  p_object_type TEXT,
  p_object_id TEXT,
  p_weight DOUBLE PRECISION DEFAULT 1.0,
  p_evidence JSONB DEFAULT '[]'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.knowledge_edges (subject_type, subject_id, predicate, object_type, object_id, weight, evidence)
  VALUES (p_subject_type, p_subject_id, p_predicate, p_object_type, p_object_id, p_weight, p_evidence)
  ON CONFLICT (subject_type, subject_id, predicate, object_type, object_id) 
  DO UPDATE SET 
    weight = knowledge_edges.weight + 0.1,
    evidence = knowledge_edges.evidence || EXCLUDED.evidence,
    updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;