import { useState, useMemo, useEffect, useCallback, useRef } from "react";

const PRICES = [200, 300];
const STORAGE_KEY = "tennis-tracker-data";
const GAPI_CLIENT_ID = "752398545330-l50d1qkb3a1g35niacrter3lcrlk7vqu.apps.googleusercontent.com";
const DRIVE_FILE_NAME = "tennis-string-tracker-backup.json";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

const uid = () => "r" + Date.now() + Math.random().toString(36).slice(2, 6);
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const fmtDateShort = (d) => new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
const fmtDateTime = (d) => new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtMoney = (n) => n.toLocaleString("th-TH");
const MFULL = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

const SAMPLE = [
  { id:"r1",date:"2025-03-01",seq:1,racket:"Wilson Pro Staff 97",string1:"Luxilon ALU Power",string2:"Wilson NXT",price:300,note:"",createdAt:"2025-03-01T10:00:00",updatedAt:"2025-03-01T10:00:00" },
  { id:"r2",date:"2025-03-01",seq:2,racket:"Babolat Pure Aero",string1:"RPM Blast",string2:"VS Touch",price:300,note:"",createdAt:"2025-03-01T10:30:00",updatedAt:"2025-03-01T10:30:00" },
  { id:"r3",date:"2025-03-01",seq:3,racket:"Head Speed MP",string1:"Solinco Hyper-G",string2:"Wilson NXT",price:200,note:"",createdAt:"2025-03-01T11:00:00",updatedAt:"2025-03-01T11:00:00" },
  { id:"r4",date:"2025-03-02",seq:1,racket:"Yonex EZONE 98",string1:"Poly Tour Pro",string2:"Yonex Rexis",price:200,note:"",createdAt:"2025-03-02T09:00:00",updatedAt:"2025-03-02T09:00:00" },
  { id:"r5",date:"2025-03-02",seq:2,racket:"Wilson Blade 98",string1:"Luxilon ALU Power",string2:"Wilson NXT",price:300,note:"ลูกค้าประจำ",createdAt:"2025-03-02T09:30:00",updatedAt:"2025-03-02T12:00:00" },
  { id:"r6",date:"2025-03-05",seq:1,racket:"Babolat Pure Drive",string1:"RPM Blast",string2:"Xcel",price:200,note:"",createdAt:"2025-03-05T08:00:00",updatedAt:"2025-03-05T08:00:00" },
  { id:"r7",date:"2025-03-05",seq:2,racket:"Head Gravity MP",string1:"Solinco Tour Bite",string2:"Wilson NXT",price:300,note:"",createdAt:"2025-03-05T08:30:00",updatedAt:"2025-03-05T08:30:00" },
  { id:"r8",date:"2025-03-05",seq:3,racket:"Wilson Clash 100",string1:"Luxilon Element",string2:"Sensation",price:200,note:"",createdAt:"2025-03-05T09:00:00",updatedAt:"2025-03-05T09:00:00" },
  { id:"r9",date:"2025-03-05",seq:4,racket:"Tecnifibre TF40",string1:"Razor Code",string2:"X-One",price:300,note:"",createdAt:"2025-03-05T09:30:00",updatedAt:"2025-03-05T09:30:00" },
];

// === Google Drive helpers ===
function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function getAccessToken() {
  await loadGsiScript();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GAPI_CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) reject(resp);
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}

async function findDriveFile(token) {
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.files?.[0] || null;
}

async function downloadDriveFile(token, fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function uploadDriveFile(token, records, existingFileId) {
  const metadata = { name: DRIVE_FILE_NAME, mimeType: "application/json" };
  const body = JSON.stringify({ records, savedAt: now() }, null, 2);

  if (existingFileId) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
    });
    return res.json();
  } else {
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", new Blob([body], { type: "application/json" }));
    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return res.json();
  }
}

// === useStore hook ===
function useStore(fallback) {
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data]);
  return [data, setData];
}

export default function App() {
  const [records, setRecords] = useStore(SAMPLE);
  const [tab, setTab] = useState("daily");
  const [selDate, setSelDate] = useState(today());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ racket:"",string1:"",string2:"",price:200,note:"" });
  const [fStart, setFStart] = useState("2025-03-01");
  const [fEnd, setFEnd] = useState(today());
  const [toast, setToast] = useState(null);
  const [delId, setDelId] = useState(null);
  // Google Drive state
  const [gToken, setGToken] = useState(null);
  const [gFileId, setGFileId] = useState(null);
  const [gSyncing, setGSyncing] = useState(false);
  const [gUser, setGUser] = useState(null);
  const [gLastSync, setGLastSync] = useState(null);
  const syncTimer = useRef(null);

  useEffect(() => { if(toast){const t=setTimeout(()=>setToast(null),2200);return()=>clearTimeout(t);} }, [toast]);
  const showToast = (msg, t="s") => setToast({msg,t});

  // Auto-sync to Drive when records change (debounced)
  useEffect(() => {
    if (!gToken) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncToDrive(records);
    }, 3000);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [records, gToken]);

  const syncToDrive = async (data) => {
    if (!gToken) return;
    setGSyncing(true);
    try {
      const result = await uploadDriveFile(gToken, data, gFileId);
      if (result.id) setGFileId(result.id);
      setGLastSync(now());
    } catch (e) {
      console.error("Drive sync failed:", e);
    }
    setGSyncing(false);
  };

  const handleGoogleLogin = async () => {
    try {
      showToast("กำลังเชื่อมต่อ Google...", "s");
      const token = await getAccessToken();
      setGToken(token);
      // Try to find existing file
      const file = await findDriveFile(token);
      if (file) {
        setGFileId(file.id);
        // Ask user if they want to load from Drive
        const driveData = await downloadDriveFile(token, file.id);
        if (driveData.records && driveData.records.length > 0) {
          if (driveData.records.length >= records.length) {
            setRecords(driveData.records);
            showToast("โหลดข้อมูลจาก Drive สำเร็จ ✓", "s");
          } else {
            // Local has more data, upload to drive
            await uploadDriveFile(token, records, file.id);
            showToast("Sync ข้อมูลขึ้น Drive สำเร็จ ✓", "s");
          }
        }
      } else {
        // No file yet, create one
        const result = await uploadDriveFile(token, records, null);
        setGFileId(result.id);
        showToast("สร้างไฟล์ backup บน Drive สำเร็จ ✓", "s");
      }
      setGLastSync(now());
      setGUser(true);
    } catch (e) {
      console.error("Google login failed:", e);
      showToast("เชื่อมต่อ Google ไม่สำเร็จ", "e");
    }
  };

  const handleForceSync = async () => {
    if (!gToken) return;
    setGSyncing(true);
    try {
      await uploadDriveFile(gToken, records, gFileId);
      setGLastSync(now());
      showToast("Sync สำเร็จ ✓", "s");
    } catch {
      showToast("Sync ไม่สำเร็จ", "e");
    }
    setGSyncing(false);
  };

  const handleForceLoad = async () => {
    if (!gToken || !gFileId) return;
    try {
      const driveData = await downloadDriveFile(gToken, gFileId);
      if (driveData.records) {
        setRecords(driveData.records);
        showToast("โหลดข้อมูลจาก Drive สำเร็จ ✓", "s");
      }
    } catch {
      showToast("โหลดไม่สำเร็จ", "e");
    }
  };

  const dayRecs = useMemo(() => records.filter(r => r.date===selDate).sort((a,b)=>a.seq-b.seq), [records,selDate]);
  const allDates = useMemo(() => [...new Set(records.map(r=>r.date))].sort().reverse(), [records]);
  const totalAll = useMemo(() => records.reduce((s,r)=>s+r.price,0), [records]);

  const reset = () => { setForm({racket:"",string1:"",string2:"",price:200,note:""}); setEditId(null); setShowForm(false); };

  const addRec = () => {
    if(!form.racket.trim()) { showToast("กรุณากรอกชื่อไม้","e"); return; }
    const n=now(); setRecords(p=>[...p,{id:uid(),date:selDate,seq:dayRecs.length+1,...form,createdAt:n,updatedAt:n}]);
    reset(); showToast("เพิ่มสำเร็จ ✓");
  };

  const startEdit = r => { setEditId(r.id); setForm({racket:r.racket,string1:r.string1,string2:r.string2,price:r.price,note:r.note}); setShowForm(true); };

  const saveEdit = () => {
    setRecords(p=>p.map(r=>r.id===editId?{...r,...form,updatedAt:now()}:r));
    reset(); showToast("แก้ไขสำเร็จ — updatedAt อัพเดทแล้ว ✓");
  };

  const doDel = () => {
    if(!delId) return;
    const dd=records.find(r=>r.id===delId)?.date;
    setRecords(p=>{const u=p.filter(r=>r.id!==delId);let s=1;return u.map(r=>r.date===dd?{...r,seq:s++}:r);});
    setDelId(null); showToast("ลบแล้ว","w");
  };

  const dailySum = useMemo(()=>{const m={};records.forEach(r=>{if(!m[r.date])m[r.date]={date:r.date,count:0,total:0};m[r.date].count++;m[r.date].total+=r.price;});return Object.values(m).sort((a,b)=>b.date.localeCompare(a.date));},[records]);
  const monthSum = useMemo(()=>{const m={};records.forEach(r=>{const k=r.date.slice(0,7);if(!m[k])m[k]={month:k,count:0,total:0};m[k].count++;m[k].total+=r.price;});return Object.values(m).sort((a,b)=>b.month.localeCompare(a.month));},[records]);
  const fSum = useMemo(()=>{const f=records.filter(r=>r.date>=fStart&&r.date<=fEnd);const c=f.length;const t=f.reduce((s,r)=>s+r.price,0);return{count:c,total:t,c200:f.filter(r=>r.price===200).length,c300:f.filter(r=>r.price===300).length,days:new Set(f.map(r=>r.date)).size,avg:c>0?Math.round(t/c):0};},[records,fStart,fEnd]);

  const TC = toast ? (toast.t==="e"?"#dc2626":toast.t==="w"?"#d97706":"#16a34a") : "";

  return (
    <div style={{minHeight:"100dvh",background:"#0b0f1a",color:"#e2e8f0",fontFamily:"'Sarabun',-apple-system,sans-serif",paddingBottom:80,WebkitTapHighlightColor:"transparent"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&family=Space+Grotesk:wght@500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        input,select,textarea{font-family:inherit;font-size:16px}
        @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        @keyframes pop{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes ts{from{opacity:0;transform:translate(-50%,-16px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .cd{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:16px;animation:up .3s ease}
        .inp{width:100%;padding:12px 14px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:12px;color:#e2e8f0;font-size:16px;outline:none;transition:border .2s,box-shadow .2s}
        .inp:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
        .inp::placeholder{color:#3b4f6f}
        .bt{padding:12px 20px;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:15px;transition:all .15s;font-family:inherit;touch-action:manipulation}
        .bt:active{transform:scale(.96)}
        .bp{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff}
        .bg{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff}
        .bo{background:rgba(255,255,255,.06);color:#94a3b8;border:1px solid rgba(255,255,255,.1)}
        .bd{background:rgba(239,68,68,.12);color:#f87171}
        .ch{padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;border:1.5px solid transparent;white-space:nowrap;touch-action:manipulation}
        .con{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border-color:#3b82f6}
        .cof{background:rgba(255,255,255,.04);color:#4b5e7a;border-color:rgba(255,255,255,.08)}
        .cof:active{background:rgba(255,255,255,.08)}
        .be{font-size:10px;color:#f59e0b;background:rgba(245,158,11,.12);padding:2px 8px;border-radius:6px;display:inline-block;margin-top:3px}
        .bn{position:fixed;bottom:0;left:0;right:0;background:rgba(11,15,26,.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.06);display:flex;padding:6px 0 max(6px,env(safe-area-inset-bottom));z-index:100}
        .ni{flex:1;display:flex;flex-direction:column;align-items:center;padding:6px 0;cursor:pointer;transition:color .2s;touch-action:manipulation}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:flex-end;justify-content:center;animation:fi .15s}
        .mo{background:#151c2c;border:1px solid rgba(255,255,255,.1);border-radius:20px 20px 0 0;padding:24px 20px max(24px,env(safe-area-inset-bottom));width:100%;max-width:480px;animation:up .25s ease;max-height:90dvh;overflow-y:auto}
        .fab{position:fixed;bottom:76px;right:16px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;border:none;cursor:pointer;box-shadow:0 4px 24px rgba(59,130,246,.4);z-index:90;touch-action:manipulation}
        .fab:active{transform:scale(.9)}
        .rc{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px;margin-bottom:8px;animation:up .3s ease;transition:background .1s}
        .rc:active{background:rgba(255,255,255,.05)}
        .st{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px;flex:1;min-width:0}
        .sg{font-family:'Space Grotesk',monospace;font-weight:700}
        .gsync{display:inline-block;width:12px;height:12px;border:2px solid #22c55e;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite}
      `}</style>

      {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:300,animation:"ts .25s ease",padding:"10px 22px",borderRadius:12,background:TC,color:"#fff",fontWeight:700,fontSize:14,boxShadow:"0 8px 32px rgba(0,0,0,.4)",whiteSpace:"nowrap"}}>{toast.msg}</div>}

      {delId&&<div className="ov" onClick={()=>setDelId(null)}><div className="mo" style={{borderRadius:20,maxWidth:340,marginBottom:"20vh"}} onClick={e=>e.stopPropagation()}><div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:40,marginBottom:8}}>🗑</div><div style={{fontWeight:700,fontSize:16}}>ลบรายการนี้?</div><div style={{color:"#64748b",fontSize:13,marginTop:4}}>การลบไม่สามารถย้อนกลับได้</div></div><div style={{display:"flex",gap:10}}><button className="bt bo" style={{flex:1}} onClick={()=>setDelId(null)}>ยกเลิก</button><button className="bt bd" style={{flex:1}} onClick={doDel}>ลบเลย</button></div></div></div>}

      {showForm&&<div className="ov" onClick={reset}><div className="mo" onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:4,background:"rgba(255,255,255,.15)",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{fontWeight:700,fontSize:16}}>{editId?"✏️ แก้ไข":"➕ เพิ่มรายการ"}</h3>
          <div style={{fontSize:12,color:"#64748b"}}>{fmtDate(selDate)}</div>
        </div>
        {editId&&<div style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.2)",borderRadius:10,padding:"8px 12px",marginBottom:14,fontSize:12,color:"#f59e0b"}}>⏱ updatedAt จะอัพเดทอัตโนมัติเมื่อบันทึก</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={{fontSize:12,color:"#64748b",marginBottom:4,display:"block"}}>ชื่อไม้ *</label><input className="inp" placeholder="เช่น Wilson Pro Staff 97" value={form.racket} onChange={e=>setForm({...form,racket:e.target.value})} autoFocus/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label style={{fontSize:12,color:"#64748b",marginBottom:4,display:"block"}}>เอ็น 1 (Main)</label><input className="inp" placeholder="Main" value={form.string1} onChange={e=>setForm({...form,string1:e.target.value})}/></div>
            <div><label style={{fontSize:12,color:"#64748b",marginBottom:4,display:"block"}}>เอ็น 2 (Cross)</label><input className="inp" placeholder="Cross" value={form.string2} onChange={e=>setForm({...form,string2:e.target.value})}/></div>
          </div>
          <div>
            <label style={{fontSize:12,color:"#64748b",marginBottom:8,display:"block"}}>ราคา</label>
            <div style={{display:"flex",gap:10}}>
              {PRICES.map(p=><button key={p} onClick={()=>setForm({...form,price:p})} style={{flex:1,padding:"14px 0",borderRadius:12,border:`2px solid ${form.price===p?(p===200?"#22c55e":"#f59e0b"):"rgba(255,255,255,.1)"}`,background:form.price===p?(p===200?"rgba(34,197,94,.12)":"rgba(245,158,11,.12)"):"rgba(255,255,255,.03)",color:form.price===p?(p===200?"#22c55e":"#f59e0b"):"#64748b",fontWeight:700,fontSize:18,cursor:"pointer",fontFamily:"'Space Grotesk'",transition:"all .15s"}}>฿{p}</button>)}
            </div>
          </div>
          <div><label style={{fontSize:12,color:"#64748b",marginBottom:4,display:"block"}}>หมายเหตุ</label><input className="inp" placeholder="ไม่จำเป็น" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button className="bt bo" style={{flex:1}} onClick={reset}>ยกเลิก</button>
          <button className={`bt ${editId?"bg":"bp"}`} style={{flex:2}} onClick={editId?saveEdit:addRec}>{editId?"💾 บันทึก":"➕ เพิ่ม"}</button>
        </div>
      </div></div>}

      <div style={{maxWidth:480,margin:"0 auto",padding:"16px 12px"}}>
        {/* Header with Google Drive status */}
        <div style={{textAlign:"center",padding:"8px 0 6px"}}>
          <div style={{fontSize:28}}>🎾</div>
          <h1 className="sg" style={{fontSize:22,background:"linear-gradient(135deg,#60a5fa,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>String Tracker</h1>
          <p style={{color:"#374560",fontSize:12}}>บันทึกการขึ้นเอ็นเทนนิส</p>
        </div>

        {/* Google Drive Sync Bar */}
        <div className="cd" style={{marginBottom:14,padding:"10px 14px"}}>
          {!gUser ? (
            <button className="bt" onClick={handleGoogleLogin} style={{width:"100%",padding:"10px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:14}}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              เชื่อมต่อ Google Drive
            </button>
          ) : (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {gSyncing ? <span className="gsync"/> : <span style={{color:"#22c55e",fontSize:14}}>●</span>}
                <span style={{fontSize:12,color:gSyncing?"#f59e0b":"#22c55e",fontWeight:600}}>
                  {gSyncing ? "กำลัง sync..." : "Google Drive เชื่อมต่อแล้ว"}
                </span>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="bt bo" style={{padding:"6px 10px",fontSize:11,borderRadius:8}} onClick={handleForceLoad} title="โหลดจาก Drive">⬇️</button>
                <button className="bt bo" style={{padding:"6px 10px",fontSize:11,borderRadius:8}} onClick={handleForceSync} title="Sync ขึ้น Drive">⬆️</button>
              </div>
            </div>
          )}
          {gLastSync && <div style={{fontSize:10,color:"#3b4f6f",marginTop:6,textAlign:"center"}}>sync ล่าสุด: {fmtDateTime(gLastSync)}</div>}
        </div>

        {tab==="daily"&&<div style={{animation:"fi .25s"}}>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontWeight:700,fontSize:14}}>📅 วันที่</span>
              <input type="date" value={selDate} onChange={e=>{setSelDate(e.target.value);setEditId(null)}} className="inp" style={{width:160,padding:"8px 12px",fontSize:14,marginLeft:"auto"}}/>
            </div>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
              <div className={`ch ${selDate===today()?"con":"cof"}`} onClick={()=>setSelDate(today())}>วันนี้</div>
              {allDates.filter(d=>d!==today()).slice(0,8).map(d=><div key={d} className={`ch ${selDate===d?"con":"cof"}`} onClick={()=>{setSelDate(d);setEditId(null)}}>{fmtDateShort(d)}</div>)}
            </div>
          </div>

          {dayRecs.length>0&&<div style={{display:"flex",gap:8,marginBottom:14}}>
            <div className="st"><div style={{color:"#475569",fontSize:10,fontWeight:600}}>ไม้</div><div className="sg" style={{fontSize:22}}>{dayRecs.length}</div></div>
            <div className="st"><div style={{color:"#475569",fontSize:10,fontWeight:600}}>รายได้</div><div className="sg" style={{fontSize:22,color:"#22c55e"}}>฿{fmtMoney(dayRecs.reduce((s,r)=>s+r.price,0))}</div></div>
            <div className="st"><div style={{color:"#475569",fontSize:10,fontWeight:600}}>เฉลี่ย</div><div className="sg" style={{fontSize:22,color:"#a78bfa"}}>฿{fmtMoney(Math.round(dayRecs.reduce((s,r)=>s+r.price,0)/dayRecs.length))}</div></div>
          </div>}

          {dayRecs.length===0?<div className="cd" style={{textAlign:"center",padding:"48px 16px"}}><div style={{fontSize:36,marginBottom:8}}>📋</div><div style={{color:"#475569",fontSize:14,fontWeight:600}}>ยังไม่มีรายการ</div><div style={{color:"#2d3a52",fontSize:12,marginTop:4}}>กดปุ่ม + ด้านล่างเพื่อเพิ่ม</div></div>
          :dayRecs.map((r,i)=><div key={r.id} className="rc" style={{animationDelay:`${i*.04}s`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start",flex:1,minWidth:0}}>
                <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Grotesk'",fontWeight:700,fontSize:14,color:"#fff",flexShrink:0}}>{r.seq}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.racket}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{r.string1}{r.string2?` / ${r.string2}`:""}</div>
                  {r.note&&<div style={{fontSize:11,color:"#4b5e7a",marginTop:2}}>💬 {r.note}</div>}
                  {r.updatedAt!==r.createdAt&&<div className="be">✏️ แก้ไข {fmtDateTime(r.updatedAt)}</div>}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0,marginLeft:8}}>
                <span className="sg" style={{fontSize:16,color:r.price===300?"#f59e0b":"#22c55e"}}>฿{r.price}</span>
                <div style={{display:"flex",gap:6}}>
                  <button className="bt bo" style={{padding:"6px 10px",fontSize:11,borderRadius:8}} onClick={()=>startEdit(r)}>✏️</button>
                  <button className="bt bd" style={{padding:"6px 10px",fontSize:11,borderRadius:8}} onClick={()=>setDelId(r.id)}>🗑</button>
                </div>
              </div>
            </div>
          </div>)}

          <button className="fab" onClick={()=>{setEditId(null);setForm({racket:"",string1:"",string2:"",price:200,note:""});setShowForm(true);}}>+</button>
        </div>}

        {tab==="summary"&&<div style={{animation:"fi .25s"}}>
          <h2 style={{fontWeight:700,fontSize:16,marginBottom:14}}>📊 สรุปรายวัน</h2>
          {dailySum.map((d,i)=><div key={d.date} className="rc" style={{animationDelay:`${i*.03}s`,cursor:"pointer"}} onClick={()=>{setSelDate(d.date);setTab("daily")}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:600,fontSize:14}}>{fmtDate(d.date)}</div><div style={{fontSize:12,color:"#4b5e7a",marginTop:2}}>{d.count} ไม้ · เฉลี่ย ฿{fmtMoney(Math.round(d.total/d.count))}</div></div>
              <div className="sg" style={{fontSize:18,color:"#22c55e"}}>฿{fmtMoney(d.total)}</div>
            </div>
          </div>)}
          <div style={{background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.15)",borderRadius:14,padding:14,marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,fontSize:14}}>รวมทั้งหมด</div><div style={{fontSize:12,color:"#64748b"}}>{records.length} ไม้ · {allDates.length} วัน</div></div>
            <div className="sg" style={{fontSize:22,color:"#22c55e"}}>฿{fmtMoney(totalAll)}</div>
          </div>
        </div>}

        {tab==="monthly"&&<div style={{animation:"fi .25s"}}>
          <h2 style={{fontWeight:700,fontSize:16,marginBottom:14}}>📅 สรุปรายเดือน</h2>
          {monthSum.map((m,i)=>{const[y,mo]=m.month.split("-");return(
            <div key={m.month} className="rc" style={{animationDelay:`${i*.05}s`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{MFULL[parseInt(mo)-1]} {y}</div>
                  <div style={{fontSize:12,color:"#4b5e7a",marginTop:2}}>{m.count} ไม้ · เฉลี่ย ฿{fmtMoney(Math.round(m.total/m.count))}</div>
                </div>
                <div className="sg" style={{fontSize:20,color:"#22c55e"}}>฿{fmtMoney(m.total)}</div>
              </div>
            </div>
          );})}
          <div style={{background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.15)",borderRadius:14,padding:14,marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700}}>รวมทั้งหมด</div><div style={{fontSize:12,color:"#64748b"}}>{records.length} ไม้</div></div>
            <div className="sg" style={{fontSize:22,color:"#22c55e"}}>฿{fmtMoney(totalAll)}</div>
          </div>
        </div>}

        {tab==="filter"&&<div style={{animation:"fi .25s"}}>
          <div className="cd" style={{marginBottom:14}}>
            <h3 style={{fontWeight:700,fontSize:15,marginBottom:14}}>🔍 เลือกช่วงวันที่</h3>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{flex:1}}><label style={{fontSize:11,color:"#475569",display:"block",marginBottom:4}}>เริ่ม</label><input type="date" className="inp" style={{padding:"10px 12px",fontSize:14}} value={fStart} onChange={e=>setFStart(e.target.value)}/></div>
              <span style={{color:"#374560",marginTop:16}}>→</span>
              <div style={{flex:1}}><label style={{fontSize:11,color:"#475569",display:"block",marginBottom:4}}>สิ้นสุด</label><input type="date" className="inp" style={{padding:"10px 12px",fontSize:14}} value={fEnd} onChange={e=>setFEnd(e.target.value)}/></div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[{l:"จำนวนไม้",v:fSum.count,s:"ไม้",c:"#3b82f6"},{l:"รายได้รวม",v:`฿${fmtMoney(fSum.total)}`,c:"#22c55e"},{l:"เฉลี่ย/ไม้",v:`฿${fmtMoney(fSum.avg)}`,c:"#a78bfa"},{l:"จำนวนวัน",v:fSum.days,s:"วัน",c:"#f59e0b"}].map((s,i)=><div key={i} className="st" style={{animation:`up .3s ease ${i*.06}s both`}}>
              <div style={{color:"#475569",fontSize:11,fontWeight:600,marginBottom:4}}>{s.l}</div>
              <div className="sg" style={{fontSize:24,color:s.c}}>{s.v}</div>
              {s.s&&<div style={{color:"#2d3a52",fontSize:11}}>{s.s}</div>}
            </div>)}
          </div>
          <div className="cd">
            <h4 style={{fontWeight:700,fontSize:14,marginBottom:12}}>แยกตามราคา</h4>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1,padding:14,background:"rgba(34,197,94,.06)",borderRadius:12,border:"1px solid rgba(34,197,94,.12)"}}>
                <div style={{fontSize:11,color:"#475569",fontWeight:600}}>฿200</div>
                <div className="sg" style={{fontSize:20,color:"#22c55e"}}>{fSum.c200}</div>
                <div style={{fontSize:12,color:"#4b5e7a"}}>= ฿{fmtMoney(fSum.c200*200)}</div>
              </div>
              <div style={{flex:1,padding:14,background:"rgba(245,158,11,.06)",borderRadius:12,border:"1px solid rgba(245,158,11,.12)"}}>
                <div style={{fontSize:11,color:"#475569",fontWeight:600}}>฿300</div>
                <div className="sg" style={{fontSize:20,color:"#f59e0b"}}>{fSum.c300}</div>
                <div style={{fontSize:12,color:"#4b5e7a"}}>= ฿{fmtMoney(fSum.c300*300)}</div>
              </div>
            </div>
          </div>
        </div>}
      </div>

      <nav className="bn">
        {[{k:"daily",i:"📝",l:"บันทึก"},{k:"summary",i:"📊",l:"รายวัน"},{k:"monthly",i:"📅",l:"รายเดือน"},{k:"filter",i:"🔍",l:"Filter"}].map(t=>
          <div key={t.k} className="ni" onClick={()=>setTab(t.k)} style={{color:tab===t.k?"#3b82f6":"#3b4f6f"}}>
            <span style={{fontSize:20,marginBottom:2}}>{t.i}</span>
            <span style={{fontSize:10,fontWeight:600}}>{t.l}</span>
          </div>
        )}
      </nav>
    </div>
  );
}
