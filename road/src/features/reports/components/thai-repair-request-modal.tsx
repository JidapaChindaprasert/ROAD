"use client";

import * as React from "react";
import { ReportDetail } from "../types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Edit3, Eye, FileText } from "lucide-react";
import { formatCoordinates } from "@/lib/utils";
import {
  getSafeImageUrl,
  CATEGORY_FALLBACK_IMAGES,
  DEFAULT_ROAD_DAMAGE_IMAGE,
} from "@/lib/constants/fallback-images";

export interface ThaiRepairRequestModalProps {
  report: ReportDetail;
  isOpen: boolean;
  onClose: () => void;
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function parseThaiDate(dateString?: string) {
  if (!dateString) {
    return { day: "29", month: "กันยายน", year: "2569" };
  }
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    return { day: "29", month: "กันยายน", year: "2569" };
  }
  return {
    day: d.getDate().toString(),
    month: THAI_MONTHS[d.getMonth()] || "กันยายน",
    year: (d.getFullYear() + 543).toString(),
  };
}

export function ThaiRepairRequestModal({
  report,
  isOpen,
  onClose,
}: ThaiRepairRequestModalProps) {
  // Derive Thai Buddhist Era Date from report created date
  const initialDate = parseThaiDate(report.createdAt);

  // Extract address elements
  const locationLabel = report.localityLabel || "ตำบลหนองไฮ";
  const defaultRoadName =
    report.title.replace(/^Deep Asphalt Pothole on\s*/i, "").replace(/^Severe\s*/i, "") || "สายหลักในชุมชน";

  // Form State for interactive editing
  const [writtenAt, setWrittenAt] = React.useState(locationLabel);
  const [moo, setMoo] = React.useState("3");
  const [ban, setBan] = React.useState("หนองไฮ");
  const [day, setDay] = React.useState(initialDate.day);
  const [month, setMonth] = React.useState(initialDate.month);
  const [year, setYear] = React.useState(initialDate.year);
  const [recipient, setRecipient] = React.useState("นายกองค์การบริหารส่วนตำบลหนองไฮ");
  const [roadName, setRoadName] = React.useState(defaultRoadName);
  const [damageLength, setDamageLength] = React.useState("35");
  const [damageDescription, setDamageDescription] = React.useState(
    report.category === "pothole"
      ? "เป็นหลุม บ่อ ขนาดใหญ่และขอบถนนกะเทาะ"
      : report.category === "crack"
      ? "มีรอยแตกร้าวรุนแรง ผิวจราจรหลุดร่อน"
      : report.category === "subsidence"
      ? "ทรุดตัวเป็นแอ่งลึก เป็นอันตรายต่อการสัญจร"
      : "ชำรุดเสียหาย เป็นหลุม บ่อ มีน้ำท่วมขัง"
  );
  const [applicantName, setApplicantName] = React.useState("นายสมศักดิ์ พัฒนาไทย");
  const [applicantPosition, setApplicantPosition] = React.useState("ผู้ใหญ่บ้านหมู่ที่ 3 / สมาชิกสภา อบต.");
  const [isEditing, setIsEditing] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="p-0 overflow-hidden max-w-4xl">
      {/* Top Toolbar (Hidden when printing) */}
      <div className="print:hidden p-4 sm:p-5 bg-surface border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">
              หนังสือขอความอนุเคราะห์ซ่อมแซมถนน (แบบฟอร์มราชการ)
            </h3>
            <p className="text-xs text-text-secondary">
              ดึงข้อมูลอัตโนมัติจากรายงาน {report.publicId} • พร้อมพิมพ์หรือบันทึกเป็น PDF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-semibold gap-1.5"
          >
            {isEditing ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
            <span>{isEditing ? "ดูตัวอย่างเอกสาร" : "แก้ไขข้อความ"}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="text-xs font-bold gap-1.5 shadow-sm bg-brand hover:bg-brand-hover text-white"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>พิมพ์แบบฟอร์มราชการ (PDF)</span>
          </Button>
        </div>
      </div>

      {/* Interactive Edit Fields Panel (Collapsible) */}
      {isEditing && (
        <div className="print:hidden p-4 sm:p-5 bg-surface-muted/60 border-b border-border space-y-3 text-xs">
          <div className="font-bold text-text-primary flex items-center gap-1.5">
            <Edit3 className="h-3.5 w-3.5 text-brand" />
            <span>ปรับแต่งข้อมูลก่อนพิมพ์ (Auto-informed Fields):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">สถานที่เขียน (เขียนที่):</label>
              <input
                type="text"
                value={writtenAt}
                onChange={(e) => setWrittenAt(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">หมู่ที่:</label>
              <input
                type="text"
                value={moo}
                onChange={(e) => setMoo(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">บ้าน / ชุมชน:</label>
              <input
                type="text"
                value={ban}
                onChange={(e) => setBan(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">เรียน (ตำแหน่งผู้รับ):</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">ชื่อถนน / สายทาง:</label>
              <input
                type="text"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">ระยะทางที่ชำรุด (เมตร):</label>
              <input
                type="text"
                value={damageLength}
                onChange={(e) => setDamageLength(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">วันที่:</label>
              <input
                type="text"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">เดือน:</label>
              <input
                type="text"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">พ.ศ.:</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary font-medium mb-1">ชื่อผู้ยื่นคำร้อง:</label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
            <div>
              <label className="block text-text-secondary font-medium mb-1">ตำแหน่งผู้ยื่น:</label>
              <input
                type="text"
                value={applicantPosition}
                onChange={(e) => setApplicantPosition(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-secondary font-medium mb-1">ลักษณะความเสียหาย:</label>
            <input
              type="text"
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg bg-surface border border-border text-xs"
            />
          </div>
        </div>
      )}

      {/* Printable Official Letter Paper Document (Matches uploaded government letter template) */}
      <div className="p-4 sm:p-8 max-h-[75vh] overflow-y-auto bg-slate-100 flex justify-center print:p-0 print:m-0 print:bg-white print:max-h-none print:overflow-visible">
        <div
          id="official-thai-petition-paper"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-14 shadow-lg print:shadow-none print:p-8 text-black font-serif text-[15px] sm:text-[16px] leading-[1.8] space-y-6"
          style={{ fontFamily: "'TH Sarabun New', 'Sarabun', 'Noto Serif Thai', Garamond, serif" }}
        >
          {/* Top Center: Official Royal Thai Garuda Emblem (ตราครุฑ) */}
          <div className="flex flex-col items-center justify-center pb-2 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-slate-700 print:border-black flex items-center justify-center font-bold text-xs uppercase tracking-wider bg-slate-50 print:bg-transparent shadow-2xs">
              ตราครุฑ
            </div>
          </div>

          {/* Header Right: Written At & Date */}
          <div className="flex flex-col items-end text-right space-y-1">
            <div>
              เขียนที่ <span className="font-semibold underline decoration-dotted underline-offset-4">{writtenAt}</span>{" "}
              หมู่ที่ <span className="font-semibold underline decoration-dotted underline-offset-4">{moo}</span>{" "}
              บ้าน <span className="font-semibold underline decoration-dotted underline-offset-4">{ban}</span>
            </div>
            <div>
              วันที่ <span className="font-semibold underline decoration-dotted underline-offset-4">{day}</span>{" "}
              เดือน <span className="font-semibold underline decoration-dotted underline-offset-4">{month}</span>{" "}
              พ.ศ. <span className="font-semibold underline decoration-dotted underline-offset-4">{year}</span>
            </div>
          </div>

          {/* Subject & Recipient Left */}
          <div className="space-y-2 pt-2">
            <div>
              <strong className="font-bold">เรื่อง</strong> ขอความอนุเคราะห์ซ่อมแซมถนน{" "}
              <span className="text-xs font-mono text-slate-500 print:text-black">
                (รหัสคำร้อง: {report.publicId})
              </span>
            </div>
            <div>
              <strong className="font-bold">เรียน</strong>{" "}
              <span className="font-semibold underline decoration-dotted underline-offset-4">{recipient}</span>
            </div>
          </div>

          {/* Paragraph 1: Problem Statement */}
          <div className="text-justify indent-12 pt-2">
            ด้วย ถนนดิน/ ถนนลูกรังสาย{" "}
            <span className="font-semibold underline decoration-dotted underline-offset-4">{roadName}</span>{" "}
            หมู่ที่ <span className="font-semibold underline decoration-dotted underline-offset-4">{moo}</span>{" "}
            บ้าน <span className="font-semibold underline decoration-dotted underline-offset-4">{ban}</span>{" "}
            ระยะทางยาวประมาณ{" "}
            <span className="font-semibold underline decoration-dotted underline-offset-4">{damageLength}</span>{" "}
            เมตร ได้เกิดการชำรุดเสียหาย {damageDescription}{" "}
            เป็นเหตุให้ประชาชนผู้ใช้เส้นทางไม่ได้รับความสะดวก และอาจเกิดอันตรายต่อชีวิตและทรัพย์สินในการสัญจรไปมา
          </div>

          {/* Paragraph 2: Petition Request */}
          <div className="text-justify indent-12">
            ดังนั้น จึงขอความอนุเคราะห์มายัง {recipient} ในการพิจารณาจัดส่งเจ้าหน้าที่และเครื่องจักรเข้าตรวจสอบ
            พร้อมดำเนินการซ่อมแซมถนนสายดังกล่าวข้างต้น ให้สามารถกลับมาใช้งานได้อย่างมั่นคง ปลอดภัยตามปกติ
            ทั้งนี้เพื่อประโยชน์สุข ความสะดวก และความปลอดภัยของประชาชนภายในหมู่บ้านและพื้นที่ใกล้เคียงต่อไป
          </div>

          {/* Paragraph 3: Closing */}
          <div className="indent-12 pt-1">
            จึงเรียนมาเพื่อโปรดพิจารณาให้ความอนุเคราะห์
          </div>

          {/* Signoff & Signature Block Right */}
          <div className="pt-8 flex flex-col items-end text-center pr-8 sm:pr-12 space-y-2">
            <div>ขอแสดงความนับถือ</div>
            <div className="pt-10">
              (&nbsp;&nbsp;<span className="font-semibold">{applicantName}</span>&nbsp;&nbsp;)
            </div>
            <div className="text-sm">
              ตำแหน่ง {applicantPosition}
            </div>
          </div>

          {/* Attached Evidence Section (Photo & Coordinates Proof) */}
          <div className="pt-10 mt-8 border-t-2 border-dashed border-slate-300 print:border-black/40 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 print:text-black uppercase tracking-wider">
              <span>เอกสารหลักฐานแนบท้ายคำร้อง (ROAD Verified Signal)</span>
              <span>รหัสอ้างอิง: {report.publicId}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {(() => {
                const fallbackImg = CATEGORY_FALLBACK_IMAGES[report.category] || DEFAULT_ROAD_DAMAGE_IMAGE;
                const safeThumb = getSafeImageUrl(report.thumbnailUrl, report.category);

                return (
                  <div className="rounded-xl overflow-hidden border border-slate-300 print:border-black max-h-48 aspect-16/9 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safeThumb}
                      alt={report.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== fallbackImg) {
                          target.src = fallbackImg;
                        }
                      }}
                    />
                  </div>
                );
              })()}

              <div className="space-y-1.5 text-xs text-slate-700 print:text-black">
                <div>
                  <strong>พิกัดดาวเทียม (GPS):</strong>{" "}
                  <span className="font-mono">
                    {formatCoordinates(report.publicLocation.latitude, report.publicLocation.longitude, 5)}
                  </span>
                </div>
                <div>
                  <strong>จุดสังเกต / สถานที่:</strong>{" "}
                  <span>{report.locationContext || report.localityLabel || "กรุงเทพมหานครและปริมณฑล"}</span>
                </div>
                <div>
                  <strong>ประเภทความเสียหาย:</strong>{" "}
                  <span>{report.category}</span>
                </div>
                {report.aiAnalysis && (
                  <div>
                    <strong>การวิเคราะห์ระบบ AI:</strong>{" "}
                    <span>
                      {report.aiAnalysis.summary} (ความแม่นยำ {(report.aiAnalysis.confidenceScore! * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 print:text-black pt-1">
                  ตรวจสอบและยืนยันผ่านระบบ ROAD Civic Damage Intelligence Platform
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
