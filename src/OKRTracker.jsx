import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { OBJECTIVES } from "./objectives.js";

const PIN_KEY = "okr-auth";
const CORRECT = import.meta.env.VITE_APP_PIN;

function AuthScreen({ onUnlock }) {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (value.trim() === (CORRECT || "").trim()) {
      localStorage.setItem(PIN_KEY, "1");
      onUnlock();
    } else {
      setShake(true);
      setValue("");
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",
      background:"#F5F5F7",fontFamily:"'Pretendard Variable',-apple-system,sans-serif",padding:"20px"}}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css');
        .auth-card{background:#fff;border-radius:20px;padding:36px 32px;width:100%;max-width:340px;
          border:1px solid #E5E5EA;box-shadow:0 4px 24px rgba(0,0,0,.06);text-align:center;}
        .auth-card h1{font-size:20px;font-weight:750;letter-spacing:-.3px;margin:0 0 4px;}
        .auth-card p{font-size:12px;color:#AEAEB2;margin:0 0 28px;}
        .auth-inp{width:100%;border:1px solid #E5E5EA;border-radius:10px;padding:11px 14px;
          font-size:15px;font-family:inherit;outline:none;transition:border .15s;
          box-sizing:border-box;text-align:center;letter-spacing:.1em;}
        .auth-inp:focus{border-color:#3B6CFF;}
        .auth-btn{width:100%;padding:11px;border-radius:10px;border:none;background:#3B6CFF;
          color:#fff;font-size:13px;font-weight:650;font-family:inherit;cursor:pointer;
          transition:opacity .15s;margin-top:10px;}
        .auth-btn:hover{opacity:.87;}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
        .shake{animation:shake .4s ease;}
      `}</style>
      <div className="auth-card">
        <h1>OKR Tracker</h1>
        <p>2026 · 민트</p>
        <form onSubmit={submit}>
          <input className={`auth-inp${shake?" shake":""}`} type="password"
            value={value} onChange={e=>setValue(e.target.value)}
            placeholder="비밀번호" autoFocus />
          <button className="auth-btn" type="submit">입장</button>
        </form>
      </div>
    </div>
  );
}

function Ring({ pct, color, size = 48, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EDEDF0" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c - (Math.min(pct,100)/100)*c}
        strokeLinecap="round" style={{transition:"stroke-dashoffset .5s cubic-bezier(.4,0,.2,1)"}}/>
    </svg>
  );
}

function FileChip({ file, onRemove }) {
  const isImg = file.type?.startsWith("image/");
  return (
    <div className="file-chip">
      {isImg && file.dataUrl ? (
        <img src={file.dataUrl} className="file-thumb" alt="" />
      ) : (
        <span className="file-icon">📎</span>
      )}
      <span className="file-name">{file.name}</span>
      <span className="file-size">{(file.size / 1024).toFixed(0)}KB</span>
      {onRemove && <button className="file-rm" onClick={onRemove}>×</button>}
    </div>
  );
}

function LogItem({ log, color, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="log-item">
      <div className="log-timeline">
        <div className="log-dot" style={{ background: color }} />
        <div className="log-line" />
      </div>
      <div className="log-content">
        <div className="log-top">
          <span className="log-date">{log.date}</span>
          <span className="log-tag">{log.krLabel}</span>
          {onEdit && <button className="log-edit" onClick={() => onEdit(log)}>수정</button>}
          <button className="log-del" onClick={() => onDelete(log.id)}>삭제</button>
        </div>
        <p className="log-text">{log.text}</p>
        {log.links?.length > 0 && (
          <div className="log-links">
            {log.links.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="log-link">
                🔗 {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
              </a>
            ))}
          </div>
        )}
        {log.files?.length > 0 && (
          <div className="log-files">
            {log.files.map((f, i) => (
              f.type?.startsWith("image/") && f.dataUrl ? (
                <img key={i} src={f.dataUrl} className="log-img-thumb"
                  onClick={() => setExpanded(expanded === i ? false : i)} alt={f.name} title={f.name} />
              ) : (
                <FileChip key={i} file={f} />
              )
            ))}
          </div>
        )}
        {expanded !== false && log.files?.[expanded]?.dataUrl && (
          <div className="log-img-full" onClick={() => setExpanded(false)}>
            <img src={log.files[expanded].dataUrl} alt="" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function OKRTracker() {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(PIN_KEY) === "1");
  const [progress, setProgress] = useState({});
  const [logs, setLogs] = useState([]);
  const [ready, setReady] = useState(false);
  const [openObj, setOpenObj] = useState(null);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ krId: "", text: "", date: "", files: [], links: [], linkInput: "" });
  const [achievements, setAchievements] = useState([]);
  const [achForm, setAchForm] = useState({ project: "신한카드 프로젝트", pain: "", solution: "", value: "" });
  const [copiedId, setCopiedId] = useState(null);
  const [editLog, setEditLog] = useState(null);
  const [memos, setMemos] = useState([]);
  const [memoText, setMemoText] = useState("");
  const [editMemo, setEditMemo] = useState(null);

  // 데이터 로드
  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      const [
        { data: progressRows },
        { data: logRows },
        { data: achRows },
        { data: memoRows },
      ] = await Promise.all([
        supabase.from("okr_progress").select("*").then(r => r.error ? { data: [] } : r),
        supabase.from("okr_logs").select("*").order("created_at", { ascending: false }).then(r => r.error ? { data: [] } : r),
        supabase.from("okr_achievements").select("*").order("created_at", { ascending: false }).then(r => r.error ? { data: [] } : r),
        supabase.from("okr_memos").select("*").order("created_at", { ascending: false }).then(r => r.error ? { data: [] } : r),
      ]);

      const p = {};
      (progressRows || []).forEach(r => { p[r.kr_id] = r.value; });
      setProgress(p);

      setLogs((logRows || []).map(r => ({
        id: r.id,
        objId: r.obj_id,
        krId: r.kr_id,
        krLabel: r.kr_label,
        text: r.log_text,
        date: r.log_date,
        files: r.files || [],
        links: r.links || [],
      })));

      setAchievements(achRows || []);
      setMemos(memoRows || []);
      setReady(true);
    })();
  }, [unlocked]);

  // 성과 추가
  const addAchievement = async () => {
    if (!achForm.pain.trim() || !achForm.solution.trim() || !achForm.value.trim()) return;
    const id = Date.now().toString();
    const row = { id, ...achForm };
    setAchievements(prev => [row, ...prev]);
    await supabase.from("okr_achievements").insert(row);
    setAchForm(prev => ({ ...prev, pain: "", solution: "", value: "" }));
  };

  const delAchievement = async (id) => {
    setAchievements(prev => prev.filter(a => a.id !== id));
    await supabase.from("okr_achievements").delete().eq("id", id);
  };

  const copyOneLiner = (a) => {
    const text = `[${a.project}] ${a.pain} → ${a.solution} → ${a.value}`;
    navigator.clipboard.writeText(text);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadAchievementsCSV = () => {
    if (!achievements.length) return;
    const esc = s => `"${s.replace(/"/g, '""')}"`;
    const rows = achievements.map(a =>
      `${a.created_at?.slice(0,10) || ""},${esc(a.project)},${esc(a.pain)},${esc(a.solution)},${esc(a.value)}`
    );
    const csv = "날짜,프로젝트,고통,해결,가치\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `성과기록_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // 메모 추가
  const addMemo = async () => {
    if (!memoText.trim()) return;
    const id = Date.now().toString();
    const row = { id, text: memoText.trim(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setMemos(prev => [row, ...prev]);
    setMemoText("");
    await supabase.from("okr_memos").insert(row);
  };

  // 메모 수정 저장
  const saveMemo = async () => {
    if (!memoText.trim()) return;
    const updated_at = new Date().toISOString();
    setMemos(prev => prev.map(m => m.id === editMemo.id ? { ...m, text: memoText.trim(), updated_at } : m));
    await supabase.from("okr_memos").update({ text: memoText.trim(), updated_at }).eq("id", editMemo.id);
    setEditMemo(null);
    setMemoText("");
  };

  // 메모 삭제
  const delMemo = async (id) => {
    setMemos(prev => prev.filter(m => m.id !== id));
    await supabase.from("okr_memos").delete().eq("id", id);
  };

  // 진행도 업데이트
  const updateProgress = useCallback(async (krId, value) => {
    setProgress(prev => ({ ...prev, [krId]: value }));
    await supabase.from("okr_progress").upsert({
      kr_id: krId,
      value,
      updated_at: new Date().toISOString(),
    });
  }, []);

  const inc = (krId, d) => {
    updateProgress(krId, Math.max(0, (progress[krId] || 0) + d));
  };

  const setVal = (krId, val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return;
    updateProgress(krId, num);
  };

  // 로그 추가
  const addLog = async () => {
    if (!form.text.trim() || !form.krId) return;
    const kr = OBJECTIVES.flatMap(o => o.keyResults).find(k => k.id === form.krId);
    const id = Date.now().toString();
    const row = {
      id,
      obj_id: modal,
      kr_id: form.krId,
      kr_label: kr?.label || "",
      log_text: form.text.trim(),
      log_date: form.date || new Date().toISOString().slice(0, 10),
      files: form.files.map(f => ({ name: f.name, size: f.size, type: f.type, dataUrl: f.dataUrl })),
      links: form.links,
    };

    // 낙관적 업데이트
    setLogs(prev => [{
      id, objId: row.obj_id, krId: row.kr_id, krLabel: row.kr_label,
      text: row.log_text, date: row.log_date, files: row.files, links: row.links,
    }, ...prev]);

    await supabase.from("okr_logs").insert(row);
    setForm({ krId: "", text: "", date: "", files: [], links: [], linkInput: "" });
    setModal(null);
  };

  // 로그 삭제
  const delLog = async (id) => {
    setLogs(prev => prev.filter(l => l.id !== id));
    await supabase.from("okr_logs").delete().eq("id", id);
  };

  // 로그 수정 열기
  const openEditModal = (log) => {
    setEditLog(log);
    setModal(log.objId);
    setForm({ krId: log.krId, text: log.text, date: log.date, files: log.files || [], links: log.links || [], linkInput: "" });
  };

  // 로그 수정 저장
  const updateLog = async () => {
    if (!form.text.trim() || !form.krId) return;
    const kr = OBJECTIVES.flatMap(o => o.keyResults).find(k => k.id === form.krId);
    const updated = {
      kr_id: form.krId,
      kr_label: kr?.label || "",
      log_text: form.text.trim(),
      log_date: form.date || new Date().toISOString().slice(0, 10),
      files: form.files.map(f => ({ name: f.name, size: f.size, type: f.type, dataUrl: f.dataUrl })),
      links: form.links,
    };
    setLogs(prev => prev.map(l => l.id === editLog.id ? {
      ...l, krId: updated.kr_id, krLabel: updated.kr_label,
      text: updated.log_text, date: updated.log_date, files: updated.files, links: updated.links,
    } : l));
    await supabase.from("okr_logs").update(updated).eq("id", editLog.id);
    closeModal();
  };

  const closeModal = () => {
    setModal(null);
    setEditLog(null);
    setForm({ krId: "", text: "", date: "", files: [], links: [], linkInput: "" });
  };

  const handleFiles = (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(prev => ({
          ...prev,
          files: [...prev.files, { name: file.name, size: file.size, type: file.type, dataUrl: ev.target.result }],
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeFormFile = (idx) => {
    setForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }));
  };

  const _now = new Date();
  const _yrStart = new Date(2026, 0, 1);
  const _yrEnd = new Date(2026, 11, 31);
  const _yearPct = Math.max(0, Math.min(((_now - _yrStart) / (_yrEnd - _yrStart)) * 100, 100));

  // noTrack 루틴 항목: % 단위면 100%, 나머지는 연도 경과율로 자동 계산
  const krPct = (kr) => {
    if (kr.noTrack) return kr.unit === "%" ? 100 : _yearPct;
    return Math.min(((progress[kr.id] || 0) / kr.target) * 100, 100);
  };

  const sortByDate = (arr) => [...arr].sort((a, b) => b.date.localeCompare(a.date));

  const buildReportHTML = () => {
    const today = new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric" });
    const total = totalPct();

    const objSections = OBJECTIVES.map(obj => {
      const pct = objPct(obj);
      const objLogs = sortByDate(logs.filter(l => l.objId === obj.id));

      const krRows = obj.keyResults.map(kr => {
        if (kr.noTrack) {
          return `<div class="kr-row kr-notrack">
            <span class="kr-label">${kr.label}</span>
            <span class="kr-period">${kr.period}</span>
          </div>`;
        }
        const cur = progress[kr.id] || 0;
        const p = Math.min((cur / kr.target) * 100, 100).toFixed(1);
        return `<div class="kr-row">
          <div class="kr-top"><span class="kr-label">${kr.label}</span><span class="kr-period">${kr.period}</span></div>
          <div class="kr-bar-bg"><div class="kr-bar-fill" style="width:${p}%;background:${obj.color}"></div></div>
          <span class="kr-val">${cur} / ${kr.target}${kr.unit} &nbsp;(${Math.round(p)}%)</span>
        </div>`;
      }).join("");

      const logItems = objLogs.map(log => {
        const linkHtml = (log.links || []).map(url => {
          let hostname = url;
          try { hostname = new URL(url).hostname; } catch {}
          return `<a href="${url}" class="link-badge">${hostname}</a>`;
        }).join("");
        const nonImgFiles = (log.files || []).filter(f => !f.type?.startsWith("image/"));
        const imgFiles = (log.files || []).filter(f => f.type?.startsWith("image/") && f.dataUrl);
        return `<div class="log-item">
          <div class="log-meta">
            <span class="log-date">${log.date}</span>
            <span class="log-tag">${log.krLabel}</span>
          </div>
          <p class="log-text">${log.text.replace(/\n/g, "<br/>")}</p>
          ${linkHtml ? `<div class="log-links">${linkHtml}</div>` : ""}
          ${nonImgFiles.map(f => `<span class="file-badge">📎 ${f.name}</span>`).join("")}
          ${imgFiles.map(f => `<img src="${f.dataUrl}" class="log-img" alt="${f.name}"/>`).join("")}
        </div>`;
      }).join("");

      return `<div class="obj-section">
        <div class="obj-header">
          <div class="obj-title-row">
            <h2 class="obj-title" style="border-left:4px solid ${obj.color}">${obj.title}</h2>
            <span class="obj-pct" style="color:${obj.color}">${pct}%</span>
          </div>
          <p class="obj-desc">${obj.desc}</p>
        </div>
        <div class="kr-list">${krRows}</div>
        ${objLogs.length ? `<div class="log-section"><h3>활동 기록 <span class="log-count">${objLogs.length}건</span></h3>${logItems}</div>` : ""}
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>OKR Report 2026</title>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css');
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Pretendard Variable',-apple-system,sans-serif;background:#F5F5F7;color:#1D1D1F;padding:40px 20px 80px;-webkit-font-smoothing:antialiased}
    .container{max-width:720px;margin:0 auto}
    header{background:#fff;border-radius:16px;padding:28px 32px;margin-bottom:32px;border:1px solid #E5E5EA}
    header h1{font-size:26px;font-weight:750;letter-spacing:-.4px;margin-bottom:6px}
    .meta{font-size:13px;color:#6E6E73;margin-bottom:12px}
    .summary-bar{display:flex;align-items:center;gap:16px}
    .total-pct{font-family:'DM Mono',monospace;font-size:36px;font-weight:500;color:#3B6CFF;line-height:1}
    .total-label{font-size:11px;color:#AEAEB2;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    .gen-date{margin-left:auto;font-size:12px;color:#AEAEB2}
    .obj-section{background:#fff;border-radius:16px;padding:24px 28px;margin-bottom:20px;border:1px solid #E5E5EA}
    .obj-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
    .obj-title{font-size:18px;font-weight:680;line-height:1.4;padding-left:12px}
    .obj-pct{font-family:'DM Mono',monospace;font-size:20px;font-weight:500;flex-shrink:0;margin-top:2px}
    .obj-desc{font-size:12.5px;color:#6E6E73;line-height:1.6;margin-bottom:16px}
    .kr-list{display:flex;flex-direction:column;gap:10px;margin-bottom:4px}
    .kr-row{padding:10px 0;border-top:1px solid #F0F0F3}
    .kr-top{display:flex;justify-content:space-between;margin-bottom:6px}
    .kr-label{font-size:13px;font-weight:560}
    .kr-period{font-size:11px;color:#AEAEB2}
    .kr-bar-bg{height:6px;background:#E8E8ED;border-radius:3px;overflow:hidden;margin-bottom:5px}
    .kr-bar-fill{height:100%;border-radius:3px}
    .kr-val{font-family:'DM Mono',monospace;font-size:11px;color:#6E6E73}
    .kr-notrack .kr-label{color:#AEAEB2;font-weight:500}
    .log-section{margin-top:20px;border-top:1px solid #F0F0F3;padding-top:16px}
    .log-section h3{font-size:11px;font-weight:650;color:#AEAEB2;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
    .log-count{font-weight:400;color:#C7C7CC;margin-left:4px}
    .log-item{padding:12px 0;border-bottom:1px solid #F0F0F3}
    .log-item:last-child{border-bottom:none}
    .log-meta{display:flex;gap:8px;align-items:center;margin-bottom:6px}
    .log-date{font-family:'DM Mono',monospace;font-size:11px;color:#AEAEB2}
    .log-tag{font-size:11px;background:#F0F0F3;color:#6E6E73;padding:2px 8px;border-radius:4px;font-weight:550}
    .log-text{font-size:13px;line-height:1.65;color:#3C3C3E;white-space:pre-wrap}
    .log-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .link-badge{font-size:11.5px;color:#3B6CFF;background:#EEF2FF;border:1px solid #C7D4FF;border-radius:6px;padding:3px 9px;text-decoration:none}
    .file-badge{display:inline-block;font-size:11px;background:#F0F0F3;color:#6E6E73;padding:3px 8px;border-radius:6px;margin:6px 4px 0 0}
    .log-img{max-width:100%;border-radius:8px;margin-top:10px;border:1px solid #E5E5EA}
    @media print{body{background:#fff;padding:0}.obj-section,header{border:none;box-shadow:none;border-radius:0;padding:20px 0}.obj-section{page-break-inside:avoid}}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>OKR 2026</h1>
      <p class="meta">민트 · 이모션 신한카드 프로젝트 · Design PL</p>
      <div class="summary-bar">
        <div>
          <div class="total-pct">${total}%</div>
          <div class="total-label">전체 달성률</div>
        </div>
        <span class="gen-date">${today} 기준</span>
      </div>
    </header>
    ${objSections}
  </div>
</body>
</html>`;

    return html;
  };

  const exportPDF = () => {
    const html = buildReportHTML();
    const win = window.open("", "_blank");
    if (!win) {
      alert("팝업이 차단되었어요. 브라우저 팝업 차단을 해제한 뒤 다시 시도해주세요.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    const triggerPrint = () => setTimeout(() => win.print(), 300);
    if (win.document.readyState === "complete") triggerPrint();
    else win.addEventListener("load", triggerPrint);
  };

  const exportMarkdown = () => {
    const today = new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric" });
    const total = totalPct();

    let md = `# OKR 2026\n\n민트 · 이모션 신한카드 프로젝트 · Design PL\n\n**전체 달성률: ${total}%** (${today} 기준)\n\n`;

    OBJECTIVES.forEach(obj => {
      const pct = objPct(obj);
      const objLogs = sortByDate(logs.filter(l => l.objId === obj.id));

      md += `## ${obj.title} — ${pct}%\n\n${obj.desc}\n\n`;

      obj.keyResults.forEach(kr => {
        if (kr.noTrack) {
          md += `- **${kr.label}** (${kr.period})\n`;
        } else {
          const cur = progress[kr.id] || 0;
          const p = Math.round(Math.min((cur / kr.target) * 100, 100));
          md += `- **${kr.label}** (${kr.period}): ${cur} / ${kr.target}${kr.unit} (${p}%)\n`;
        }
      });
      md += "\n";

      if (objLogs.length) {
        md += `### 활동 기록 (${objLogs.length}건)\n\n`;
        objLogs.forEach(log => {
          md += `- **${log.date}** [${log.krLabel}] ${log.text.replace(/\n/g, " ")}\n`;
          (log.links || []).forEach(url => { md += `  - 🔗 ${url}\n`; });
          (log.files || []).forEach(f => { md += `  - 📎 ${f.name}\n`; });
        });
        md += "\n";
      }
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OKR-2026-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const objPct = (obj) => {
    const v = obj.keyResults.filter(kr => !kr.excludeFromPct).map(kr => krPct(kr));
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  };
  const totalPct = () => {
    const v = OBJECTIVES.map(objPct);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  };

  const timePct = Math.round(_yearPct);
  const monthNames = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  const curMonth = _now.getMonth();

  if (!unlocked) return <AuthScreen onUnlock={() => setUnlocked(true)} />;
  if (!ready) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
      fontFamily:"'Pretendard Variable',sans-serif",color:"#999",fontSize:14}}>불러오는 중…</div>
  );

  return (
    <div className="app">
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css');
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }

        .app {
          --bg: #F5F5F7;
          --card: #FFFFFF;
          --border: #E5E5EA;
          --blt: #F0F0F3;
          --t1: #1D1D1F;
          --t2: #6E6E73;
          --t3: #AEAEB2;
          --rbg: #E8E8ED;
          --sh: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
          --r: 16px;
          --rs: 10px;
          font-family: 'Pretendard Variable', -apple-system, sans-serif;
          background: var(--bg);
          min-height: 100vh;
          color: var(--t1);
          padding: 28px 16px 64px;
          max-width: 680px;
          margin: 0 auto;
          -webkit-font-smoothing: antialiased;
        }

        .hdr { margin-bottom: 24px; }
        .hdr-row { display:flex; align-items:center; justify-content:space-between; }
        .hdr h1 { font-size:21px; font-weight:750; letter-spacing:-.4px; margin:0; }
        .hdr h1 em { font-style:normal; font-family:'DM Mono',monospace; font-weight:400; color:var(--t3); font-size:14px; margin-left:8px; }
        .hdr-bottom { display:flex; align-items:center; justify-content:space-between; margin-top:4px; }
        .hdr-sub { font-size:12px; color:var(--t3); letter-spacing:.2px; }
        .export-btn { font-size:11px; font-weight:600; font-family:inherit; padding:5px 11px; border-radius:7px;
          border:1px solid var(--border); background:var(--card); color:var(--t2); cursor:pointer; transition:all .12s; }
        .export-btn:hover { background:var(--blt); }

        .tabs { display:flex; gap:2px; background:var(--blt); border-radius:9px; padding:2.5px; }
        .tab { font-size:11.5px; font-weight:650; padding:5.5px 14px; border:none; border-radius:7px;
          cursor:pointer; background:transparent; color:var(--t3); transition:all .15s; font-family:inherit; }
        .tab.on { background:var(--card); color:var(--t1); box-shadow:0 1px 2px rgba(0,0,0,.06); }

        .sum { display:flex; align-items:center; gap:20px; background:var(--card); border:1px solid var(--border);
          border-radius:var(--r); padding:18px 22px; margin-bottom:8px; box-shadow:var(--sh); }
        .sum-ring { position:relative; }
        .sum-ring-lbl { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
          font-family:'DM Mono',monospace; font-size:14px; font-weight:500; color:var(--t2); }
        .sum-label { font-size:11px; color:var(--t3); font-weight:600; text-transform:uppercase; letter-spacing:.6px; }
        .sum-right { flex:1; }
        .time-row { display:flex; justify-content:space-between; font-size:11px; color:var(--t3); margin-bottom:5px; font-weight:500; }
        .time-track { height:5px; background:var(--rbg); border-radius:3px; overflow:hidden; }
        .time-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#C7C7CC,#8E8E93); transition:width .4s; }

        .month-row { display:flex; gap:3px; padding:10px 22px 14px; }
        .month-dot { flex:1; height:4px; border-radius:2px; background:var(--blt); transition:background .3s; position:relative; }
        .month-dot.past { background:#C7C7CC; }
        .month-dot.now { background:#3B6CFF; }
        .month-dot::after { content:attr(data-m); position:absolute; top:8px; left:50%; transform:translateX(-50%);
          font-size:9px; color:var(--t3); white-space:nowrap; display:none; }
        .month-dot:nth-child(3n+1)::after { display:block; }

        .ocard { background:var(--card); border:1px solid var(--border); border-radius:var(--r);
          margin-bottom:12px; box-shadow:var(--sh); overflow:hidden; transition:box-shadow .2s; }
        .ocard:hover { box-shadow:0 2px 8px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.04); }
        .ocard-hdr { display:flex; align-items:flex-start; gap:12px; padding:16px 20px 12px; cursor:pointer; user-select:none; }
        .ocard-icon { font-size:20px; margin-top:1px; }
        .ocard-info { flex:1; min-width:0; }
        .ocard-title { font-size:20px; font-weight:680; line-height:1.4; margin:0; }
        .ocard-desc { font-size:11.5px; color:var(--t3); margin-top:3px; line-height:1.5; }
        .ocard-ring { position:relative; flex-shrink:0; }
        .ocard-ring-lbl { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
          font-family:'DM Mono',monospace; font-size:11px; font-weight:500; color:var(--t2); }
        .arrow { font-size:11px; color:var(--t3); transition:transform .2s; margin-top:16px; }
        .arrow.open { transform:rotate(180deg); }

        .kr-list { padding:0 20px 12px; }
        .kr { display:flex; align-items:center; gap:10px; padding:10px 0; border-top:1px solid var(--blt); }
        .kr-main { flex:1; min-width:0; }
        .kr-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:5px; }
        .kr-name { font-size:12.5px; font-weight:560; }
        .kr-period { font-size:10.5px; color:var(--t3); }
        .kr-bar { height:6px; background:var(--rbg); border-radius:3px; overflow:hidden; }
        .kr-fill { height:100%; border-radius:3px; transition:width .45s cubic-bezier(.4,0,.2,1); }
        .kr-ctrl { display:flex; align-items:center; gap:4px; flex-shrink:0; }
        .kr-btn { width:26px; height:26px; border-radius:7px; border:1px solid var(--border); background:var(--card);
          cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:15px; color:var(--t2);
          transition:all .12s; font-family:inherit; line-height:1; }
        .kr-btn:hover { background:var(--blt); }
        .kr-btn:active { transform:scale(.9); }
        .kr-inp { font-family:'DM Mono',monospace; font-size:12px; font-weight:500; width:32px; text-align:center;
          color:var(--t2); border:none; background:transparent; padding:0; outline:none; }
        .kr-inp:focus { color:var(--t1); }
        .kr-tgt { font-family:'DM Mono',monospace; font-size:11px; color:var(--t3); }
        .kr-notrack .kr-name { color:var(--t3); font-weight:500; }
        .kr-notrack .kr-period { color:var(--t3); opacity:.7; }

        .ocard-act { padding:4px 20px 14px; display:flex; gap:8px; }
        .act-btn { font-size:11.5px; font-weight:620; padding:6px 13px; border-radius:8px; border:1px solid var(--border);
          background:var(--card); color:var(--t2); cursor:pointer; font-family:inherit; transition:all .12s; }
        .act-btn:hover { background:var(--blt); }
        .act-btn.pri { background:var(--t1); color:#fff; border-color:var(--t1); }
        .act-btn.pri:hover { opacity:.85; }

        .log-sec { padding:4px 20px 16px; }
        .log-sec-hd { font-size:11px; font-weight:650; color:var(--t3); text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; }
        .log-item { display:flex; gap:0; }
        .log-timeline { display:flex; flex-direction:column; align-items:center; width:20px; flex-shrink:0; }
        .log-dot { width:7px; height:7px; border-radius:50%; margin-top:6px; flex-shrink:0; }
        .log-line { width:1.5px; flex:1; background:var(--blt); margin-top:4px; }
        .log-item:last-child .log-line { display:none; }
        .log-content { flex:1; padding-bottom:14px; min-width:0; }
        .log-top { display:flex; align-items:center; gap:6px; margin-bottom:3px; flex-wrap:wrap; }
        .log-date { font-family:'DM Mono',monospace; font-size:11px; color:var(--t3); font-weight:400; }
        .log-tag { font-size:10.5px; color:var(--t2); background:var(--blt); padding:1px 7px; border-radius:4px; font-weight:550; }
        .log-edit { margin-left:auto; font-size:10.5px; color:var(--t3); background:none; border:none; cursor:pointer;
          opacity:0; transition:opacity .15s; font-family:inherit; padding:2px 4px; }
        .log-del { font-size:10.5px; color:var(--t3); background:none; border:none; cursor:pointer;
          opacity:0; transition:opacity .15s; font-family:inherit; padding:2px 4px; }
        .log-item:hover .log-edit, .log-item:hover .log-del { opacity:1; }
        .log-edit:hover { color:#3B6CFF; }
        .log-del:hover { color:#FF3B30; }
        .log-text { font-size:12.5px; line-height:1.6; margin:0; color:var(--t2); white-space:pre-wrap; }
        .log-files { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
        .log-img-thumb { width:56px; height:56px; border-radius:8px; object-fit:cover; cursor:pointer;
          border:1px solid var(--border); transition:transform .15s; }
        .log-img-thumb:hover { transform:scale(1.05); }
        .log-img-full { margin-top:8px; border-radius:10px; overflow:hidden; cursor:pointer; border:1px solid var(--border); }
        .log-img-full img { width:100%; display:block; }

        .file-chip { display:inline-flex; align-items:center; gap:6px; background:var(--blt); border:1px solid var(--border);
          border-radius:8px; padding:4px 10px 4px 5px; font-size:11px; color:var(--t2); max-width:200px; cursor:default; }
        .file-thumb { width:28px; height:28px; border-radius:5px; object-fit:cover; }
        .file-icon { font-size:14px; margin-left:2px; }
        .file-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:500; flex:1; min-width:0; }
        .file-size { color:var(--t3); flex-shrink:0; }
        .file-rm { background:none; border:none; color:var(--t3); cursor:pointer; font-size:13px; padding:0 2px; margin-left:2px; }
        .file-rm:hover { color:#FF3B30; }

        .overlay { position:fixed; inset:0; background:rgba(0,0,0,.22); display:flex; align-items:center;
          justify-content:center; z-index:100; padding:20px; animation:fadein .12s; }
        @keyframes fadein { from{opacity:0} }
        .modal { background:var(--card); border-radius:var(--r); padding:24px; width:100%; max-width:440px;
          box-shadow:0 12px 48px rgba(0,0,0,.12); max-height:90vh; overflow-y:auto; }
        .modal h3 { font-size:15px; font-weight:720; margin:0 0 18px; }
        .fg { margin-bottom:14px; }
        .fg label { display:block; font-size:11px; font-weight:650; color:var(--t3); margin-bottom:5px; text-transform:uppercase; letter-spacing:.3px; }
        .fg select, .fg input[type="date"], .fg textarea {
          width:100%; border:1px solid var(--border); border-radius:var(--rs); padding:9px 12px;
          font-size:12.5px; font-family:inherit; background:var(--bg); color:var(--t1); outline:none; transition:border .15s; }
        .fg select:focus, .fg input:focus, .fg textarea:focus { border-color:#3B6CFF; }
        .fg textarea { resize:vertical; min-height:80px; line-height:1.6; }

        .log-links { display:flex; flex-wrap:wrap; gap:6px; margin-top:7px; }
        .log-link { font-size:11.5px; color:#3B6CFF; background:#EEF2FF; border:1px solid #C7D4FF;
          border-radius:6px; padding:3px 9px; text-decoration:none; }
        .log-link:hover { background:#DDE6FF; }

        .link-row { display:flex; gap:6px; }
        .link-row input { flex:1; }
        .link-add-btn { padding:0 14px; border-radius:var(--rs); border:1px solid var(--border);
          background:var(--card); color:var(--t2); cursor:pointer; font-size:12px; font-family:inherit;
          font-weight:600; white-space:nowrap; }
        .link-add-btn:hover { background:var(--blt); }
        .link-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
        .link-chip { display:inline-flex; align-items:center; gap:5px; background:#EEF2FF;
          border:1px solid #C7D4FF; border-radius:6px; padding:3px 8px; font-size:11.5px; color:#3B6CFF; }
        .link-chip-label { max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        .upload-zone { border:1.5px dashed var(--border); border-radius:var(--rs); padding:16px; text-align:center;
          cursor:pointer; transition:all .15s; background:var(--bg); }
        .upload-zone:hover { border-color:#3B6CFF; background:#EEF2FF; }
        .upload-zone p { margin:4px 0 0; font-size:12px; color:var(--t3); }
        .upload-zone .up-ico { font-size:22px; }
        .upload-hint { font-size:10px; color:var(--t3); margin-top:2px; }
        .upload-preview { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }

        .modal-btns { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }
        .mbtn { padding:8px 18px; border-radius:8px; font-size:12.5px; font-family:inherit; cursor:pointer; font-weight:600; transition:all .12s; }
        .mbtn-c { border:1px solid var(--border); background:var(--card); color:var(--t2); }
        .mbtn-s { border:none; background:#3B6CFF; color:#fff; }
        .mbtn-s:hover { background:#2D56D9; }
        .mbtn-s:disabled { opacity:.35; cursor:default; }

        .ach-form { background:var(--card); border:1px solid var(--border); border-radius:var(--r);
          padding:18px 20px; margin-bottom:14px; box-shadow:var(--sh); }
        .ach-submit { width:100%; justify-content:center; margin-top:4px; }
        .ach-card { background:var(--card); border:1px solid var(--border); border-radius:var(--r);
          padding:16px 20px; margin-bottom:10px; box-shadow:var(--sh); }
        .ach-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .ach-project { font-size:11.5px; font-weight:650; background:var(--blt); color:var(--t2);
          padding:2px 9px; border-radius:5px; }
        .ach-date { font-family:'DM Mono',monospace; font-size:11px; color:var(--t3); margin-left:8px; }
        .ach-row { display:flex; gap:10px; font-size:12.5px; line-height:1.6; padding:6px 0;
          border-top:1px solid var(--blt); color:var(--t2); }
        .ach-label { font-size:11px; font-weight:650; color:var(--t3); width:32px; flex-shrink:0; padding-top:2px; }
        .ach-copy-btn { margin-top:12px; font-size:11.5px; font-weight:620; padding:6px 13px;
          border-radius:8px; border:1px solid var(--border); background:var(--card); color:var(--t2);
          cursor:pointer; font-family:inherit; transition:all .12s; }
        .ach-copy-btn:hover { background:var(--blt); }

        .all-obj-hd { font-size:13px; font-weight:680; margin:20px 0 10px; display:flex; align-items:center; gap:8px; }
        .all-obj-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
        .empty { text-align:center; padding:44px 20px; color:var(--t3); font-size:12.5px; line-height:1.7; }
        .empty .em-ico { font-size:26px; margin-bottom:6px; }

        .memo-input-box { background:var(--card); border:1px solid var(--border); border-radius:var(--r);
          padding:16px 18px; margin-bottom:14px; box-shadow:var(--sh); }
        .memo-textarea { width:100%; border:1px solid var(--border); border-radius:var(--rs);
          padding:10px 13px; font-size:13px; font-family:inherit; background:var(--bg); color:var(--t1);
          outline:none; resize:vertical; min-height:88px; line-height:1.65; transition:border .15s;
          box-sizing:border-box; }
        .memo-textarea:focus { border-color:#3B6CFF; }
        .memo-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:10px; }
        .memo-card { background:var(--card); border:1px solid var(--border); border-radius:var(--r);
          padding:14px 18px; margin-bottom:10px; box-shadow:var(--sh); }
        .memo-card-top { display:flex; align-items:center; gap:6px; margin-bottom:8px; }
        .memo-card-date { font-family:'DM Mono',monospace; font-size:11px; color:var(--t3); }
        .memo-card-edited { font-size:10.5px; color:var(--t3); }
        .memo-card-btns { margin-left:auto; display:flex; gap:2px; opacity:0; transition:opacity .15s; }
        .memo-card:hover .memo-card-btns { opacity:1; }
        .memo-card-btn { font-size:10.5px; background:none; border:none; cursor:pointer; padding:2px 6px;
          color:var(--t3); font-family:inherit; border-radius:5px; }
        .memo-card-btn.edit:hover { color:#3B6CFF; }
        .memo-card-btn.del:hover { color:#FF3B30; }
        .memo-card-text { font-size:13px; line-height:1.7; color:var(--t2); white-space:pre-wrap; margin:0; }
      `}</style>

      <div className="hdr">
        <div className="hdr-row">
          <h1>OKR Tracker<em>2026</em></h1>
          <div className="tabs">
            <button className={`tab ${tab==="overview"?"on":""}`} onClick={()=>setTab("overview")}>현황</button>
            <button className={`tab ${tab==="logs"?"on":""}`} onClick={()=>setTab("logs")}>기록</button>
            <button className={`tab ${tab==="achievements"?"on":""}`} onClick={()=>setTab("achievements")}>성과</button>
            <button className={`tab ${tab==="memos"?"on":""}`} onClick={()=>setTab("memos")}>메모</button>
          </div>
        </div>
        <div className="hdr-bottom">
          <div className="hdr-sub">민트 · 이모션 신한카드 프로젝트 · Design PL</div>
          <div style={{display:"flex",gap:6}}>
            <button className="export-btn" onClick={exportPDF}>PDF로 내보내기</button>
            <button className="export-btn" onClick={exportMarkdown}>MD로 내보내기</button>
            <button className="export-btn" onClick={() => { localStorage.removeItem(PIN_KEY); setUnlocked(false); }}>로그아웃</button>
          </div>
        </div>
      </div>

      <div className="sum">
        <div className="sum-ring">
          <Ring pct={totalPct()} color="#3B6CFF" size={54} stroke={4.5}/>
          <div className="sum-ring-lbl">{totalPct()}%</div>
        </div>
        <div><div className="sum-label">전체 달성률</div></div>
        <div className="sum-right">
          <div className="time-row"><span>2026 경과</span><span>{timePct}%</span></div>
          <div className="time-track"><div className="time-fill" style={{width:`${timePct}%`}}/></div>
        </div>
      </div>

      <div className="month-row">
        {monthNames.map((m, i) => (
          <div key={m} className={`month-dot ${i < curMonth ? "past" : i === curMonth ? "now" : ""}`} data-m={m} />
        ))}
      </div>

      {tab === "overview" && OBJECTIVES.map(obj => {
        const pct = objPct(obj);
        const isOpen = openObj === obj.id;
        const objLogs = sortByDate(logs.filter(l => l.objId === obj.id)).slice(0, 5);
        return (
          <div className="ocard" key={obj.id}>
            <div className="ocard-hdr" onClick={() => setOpenObj(isOpen ? null : obj.id)}>
              <div className="ocard-info">
                <p className="ocard-title">{obj.title}</p>
                {isOpen && <p className="ocard-desc">{obj.desc}</p>}
              </div>
              <div className="ocard-ring">
                <Ring pct={pct} color={obj.color}/>
                <div className="ocard-ring-lbl">{pct}%</div>
              </div>
              <span className={`arrow ${isOpen?"open":""}`}>▼</span>
            </div>

            {isOpen && <>
              <div className="kr-list">
                {obj.keyResults.map(kr => {
                  if (kr.noTrack) {
                    return (
                      <div className="kr kr-notrack" key={kr.id}>
                        <div className="kr-main">
                          <div className="kr-top">
                            <span className="kr-name">{kr.label}</span>
                            <span className="kr-period">{kr.period}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const cur = progress[kr.id] || 0;
                  const p = krPct(kr);
                  return (
                    <div className="kr" key={kr.id}>
                      <div className="kr-main">
                        <div className="kr-top">
                          <span className="kr-name">{kr.label}</span>
                          <span className="kr-period">{kr.period}</span>
                        </div>
                        <div className="kr-bar">
                          <div className="kr-fill" style={{width:`${p}%`, background:`linear-gradient(90deg,${obj.color}66,${obj.color})`}}/>
                        </div>
                      </div>
                      <div className="kr-ctrl">
                        <button className="kr-btn" onClick={()=>inc(kr.id,-1)}>−</button>
                        <input className="kr-inp" value={cur}
                          onChange={e=>setVal(kr.id, e.target.value)}
                          style={{width: Math.max(28, String(cur).length * 10)}} />
                        <span className="kr-tgt">/{kr.target}{kr.unit}</span>
                        <button className="kr-btn" onClick={()=>inc(kr.id,1)}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ocard-act">
                <button className="act-btn pri" onClick={() => {
                  setModal(obj.id);
                  setForm({ krId: obj.keyResults[0]?.id||"", text:"", date:new Date().toISOString().slice(0,10), files:[], links:[], linkInput:"" });
                }}>+ 활동 기록</button>
              </div>

              {objLogs.length > 0 && (
                <div className="log-sec">
                  <div className="log-sec-hd">최근 기록</div>
                  {objLogs.map(log => (
                    <LogItem key={log.id} log={log} color={obj.color} onDelete={delLog} onEdit={openEditModal}/>
                  ))}
                </div>
              )}
            </>}
          </div>
        );
      })}

      {tab === "logs" && (
        <div>
          {OBJECTIVES.map(obj => {
            const objLogs = sortByDate(logs.filter(l => l.objId === obj.id));
            if (!objLogs.length) return null;
            return (
              <div key={obj.id}>
                <div className="all-obj-hd">
                  <span className="all-obj-dot" style={{background:obj.color}}/>
                  {obj.title}
                </div>
                {objLogs.map(log => (
                  <LogItem key={log.id} log={log} color={obj.color} onDelete={delLog} onEdit={openEditModal}/>
                ))}
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="empty">
              <div className="em-ico">📝</div>
              <p>아직 기록이 없어요.<br/>현황 탭에서 활동 기록을 추가해보세요.</p>
            </div>
          )}
        </div>
      )}

      {tab === "achievements" && (
        <div>
          {/* 입력 폼 */}
          <div className="ach-form">
            <div className="fg">
              <label>프로젝트</label>
              <select value={achForm.project} onChange={e=>setAchForm({...achForm, project:e.target.value})}>
                {["신한카드 프로젝트","팀 이슈","기타"].map(p=>(
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>고통 — 어떤 비효율이 있었나?</label>
              <textarea placeholder="예: 매주 수동으로 보고 데이터를 추출해서 전달해야 했어"
                value={achForm.pain} onChange={e=>setAchForm({...achForm, pain:e.target.value})}/>
            </div>
            <div className="fg">
              <label>해결 — 내가 어떻게 해결했나?</label>
              <textarea placeholder="예: 대시보드를 구축해 자동화했어"
                value={achForm.solution} onChange={e=>setAchForm({...achForm, solution:e.target.value})}/>
            </div>
            <div className="fg">
              <label>가치 — 어떤 시간/비용을 절감했나?</label>
              <textarea placeholder="예: 담당자 1명 주 4시간 × 52주 = 연간 208시간 리소스 확보"
                value={achForm.value} onChange={e=>setAchForm({...achForm, value:e.target.value})}/>
            </div>
            <button className="act-btn pri ach-submit"
              disabled={!achForm.pain.trim()||!achForm.solution.trim()||!achForm.value.trim()}
              onClick={addAchievement}>+ 기록 추가</button>
          </div>

          {/* 기록 목록 */}
          {achievements.length > 0 ? achievements.map(a => (
            <div className="ach-card" key={a.id}>
              <div className="ach-top">
                <div>
                  <span className="ach-project">{a.project}</span>
                  <span className="ach-date">{a.created_at?.slice(0,10)}</span>
                </div>
                <button className="log-del" style={{opacity:1}} onClick={()=>delAchievement(a.id)}>삭제</button>
              </div>
              <div className="ach-row"><span className="ach-label">고통</span><span>{a.pain}</span></div>
              <div className="ach-row"><span className="ach-label">해결</span><span>{a.solution}</span></div>
              <div className="ach-row"><span className="ach-label">가치</span><span>{a.value}</span></div>
              <button className="ach-copy-btn" onClick={()=>copyOneLiner(a)}>
                {copiedId===a.id ? "✓ 복사됨" : "한 줄 성과 복사 →"}
              </button>
            </div>
          )) : (
            <div className="empty">
              <div className="em-ico">🏆</div>
              <p>아직 성과 기록이 없어요.<br/>고통 → 해결 → 가치 순서로 기록해보세요.</p>
            </div>
          )}

          {achievements.length > 0 && (
            <button className="act-btn" style={{width:"100%",marginTop:8}} onClick={downloadAchievementsCSV}>
              CSV 다운로드
            </button>
          )}
        </div>
      )}

      {tab === "memos" && (
        <div>
          <div className="memo-input-box">
            <textarea
              className="memo-textarea"
              placeholder="생각난 것, 아이디어, 메모…"
              value={memoText}
              onChange={e => setMemoText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  editMemo ? saveMemo() : addMemo();
                }
              }}
            />
            <div className="memo-actions">
              {editMemo && (
                <button className="mbtn mbtn-c" style={{fontSize:12}} onClick={() => { setEditMemo(null); setMemoText(""); }}>취소</button>
              )}
              <button className="mbtn mbtn-s" style={{fontSize:12}} disabled={!memoText.trim()} onClick={editMemo ? saveMemo : addMemo}>
                {editMemo ? "수정 완료" : "저장"}
              </button>
            </div>
          </div>

          {memos.length === 0 ? (
            <div className="empty">
              <div className="em-ico">🗒️</div>
              <p>아직 메모가 없어요.<br/>생각난 것을 자유롭게 적어보세요.</p>
            </div>
          ) : memos.map(m => (
            <div className="memo-card" key={m.id}>
              <div className="memo-card-top">
                <span className="memo-card-date">{m.created_at?.slice(0,10)}</span>
                {m.updated_at !== m.created_at && <span className="memo-card-edited">수정됨</span>}
                <div className="memo-card-btns">
                  <button className="memo-card-btn edit" onClick={() => { setEditMemo(m); setMemoText(m.text); }}>수정</button>
                  <button className="memo-card-btn del" onClick={() => delMemo(m.id)}>삭제</button>
                </div>
              </div>
              <p className="memo-card-text">{m.text}</p>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && closeModal()}>
          <div className="modal">
            <h3>{editLog ? "활동 기록 수정" : "활동 기록 추가"}</h3>
            <div className="fg">
              <label>Key Result</label>
              <select value={form.krId} onChange={e=>setForm({...form, krId:e.target.value})}>
                {OBJECTIVES.find(o=>o.id===modal)?.keyResults.map(kr=>(
                  <option key={kr.id} value={kr.id}>{kr.label}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>날짜</label>
              <input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}/>
            </div>
            <div className="fg">
              <label>활동 내용</label>
              <textarea placeholder="예: 수퍼솔 앱 디자인 가이드 v1 작성 완료, 팀 노션에 공유함"
                value={form.text} onChange={e=>setForm({...form, text:e.target.value})}/>
            </div>
            <div className="fg">
              <label>웹사이트 링크</label>
              <div className="link-row">
                <input type="url" placeholder="https://..." value={form.linkInput}
                  onChange={e => setForm({...form, linkInput: e.target.value})}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const url = form.linkInput.trim();
                      if (url) setForm({...form, links: [...form.links, url], linkInput: ""});
                    }
                  }}
                />
                <button type="button" className="link-add-btn"
                  onClick={() => {
                    const url = form.linkInput.trim();
                    if (url) setForm({...form, links: [...form.links, url], linkInput: ""});
                  }}>추가</button>
              </div>
              {form.links.length > 0 && (
                <div className="link-chips">
                  {form.links.map((url, i) => (
                    <div key={i} className="link-chip">
                      <span className="link-chip-label">{(() => { try { return new URL(url).hostname; } catch { return url; } })()}</span>
                      <button className="file-rm" onClick={() => setForm({...form, links: form.links.filter((_, j) => j !== i)})}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="fg">
              <label>파일 첨부</label>
              <div className="upload-zone" onClick={()=>document.getElementById('okr-file-input').click()}>
                <div className="up-ico">📂</div>
                <p>클릭하여 파일 선택</p>
                <div className="upload-hint">이미지, PDF, 문서 등 — 여러 파일 선택 가능</div>
              </div>
              <input id="okr-file-input" type="file" multiple accept="image/*,.pdf,.doc,.docx,.pptx,.xlsx,.txt,.fig"
                style={{display:'none'}} onChange={handleFiles}/>
              {form.files.length > 0 && (
                <div className="upload-preview">
                  {form.files.map((f, i) => <FileChip key={i} file={f} onRemove={()=>removeFormFile(i)}/>)}
                </div>
              )}
            </div>
            <div className="modal-btns">
              <button className="mbtn mbtn-c" onClick={closeModal}>취소</button>
              <button className="mbtn mbtn-s" disabled={!form.text.trim()} onClick={editLog ? updateLog : addLog}>
                {editLog ? "수정 완료" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
