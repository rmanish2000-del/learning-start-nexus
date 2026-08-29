import { fetchDiagnosticCatalog } from "../src/lib/parent-diagnostic.server";
const cat = await fetchDiagnosticCatalog();
for (const b of cat) {
  console.log(`${b.subject} — ${b.bookTitle} (${b.units.length} sellable unit(s))`);
  for (const u of b.units) console.log(`   ${u.title}: outcomes=${u.outcomes} approvedVerified=${u.approvedQuestions} diagnosticSize=${u.questionCount}`);
}
