-- Sprint 6G: two submitted sessions on the 6F pilot diagnostic
-- (cc000001 "My Country — Unit Diagnostic (Auto)", book 66000000-...-0003).
-- Answers are keyed by question_bank id; the result breakdown uses
-- subtopic = assessment outcome code so per-outcome evidence is traceable.
--
-- Diagnostic map (3 pts per question):
--   NAT_01 National Symbols : 66600000-...-000000000001, ...0101, ...0002
--   NAT_02 States & Capitals: ...0201, ...0202, ...0203
--   NAT_03 Monuments        : ...0301, ...0302, ...0303
--
-- Aarav (dd000001): 6/9 -> NAT_01 100% (Advanced), NAT_02 67% (Developing),
--                    NAT_03 33% (Beginning)
-- Diya  (dd000002): 4/9 -> NAT_01 67% (Developing), NAT_02 33% (Beginning),
--                    NAT_03 33% (Beginning)

INSERT INTO public.assessment_sessions (
  id, org_id, assessment_id, learner_id, assigned_by, status,
  answers, current_position, score_pct, correct_count, total_count,
  result, due, started_at, last_activity_at, submitted_at, created_at, updated_at
) VALUES
(
  'dd000001-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'cc000001-0000-4000-8000-000000000001',
  'ccccccc1-0000-4000-8000-000000000001',
  'eeeeeee1-0000-4000-8000-000000000001',
  'submitted',
  '{
    "66600000-0000-4000-8000-000000000001": "Bengal Tiger",
    "66600000-0000-4000-8000-000000000101": "Rabindranath Tagore",
    "66600000-0000-4000-8000-000000000002": "Peacock",
    "66600000-0000-4000-8000-000000000201": "Mumbai",
    "66600000-0000-4000-8000-000000000202": "Mumbai",
    "66600000-0000-4000-8000-000000000203": "Jodhpur",
    "66600000-0000-4000-8000-000000000301": "Agra",
    "66600000-0000-4000-8000-000000000302": "Delhi",
    "66600000-0000-4000-8000-000000000303": "Jaipur"
  }'::jsonb,
  9, 67, 6, 9,
  '[
    {"item_id":"66600000-0000-4000-8000-000000000001","subtopic":"NAT_01","given":"Bengal Tiger","correct_answer":"Bengal Tiger","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000101","subtopic":"NAT_01","given":"Rabindranath Tagore","correct_answer":"Rabindranath Tagore","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000002","subtopic":"NAT_01","given":"Peacock","correct_answer":"Peacock","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000201","subtopic":"NAT_02","given":"Mumbai","correct_answer":"Mumbai","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000202","subtopic":"NAT_02","given":"Mumbai","correct_answer":"Mumbai","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000203","subtopic":"NAT_02","given":"Jodhpur","correct_answer":"Jaipur","correct":false},
    {"item_id":"66600000-0000-4000-8000-000000000301","subtopic":"NAT_03","given":"Agra","correct_answer":"Agra","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000302","subtopic":"NAT_03","given":"Delhi","correct_answer":"Mumbai","correct":false},
    {"item_id":"66600000-0000-4000-8000-000000000303","subtopic":"NAT_03","given":"Jaipur","correct_answer":"Delhi","correct":false}
  ]'::jsonb,
  NULL,
  '2026-08-22T09:00:00Z', '2026-08-22T09:24:00Z', '2026-08-22T09:24:00Z',
  '2026-08-22T09:00:00Z', '2026-08-22T09:24:00Z'
),
(
  'dd000002-0000-4000-8000-000000000002',
  '11111111-1111-4111-8111-111111111111',
  'cc000001-0000-4000-8000-000000000001',
  'ccccccc1-0000-4000-8000-000000000002',
  'eeeeeee1-0000-4000-8000-000000000001',
  'submitted',
  '{
    "66600000-0000-4000-8000-000000000001": "Bengal Tiger",
    "66600000-0000-4000-8000-000000000101": "Rabindranath Tagore",
    "66600000-0000-4000-8000-000000000002": "Sparrow",
    "66600000-0000-4000-8000-000000000201": "Mumbai",
    "66600000-0000-4000-8000-000000000202": "Delhi",
    "66600000-0000-4000-8000-000000000203": "Udaipur",
    "66600000-0000-4000-8000-000000000301": "Agra",
    "66600000-0000-4000-8000-000000000302": "Kolkata",
    "66600000-0000-4000-8000-000000000303": "Agra"
  }'::jsonb,
  9, 44, 4, 9,
  '[
    {"item_id":"66600000-0000-4000-8000-000000000001","subtopic":"NAT_01","given":"Bengal Tiger","correct_answer":"Bengal Tiger","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000101","subtopic":"NAT_01","given":"Rabindranath Tagore","correct_answer":"Rabindranath Tagore","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000002","subtopic":"NAT_01","given":"Sparrow","correct_answer":"Peacock","correct":false},
    {"item_id":"66600000-0000-4000-8000-000000000201","subtopic":"NAT_02","given":"Mumbai","correct_answer":"Mumbai","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000202","subtopic":"NAT_02","given":"Delhi","correct_answer":"Mumbai","correct":false},
    {"item_id":"66600000-0000-4000-8000-000000000203","subtopic":"NAT_02","given":"Udaipur","correct_answer":"Jaipur","correct":false},
    {"item_id":"66600000-0000-4000-8000-000000000301","subtopic":"NAT_03","given":"Agra","correct_answer":"Agra","correct":true},
    {"item_id":"66600000-0000-4000-8000-000000000302","subtopic":"NAT_03","given":"Kolkata","correct_answer":"Mumbai","correct":false},
    {"item_id":"66600000-0000-4000-8000-000000000303","subtopic":"NAT_03","given":"Agra","correct_answer":"Delhi","correct":false}
  ]'::jsonb,
  NULL,
  '2026-08-23T10:00:00Z', '2026-08-23T10:21:00Z', '2026-08-23T10:21:00Z',
  '2026-08-23T10:00:00Z', '2026-08-23T10:21:00Z'
)
ON CONFLICT (id) DO NOTHING;