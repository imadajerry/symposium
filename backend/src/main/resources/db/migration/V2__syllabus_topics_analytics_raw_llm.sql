-- ============================================================
-- V2: syllabus_topics, raw_llm_response, covered_on
-- Improvements: 1 (topics table + FK), 2 (covered_on), 6 (raw LLM)
-- ============================================================

-- Improvement 6: store raw LLM output for debugging
ALTER TABLE generated_content ADD COLUMN raw_llm_response TEXT;

-- Improvement 1 + 2: structured topics extracted from approved generated content
CREATE TABLE syllabus_topics (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id           UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  generated_content_id UUID REFERENCES generated_content(id) ON DELETE SET NULL,
  module_title         VARCHAR(300),
  topic_name           VARCHAR(300) NOT NULL,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  covered_on           DATE,         -- improvement 2: teacher marks when topic was covered
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_syllabus_topics_subject ON syllabus_topics(subject_id);
CREATE INDEX idx_syllabus_topics_content ON syllabus_topics(generated_content_id);

-- Improvement 1: link understanding entries to a canonical topic (nullable for backward compat)
ALTER TABLE understanding_entries
  ADD COLUMN topic_id UUID REFERENCES syllabus_topics(id) ON DELETE SET NULL;
