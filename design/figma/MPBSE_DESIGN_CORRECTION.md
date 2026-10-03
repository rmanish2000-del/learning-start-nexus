# MPBSE design correction (against Figma handoff fa5fcde0)

The handoff stated MPBSE Class 10 Mathematics has a single paper. This is wrong.
MPBSE publishes separate **Mathematics Basic** and **Mathematics Standard** model papers
for 2026 (verified on mpbse.nic.in, 2026-10-02; see content/mpbse/).

Implementation: the MPBSE panel on Exam Pattern shows a Basic / Standard filter for
Mathematics; Science has no stream filter. The panel is English-only (`lang="en"`), like
the rest of EduOS: the Hindi-default variant proposed in the staging handoff was rejected by
the founder on 2026-10-03 (product remains English-only, D9/G5).
