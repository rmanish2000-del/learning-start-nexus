# MPBSE design correction (against Figma handoff fa5fcde0)

The handoff stated MPBSE Class 10 Mathematics has a single paper. This is wrong.
MPBSE publishes separate **Mathematics Basic** and **Mathematics Standard** model papers
for 2026 (verified on mpbse.nic.in, 2026-10-02; see content/mpbse/).

Implementation: the MPBSE panel on Exam Pattern shows a Basic / Standard filter for
Mathematics; Science has no stream filter. MPBSE copy defaults to Hindi (`lang="hi"`)
with an English switch; CBSE and the rest of the app stay English.
