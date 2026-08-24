BEGIN;

-- 16 new approved questions: 4 for LO_GK3_NAT_01 (to reach 6 approved),
-- 6 each for LO_GK3_NAT_02 and LO_GK3_NAT_03 (previously none).
INSERT INTO public.question_bank
  (id, org_id, book_id, outcome_id, kind, difficulty, prompt, options, correct_answer, explanation, status, source)
VALUES
  ('66600000-0000-4000-8000-000000000101', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000001', 'fill_blank', 1, 'The national anthem of India, ''Jana Gana Mana'', was written by ______.', NULL, 'Rabindranath Tagore', 'Rabindranath Tagore wrote Jana Gana Mana. It was adopted as the national anthem in 1950.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000102', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000001', 'true_false', 2, 'The Lion Capital of Ashoka is the national emblem of India.', NULL, 'True', 'The national emblem is adapted from the Lion Capital of Ashoka at Sarnath.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000103', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000001', 'mcq', 2, 'Which flower is the national flower of India?', '["Lotus", "Rose", "Marigold", "Jasmine"]', 'Lotus', 'The lotus is the national flower of India and symbolises purity.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000104', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000001', 'mcq', 3, 'The national song ''Vande Mataram'' is taken from which novel by Bankim Chandra Chatterjee?', '["Anandamath", "Gitanjali", "Gora", "Devdas"]', 'Anandamath', 'Vande Mataram appears in the novel Anandamath (1882) by Bankim Chandra Chatterjee.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000201', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000002', 'mcq', 1, 'What is the capital city of Maharashtra?', '["Mumbai", "Pune", "Nagpur", "Nashik"]', 'Mumbai', 'Mumbai is the capital of Maharashtra and India''s financial centre.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000202', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000002', 'mcq', 2, 'Which Indian city was formerly known as Bombay?', '["Mumbai", "Chennai", "Kolkata", "Hyderabad"]', 'Mumbai', 'Bombay was officially renamed Mumbai in 1995.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000203', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000002', 'fill_blank', 2, 'The capital of Rajasthan is ______.', NULL, 'Jaipur', 'Jaipur, the Pink City, is the capital of Rajasthan.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000204', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000002', 'true_false', 3, 'Kolkata was formerly called Calcutta.', NULL, 'True', 'Calcutta was officially renamed Kolkata in 2001.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000205', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000002', 'mcq', 3, 'What is the capital of Karnataka?', '["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"]', 'Bengaluru', 'Bengaluru is the capital of Karnataka and a major technology hub.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000206', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000002', 'short_answer', 4, 'Which city, the capital of Tamil Nadu, was formerly known as Madras?', NULL, 'Chennai', 'Madras was officially renamed Chennai in 1996.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000301', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000003', 'mcq', 1, 'In which city is the Taj Mahal located?', '["Agra", "Delhi", "Jaipur", "Lucknow"]', 'Agra', 'The Taj Mahal stands on the banks of the Yamuna river in Agra, Uttar Pradesh.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000302', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000003', 'mcq', 2, 'The Gateway of India is a famous monument in which city?', '["Mumbai", "Delhi", "Chennai", "Kolkata"]', 'Mumbai', 'The Gateway of India overlooks the harbour in Mumbai.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000303', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000003', 'fill_blank', 2, 'The Red Fort, a famous Mughal monument, is located in ______.', NULL, 'Delhi', 'The Red Fort (Lal Qila) is in Delhi; the Prime Minister addresses the nation from it on Independence Day.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000304', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000003', 'true_false', 3, 'The Qutub Minar in Delhi is the tallest brick minaret in the world.', NULL, 'True', 'The Qutub Minar is about 73 metres tall and is the world''s tallest brick minaret.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000305', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000003', 'mcq', 3, 'The Ajanta and Ellora caves are located in which Indian state?', '["Maharashtra", "Gujarat", "Rajasthan", "Madhya Pradesh"]', 'Maharashtra', 'The Ajanta and Ellora cave temples are near Aurangabad in Maharashtra.', 'approved', 'manual'),
  ('66600000-0000-4000-8000-000000000306', '11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', '66500000-0000-4000-8000-000000000003', 'short_answer', 4, 'Name the town in Odisha famous for its Sun Temple.', NULL, 'Konark', 'The Konark Sun Temple is a 13th-century chariot-shaped temple in Odisha.', 'approved', 'manual');

-- Generated diagnostic: weights 34/33/33 over 9 questions -> 3/3/3
-- (largest remainder). Per outcome, first approved questions by
-- (difficulty, id): NAT_01 0001/0101/0002, NAT_02 0201/0202/0203,
-- NAT_03 0301/0302/0303.
INSERT INTO public.assessments
  (id, org_id, created_by, title, description, subject, topic, grade, kind, status, time_limit_minutes, book_id, unit_id)
VALUES
  ('cc000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', NULL,
   'My Country — Unit Diagnostic (Auto)',
   'Generated by the Diagnostic Engine from blueprint weights (34/33/33 -> 3/3/3 of 9 questions). Construction only: not assigned to any learner.',
   'General Knowledge', 'My Country', 3, 'diagnostic', 'published', 20,
   '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000001'),
  ('cc000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', NULL,
   'My Country — Unit Reassessment (Auto)',
   'Generated by the Diagnostic Engine as a reassessment blueprint: zero question overlap with the unit diagnostic; every question was previously unused.',
   'General Knowledge', 'My Country', 3, 'reassessment', 'draft', 20,
   '66000000-0000-4000-8000-000000000003', '66100000-0000-4000-8000-000000000001');

INSERT INTO public.assessment_question_map (assessment_id, question_id, sort_order, points) VALUES
  ('cc000001-0000-4000-8000-000000000001', '66600000-0000-4000-8000-000000000001', 1, 1),
  ('cc000001-0000-4000-8000-000000000001', '66600000-0000-4000-8000-000000000101', 2, 1),
  ('cc000001-0000-4000-8000-000000000001', '66600000-0000-4000-8000-000000000002', 3, 1),
  ('cc000001-0000-4000-8000-000000000001', '66600000-0000-4000-8000-000000000201', 4, 1),
  ('cc000001-0000-4000-8000-000000000001', '66600000-0000-4000-8000-000000000202', 5, 1),
  ('cc000001-0000-4000-8000-000000000001', '66600000-0000-4000-8000-000000000203', 6, 1),
  ('cc000001-0000-4000-8000-000000000001', '66600000-0000-4000-8000-000000000301', 7, 1),
  ('cc000001-0000-4000-8000-000000000001', '66600000-0000-4000-8000-000000000302', 8, 1),
  ('cc000001-0000-4000-8000-000000000001', '66600000-0000-4000-8000-000000000303', 9, 1),
  ('cc000002-0000-4000-8000-000000000002', '66600000-0000-4000-8000-000000000102', 1, 1),
  ('cc000002-0000-4000-8000-000000000002', '66600000-0000-4000-8000-000000000103', 2, 1),
  ('cc000002-0000-4000-8000-000000000002', '66600000-0000-4000-8000-000000000104', 3, 1),
  ('cc000002-0000-4000-8000-000000000002', '66600000-0000-4000-8000-000000000204', 4, 1),
  ('cc000002-0000-4000-8000-000000000002', '66600000-0000-4000-8000-000000000205', 5, 1),
  ('cc000002-0000-4000-8000-000000000002', '66600000-0000-4000-8000-000000000206', 6, 1),
  ('cc000002-0000-4000-8000-000000000002', '66600000-0000-4000-8000-000000000304', 7, 1),
  ('cc000002-0000-4000-8000-000000000002', '66600000-0000-4000-8000-000000000305', 8, 1),
  ('cc000002-0000-4000-8000-000000000002', '66600000-0000-4000-8000-000000000306', 9, 1);

INSERT INTO public.book_events (org_id, book_id, actor_id, event, detail) VALUES
  ('11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', NULL, 'diagnostic_generated',
   '{"assessmentId": "cc000001-0000-4000-8000-000000000001", "unitId": "66100000-0000-4000-8000-000000000001", "engine": "sprint-6f", "totalQuestions": 9, "weights": {"LO_GK3_NAT_01": 34, "LO_GK3_NAT_02": 33, "LO_GK3_NAT_03": 33}, "allocation": {"LO_GK3_NAT_01": 3, "LO_GK3_NAT_02": 3, "LO_GK3_NAT_03": 3}, "method": "largest_remainder", "selection": "approved questions ordered by (difficulty, id)"}'),
  ('11111111-1111-4111-8111-111111111111', '66000000-0000-4000-8000-000000000003', NULL, 'diagnostic_generated',
   '{"assessmentId": "cc000002-0000-4000-8000-000000000002", "unitId": "66100000-0000-4000-8000-000000000001", "engine": "sprint-6f", "template": "reassessment", "baselineAssessmentId": "cc000001-0000-4000-8000-000000000001", "totalQuestions": 9, "overlapWithBaseline": 0, "reusedQuestions": 0, "rule": "exclude baseline questions; prefer globally unused approved questions; reuse only when alternatives are exhausted"}');

COMMIT;