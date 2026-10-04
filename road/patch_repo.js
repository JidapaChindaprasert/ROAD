const fs = require('fs');

// 1. Interface
let interfaceCode = fs.readFileSync('src/lib/repositories/report-repository.ts', 'utf8');
interfaceCode = interfaceCode.replace('listMyReports(userId?: string): Promise<ReportDetail[]>;', 'listMyReports(userId?: string): Promise<ReportDetail[]>;\n\n  listAllReports?(): Promise<ReportDetail[]>;');
fs.writeFileSync('src/lib/repositories/report-repository.ts', interfaceCode);

// 2. Demo Repo
let demoRepoCode = fs.readFileSync('src/lib/repositories/demo-report-repository.ts', 'utf8');
demoRepoCode = demoRepoCode.replace(
  'async listMyReports(userId?: string): Promise<ReportDetail[]> {',
  'async listAllReports(): Promise<ReportDetail[]> {\n    return getStoredDemoReports();\n  }\n\n  async listMyReports(userId?: string): Promise<ReportDetail[]> {'
);
fs.writeFileSync('src/lib/repositories/demo-report-repository.ts', demoRepoCode);

// 3. Supabase Repo
let supaRepoCode = fs.readFileSync('src/lib/repositories/supabase-report-repository.ts', 'utf8');
supaRepoCode = supaRepoCode.replace(
  'async listMyReports(userId?: string): Promise<ReportDetail[]> {',
  `async listAllReports(): Promise<ReportDetail[]> {
    const supabase = this.getClient();
    const { data: reports, error } = await supabase
      .from("reports")
      .select(\`*, assigned_team:teams(id, name, public_display_name)\`)
      .order("created_at", { ascending: false });
    if (error) return [];
    return reports.map((r: any) => mapDbReportToDetail({
      ...r,
      public_longitude: r.public_location?.coordinates?.[0] ?? 100.5018,
      public_latitude: r.public_location?.coordinates?.[1] ?? 13.7563,
      exact_longitude: r.exact_location?.coordinates?.[0],
      exact_latitude: r.exact_location?.coordinates?.[1],
    }, { isStaff: true }));
  }

  async listMyReports(userId?: string): Promise<ReportDetail[]> {`
);
fs.writeFileSync('src/lib/repositories/supabase-report-repository.ts', supaRepoCode);

// 4. Report Queue
let queueCode = fs.readFileSync('src/features/operations/report-queue.tsx', 'utf8');
queueCode = queueCode.replace(
  'repository.listMyReports().then(setReports);',
  'if (repository.listAllReports) repository.listAllReports().then(setReports); else repository.listMyReports().then(setReports);'
);
fs.writeFileSync('src/features/operations/report-queue.tsx', queueCode);

// 5. Fix thai-repair-request-modal.tsx TS error
let modalCode = fs.readFileSync('src/features/reports/components/thai-repair-request-modal.tsx', 'utf8');
modalCode = modalCode.replace(
  `  const handlePrint = () => {
    const element = document.getElementById("official-thai-petition-paper");
    const opt = {
      margin: 10,
      filename: \`ROAD_petition_\${report.publicId}.pdf\`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };`,
  `  const handlePrint = () => {
    const element = document.getElementById("official-thai-petition-paper");
    if (!element) return;
    const opt: import('html2pdf.js').Html2PdfOptions = {
      margin: 10,
      filename: \`ROAD_petition_\${report.publicId}.pdf\`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };`
);
fs.writeFileSync('src/features/reports/components/thai-repair-request-modal.tsx', modalCode);

