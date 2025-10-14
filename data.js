// ✅ data.js - خواندن داده از Google Sheet به جای داده‌ی ثابت

// لینک CSV شیت خود را اینجا بگذار 👇
const sheetUrl = "https://docs.google.com/spreadsheets/d/1iGQNZWDl_4n53u4T-otJvsuA_3ooKJjmF12KvQDY_JU/gviz/tq?tqx=out:csv";

async function loadUserData() {
  try {
    const response = await fetch(sheetUrl);
    const csv = await response.text();

    // جدا کردن سطرها و ستون‌ها
    const rows = csv.split("\n").map(r => r.split(","));
    const headers = rows.shift().map(h => h.trim());

    // ساخت داده‌ها
    const userData = rows
      .filter(row => row.some(cell => cell.trim() !== "")) // حذف ردیف‌های خالی
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = row[i] ? row[i].trim() : "";
        });

        // بخش لینک‌ها
        obj.links = {
          finalResult: obj.finalResult,
          applicationForm: obj.applicationForm,
          uploadPassport: obj.uploadPassport,
          uploadPhoto: obj.uploadPhoto,
          uploadIdentityDocs: obj.uploadIdentityDocs,
          viewUNHCRLetter: obj.viewUNHCRLetter,
          uploadProofOfDanger: obj.uploadProofOfDanger,
          uploadResidenceDocs: obj.uploadResidenceDocs,
          uploadEducationJobDocs: obj.uploadEducationJobDocs,
          viewAppointmentDetails: obj.viewAppointmentDetails,
          viewPaymentConfirmation: obj.viewPaymentConfirmation,
          uploadFingerprints: obj.uploadFingerprints,
          trackApplicationStatus: obj.trackApplicationStatus,
          finalReviewChecklist: obj.finalReviewChecklist,
          interviewGuideFaqs: obj.interviewGuideFaqs,
          downloadVisaLetter: obj.downloadVisaLetter,
          downloadAllDocsInfo: obj.downloadAllDocsInfo
        };

        return obj;
      });

    console.log("✅ داده‌ها از Google Sheet بارگذاری شدند:", userData);
    return userData;
  } catch (error) {
    console.error("❌ خطا در بارگذاری داده‌ها:", error);
    return [];
  }
}

// اگر می‌خواهی هنگام لود صفحه داده‌ها آماده باشند:
let userData = [];
loadUserData().then(data => {
  userData = data;
  console.log("📦 userData آماده است:", userData);
});
