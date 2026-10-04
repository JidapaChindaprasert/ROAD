const fs = require('fs');
const file = 'src/features/reports/components/thai-repair-request-modal.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. imports
code = code.replace(
  `import { formatCoordinates } from "@/lib/utils";`,
  `import { formatCoordinates } from "@/lib/utils";
import html2pdf from "html2pdf.js";`
);

// 2. default values
code = code.replace(`const [writtenAt, setWrittenAt] = React.useState(locationLabel);`, `const [writtenAt, setWrittenAt] = React.useState("");`);
code = code.replace(`const [moo, setMoo] = React.useState("3");`, `const [moo, setMoo] = React.useState("");`);
code = code.replace(`const [ban, setBan] = React.useState("หนองไฮ");`, `const [ban, setBan] = React.useState("");`);
code = code.replace(`const [recipient, setRecipient] = React.useState("นายกองค์การบริหารส่วนตำบลหนองไฮ");`, `const [recipient, setRecipient] = React.useState("");`);
code = code.replace(`const [roadName, setRoadName] = React.useState(defaultRoadName);`, `const [roadName, setRoadName] = React.useState("");`);
code = code.replace(`const [damageLength, setDamageLength] = React.useState("35");`, `const [damageLength, setDamageLength] = React.useState("");`);
code = code.replace(`const [damageDescription, setDamageDescription] = React.useState(
    report.category === "pothole"
      ? "เป็นหลุม บ่อ ขนาดใหญ่และขอบถนนกะเทาะ"
      : report.category === "crack"
      ? "มีรอยแตกร้าวรุนแรง ผิวจราจรหลุดร่อน"
      : report.category === "subsidence"
      ? "ทรุดตัวเป็นแอ่งลึก เป็นอันตรายต่อการสัญจร"
      : "ชำรุดเสียหาย เป็นหลุม บ่อ มีน้ำท่วมขัง"
  );`, `const [damageDescription, setDamageDescription] = React.useState("");`);
code = code.replace(`const [applicantName, setApplicantName] = React.useState("นายสมศักดิ์ พัฒนาไทย");`, `const [applicantName, setApplicantName] = React.useState("");`);
code = code.replace(`const [applicantPosition, setApplicantPosition] = React.useState("ผู้ใหญ่บ้านหมู่ที่ 3 / สมาชิกสภา อบต.");`, `const [applicantPosition, setApplicantPosition] = React.useState("");`);

// 3. handlePrint
code = code.replace(`  const handlePrint = () => {
    window.print();
  };`, `  const handlePrint = () => {
    const element = document.getElementById("official-thai-petition-paper");
    const opt = {
      margin: 10,
      filename: \`ROAD_petition_\${report.publicId}.pdf\`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };`);

// 4. Garuda
code = code.replace(`<div className="flex flex-col items-center justify-center pb-2 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-slate-700 print:border-black flex items-center justify-center font-bold text-xs uppercase tracking-wider bg-slate-50 print:bg-transparent shadow-2xs">
              ตราครุฑ
            </div>
          </div>`, `<div className="flex flex-col items-center justify-center pb-2 text-center">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Garuda_Emblem_of_Thailand.svg/200px-Garuda_Emblem_of_Thailand.svg.png" crossOrigin="anonymous" alt="ตราครุฑ" className="w-16 h-16 object-contain" />
          </div>`);

// 5. Remove AI part
const aiPart = `{report.aiAnalysis && (
                  <div>
                    <strong>การวิเคราะห์ระบบ AI:</strong>{" "}
                    <span>
                      {report.aiAnalysis.summary} (ความแม่นยำ {(report.aiAnalysis.confidenceScore! * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 print:text-black pt-1">
                  ตรวจสอบและยืนยันผ่านระบบ ROAD Civic Damage Intelligence Platform
                </div>`;
code = code.replace(aiPart, ``);

fs.writeFileSync(file, code);
