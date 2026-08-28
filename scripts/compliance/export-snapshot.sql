-- Read-only Class 10 compliance snapshot (see export-snapshot.ts).
select jsonb_pretty(jsonb_build_object(
 'snapshotVersion','1',
 'board','CBSE','classLevel',10,'academicYear','2026-27',
 'generatedBy','scripts/compliance/export-snapshot.ts',
 'catalogue',(select jsonb_agg(jsonb_build_object('code',cs.code,'subjectKey',cs.subject_key,'version',cs.version,'isActive',cs.is_active,'commercialStatus',cs.commercial_status,'reviewState',cs.review_state,'diagnosticEligible',cs.diagnostic_eligible,'reassessmentReady',cs.reassessment_ready,'minQuestionsPerOutcome',cs.min_questions_per_outcome,'diagnosticTarget',cs.diagnostic_target,'diagnosticMinimum',cs.diagnostic_minimum) order by cs.code)
   from catalogue_subjects cs join catalogue_classes cc on cc.id=cs.class_id where cc.class_level=10),
 'books',(select jsonb_agg(jsonb_build_object('id',b.id,'title',b.title,'subject',b.subject,'status',b.status,'board',b.board) order by b.subject,b.title) from books b where b.grade=10),
 'units',(select jsonb_agg(x order by x->>'subject', (x->>'position')::int) from (
    select jsonb_build_object(
      'subject',b.subject,'bookId',b.id,'bookStatus',b.status,'unitId',u.id,'title',u.title,'position',u.position,'status',u.status,
      'chapters',(select jsonb_agg(jsonb_build_object('title',c.title,'position',c.position,'status',c.status,
          'topics',(select jsonb_agg(jsonb_build_object('title',t.title,'position',t.position,'status',t.status) order by t.position) from curriculum_topics t where t.chapter_id=c.id)
        ) order by c.position) from curriculum_chapters c where c.unit_id=u.id),
      'outcomes',(select jsonb_agg(jsonb_build_object('code',o.code,'title',o.title,'status',o.status,'category',o.category,'bloom',o.bloom_level,'difficulty',o.difficulty,
          'atoms',(select count(*) from outcome_map m where m.assessment_outcome_id=o.id),
          'questions',(select count(*) from question_bank q where q.outcome_id=o.id),
          'verified',(select count(*) from question_bank q where q.outcome_id=o.id and q.status='approved' and q.verification_state='verified'),
          'difficulties',(select coalesce(jsonb_object_agg(d.difficulty,d.n),'{}'::jsonb) from (select q.difficulty, count(*) n from question_bank q where q.outcome_id=o.id group by 1) d),
          'kinds',(select coalesce(jsonb_object_agg(k.kind,k.n),'{}'::jsonb) from (select q.kind, count(*) n from question_bank q where q.outcome_id=o.id group by 1) k)
        ) order by o.code) from assessment_outcomes o where o.unit_id=u.id)
    ) x from curriculum_units u join books b on b.id=u.book_id where b.grade=10)
  s(x))
));
