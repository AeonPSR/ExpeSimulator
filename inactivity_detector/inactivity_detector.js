// Inactivity Detector Content Script
// Injects a simple counter UI on game result pages (/the-end/X)

(function(){
  // Inject ultra-early CSS (document_start) to pre-hide modal containers and prevent flicker.
  try {
    const style = document.createElement('style');
    style.id = 'inactivity-prehide-style';
  style.textContent = `body.inactivity-harvesting #login-modal, 
  body.inactivity-harvesting #login-modal .modal-box {opacity:0 !important; visibility:hidden !important;}
    .inactivity-spinner {width:16px; height:16px; border:3px solid rgba(255,255,255,0.25); border-top-color:#fcff00; border-radius:50%; animation:inact-spin 0.8s linear infinite;}
    .inactivity-spinner.alt {border-top-color:#bc001c;}
    @keyframes inact-spin {to {transform: rotate(360deg);} }
  .inactivity-badge {position:absolute; top:2px; right:2px; width:22px; height:22px; z-index:3; pointer-events:none; filter: drop-shadow(0 0 2px rgba(0,0,0,0.7));}
  .inactivity-badge.inactive { }
  .inactivity-badge.grand-inactive { }
  .original-mush-name { color:#ff5cb8 !important; font-weight:700; text-shadow:0 0 4px rgba(255,92,184,0.6), 0 0 2px #000; }
    `;
    (document.head || document.documentElement).appendChild(style);
  } catch(e) {}
  if(!/https:\/\/emush\.eternaltwin\.org\/the-end\//.test(location.href)) return;

  // Global storage for harvested triumph data
  window.__inactivityTriumphs = window.__inactivityTriumphs || {};

  // Multilingual death cause pattern helpers
  const ABDUCTION_PATTERNS = [
    /you have been abducted\.?/i,
    /fuiste\s+secuestrado\s+por\s+extraterrestres\.?/i,
    /vous avez été enlevé\.?/i
  ];
  const STARVATION_PATTERNS = [
    /mort de faim/i,
    /muerto de hambre/i,
    /starv(?:ed)? to death/i
  ];
  function isAbducted(text){ return ABDUCTION_PATTERNS.some(r=>r.test(text)); }
  function isStarved(text){ return STARVATION_PATTERNS.some(r=>r.test(text)); }

  // Multilingual cycle labels
  const HUMAN_CYCLE_PATTERNS = [ /cycle humain/i, /ciclo humano/i, /human cycle/i ];
  const MUSH_CYCLE_PATTERNS  = [ /cycle mush/i, /ciclo mush/i, /mush cycle/i ]; // ignored for inactivity
  function isHumanCycleLine(text){ return HUMAN_CYCLE_PATTERNS.some(r=>r.test(text)); }
  function isMushCycleLine(text){ return MUSH_CYCLE_PATTERNS.some(r=>r.test(text)); }

  /** UI PANEL **/
  const container = document.createElement('div');
  container.id = 'inactivity-detector';
  Object.assign(container.style, {
    position: 'fixed', top: '10px', right: '10px', zIndex: 99999,
    background: 'rgba(0,0,0,0.6)', padding: '6px 10px', border: '2px solid #444',
    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px',
    fontFamily: 'sans-serif', fontSize: '14px', color: '#ecf0f1'
  });

  function createSegment(getter, color, imgName, title) {
    const seg = document.createElement('div');
    seg.style.display = 'flex';
    seg.style.alignItems = 'center';
    seg.style.gap = '4px';
    seg.title = title || '';
    const num = document.createElement('span');
    num.dataset.dynamic = 'true';
    num.style.fontWeight = '700';
    num.style.color = color;
    num.textContent = '0';
    const spinner = document.createElement('div');
    spinner.className = 'inactivity-spinner' + (imgName.includes('noob') ? ' alt' : '');
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('inactivity_detector/' + imgName);
    img.alt = imgName.replace('.png','');
    Object.assign(img.style, { width: '20px', height: '20px', objectFit: 'contain' });
    seg.appendChild(num); seg.appendChild(spinner); seg.appendChild(img);
    // updater hook
    seg.update = () => { try { num.textContent = getter().toString(); } catch(e) {} };
    seg.setLoading = (loading)=>{
      if(loading){
        spinner.style.display = 'inline-block';
        num.style.display = 'none';
      } else {
        spinner.style.display = 'none';
        num.style.display = 'inline';
      }
    };
    return seg;
  }

  // Cycle-based classification segments
  const sleepySeg = createSegment(()=>calculateInactiveCount(), '#fcff00', 'sleepy.png', 'Inactive players (>=10% inactive cycles, <=8 inactive cycles)');
  const noobSeg   = createSegment(()=>calculateGrandInactiveCount(),   '#bc001c', 'noob.png',   'Grand-inactive players (>=10% inactive cycles and >8 inactive cycles)');
  // Initially show loading spinners until harvest completes
  sleepySeg.setLoading(true);
  noobSeg.setLoading(true);

  container.appendChild(sleepySeg);
  container.appendChild(noobSeg);
  // Copy death summary button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy deaths';
  Object.assign(copyBtn.style, {
    background:'#34495e', color:'#ecf0f1', border:'1px solid #555', cursor:'pointer',
    padding:'4px 6px', fontSize:'12px', borderRadius:'4px'
  });
  copyBtn.addEventListener('click', async () => {
    try {
      // Ensure summary exists / updated
      if(typeof window.getDeathSummaryLine !== 'function') {
        outputDeathSummary();
      }
      const line = window.getDeathSummaryLine ? window.getDeathSummaryLine() : '';
      await navigator.clipboard.writeText(line);
      const prev = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(()=> copyBtn.textContent = prev, 1600);
    } catch(e){
      console.warn('Copy failed, falling back to prompt', e);
      const line = window.getDeathSummaryLine ? window.getDeathSummaryLine() : '';
      window.prompt('Copy death summary:', line);
    }
  });
  container.appendChild(copyBtn);
  // Copy inactivity summary button
  const copyInactiveBtn = document.createElement('button');
  copyInactiveBtn.textContent = 'Copy inactive';
  Object.assign(copyInactiveBtn.style, {
    background:'#34495e', color:'#ecf0f1', border:'1px solid #555', cursor:'pointer',
    padding:'4px 6px', fontSize:'12px', borderRadius:'4px'
  });
  copyInactiveBtn.addEventListener('click', async () => {
    try {
      if(typeof window.getInactivitySummaryLine !== 'function') {
        outputInactivitySummary();
      }
      const line = window.getInactivitySummaryLine ? window.getInactivitySummaryLine() : '';
      await navigator.clipboard.writeText(line);
      const prev = copyInactiveBtn.textContent;
      copyInactiveBtn.textContent = 'Copied!';
      setTimeout(()=> copyInactiveBtn.textContent = prev, 1600);
    } catch(e){
      console.warn('Copy inactive failed, fallback prompt', e);
      const line = window.getInactivitySummaryLine ? window.getInactivitySummaryLine() : '';
      window.prompt('Copy inactivity summary:', line);
    }
  });
  container.appendChild(copyInactiveBtn);
  document.documentElement.appendChild(container);

  /** Harvest Logic **/
  function delay(ms){ return new Promise(r=>setTimeout(r, ms)); }

  function getPlayerCards(){
    return Array.from(document.querySelectorAll('.card.guest-card, .card.player-card, .card'))
      .filter(el=>el.querySelector('.triumph button'));
  }

  function extractNameFromCard(card){
    const nameEl = card.querySelector('.char-name');
    return nameEl ? nameEl.textContent.trim() : null;
  }

  function getModalBox(){
    const loginModal = document.getElementById('login-modal');
    if(!loginModal) return null;
    return loginModal.firstElementChild && loginModal.firstElementChild.classList.contains('modal-box')
      ? loginModal.firstElementChild : null;
  }

  function parseModal(modal){
    if(!modal) return null;
    const h1 = modal.querySelector('h1');
    const name = h1 ? h1.textContent.trim() : null;
    const sections = Array.from(modal.querySelectorAll('h2'));
    const data = { name, highlights: [], glory: [], totalTriumph: 0, rawHTML: modal.innerHTML,
      cyclesActive: 0, cyclesInactive: 0, cyclesTotal: 0, inactivityRatio: 0, inactivityClass: 'active', deathCause: null, abducted: false, starved: false, mushPlayer: false };
    sections.forEach(sec=>{
      const title = sec.textContent.trim().toLowerCase();
      const list = sec.nextElementSibling && sec.nextElementSibling.tagName === 'UL' ? sec.nextElementSibling : null;
      if(list){
        const items = Array.from(list.querySelectorAll('li span')).map(s=>s.textContent.trim());
        if(title.includes('highlight')) data.highlights = items;
        else if(title.includes('glory')) {
          data.glory = items;
          data.totalTriumph = computeTotalTriumph(items);
          const cycleStats = computeCycleStats(items);
          Object.assign(data, cycleStats);
          // detect mush cycles presence (we ignore them for counts but flag player)
          data.mushPlayer = items.some(line => isMushCycleLine(line));
          classifyInactivity(data);
        }
      }
    });
    return data;
  }

  function computeTotalTriumph(gloryLines){
    let total = 0;
    for(const line of gloryLines){
      // Pattern examples: "35 x Cycle Humain ( +1" , "1 x Retour sur Sol ( +20"
      // We'll capture count before the 'x' and the first +number inside parentheses.
      const countMatch = line.match(/^(\d+)\s*x/i);
      const plusMatch = line.match(/\(\s*\+(\d+)/);
      if(countMatch && plusMatch){
        const count = parseInt(countMatch[1],10);
        const per = parseInt(plusMatch[1],10);
        if(!isNaN(count) && !isNaN(per)) total += count * per;
      }
    }
    return total;
  }

  function computeCycleStats(gloryLines){
    let active = 0, inactive = 0;
    for(const rawLine of gloryLines){
  if(isMushCycleLine(rawLine)) continue; // explicitly ignore Mush cycles
  if(!isHumanCycleLine(rawLine)) continue; // only process human cycles
      const line = rawLine.trim();
      const countMatch = line.match(/^(\d+)\s*x/i);
      const count = countMatch ? parseInt(countMatch[1],10) : 0;
      // Detect per-cycle triumph; fallback logic if pattern missing
      let per = null;
      const plusMatch = line.match(/\(\s*\+(\d+)/);
      if(plusMatch) per = parseInt(plusMatch[1],10);
      // Heuristics:
      //  - If per === 0 => inactive cycles
      //  - If per > 0 => active cycles
      //  - If per is null:
      //      * If line contains '+0' anywhere, treat inactive
      //      * Else if line contains '+1' (or + digit) treat active
      //      * Else fallback: treat as inactive (conservative)
      if(!isNaN(count) && count > 0){
        if(per === 0){
          inactive += count;
        } else if(per > 0){
          active += count;
        } else { // per is null
          if(/\+0(?!\d)/.test(line)) inactive += count;
          else if(/\+\d+/.test(line)) active += count;
          else inactive += count; // default
        }
      }
    }
    const total = active + inactive;
    const ratio = total > 0 ? inactive / total : 0;
    return { cyclesActive: active, cyclesInactive: inactive, cyclesTotal: total, inactivityRatio: ratio };
  }

  function classifyInactivity(data){
    // Additive severity model: 0 active, 1 inactive, 2 grand-inactive
    let severity = 0;
    const reasons = [];

    // Cycle-based baseline (only if we have cycles total >0)
    if(data.cyclesTotal > 0){
      if(data.inactivityRatio >= 0.10 && data.cyclesInactive > 0){
        severity = data.cyclesInactive > 8 ? 2 : 1;
        reasons.push('cycles');
      }
    }

    // Starvation: always at least inactive; if many inactive cycles push to grand
    if(data.starved){
      const starveSeverity = data.cyclesInactive > 8 ? 2 : 1;
      if(starveSeverity > severity) severity = starveSeverity;
      reasons.push('starved');
    }

    // Abduction: at least inactive; if many inactive cycles already, may escalate
    if(data.abducted){
      const abductSeverity = data.cyclesInactive > 8 ? 2 : 1;
      if(abductSeverity > severity) severity = abductSeverity;
      reasons.push('abducted');
    }

    // Mush highlight heuristic: if Mush & low highlights escalate to grand-inactive
    if(data.mushPlayer){
      if(data.highlights.length < 2){
        if(severity < 2) severity = 2;
        reasons.push('mush-low-highlights');
      } else {
        reasons.push('mush');
      }
    }

    // Final guarantees
    if(data.starved && severity < 1){
      severity = 1; // starvation guarantee
      if(!reasons.includes('starved')) reasons.push('starved');
    }

    // Map severity to class
    data.inactivityClass = severity === 0 ? 'active' : (severity === 1 ? 'inactive' : 'grand-inactive');
    if(reasons.length) data.inactivityReasons = reasons;
    console.debug('[InactivityDetector] Classified', data.name, 'cyclesActive=', data.cyclesActive, 'cyclesInactive=', data.cyclesInactive, 'ratio=', (data.inactivityRatio*100).toFixed(1)+'%', 'severity=', severity, 'class=', data.inactivityClass, 'reasons=', reasons.join('+'));
  }

  function applyInactivityBadges(){
    const cards = document.querySelectorAll('.card, .card.extra-card, .card.player-card, .card.guest-card');
    cards.forEach(card=>{
      const nameEl = card.querySelector('.char-name');
      if(!nameEl) return;
      const name = nameEl.textContent.trim();
      const record = window.__inactivityTriumphs[name];
      if(!record) return;
      if(record.inactivityClass === 'active') return; // skip active
      const dude = card.querySelector('.dude');
      if(!dude) return;
      if(getComputedStyle(dude).position === 'static') dude.style.position = 'relative';
      // Remove existing badge
      const existing = dude.querySelector('.inactivity-badge');
      if(existing) existing.remove();
      const badge = document.createElement('img');
      badge.className = 'inactivity-badge ' + (record.inactivityClass === 'grand-inactive' ? 'grand-inactive' : 'inactive');
      badge.src = chrome.runtime.getURL('inactivity_detector/' + (record.inactivityClass === 'grand-inactive' ? 'noob.png' : 'sleepy.png'));
      badge.alt = record.inactivityClass;
      dude.appendChild(badge);
    });
  }

  async function clickAndWait(card, expectedName){
    const btn = card.querySelector('.triumph button');
    if(!btn) return null;
    const modalBefore = getModalBox();
    const prevSignature = modalBefore ? modalBefore.innerText.slice(0,200) : '';
    btn.click();
    let attempts = 0;
    let parsed = null;
    while(attempts < 50){ // up to ~5s (50*100ms)
      await delay(100);
      const modal = getModalBox();
      if(modal){
        const h1 = modal.querySelector('h1');
        const name = h1 ? h1.textContent.trim() : null;
        const sig = modal.innerText.slice(0,200);
        if(name === expectedName || sig !== prevSignature){
          parsed = parseModal(modal);
          // hide modal after capture (non-destructive)
          modal.style.display = 'none';
          break;
        }
      }
      attempts++;
    }
    return parsed;
  }

  async function harvestAllTriumphs(){
    const cards = getPlayerCards();
    // Mark harvesting phase for CSS-based hiding
    document.body.classList.add('inactivity-harvesting');
    const loginModalContainer = document.getElementById('login-modal');
    let previousInline = null;
    if(loginModalContainer){
      previousInline = loginModalContainer.getAttribute('style');
      // minimal inline override (CSS already hides)
      loginModalContainer.style.pointerEvents = 'none';
      loginModalContainer.style.transition = 'none';
    }
    for(const card of cards){
      const name = extractNameFromCard(card);
      if(!name) continue;
  if(window.__inactivityTriumphs[name]) continue; // already harvested
  // Extract death cause text from card (if present)
      let deathCause = null;
      const dcEl = card.querySelector('.death-cause');
      if(dcEl){
        deathCause = dcEl.textContent.trim();
      }
      try{
        const data = await clickAndWait(card, name);
        if(data && data.name){
          if(deathCause){
            data.deathCause = deathCause;
            if(isAbducted(deathCause)) data.abducted = true;
            if(isStarved(deathCause)) data.starved = true;
            classifyInactivity(data); // re-classify with overrides
          }
          // derive canonical name and store mapping
          const canonical = deriveCanonical(data.name);
          data.canonical = canonical;
          // minimize stored size
          delete data.rawHTML;
          window.__inactivityTriumphs[data.name] = data;
          window.__inactivityByCanonical[canonical] = data;
          console.log('[InactivityDetector] Triumph total:', data.name, '=>', data.totalTriumph);
        }
      }catch(e){
        console.warn('Harvest failed for', name, e);
      }
      // small gap to be kind to the page
      await delay(50);
    }
  console.info('Triumph harvest complete. Totals:');
    Object.values(window.__inactivityTriumphs).forEach(d=>{
      console.info(' -', d.name, ':', d.totalTriumph);
    });
  // Classification logging
  const inactiveNames = Object.values(window.__inactivityTriumphs).filter(p=>p.inactivityClass==='inactive').map(p=>p.name);
  const grandInactiveNames = Object.values(window.__inactivityTriumphs).filter(p=>p.inactivityClass==='grand-inactive').map(p=>p.name);
  console.info('[InactivityDetector] Inactive players:', inactiveNames.length ? inactiveNames.join(', ') : '(none)');
  console.info('[InactivityDetector] Grand-inactive players:', grandInactiveNames.length ? grandInactiveNames.join(', ') : '(none)');
    // Close the modal once after all harvesting is done (per user request)
    const closeBtn = document.querySelector('#login-modal .modal-close');
    if(closeBtn){
      closeBtn.click();
      console.info('[InactivityDetector] Modal closed after harvest.');
    }
    // End harvesting phase: restore visibility & pointer events
    document.body.classList.remove('inactivity-harvesting');
    if(loginModalContainer){
      if(previousInline === null) loginModalContainer.removeAttribute('style');
      else loginModalContainer.setAttribute('style', previousInline);
      console.info('[InactivityDetector] Modal visibility restored post-harvest.');
    }
  // Update counters & remove loading state
  sleepySeg.update();
  noobSeg.update();
  sleepySeg.setLoading(false);
  noobSeg.setLoading(false);
  applyInactivityBadges();
  outputDeathSummary();
  outputInactivitySummary();
  renameOriginalMushPlayers();
  }

  /** Cycle-based classification counts **/
  function calculateInactiveCount(){
    return Object.values(window.__inactivityTriumphs).filter(p=>p.inactivityClass === 'inactive').length;
  }
  function calculateGrandInactiveCount(){
    return Object.values(window.__inactivityTriumphs).filter(p=>p.inactivityClass === 'grand-inactive').length;
  }

  // Normalize death causes to single keyword per player in a fixed order
  const DEATH_ORDER = [
    'Chao','Chun','Eleesha','Finola','Frieda','Gioele','Hua','Ian','Janice','Jin Su','Kuan-ti','Paola','Raluca','Roland','Stephen','Terrence','Derek','Andie'
  ];

  // Canonical mapping helpers to avoid any later name substring scans
  window.__inactivityByCanonical = window.__inactivityByCanonical || {}; // { canonicalName -> record }
  const FULL_TO_CANONICAL = {
    'zhong chun':'Chun',
    'chun':'Chun',
    'lai kuan ti':'Kuan-ti',
    'lai kuan-ti':'Kuan-ti',
    'kuan ti':'Kuan-ti',
    'kuan-ti':'Kuan-ti',
    'jin su':'Jin Su',
    'jinsu':'Jin Su'
  };
  function normalizeKey(str){
    return (str||'')
      .toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu,'')
      .replace(/[^a-z0-9]+/g,' ') // collapse separators
      .trim()
      .replace(/\s+/g,' ');
  }
  function deriveCanonical(rawName){
    const key = normalizeKey(rawName);
    if(FULL_TO_CANONICAL[key]) return FULL_TO_CANONICAL[key];
    // fallback: find first canonical whose normalized form is contained as a whole word
    for(const canon of DEATH_ORDER){
      const ck = normalizeKey(canon);
      const re = new RegExp('(^| )'+ck+'($| )');
      if(re.test(key)) return canon; // direct match
    }
    // last resort: return first token capitalized
    const first = key.split(' ')[0] || '';
    return first ? first.charAt(0).toUpperCase()+first.slice(1) : rawName;
  }

  function normalizeDeathCause(cause){
    if(!cause) return '0';
    const c = cause.toLowerCase();
  // Returned to Sol variants (set before generic Eden or other matches)
  if(/returned to sol/.test(c) || /retourn[ée] sur sol/.test(c) || /retour sur sol/.test(c)) return 'Sol';
    if(/abduct/i.test(c) || /secuestrado/.test(c) || /enlevé/.test(c)) return 'Abducted';
    if(/starv/.test(c) || /faim/.test(c) || /hambre/.test(c)) return 'Starved';
    if(/assass/i.test(c)) return 'Assassinated';
    if(/eden/.test(c)) return 'Eden';
    if(/mush/.test(c)) return 'Mush';
  // (Previous 'Returned' label replaced by explicit 'Sol' mapping above.)
    if(/suicide|self/.test(c)) return 'Suicide';
    if(/explos/i.test(c)) return 'Explosion';
    if(/poison/i.test(c)) return 'Poison';
    if(/virus|infection/.test(c)) return 'Infection';
    // fallback: first word capitalized (letters only)
    const m = c.match(/[a-zA-ZÀ-ÿ]+/);
    return m ? (m[0].charAt(0).toUpperCase()+m[0].slice(1)) : 'Other';
  }

  function outputDeathSummary(){
    const parts = DEATH_ORDER.map(canon=>{
      const rec = window.__inactivityByCanonical[canon];
      return normalizeDeathCause(rec && rec.deathCause);
    });
    const line = parts.join(',');
    console.log('[InactivityDetector] DeathSummary:', line);
    window.getDeathSummaryLine = () => line; // helper for copy
  }

  function outputInactivitySummary(){
    const parts = DEATH_ORDER.map(canon=>{
      const rec = window.__inactivityByCanonical[canon];
      if(!rec) return '0';
      return (rec.inactivityClass === 'inactive' || rec.inactivityClass === 'grand-inactive') ? '1' : '0';
    });
    const line = parts.join(',');
    console.log('[InactivityDetector] InactivitySummary:', line);
    window.getInactivitySummaryLine = ()=> line;
  }

  // Rename the two original Mush (those having a Mushified +120 glory line) to 'Pink' on the visible card
  function renameOriginalMushPlayers(){
    const candidates = Object.values(window.__inactivityTriumphs).filter(r=>{
      if(!Array.isArray(r.glory)) return false;
  return r.glory.some(line=> /(mushified|mushiform[ée])/i.test(line) && /\+120/.test(line));
    });
    if(!candidates.length) return; // nothing to do
    candidates.forEach(rec=>{
      // Find a matching card whose current name text still matches the original name (not already changed)
      const card = Array.from(document.querySelectorAll('.card .char-name'))
        .map(el=>el.closest('.card'))
        .find(c=>{
          const nameEl = c && c.querySelector('.char-name');
          return nameEl && nameEl.textContent.trim() === rec.name;
        });
      if(card){
        const nameEl = card.querySelector('.char-name');
        if(nameEl){
          if(!nameEl.classList.contains('original-mush-name')){
            nameEl.classList.add('original-mush-name');
            nameEl.dataset.originalName = rec.name;
          }
        }
      }
    });
    console.debug('[InactivityDetector] Styled original Mush players (pink):', candidates.map(c=>c.name));
  }

  // Auto-trigger initial harvest after a short delay (can be removed if undesired)
  setTimeout(()=>{
  harvestAllTriumphs();
  }, 1500);

  // Expose helper for manual inspection
  window.listTriumphTotals = function(){
    Object.values(window.__inactivityTriumphs).forEach(d=>console.log(d.name, d.totalTriumph, d));
  };
  
  // Patch harvest logic: inject canonical mapping & avoid retaining rawHTML
  const _origParseModal = parseModal; // capture reference if needed
  // Monkey-patch parseModal only to strip rawHTML field afterwards (storage minimization)
  // (Keeping function body unchanged above; trimming when storing record.)

  // Hook into record storage by wrapping original harvesting loop via Mutation (simpler: override window.__inactivityTriumphs setter not needed)
  // Instead, modify storage inside harvestAllTriumphs via small inline patch below.
})();
