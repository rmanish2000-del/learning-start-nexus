-- Read-only evidence export for the Class 10 2026-27 verification pass.
--
-- Emits a single JSON document describing the live curriculum tree (books ->
-- units -> chapters -> topics -> curriculum outcomes), the assessment-outcome
-- layer that questions actually attach to, and question counts split by
-- editorial status and verification state.
--
-- SELECT only. Never modifies the database.

WITH question_rollup AS (
  SELECT q.outcome_id,
         count(*)::int                                                                   AS total,
         count(*) FILTER (WHERE q.status = 'approved')::int                              AS approved,
         count(*) FILTER (WHERE q.verification_state = 'verified')::int                  AS verified,
         count(*) FILTER (WHERE q.status = 'approved'
                            AND q.verification_state = 'verified')::int                  AS diagnostic_eligible,
         count(*) FILTER (WHERE q.status = 'draft')::int                                 AS draft,
         (SELECT jsonb_agg(DISTINCT k) FROM question_bank q2, LATERAL (SELECT q2.kind AS k) s
           WHERE q2.outcome_id = q.outcome_id)                                           AS kinds,
         (SELECT jsonb_agg(DISTINCT d) FROM question_bank q3, LATERAL (SELECT q3.difficulty AS d) s
           WHERE q3.outcome_id = q.outcome_id)                                           AS difficulties
  FROM question_bank q
  GROUP BY q.outcome_id
),
assessment_outcome_rows AS (
  SELECT ao.unit_id,
         jsonb_agg(
           jsonb_build_object(
             'assessmentOutcomeId', ao.id,
             'code', ao.code,
             'title', ao.title,
             'status', ao.status,
             'declaredQuestionTypes', ao.question_types,
             'questionTotal', coalesce(r.total, 0),
             'questionApproved', coalesce(r.approved, 0),
             'questionVerified', coalesce(r.verified, 0),
             'questionDiagnosticEligible', coalesce(r.diagnostic_eligible, 0),
             'questionDraft', coalesce(r.draft, 0),
             'questionKinds', coalesce(r.kinds, '[]'::jsonb),
             'questionDifficulties', coalesce(r.difficulties, '[]'::jsonb),
             'linkedCurriculumOutcomeIds', coalesce(
               (SELECT jsonb_agg(om.curriculum_outcome_id ORDER BY om.curriculum_outcome_id)
                  FROM outcome_map om WHERE om.assessment_outcome_id = ao.id), '[]'::jsonb)
           ) ORDER BY ao.code
         ) AS rows
  FROM assessment_outcomes ao
  GROUP BY ao.unit_id
),
topic_rows AS (
  SELECT t.chapter_id,
         jsonb_agg(
           jsonb_build_object(
             'topicId', t.id,
             'title', t.title,
             'position', t.position,
             'curriculumOutcomes', coalesce(
               (SELECT jsonb_agg(jsonb_build_object(
                          'curriculumOutcomeId', o.id,
                          'text', o.text,
                          'status', o.status,
                          'assessmentOutcomeIds', coalesce(
                            (SELECT jsonb_agg(om.assessment_outcome_id ORDER BY om.assessment_outcome_id)
                               FROM outcome_map om WHERE om.curriculum_outcome_id = o.id), '[]'::jsonb))
                        ORDER BY o.position)
                  FROM curriculum_outcomes o WHERE o.topic_id = t.id), '[]'::jsonb)
           ) ORDER BY t.position, t.title
         ) AS rows
  FROM curriculum_topics t
  GROUP BY t.chapter_id
),
chapter_rows AS (
  SELECT c.unit_id,
         jsonb_agg(
           jsonb_build_object(
             'chapterId', c.id,
             'title', c.title,
             'position', c.position,
             'topics', coalesce(tr.rows, '[]'::jsonb)
           ) ORDER BY c.position, c.title
         ) AS rows
  FROM curriculum_chapters c
  LEFT JOIN topic_rows tr ON tr.chapter_id = c.id
  GROUP BY c.unit_id
),
unit_rows AS (
  SELECT u.book_id,
         jsonb_agg(
           jsonb_build_object(
             'unitId', u.id,
             'title', u.title,
             'status', u.status,
             'position', u.position,
             'chapters', coalesce(cr.rows, '[]'::jsonb),
             'assessmentOutcomes', coalesce(ar.rows, '[]'::jsonb)
           ) ORDER BY u.position, u.title
         ) AS rows
  FROM curriculum_units u
  LEFT JOIN chapter_rows cr ON cr.unit_id = u.id
  LEFT JOIN assessment_outcome_rows ar ON ar.unit_id = u.id
  GROUP BY u.book_id
)
SELECT jsonb_pretty(jsonb_build_object(
  'contractVersion', '1.0.0',
  'board', 'CBSE',
  'classLevel', 10,
  'academicYear', '2026-27',
  'books', coalesce(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'bookId', b.id,
         'title', b.title,
         'subject', b.subject,
         'status', b.status,
         'units', coalesce(ur.rows, '[]'::jsonb)
       ) ORDER BY b.subject, b.title)
     FROM books b
     LEFT JOIN unit_rows ur ON ur.book_id = b.id
     WHERE b.subject IN ('Mathematics', 'Science')), '[]'::jsonb)
));
