import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Target, Trophy, Wallet, Activity, 
  Calendar, Edit3, Sliders, PlusCircle, Trash2, 
  Milestone, Newspaper, Search, Cpu, Sparkles, Check, AlertCircle 
} from 'lucide-react';

export default function App() {
  // --- 1. React States & Initialization ---
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('dca_10m_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    // Fallback Initial Mock Data
    return [
      { id: "1", month: "มกราคม 2569", amount: 45000, nvdaVal: 15200, googlVal: 14800, amdVal: 15000 },
      { id: "2", month: "กุมภาพันธ์ 2569", amount: 45000, nvdaVal: 32000, googlVal: 29500, amdVal: 30500 },
      { id: "3", month: "มีนาคม 2569", amount: 50000, nvdaVal: 52000, googlVal: 46000, amdVal: 50000 },
      { id: "4", month: "เมษายน 2569", amount: 55000, nvdaVal: 76000, googlVal: 62000, amdVal: 72000 },
      { id: "5", month: "พฤษภาคม 2569", amount: 60000, nvdaVal: 108000, googlVal: 87000, amdVal: 90000 }
    ];
  });

  // Target Configuration States
  const [expectedReturn, setExpectedReturn] = useState(() => {
    const saved = localStorage.getItem('dca_10m_expected_return');
    return saved ? parseFloat(saved) : 12;
  });

  const [targetGoal, setTargetGoal] = useState(() => {
    const saved = localStorage.getItem('dca_10m_target_goal');
    return saved ? parseFloat(saved) : 10000000;
  });

  // Draft Input Form States (Also persisted so users don't lose typed data on refresh)
  const [draftMonth, setDraftMonth] = useState(() => localStorage.getItem('dca_draft_month') || "มิถุนายน 2569");
  const [draftAmount, setDraftAmount] = useState(() => localStorage.getItem('dca_draft_amount') || "30000");
  const [draftNvda, setDraftNvda] = useState(() => localStorage.getItem('dca_draft_nvda') || "10000");
  const [draftGoogl, setDraftGoogl] = useState(() => localStorage.getItem('dca_draft_googl') || "10000");
  const [draftAmd, setDraftAmd] = useState(() => localStorage.getItem('dca_draft_amd') || "10000");

  // Save Status & Toast Indicator States
  const [saveStatus, setSaveStatus] = useState("saved"); // "saving" | "saved"
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [aiNews, setAiNews] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState("");

  const saveTimeoutRef = useRef(null);

  // --- 2. Auto-Save via useEffect ---
  useEffect(() => {
    // Set status to saving immediately when inputs or settings change
    setSaveStatus("saving");

    // Save to local storage
    localStorage.setItem('dca_10m_history', JSON.stringify(history));
    localStorage.setItem('dca_10m_expected_return', expectedReturn.toString());
    localStorage.setItem('dca_10m_target_goal', targetGoal.toString());
    localStorage.setItem('dca_draft_month', draftMonth);
    localStorage.setItem('dca_draft_amount', draftAmount);
    localStorage.setItem('dca_draft_nvda', draftNvda);
    localStorage.setItem('dca_draft_googl', draftGoogl);
    localStorage.setItem('dca_draft_amd', draftAmd);

    // Debounce the "Saved" status feedback for better UX
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus("saved");
    }, 600);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [history, expectedReturn, targetGoal, draftMonth, draftAmount, draftNvda, draftGoogl, draftAmd]);

  // --- 3. Custom Calculations & Projection Logic ---
  const totalCost = history.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Latest actual record value calculations
  const latestRecord = history.length > 0 ? history[history.length - 1] : null;
  const currentNvdaValue = latestRecord ? parseFloat(latestRecord.nvdaVal) || 0 : 0;
  const currentGooglValue = latestRecord ? parseFloat(latestRecord.googlVal) || 0 : 0;
  const currentAmdValue = latestRecord ? parseFloat(latestRecord.amdVal) || 0 : 0;
  const latestAssetValue = currentNvdaValue + currentGooglValue + currentAmdValue;

  // Cost basis per stock (Equal-Weight approach)
  const costBasisPerStock = totalCost / 3;

  // ROI calculations
  const totalGain = latestAssetValue - totalCost;
  const roiPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Challenge Progress
  const progressPct = Math.min((latestAssetValue / targetGoal) * 100, 100);

  // Compounding Solver to reach Target Goal
  const avgMonthlyDca = history.length > 0 ? totalCost / history.length : 30000;
  
  const calculateMonthsToGoal = (pv, pmt, annualRate, target) => {
    if (pmt <= 0) return Infinity;
    if (pv >= target) return 0;
    
    const r = (annualRate / 100) / 12;
    if (r === 0) return (target - pv) / pmt;

    let currentVal = pv;
    let months = 0;
    const maxMonths = 1200; // 100 year ceiling
    
    while (currentVal < target && months < maxMonths) {
      currentVal = currentVal * (1 + r) + pmt;
      months++;
    }
    return months;
  };

  const monthsToGo = calculateMonthsToGoal(latestAssetValue, avgMonthlyDca, expectedReturn, targetGoal);
  const yearsRemaining = monthsToGo !== Infinity ? Math.floor(monthsToGo / 12) : null;
  const monthsRemaining = monthsToGo !== Infinity ? Math.round(monthsToGo % 12) : null;

  // Dynamic MoM comparison
  let momChangePct = null;
  if (history.length > 1) {
    const currentInput = parseFloat(draftAmount) || 0;
    const prevAmount = history[history.length - 1].amount;
    momChangePct = ((currentInput - prevAmount) / prevAmount) * 100;
  }

  // --- 4. Interactive Actions ---
  const triggerToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleAddRecord = (e) => {
    e.preventDefault();
    const amount = parseFloat(draftAmount);
    const nvda = parseFloat(draftNvda);
    const googl = parseFloat(draftGoogl);
    const amd = parseFloat(draftAmd);

    if (!draftMonth.trim() || isNaN(amount) || amount <= 0 || isNaN(nvda) || isNaN(googl) || isNaN(amd)) {
      triggerToast("โปรดตรวจสอบข้อมูลยอดเงินและรอบเดือนให้ถูกต้อง", "error");
      return;
    }

    const newRecord = {
      id: Date.now().toString(),
      month: draftMonth,
      amount,
      nvdaVal: nvda,
      googlVal: googl,
      amdVal: amd
    };

    setHistory([...history, newRecord]);
    
    // Suggest next logical month and clear draft values
    setDraftMonth("");
    setDraftAmount("");
    setDraftNvda("");
    setDraftGoogl("");
    setDraftAmd("");
    
    triggerToast("อัปเดตสถิติยอดทรัพย์สินรวมเรียบร้อยแล้ว!");
  };

  const handleDeleteRecord = (id) => {
    setHistory(history.filter(item => item.id !== id));
    triggerToast("ลบรายการประวัติสำเร็จ");
  };

  const handleReset = () => {
    setHistory([]);
    setDraftMonth("มกราคม 2569");
    setDraftAmount("30000");
    setDraftNvda("10000");
    setDraftGoogl("10000");
    setDraftAmd("10000");
    triggerToast("ล้างข้อมูลพอร์ตสำเร็จ", "success");
  };

  // --- 5. Gemini API Live Search & News ---
  const fetchLiveNews = async () => {
    setAiLoading(true);
    setAiStatusMsg("กำลังเชื่อมต่อผ่าน Google Search เพื่อดึงข้อมูลสัญญาณจริง...");
    setAiNews("");

    const queryPrompt = "Analyze the latest stock trends, earnings, chip rollouts, or strategic growth for NVDA, GOOGL, and AMD as of June 2026. Make it clear if Bullish or Bearish and write in Thai language.";
    const systemPrompt = "คุณคือผู้เชี่ยวชาญทางการเงินระดับสากล สรุปรายงานย่อความเคลื่อนไหวล่าสุดของหุ้น NVDA, GOOGL, AMD เพื่อนำเสนอข่าวกรองการลงทุน (Signals) หลีกเลี่ยง Noise ทั่วไป เน้นผลกระทบต่อพอร์ต DCA ในระยะยาว เขียนวิเคราะห์ในโทนที่ชัดเจน กระชับ เป็นมิตร มีสไตล์ และใช้ภาษาไทยอย่างถูกต้อง";
    const apiKey = ""; 

    let delay = 1000;
    let responseText = "";
    let success = false;

    for (let retry = 1; retry <= 5; retry++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: queryPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [{ "google_search": {} }]
          })
        });

        if (!response.ok) throw new Error("API call failed Status: " + response.status);

        const result = await response.json();
        responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText) {
          success = true;
          break;
        }
      } catch (e) {
        if (retry === 5) break;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    setAiLoading(false);
    setAiStatusMsg("");

    if (success && responseText) {
      setAiNews(responseText);
      triggerToast("อัปเดตสถิติและข่าวสารเรียลไทม์สำเร็จ!");
    } else {
      loadSimulatedNews();
      triggerToast("แสดงรายงานข่าวจำลองเนื่องจากพอร์ตออฟไลน์", "success");
    }
  };

  const loadSimulatedNews = () => {
    const fallbackText = `
**NVIDIA (NVDA)** 🟢 Bullish (ระยะยาว)
- ชิปสถาปัตยกรรม Blackwell มียอดสั่งซื้อสูงสุดเป็นประวัติการณ์จากผู้ให้บริการคลาวด์ขนาดใหญ่ (Hyperscalers) ทำให้อัตรากำไรสุทธิยังคงเติบโตแข็งแกร่งอย่างต่อเนื่อง

**Alphabet (GOOGL)** 🟢 Bullish (ระยะยาว)
- ธุรกิจ Google Cloud เติบโตอย่างโดดเด่นด้วยการประยุกต์ใช้โมเดล Gemini 1.5/2.0 ในซอฟต์แวร์ระดับองค์กร ช่วยชดเชยความผันผวนจากคดีผูกขาด Search Engine ได้ดีเยี่ยม

**Advanced Micro Devices (AMD)** 🟢 Bullish (ระยะยาว)
- การ์ดเร่งความเร็ว AI ตระกูล MI325X ได้รับการตอบรับที่ดีมากจากลูกค้าที่ต้องการกระจายความเสี่ยงจาก NVIDIA ทำให้รักษาส่วนแบ่งทางการตลาดได้อย่างเหนียวแน่น
    `;
    setAiNews(fallbackText);
  };

  // Helper to parse Markdown bold and bullish/bearish emojis in React safely
  const parseMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      if (!line.trim()) return null;
      
      // Replace bullish / bearish text with badges
      let content = line;
      let isBullish = line.includes("Bullish") || line.includes("🟢");
      let isBearish = line.includes("Bearish") || line.includes("🔴");

      return (
        <div key={idx} className="mb-2.5 text-xs text-slate-700 leading-relaxed">
          {isBullish && (
            <span className="inline-flex items-center px-2 py-0.5 mr-2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              🟢 Bullish
            </span>
          )}
          {isBearish && (
            <span className="inline-flex items-center px-2 py-0.5 mr-2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
              🔴 Bearish
            </span>
          )}
          <span>{content.replace(/🟢\s*Bullish/gi, '').replace(/🔴\s*Bearish/gi, '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
        </div>
      );
    });
  };

  // --- 6. Custom SVG Donut Chart Calculation ---
  const totalVal = currentNvdaValue + currentGooglValue + currentAmdValue;
  const nvdaPct = totalVal > 0 ? (currentNvdaValue / totalVal) * 100 : 33.3;
  const googlPct = totalVal > 0 ? (currentGooglValue / totalVal) * 100 : 33.3;
  const amdPct = totalVal > 0 ? (currentAmdValue / totalVal) * 100 : 33.3;

  // Circumference for SVG circle with r=30 is ~188.5
  const circ = 2 * Math.PI * 30;
  const nvdaStroke = (nvdaPct / 100) * circ;
  const googlStroke = (googlPct / 100) * circ;
  const amdStroke = (amdPct / 100) * circ;

  return (
    <div className="bg-gradient-to-br from-[#F4F8FA] via-[#EBF3F8] to-[#DFECF5] text-slate-800 min-h-screen font-sans antialiased">
      
      {/* Header Navigation */}
      <header className="border-b border-[#C0D4E1] bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#78A3D4] text-white rounded-2xl shadow-md shadow-blue-100">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                DCA 10M Challenge Tracker
              </h1>
              <p className="text-[11px] text-[#4A627A]">ระบบ React Auto-Save • ติดตามความมั่งคั่งพอร์ตสไตล์พาสเทล</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#C3EEFA] text-[#2C5270] border border-[#9DCAEB]">
              <span className="w-2 h-2 mr-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Challenge Active
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TOP: 10 Million Challenge Goal Tracker */}
        <div className="bg-gradient-to-r from-[#DAFAFA] via-[#C3EEFA] to-[#AFD5F0] rounded-3xl border border-[#C0D4E1] p-6 sm:p-8 mb-8 shadow-md relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
            <Trophy className="w-96 h-96 text-slate-800" />
          </div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Challenge Pitch */}
            <div className="lg:col-span-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#4A627A] px-2.5 py-1 bg-white/60 rounded-full border border-white/80">
                🏆 CHALLENGE MILESTONE
              </span>
              <h2 className="text-3xl font-extrabold text-slate-800 mt-3 tracking-tight">
                สะสมสู่เป้าหมาย 10 ล้าน ฿
              </h2>
              <p className="text-slate-600 mt-2 text-xs leading-relaxed">
                แถบความคืบหน้านี้คำนวณจาก <strong>"มูลค่าทรัพย์สินรวมในตลาดจริง"</strong> เพื่อเป้าหมายทางการเงินด้วยพลังจากกำไรทบต้น!
              </p>
            </div>

            {/* Live Statistics Dashboard */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Stat 1: Total Cost */}
              <div className="bg-white/80 rounded-2xl p-4 border border-white/60 shadow-sm">
                <div className="text-[10px] text-[#4A627A] font-medium uppercase tracking-wider">เงินต้นสะสมรวม (Cost)</div>
                <div className="text-lg font-bold text-slate-800 mt-1">฿{totalCost.toLocaleString('th-TH')}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">ยอดออมสะสมจริงในระบบ</div>
              </div>

              {/* Stat 2: Current Actual Asset Value */}
              <div className="bg-[#DAFAFA]/95 rounded-2xl p-4 border border-[#C0D4E1] shadow-sm ring-2 ring-[#78A3D4]/20">
                <div className="text-[10px] text-[#2C5270] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-[#78A3D4]" /> ยอดทรัพย์สินปัจจุบัน (Value)
                </div>
                <div className="text-lg font-black text-slate-800 mt-1">฿{latestAssetValue.toLocaleString('th-TH')}</div>
                <div className={`text-[9px] font-bold mt-0.5 ${totalGain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  ROI: {totalGain >= 0 ? '+' : ''}{roiPct.toFixed(2)}%
                </div>
              </div>

              {/* Stat 3: Challenge Completed */}
              <div className="bg-white/80 rounded-2xl p-4 border border-white/60 shadow-sm">
                <div className="text-[10px] text-[#4A627A] font-medium uppercase tracking-wider">ความคืบหน้าสู่เป้าหมาย</div>
                <div className="text-lg font-bold text-[#78A3D4] mt-1">{progressPct.toFixed(2)}%</div>
                <div className="w-full bg-[#CFE0EB] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#78A3D4] to-[#9DCAEB] h-full transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                </div>
              </div>

              {/* Stat 4: Estimated Time Remaining */}
              <div className="bg-white/80 rounded-2xl p-4 border border-white/60 shadow-sm">
                <div className="text-[10px] text-[#4A627A] font-medium uppercase tracking-wider">ปีคาดการณ์ถึงเป้าหมาย</div>
                <div className="text-lg font-extrabold text-slate-800 mt-1">
                  {yearsRemaining !== null ? `${yearsRemaining} ปี ${monthsRemaining} ด.` : '--'}
                </div>
                <div className="text-[9px] text-[#4A627A] mt-0.5">คิดบนฐานการลงทุนเฉลี่ย</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: DCA Calculator & Setup */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* DCA CALCULATOR AND ASSET INPUT */}
            <div className="bg-white border border-[#C0D4E1] rounded-2xl p-6 shadow-sm relative">
              
              {/* Auto-Save Visual Indicator */}
              <div className="absolute top-4 right-4 z-10 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F4F8FA] border border-[#C0D4E1]">
                {saveStatus === "saving" ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    <span className="text-amber-600">⏳ กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-emerald-600">✅ บันทึกเรียบร้อย</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2.5 bg-[#C3EEFA] text-[#4A627A] rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">อัปเดตยอด DCA และทรัพย์สิน</h3>
                  <p className="text-[11px] text-slate-500">ระบบจะทำการ Auto-save ไปยังหน่วยความจำเครื่องทันทีเมื่อคุณกรอก</p>
                </div>
              </div>

              <form onSubmit={handleAddRecord} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Month */}
                  <div>
                    <label className="block text-xs font-semibold text-[#4A627A] mb-1.5">รอบการลงทุน (เดือน)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#78A3D4]">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input 
                        type="text" 
                        value={draftMonth}
                        onChange={(e) => setDraftMonth(e.target.value)}
                        placeholder="เช่น มิถุนายน 2569" 
                        className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-[#C0D4E1] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78A3D4] text-sm"
                        required
                      />
                    </div>
                  </div>
                  {/* DCA Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-[#4A627A] mb-1.5">ยอดเงินที่ DCA รอบนี้ (บาท)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#78A3D4] font-medium">฿</span>
                      <input 
                        type="number" 
                        value={draftAmount}
                        onChange={(e) => setDraftAmount(e.target.value)}
                        placeholder="เงินที่ซื้อเฉลี่ยรอบนี้" 
                        className="block w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-[#C0D4E1] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78A3D4] text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* INDIVIDUAL STOCK MARKET VALUE INPUTS */}
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                    <Activity className="w-4 h-4 text-[#78A3D4]" /> มูลค่าตลาดจริงของหุ้นรายตัว ณ ปัจจุบัน (บาท)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">NVIDIA (NVDA)</label>
                      <input 
                        type="number" 
                        value={draftNvda}
                        onChange={(e) => setDraftNvda(e.target.value)}
                        placeholder="มูลค่าพอร์ต NVDA" 
                        className="block w-full px-3 py-2 bg-[#DAFAFA]/30 border border-[#C0D4E1] rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#78A3D4]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Alphabet (GOOGL)</label>
                      <input 
                        type="number" 
                        value={draftGoogl}
                        onChange={(e) => setDraftGoogl(e.target.value)}
                        placeholder="มูลค่าพอร์ต GOOGL" 
                        className="block w-full px-3 py-2 bg-[#DAFAFA]/30 border border-[#C0D4E1] rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#78A3D4]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">AMD (AMD)</label>
                      <input 
                        type="number" 
                        value={draftAmd}
                        onChange={(e) => setDraftAmd(e.target.value)}
                        placeholder="มูลค่าพอร์ต AMD" 
                        className="block w-full px-3 py-2 bg-[#DAFAFA]/30 border border-[#C0D4E1] rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#78A3D4]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* ADVANCED PROJECTION CONFIGURATION */}
                <div className="p-4 bg-[#CFE0EB]/30 border border-[#C0D4E1]/50 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-[#4A627A] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> ตั้งค่าการคาดการณ์พอร์ต (Projection Settings)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#4A627A] mb-1">ผลตอบแทนปีละเฉลี่ย (%)</label>
                      <input 
                        type="number" 
                        value={expectedReturn}
                        onChange={(e) => setExpectedReturn(parseFloat(e.target.value) || 0)}
                        className="block w-full px-3 py-1.5 bg-white border border-[#C0D4E1] rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#78A3D4]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#4A627A] mb-1">มูลค่ารวมเป้าหมาย (บาท)</label>
                      <input 
                        type="number" 
                        value={targetGoal}
                        onChange={(e) => setTargetGoal(parseFloat(e.target.value) || 0)}
                        className="block w-full px-3 py-1.5 bg-white border border-[#C0D4E1] rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#78A3D4]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-1">
                  <button type="submit" className="flex-1 bg-[#78A3D4] hover:bg-[#8BADD3] text-white font-semibold py-2.5 px-4 rounded-xl transition duration-200 flex items-center justify-center space-x-2 text-sm shadow-md shadow-blue-200">
                    <PlusCircle className="w-4 h-4" />
                    <span>บันทึกความคืบหน้า DCA ของเดือนนี้</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleReset}
                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-[#C0D4E1] rounded-xl text-slate-500 hover:text-slate-700 transition duration-200 text-sm"
                  >
                    ล้างข้อมูล
                  </button>
                </div>
              </form>
            </div>

            {/* ALLOCATION RESULTS */}
            <div className="bg-white border border-[#C0D4E1] rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2.5 bg-[#DAFAFA] text-[#4A627A] rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800">สัดส่วนพอร์ตจริง & อัตรากำไรสุทธิ</h3>
                    <p className="text-[11px] text-slate-500">เปรียบเทียบสัดส่วนมูลค่าตลาดที่เปลี่ยนไปจากต้นทุนจริง</p>
                  </div>
                </div>
                {momChangePct !== null && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${momChangePct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    MoM: {momChangePct >= 0 ? '+' : ''}{momChangePct.toFixed(1)}%
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* SVG Reactive Donut Chart */}
                <div className="relative flex justify-center items-center h-48">
                  <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 80 80">
                    {/* Background Circle */}
                    <circle cx="40" cy="40" r="30" fill="transparent" stroke="#F1F5F9" strokeWidth="8" />
                    
                    {/* NVDA Arc */}
                    <circle 
                      cx="40" cy="40" r="30" fill="transparent" 
                      stroke="#78A3D4" strokeWidth="8" 
                      strokeDasharray={`${nvdaStroke} ${circ}`} 
                      strokeDashoffset={0} 
                    />
                    
                    {/* GOOGL Arc */}
                    <circle 
                      cx="40" cy="40" r="30" fill="transparent" 
                      stroke="#9DCAEB" strokeWidth="8" 
                      strokeDasharray={`${googlStroke} ${circ}`} 
                      strokeDashoffset={-nvdaStroke} 
                    />
                    
                    {/* AMD Arc */}
                    <circle 
                      cx="40" cy="40" r="30" fill="transparent" 
                      stroke="#AFD5F0" strokeWidth="8" 
                      strokeDasharray={`${amdStroke} ${circ}`} 
                      strokeDashoffset={-(nvdaStroke + googlStroke)} 
                    />
                  </svg>
                  <div className="absolute flex flex-col justify-center items-center text-center">
                    <span className="text-[9px] text-[#4A627A] uppercase tracking-widest font-semibold">มูลค่ารวมพอร์ต</span>
                    <span className="text-base font-extrabold text-slate-800">฿{latestAssetValue.toLocaleString('th-TH')}</span>
                  </div>
                </div>

                {/* Grid Allocation Details with Actual Performance */}
                <div className="space-y-3">
                  {/* NVDA */}
                  <div className="p-3 bg-gradient-to-r from-emerald-50/30 to-white border border-[#C0D4E1]/40 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-[#78A3D4]"></div>
                      <div>
                        <div className="font-bold text-xs text-slate-700">NVIDIA Corporation (NVDA)</div>
                        <div className="text-[9px] text-slate-400">ทุนสะสม: ฿{Math.round(costBasisPerStock).toLocaleString('th-TH')} ({nvdaPct.toFixed(1)}%)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-800">฿{currentNvdaValue.toLocaleString('th-TH')}</span>
                      <div className={`text-[10px] font-bold ${currentNvdaValue >= costBasisPerStock ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {costBasisPerStock > 0 ? `${((currentNvdaValue - costBasisPerStock) / costBasisPerStock * 100).toFixed(1)}%` : '0%'}
                      </div>
                    </div>
                  </div>
                  {/* GOOGL */}
                  <div className="p-3 bg-gradient-to-r from-[#DAFAFA]/30 to-white border border-[#C0D4E1]/40 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-[#9DCAEB]"></div>
                      <div>
                        <div className="font-bold text-xs text-slate-700">Alphabet Inc. (GOOGL)</div>
                        <div className="text-[9px] text-slate-400">ทุนสะสม: ฿{Math.round(costBasisPerStock).toLocaleString('th-TH')} ({googlPct.toFixed(1)}%)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-800">฿{currentGooglValue.toLocaleString('th-TH')}</span>
                      <div className={`text-[10px] font-bold ${currentGooglValue >= costBasisPerStock ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {costBasisPerStock > 0 ? `${((currentGooglValue - costBasisPerStock) / costBasisPerStock * 100).toFixed(1)}%` : '0%'}
                      </div>
                    </div>
                  </div>
                  {/* AMD */}
                  <div className="p-3 bg-gradient-to-r from-[#C3EEFA]/30 to-white border border-[#C0D4E1]/40 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-[#AFD5F0]"></div>
                      <div>
                        <div className="font-bold text-xs text-slate-700">Advanced Micro Devices (AMD)</div>
                        <div className="text-[9px] text-slate-400">ทุนสะสม: ฿{Math.round(costBasisPerStock).toLocaleString('th-TH')} ({amdPct.toFixed(1)}%)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-800">฿{currentAmdValue.toLocaleString('th-TH')}</span>
                      <div className={`text-[10px] font-bold ${currentAmdValue >= costBasisPerStock ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {costBasisPerStock > 0 ? `${((currentAmdValue - costBasisPerStock) / costBasisPerStock * 100).toFixed(1)}%` : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HISTORY LEDGER WITH ACTUAL VALUE */}
            <div className="bg-white border border-[#C0D4E1] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2.5 bg-[#CFE0EB] text-[#4A627A] rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800">บันทึกประวัติเปรียบเทียบและการเติบโต</h3>
                    <p className="text-[11px] text-slate-500">ติดตามยอดสะสมจริงรายเดือนของสินทรัพย์ในพอร์ต</p>
                  </div>
                </div>
                <span className="text-xs text-[#2C5270] bg-[#C3EEFA] px-3 py-1 rounded-full border border-[#9DCAEB] font-bold">
                  {history.length} เดือนที่บันทึก
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="border-b border-[#C0D4E1] text-slate-500">
                      <th className="pb-3 font-semibold">เดือนที่ลงทุน</th>
                      <th className="pb-3 font-semibold text-right">ยอด DCA รอบนั้น</th>
                      <th className="pb-3 font-semibold text-right">มูลค่าพอร์ตรวมจริง</th>
                      <th className="pb-3 font-semibold text-center">กำไรสะสม (ROI)</th>
                      <th className="pb-3 font-semibold text-center">ความก้าวหน้า</th>
                      <th className="pb-3 font-semibold text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C0D4E1]/30">
                    {history.slice().reverse().map((record, index) => {
                      const actualValue = record.nvdaVal + record.googlVal + record.amdVal;
                      // cumulative cost up to this point in the chronological list
                      const chronoIndex = history.findIndex(h => h.id === record.id);
                      const cumulativeCostAtPoint = history.slice(0, chronoIndex + 1).reduce((sum, h) => sum + h.amount, 0);
                      const gainLossAtPoint = actualValue - cumulativeCostAtPoint;
                      const roiAtPoint = cumulativeCostAtPoint > 0 ? (gainLossAtPoint / cumulativeCostAtPoint) * 100 : 0;
                      const progressAtPoint = (actualValue / targetGoal) * 100;

                      return (
                        <tr key={record.id} className="hover:bg-[#CFE0EB]/10 transition">
                          <td className="py-3 font-medium text-slate-700">{record.month}</td>
                          <td className="py-3 text-right font-bold text-slate-800">฿{record.amount.toLocaleString()}</td>
                          <td className="py-3 text-right text-emerald-600 font-bold">฿{actualValue.toLocaleString()}</td>
                          <td className={`py-3 text-center font-semibold ${roiAtPoint >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {roiAtPoint >= 0 ? '+' : ''}{roiAtPoint.toFixed(1)}%
                          </td>
                          <td className="py-3 text-center font-semibold text-[#4A627A]">{progressAtPoint.toFixed(1)}%</td>
                          <td className="py-3 text-center">
                            <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-400 hover:text-rose-500 transition p-1">
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {history.length === 0 && (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-xs">ไม่มีรายการบันทึกประวัติการลงทุนในขณะนี้</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: AI Terminal & Projection */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* CHALLENGE FUTURE CALCULATOR INTERACTIVE */}
            <div className="bg-white border border-[#C0D4E1] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <div className="p-2.5 bg-[#C3EEFA] text-[#4A627A] rounded-xl">
                  <Milestone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">เครื่องพยากรณ์อิสรภาพ "10 ล้าน"</h3>
                  <p className="text-[11px] text-slate-500">จำลองบนสมมติฐานพอร์ตปัจจุบัน & ยอดเฉลี่ย</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="bg-[#DAFAFA]/50 border border-[#C0D4E1] p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs text-[#4A627A]">
                    <span>สินทรัพย์ปัจจุบันตั้งต้น:</span>
                    <strong className="text-slate-800">฿{latestAssetValue.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-xs text-[#4A627A]">
                    <span>ยอดลงทุนต่อเดือนเฉลี่ย:</span>
                    <strong className="text-slate-800">฿{Math.round(avgMonthlyDca).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-xs text-[#4A627A]">
                    <span>ผลตอบแทนสมมติหารต่อปี:</span>
                    <strong className="text-slate-800">{expectedReturn}%</strong>
                  </div>
                  <div className="border-t border-[#C0D4E1]/40 my-2 pt-2 flex justify-between text-sm">
                    <span className="font-bold text-slate-700">จะบรรลุเป้าหมายในอีก:</span>
                    <strong className="text-[#78A3D4] font-black text-lg">
                      {yearsRemaining !== null ? `${yearsRemaining} ปี ${monthsRemaining} เดือน` : '--'}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-[#CFE0EB]/20 rounded-xl border border-[#C0D4E1]/30">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    💡 <strong>พลังของดอกเบี้ยทบต้น:</strong> การอัปเดตยอดจริงรายเดือนช่วยพยากรณ์ได้อย่างแม่นยำที่สุด การเติบโตของกลุ่ม AI คาดหวังการทบต้นเฉลี่ยปีละ 12% เป็นสถิติที่เหมาะสม
                  </p>
                </div>
              </div>
            </div>

            {/* AI LATEST BRIEFING AND STRATEGIC NEWS */}
            <div className="bg-white border border-[#C0D4E1] rounded-2xl p-6 shadow-sm relative flex flex-col h-full min-h-[480px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2.5 bg-[#DAFAFA] text-[#4A627A] rounded-xl">
                    <Newspaper className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800">AI Financial News Terminal</h3>
                    <p className="text-[11px] text-slate-500">บทความวิเคราะห์สัญญาณทิศทางล่าสุดรายวัน</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#9DCAEB]/20 text-[#4A627A] border border-[#78A3D4]/20">GEMINI LIVE</span>
              </div>

              <div className="mb-4 p-3 bg-slate-50 border border-[#C0D4E1] rounded-xl space-y-3">
                <div className="flex items-center justify-between bg-transparent">
                  <span className="text-[11px] font-bold text-[#4A627A]">สำรวจสถานะหุ้นเทคโนโลยี:</span>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={fetchLiveNews}
                    className="flex-1 bg-gradient-to-r from-[#78A3D4] to-[#9DCAEB] hover:opacity-90 text-white font-semibold py-2 rounded-lg transition duration-200 text-xs flex items-center justify-center space-x-1.5 shadow-md"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>ค้นหาข่าวสาร AI วันนี้</span>
                  </button>
                  <button 
                    onClick={loadSimulatedNews}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-[#C0D4E1] rounded-lg text-xs transition"
                  >
                    ข่าวจำลอง
                  </button>
                </div>
                
                {aiLoading && (
                  <div className="flex items-center space-x-2 justify-center py-1.5 text-xs text-[#78A3D4]">
                    <span className="animate-spin h-4 w-4 border-2 border-[#78A3D4] border-t-transparent rounded-full"></span>
                    <span>{aiStatusMsg}</span>
                  </div>
                )}
              </div>

              {/* News Output Workspace */}
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px] pr-1">
                {aiNews ? (
                  <div className="space-y-4 bg-[#C3EEFA]/10 p-4 rounded-xl border border-[#C0D4E1]">
                    <div className="flex items-center space-x-2 text-xs text-[#4A627A] font-bold uppercase mb-2">
                      <Sparkles className="w-4 h-4 text-[#78A3D4]" />
                      <span>สรุปสัญญาณตลาดเรียลไทม์ (AI Daily Brief)</span>
                    </div>
                    <div>
                      {parseMarkdown(aiNews)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Cpu className="w-12 h-12 mx-auto text-[#9DCAEB] mb-3" />
                    <p className="text-xs font-semibold text-slate-600">วิเคราะห์สัญญาณของวันนี้พร้อมเสิร์ฟ</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[280px] mx-auto">กดดึงข้อมูลล่าสุดเพื่อให้อัปเดตสถานะของตลาดแบบ Signal ไร้ Noise รบกวน</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Custom Toast Alert */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 bg-white border border-[#C0D4E1] text-slate-800 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 transition-all duration-300">
          <div className="p-1 bg-[#DAFAFA] text-[#2C5270] rounded-lg">
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}