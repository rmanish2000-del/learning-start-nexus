import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLearnersTool from "./tools/list-learners";
import getLearnerGapsTool from "./tools/get-learner-gaps";
import listAssessmentsTool from "./tools/list-assessments";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "eduos-foundation",
  title: "EduOS Foundation",
  version: "0.1.0",
  instructions:
    "Tools for EduOS, a learning intelligence platform for tutoring centres. Use `list_learners` to find learners, `get_learner_gaps` to inspect a learner's detected learning gaps, and `list_assessments` to review assessments. All data is scoped to the signed-in user's organisation and permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listLearnersTool, getLearnerGapsTool, listAssessmentsTool] as never,
});
