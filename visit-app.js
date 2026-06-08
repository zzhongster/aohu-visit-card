/* ===== 傲虎走访 · 访谈记录卡 · 应用逻辑 ===== */
(function(){
const D = window.VISIT_DATA;
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- storage ---------- */
const LS_ANS  = 'aohu_visit_answers_v1';   // { qid:{note,star,secs} }
const LS_CHK  = 'aohu_visit_check_v1';     // { cid:{got,note} }
const LS_SCR  = 'aohu_visit_score_v1';     // { dimId:1-5 }
const LS_MISC = 'aohu_visit_misc_v1';      // { who,date,conclusion,overall }

const load = (k,f)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return v==null?f:v; }catch(e){ return f; } };
let ANS  = load(LS_ANS,{});
let CHK  = load(LS_CHK,{});
let SCR  = load(LS_SCR,{});
let MISC = load(LS_MISC,{});
MISC.roleWho = MISC.roleWho || {};   // { roleId: 受访人姓名 } —— 一次走访分别访不同岗位的人

let saveTimer=null;
function persist(){
  localStorage.setItem(LS_ANS ,JSON.stringify(ANS));
  localStorage.setItem(LS_CHK ,JSON.stringify(CHK));
  localStorage.setItem(LS_SCR ,JSON.stringify(SCR));
  localStorage.setItem(LS_MISC,JSON.stringify(MISC));
  clearTimeout(saveTimer); saveTimer=setTimeout(flagSaved,200);
}
function flagSaved(){ updateBadges(); }

const esc = s => (s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const roleById = id => D.roles.find(r=>r.id===id);
function autoGrow(ta){ ta.style.height='auto'; ta.style.height=Math.max(ta.scrollHeight,ta.clientHeight)+'px'; }
function fmtSecs(s){ const m=Math.floor(s/60), ss=s%60; return String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0'); }

/* =========================================================
   PANEL 1 · 访谈
   ========================================================= */
const roleScroll=$('#roleScroll'), askBody=$('#askBody');
let curRole = D.roles[0].id;

function roleProgress(rid){
  const qs=D.questions.filter(q=>q.role===rid);
  const done=qs.filter(q=>{const a=ANS[q.id];return a&&((a.note&&a.note.trim())||a.star);}).length;
  return {done,total:qs.length};
}
function renderRoleChips(){
  roleScroll.innerHTML='';
  D.roles.forEach(r=>{
    const p=roleProgress(r.id);
    const chip=document.createElement('button');
    chip.className='rchip c-'+r.color+(r.id===curRole?' sel':'')+(p.done===p.total&&p.done>0?' done':'');
    chip.innerHTML=`<span class="ri"><svg class="ic"><use href="#${r.icon}"/></svg></span>`+
      `<span class="rt"><span class="rn">${esc(r.name)}</span><span class="rc">${r.code}</span></span>`+
      `<span class="rprog">${p.done}/${p.total}</span>`;
    chip.addEventListener('click',()=>{ curRole=r.id; renderRoleChips(); renderQuestions(); window.scrollTo({top:0,behavior:'smooth'}); });
    roleScroll.appendChild(chip);
  });
}

function renderQuestions(){
  const r=roleById(curRole);
  const qs=D.questions.filter(q=>q.role===curRole);
  let html=`<div class="rolehead c-${r.color}">
      <span class="rh-ic"><svg class="ic"><use href="#${r.icon}"/></svg></span>
      <div><div class="rh-k">${r.code} · Interview${r.tier?` <span class="badge">${esc(r.tier)}</span>`:''}</div>
        <h2>${esc(r.name)}</h2><div class="rh-s">${esc(r.sub)}</div></div>
    </div>
    <div class="rolewho c-${r.color}">
      <svg class="ic"><use href="#i-user"/></svg>
      <input data-rwho placeholder="本角色受访人，如 张工 / 李经理" value="${esc(MISC.roleWho[curRole]||'')}">
    </div>`;
  qs.forEach(q=>{
    const a=ANS[q.id]||{};
    const answered=(a.note&&a.note.trim());
    html+=`<div class="qcard c-${r.color}${a.star?' starred':''}${answered?' answered':''}" data-q="${q.id}">
      <div class="qtop">
        <span class="qnum">Q${q.n}</span>
        ${q.demo?`<span class="demo-badge"><svg class="ic"><use href="#i-clock"/></svg> 请演示</span>`:''}
        <span class="sp"></span>
        <button class="starbtn${a.star?' on':''}" data-star title="标记重点"><svg class="ic"><use href="#i-star"/></svg></button>
      </div>
      <div class="qtext">${esc(q.t)}</div>
      ${q.hint?`<div class="qhint"><svg class="ic"><use href="#i-flag"/></svg><span>${esc(q.hint)}</span></div>`:''}
      ${q.demo?swHTML(q.id,a.secs||0):''}
      <div class="qnote"><textarea data-note placeholder="记一笔：怎么做的、花多久、卡在哪、原话…">${esc(a.note||'')}</textarea></div>
    </div>`;
  });
  askBody.innerHTML=html;

  // wire 受访人（本角色）
  const rwho=askBody.querySelector('[data-rwho]');
  if(rwho) rwho.addEventListener('input',()=>{ MISC.roleWho[curRole]=rwho.value; persist(); });

  // wire
  $$('#askBody .qcard').forEach(card=>{
    const qid=card.dataset.q;
    const ta=card.querySelector('[data-note]'); autoGrow(ta);
    ta.addEventListener('input',()=>{
      ANS[qid]=ANS[qid]||{}; ANS[qid].note=ta.value; autoGrow(ta);
      card.classList.toggle('answered', !!ta.value.trim());
      card.querySelector('.qnum').className='qnum';
      persist(); updateChipProgress();
    });
    card.querySelector('[data-star]').addEventListener('click',()=>{
      ANS[qid]=ANS[qid]||{}; ANS[qid].star=!ANS[qid].star;
      card.querySelector('[data-star]').classList.toggle('on',ANS[qid].star);
      card.classList.toggle('starred',ANS[qid].star);
      persist(); updateChipProgress();
    });
    const sw=card.querySelector('[data-sw]'); if(sw) wireStopwatch(sw,qid);
  });
}
function updateChipProgress(){
  D.roles.forEach((r,i)=>{
    const chip=roleScroll.children[i]; if(!chip)return;
    const p=roleProgress(r.id);
    chip.querySelector('.rprog').textContent=`${p.done}/${p.total}`;
    chip.classList.toggle('done',p.done===p.total&&p.done>0);
  });
}

/* ---- stopwatch ---- */
function swHTML(qid,secs){
  return `<div class="sw" data-sw data-qid="${qid}">
    <span class="swt">${fmtSecs(secs)}</span>
    <button class="swgo"><svg class="ic"><use href="#i-play"/></svg> 计时</button>
    <button class="swrs"><svg class="ic"><use href="#i-reset"/></svg></button>
  </div>`;
}
const timers={}; // qid -> {int, base, t0}
function wireStopwatch(el,qid){
  const disp=el.querySelector('.swt'), go=el.querySelector('.swgo'), rs=el.querySelector('.swrs');
  function cur(){ const a=ANS[qid]||{}; return a.secs||0; }
  function set(v){ ANS[qid]=ANS[qid]||{}; ANS[qid].secs=v; disp.textContent=fmtSecs(v); }
  go.addEventListener('click',()=>{
    const t=timers[qid];
    if(t&&t.int){ // pause
      clearInterval(t.int); const elapsed=Math.round((Date.now()-t.t0)/1000); set(t.base+elapsed);
      timers[qid]=null; go.classList.remove('pause'); go.innerHTML='<svg class="ic"><use href="#i-play"/></svg> 计时'; disp.classList.remove('run'); persist();
    }else{ // start
      timers[qid]={base:cur(),t0:Date.now(),int:null};
      timers[qid].int=setInterval(()=>{ const e=Math.round((Date.now()-timers[qid].t0)/1000); disp.textContent=fmtSecs(timers[qid].base+e); },250);
      go.classList.add('pause'); go.innerHTML='<svg class="ic"><use href="#i-pause"/></svg> 停'; disp.classList.add('run');
    }
  });
  rs.addEventListener('click',()=>{
    const t=timers[qid]; if(t&&t.int){clearInterval(t.int);} timers[qid]=null;
    go.classList.remove('pause'); go.innerHTML='<svg class="ic"><use href="#i-play"/></svg> 计时'; disp.classList.remove('run');
    set(0); persist();
  });
}

/* =========================================================
   PANEL 2 · 盘点
   ========================================================= */
function renderCheck(){
  const host=$('#checkBody'); let html='';
  D.checklist.forEach(g=>{
    const got=g.items.filter(it=>CHK[it.id]&&CHK[it.id].got).length;
    html+=`<div class="ckgroup c-${g.color}">
      <div class="ckg-head"><span class="ckg-tier">${esc(g.tier)}</span><span class="ckg-name">${esc(g.name)}</span><span class="sp"></span><span class="ckg-count" data-gc="${g.id}">${got}/${g.items.length}</span></div>`;
    g.items.forEach(it=>{
      const c=CHK[it.id]||{};
      const hasNote=c.note&&c.note.trim();
      html+=`<div class="ckitem${c.got?' got':''}" data-c="${it.id}">
        <div class="ck-row">
          <span class="ckbox"><svg class="ic"><use href="#i-check"/></svg></span>
          <span class="ck-label">${esc(it.t)}</span>
          <button class="ck-notebtn${hasNote?' has':''}" data-notebtn title="记一笔"><svg class="ic"><use href="#i-pencil"/></svg></button>
        </div>
        <div class="ck-note${hasNote?' open':''}"><textarea data-cnote placeholder="样本在哪 / 数据量 / 谁维护 / 卡点…">${esc(c.note||'')}</textarea></div>
      </div>`;
    });
    html+='</div>';
  });
  host.innerHTML=html;

  $$('#checkBody .ckitem').forEach(item=>{
    const cid=item.dataset.c;
    item.querySelector('.ck-row').addEventListener('click',e=>{
      if(e.target.closest('[data-notebtn]'))return;
      CHK[cid]=CHK[cid]||{}; CHK[cid].got=!CHK[cid].got;
      item.classList.toggle('got',CHK[cid].got);
      persist(); updateGroupCounts(); updateBadges();
    });
    const nb=item.querySelector('[data-notebtn]'), zone=item.querySelector('.ck-note'), ta=item.querySelector('[data-cnote]');
    autoGrow(ta);
    nb.addEventListener('click',()=>{ zone.classList.toggle('open'); if(zone.classList.contains('open')){autoGrow(ta);ta.focus();} });
    ta.addEventListener('input',()=>{ CHK[cid]=CHK[cid]||{}; CHK[cid].note=ta.value; autoGrow(ta); nb.classList.toggle('has',!!ta.value.trim()); persist(); });
  });
}
function updateGroupCounts(){
  D.checklist.forEach(g=>{
    const el=document.querySelector(`[data-gc="${g.id}"]`); if(!el)return;
    const got=g.items.filter(it=>CHK[it.id]&&CHK[it.id].got).length;
    el.textContent=`${got}/${g.items.length}`;
  });
}

/* =========================================================
   PANEL 3 · 评分
   ========================================================= */
function avg(){
  const vals=D.scoreDims.map(d=>SCR[d.id]).filter(v=>v);
  if(!vals.length)return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function renderScoreBoard(){
  const a=avg();
  const shown=a==null?'—':a.toFixed(1);
  const filled=a==null?0:Math.round(a);
  let bars=''; for(let i=1;i<=5;i++)bars+=`<i class="${i<=filled?'f':''}"></i>`;
  const got=D.scoreDims.filter(d=>SCR[d.id]).length;
  $('#scoreBoard').innerHTML=`<div class="scoreboard">
    <div class="sb-avg">${shown}<small>/5</small></div>
    <div class="sb-bar">${bars}</div>
    <div class="sb-lab">六维平均 · 已打 ${got}/${D.scoreDims.length}</div>
  </div>`;
}
function renderScoreRows(){
  let html='';
  D.scoreDims.forEach(d=>{
    const v=SCR[d.id]||0;
    let btns=''; for(let i=1;i<=5;i++)btns+=`<button class="${v===i?'on':''}" data-v="${i}">${i}</button>`;
    html+=`<div class="srow" data-dim="${d.id}">
      <div class="s-name"><span class="sdot"></span>${esc(d.name)}</div>
      <div class="s-sig">${esc(d.signal)}</div>
      <div class="sscale">${btns}</div>
      <div class="sscale-ends"><span>1 · 弱</span><span>5 · 强</span></div>
    </div>`;
  });
  $('#scoreBody').innerHTML=html;
  $$('#scoreBody .srow').forEach(row=>{
    const dim=row.dataset.dim;
    row.querySelectorAll('.sscale button').forEach(b=>{
      b.addEventListener('click',()=>{
        const v=+b.dataset.v;
        SCR[dim]= SCR[dim]===v ? 0 : v;       // tap again to clear
        row.querySelectorAll('.sscale button').forEach(x=>x.classList.toggle('on',+x.dataset.v===SCR[dim]));
        persist(); renderScoreBoard();
      });
    });
  });
}
function renderConcl(){
  const seg=$('#conclSeg'); seg.innerHTML='';
  D.conclusions.forEach(c=>{
    const b=document.createElement('button');
    b.dataset.v=c; b.textContent=c;
    b.className=MISC.conclusion===c?'on':'';
    b.addEventListener('click',()=>{ MISC.conclusion= MISC.conclusion===c?'':c; renderConcl(); persist(); });
    seg.appendChild(b);
  });
}

/* =========================================================
   meta + badges
   ========================================================= */
const mWho=$('#mWho'), mDate=$('#mDate'), overall=$('#overallNote');
mWho.value=MISC.who||'';
mDate.value=MISC.date|| new Date().toISOString().slice(0,10);
MISC.date=mDate.value;
overall.value=MISC.overall||'';
mWho.addEventListener('input',()=>{MISC.who=mWho.value;persist();});
mDate.addEventListener('input',()=>{MISC.date=mDate.value;persist();});
overall.addEventListener('input',()=>{MISC.overall=overall.value;autoGrow(overall);persist();});

function updateBadges(){
  const ans=D.questions.filter(q=>{const a=ANS[q.id];return a&&((a.note&&a.note.trim())||a.star);}).length;
  const chk=D.checklist.reduce((n,g)=>n+g.items.filter(it=>CHK[it.id]&&CHK[it.id].got).length,0);
  const bA=$('#badgeAsk'), bC=$('#badgeCheck');
  bA.style.display=ans?'block':'none'; bA.textContent=ans;
  bC.style.display=chk?'block':'none'; bC.textContent=chk;
  const totalChk=D.checklist.reduce((n,g)=>n+g.items.length,0);
  $('#sheetStat').textContent=`访谈 ${ans}/${D.questions.length} · 盘点 ${chk}/${totalChk}`;
}

/* =========================================================
   nav
   ========================================================= */
$$('.bnav button').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const v=btn.dataset.view;
    $$('.bnav button').forEach(b=>b.classList.toggle('on',b===btn));
    $$('.panel-view').forEach(p=>p.classList.remove('on'));
    $('#view-'+v).classList.add('on');
    window.scrollTo({top:0});
    if(v==='score'){renderScoreBoard();autoGrow(overall);}
  });
});

/* =========================================================
   menu sheet
   ========================================================= */
const scrim=$('#scrim'), sheet=$('#sheet');
function openSheet(){ updateBadges(); scrim.classList.add('open'); sheet.classList.add('open'); }
function closeSheet(){ scrim.classList.remove('open'); sheet.classList.remove('open'); }
$('#btnMenu').addEventListener('click',openSheet);
scrim.addEventListener('click',closeSheet);

/* =========================================================
   export markdown
   ========================================================= */
function buildMD(){
  const date=MISC.date||new Date().toISOString().slice(0,10);
  const now=new Date().toLocaleString('zh-CN');
  let md=`# 傲虎事业部 · 走访记录\n\n`;
  md+=`> 受访单位：${MISC.who?MISC.who:'（未填）'}　|　走访日期：${date}　|　导出：${now}\n\n`;
  md+=`---\n\n## 一、分角色访谈\n\n`;
  let anyAsk=false;
  D.roles.forEach(r=>{
    const qs=D.questions.filter(q=>q.role===r.id);
    const recorded=qs.filter(q=>{const a=ANS[q.id];return a&&((a.note&&a.note.trim())||a.star||a.secs);});
    if(!recorded.length)return;
    anyAsk=true;
    const rw=(MISC.roleWho[r.id]||'').trim();
    md+=`### ${r.code} ${r.name}（${r.sub}）${rw?`　受访人：${rw}`:''}\n\n`;
    recorded.forEach(q=>{
      const a=ANS[q.id]||{};
      md+=`**Q${q.n}${a.star?' ⭐':''}** ${q.t}\n`;
      if(a.secs) md+=`\n_用时：${fmtSecs(a.secs)}_\n`;
      if(a.note&&a.note.trim()) md+=`\n${a.note.trim()}\n`;
      md+=`\n`;
    });
  });
  if(!anyAsk)md+=`_（暂无访谈记录）_\n\n`;

  md+=`---\n\n## 二、数据与系统盘点\n\n`;
  D.checklist.forEach(g=>{
    md+=`### ${g.name}　_${g.tier}_\n\n`;
    g.items.forEach(it=>{
      const c=CHK[it.id]||{};
      md+=`- [${c.got?'x':' '}] ${it.t}`;
      if(c.note&&c.note.trim())md+=`　— ${c.note.trim()}`;
      md+=`\n`;
    });
    md+=`\n`;
  });

  md+=`---\n\n## 三、试点适配度评分（1–5，越高越利好）\n\n`;
  D.scoreDims.forEach(d=>{
    const v=SCR[d.id];
    md+=`- **${d.name}**：${v?v+' / 5':'—'}　_（${d.signal}）_\n`;
  });
  const a=avg();
  md+=`\n**六维平均：${a==null?'—':a.toFixed(1)} / 5**\n\n`;
  md+=`**结论：${MISC.conclusion||'（未定）'}**\n\n`;
  if(MISC.overall&&MISC.overall.trim())md+=`**总评：** ${MISC.overall.trim()}\n\n`;

  md+=`---\n_由「傲虎走访 · 访谈记录卡」现场导出。_\n`;
  return md;
}

/* ---------- toast ---------- */
const toast=$('#toast'),toastMsg=$('#toastMsg');let tT=null;
function showToast(m){toastMsg.textContent=m;toast.classList.add('show');clearTimeout(tT);tT=setTimeout(()=>toast.classList.remove('show'),2200);}

function doExport(){
  const md=buildMD();
  const d=MISC.date? MISC.date.replace(/-/g,'') : new Date().toISOString().slice(0,10).replace(/-/g,'');
  const fn=`傲虎走访记录_${d}.md`;
  const blob=new Blob([md],{type:'text/markdown;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  showToast('已导出 '+fn); closeSheet();
}
async function doCopy(){
  const md=buildMD();
  try{ await navigator.clipboard.writeText(md); showToast('记录已复制到剪贴板'); }
  catch(e){
    const ta=document.createElement('textarea');ta.value=md;document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');showToast('记录已复制到剪贴板');}catch(_){showToast('复制失败，请用导出');}
    ta.remove();
  }
  closeSheet();
}
$('#btnExportTop').addEventListener('click',doExport);
$('#mExport').addEventListener('click',doExport);
$('#mCopy').addEventListener('click',doCopy);
$('#mReset').addEventListener('click',()=>{
  if(!confirm('清空本次走访的全部记录？此操作不可撤销（导出的 .md 文件不受影响）。'))return;
  ANS={};CHK={};SCR={};const keepDate=MISC.date;MISC={date:keepDate,roleWho:{}};
  [LS_ANS,LS_CHK,LS_SCR,LS_MISC].forEach(k=>localStorage.removeItem(k));
  persist();
  mWho.value='';overall.value='';
  renderRoleChips();renderQuestions();renderCheck();renderScoreBoard();renderScoreRows();renderConcl();updateBadges();
  showToast('已清空');closeSheet();
});

/* ---------- init ---------- */
renderRoleChips();
renderQuestions();
renderCheck();
renderScoreBoard();
renderScoreRows();
renderConcl();
autoGrow(overall);
updateBadges();
})();
