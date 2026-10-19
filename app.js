/**
 * SHREE SUBHA LAXMI JEWELLERY - LIVE RATES ENGINE
 * Android TV & Web Display Controller
 */

// Default Configuration & Rules
const DEFAULT_CONFIG = {
  offset24k: 500,        // User rule: Add 500 Rs in 24k gold tola price
  multiplier22k: 92,     // User rule: 22k = 24k * 92%
  offsetSilver: 15,      // User rule: Add 15 Rs in silver tola
  refreshSeconds: 60,    // Timely refresh
  useNepaliDigits: false, // Digits format toggle
  phone: '+977-9851000000, 01-4XXXXXX',
  address: 'न्यूरोड, काठमाडौं, नेपाल (New Road, Kathmandu)',
  customNotice: 'श्री शुभ लक्ष्मी ज्वेलरीमा १००% हलमार्क छाप भएका गहनाहरु उचित ज्याला र जर्तीमा उपलब्ध छन्।'
};

// State Object
const state = {
  config: { ...DEFAULT_CONFIG },
  rates: null,
  rawApiResponse: null,
  lastUpdated: null,
  nextRefreshTimer: null,
  countdownSec: 60,
  currentSlide: 0,
  slideshowTimer: null,
  wakeLock: null
};

// Fallback Baseline Data (in case network/Fenegosida is unreachable)
const SNAPSHOT_FALLBACK = [
  {
    id: 16147,
    todayDate: new Date().toISOString(),
    yestardayDate: new Date(Date.now() - 86400000).toISOString(),
    rateType: "छापावाल सुन (१० ग्राम)",
    todayBaseRatePerGram: 248800,
    yestardayBaseRatePerGram: 248370
  },
  {
    id: 16148,
    todayDate: new Date().toISOString(),
    yestardayDate: new Date(Date.now() - 86400000).toISOString(),
    rateType: "छापावाल सुन (१ तोला)",
    todayBaseRatePerGram: 290200,
    yestardayBaseRatePerGram: 289700
  },
  {
    id: 16149,
    todayDate: new Date().toISOString(),
    yestardayDate: new Date(Date.now() - 86400000).toISOString(),
    rateType: "असली चाँदी दर (१० ग्राम)",
    todayBaseRatePerGram: 3588,
    yestardayBaseRatePerGram: 3515
  },
  {
    id: 16150,
    todayDate: new Date().toISOString(),
    yestardayDate: new Date(Date.now() - 86400000).toISOString(),
    rateType: "असली चाँदी दर (१ तोला)",
    todayBaseRatePerGram: 4185,
    yestardayBaseRatePerGram: 4100
  }
];

// Slides data
const SLIDES = [
  {
    img: 'assets/necklace.jpg',
    nepali: 'परम्परागत ब्राइडल रानीहार सेट',
    english: 'Royal Traditional Bridal Collection'
  },
  {
    img: 'assets/bangles.jpg',
    nepali: '२४ क्यारेट कलात्मक चुरा तथा कंगन',
    english: 'Exquisite 24K Handcrafted Bangles'
  },
  {
    img: 'assets/rings.jpg',
    nepali: 'प्रमाणित डायमण्ड तथा सुनका औँठीहरु',
    english: 'Certified Diamond & Solitaire Rings'
  }
];

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  initClockAndCalendar();
  initSlideshow();
  initEventListeners();
  requestWakeLock();
  fetchRates();
  startRefreshCountdown();
});

/* ==========================================================================
   CONFIG STORAGE & SETTINGS
   ========================================================================== */
function loadConfig() {
  try {
    const saved = localStorage.getItem('subhalaxmi_cfg');
    if (saved) {
      state.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  applyConfigToUI();
}

function saveConfig() {
  try {
    localStorage.setItem('subhalaxmi_cfg', JSON.stringify(state.config));
  } catch (e) {
    console.warn('LocalStorage write error:', e);
  }
  applyConfigToUI();
  if (state.rates) {
    renderRates(state.rates);
  }
  showToast('सेटिङ्स सुरक्षित गरियो (Settings saved successfully!)');
}

function applyConfigToUI() {
  // Update Ticker Contact Info
  const tPhone = document.getElementById('tickerPhone');
  const tPhone2 = document.getElementById('tickerPhone2');
  const tAddress = document.getElementById('tickerAddress');
  const tAddress2 = document.getElementById('tickerAddress2');

  if (tPhone) tPhone.textContent = state.config.phone;
  if (tPhone2) tPhone2.textContent = state.config.phone;
  if (tAddress) tAddress.textContent = state.config.address;
  if (tAddress2) tAddress2.textContent = state.config.address;

  // Sync Form inputs
  const cfgPhone = document.getElementById('cfgPhone');
  const cfgAddress = document.getElementById('cfgAddress');
  const cfgNotice = document.getElementById('cfgCustomNotice');
  const cfg24k = document.getElementById('cfgOffset24k');
  const cfg22k = document.getElementById('cfgMultiplier22k');
  const cfgSilver = document.getElementById('cfgOffsetSilver');
  const cfgRefresh = document.getElementById('cfgRefreshSeconds');
  const cfgDigits = document.getElementById('cfgNepaliDigits');

  if (cfgPhone) cfgPhone.value = state.config.phone;
  if (cfgAddress) cfgAddress.value = state.config.address;
  if (cfgNotice) cfgNotice.value = state.config.customNotice;
  if (cfg24k) cfg24k.value = state.config.offset24k;
  if (cfg22k) cfg22k.value = state.config.multiplier22k;
  if (cfgSilver) cfgSilver.value = state.config.offsetSilver;
  if (cfgRefresh) cfgRefresh.value = state.config.refreshSeconds;
  if (cfgDigits) cfgDigits.checked = !!state.config.useNepaliDigits;

  state.countdownSec = state.config.refreshSeconds;
}

/* ==========================================================================
   RATE FETCHING & CALCULATION ENGINE
   ========================================================================== */
async function fetchRates() {
  const refreshBtn = document.getElementById('btnRefresh');
  if (refreshBtn) refreshBtn.classList.add('spinning');

  // Hierarchy of endpoints:
  // 1. /api/rates (Vercel Serverless & local proxy)
  // 2. Direct Fenegosida URL
  // 3. Public CORS proxy fallback
  const endpoints = [
    '/api/rates',
    'https://api.fenegosida.org/api/website/v1/Dashboard/today',
    'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://api.fenegosida.org/api/website/v1/Dashboard/today')
  ];

  let rawData = null;
  let fetchError = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) {
        rawData = await res.json();
        // If data is nested under 'value'
        if (rawData && rawData.value && Array.isArray(rawData.value)) {
          rawData = rawData.value;
        }
        if (Array.isArray(rawData) && rawData.length > 0) {
          break; // successfully got valid array
        }
      }
    } catch (err) {
      fetchError = err;
      console.warn(`Failed fetch from ${url}:`, err);
    }
  }

  if (refreshBtn) refreshBtn.classList.remove('spinning');

  if (Array.isArray(rawData) && rawData.length > 0) {
    state.rawApiResponse = rawData;
    processAndDisplayRates(rawData);
    state.lastUpdated = new Date();
  } else {
    console.error('All rate endpoints failed. Using snapshot fallback.', fetchError);
    if (!state.rawApiResponse) {
      state.rawApiResponse = SNAPSHOT_FALLBACK;
      processAndDisplayRates(SNAPSHOT_FALLBACK);
      showToast('⚠️ आधिकारिक डेटा लोड भएन। पछिल्लो सुरक्षित दर देखाइएको छ।');
    }
  }
}

function processAndDisplayRates(data) {
  // Find entries from Fenegosida
  let gold1TolaItem = data.find(i => i.rateType && (i.rateType.includes('छापावाल') || i.rateType.includes('Fine')) && i.rateType.includes('१ तोला'));
  let gold10gItem = data.find(i => i.rateType && (i.rateType.includes('छापावाल') || i.rateType.includes('Fine')) && i.rateType.includes('१० ग्राम'));
  let silver1TolaItem = data.find(i => i.rateType && (i.rateType.includes('चाँदी') || i.rateType.includes('Silver')) && i.rateType.includes('१ तोला'));
  let silver10gItem = data.find(i => i.rateType && (i.rateType.includes('चाँदी') || i.rateType.includes('Silver')) && i.rateType.includes('१० ग्राम'));

  // Default values if exact match fails
  const baseGoldTolaToday = gold1TolaItem ? gold1TolaItem.todayBaseRatePerGram : 290200;
  const baseGoldTolaYest = gold1TolaItem ? gold1TolaItem.yestardayBaseRatePerGram : 289700;
  const baseGold10gToday = gold10gItem ? gold10gItem.todayBaseRatePerGram : 248800;
  const baseGold10gYest = gold10gItem ? gold10gItem.yestardayBaseRatePerGram : 248370;

  const baseSilverTolaToday = silver1TolaItem ? silver1TolaItem.todayBaseRatePerGram : 4185;
  const baseSilverTolaYest = silver1TolaItem ? silver1TolaItem.yestardayBaseRatePerGram : 4100;
  const baseSilver10gToday = silver10gItem ? silver10gItem.todayBaseRatePerGram : 3588;
  const baseSilver10gYest = silver10gItem ? silver10gItem.yestardayBaseRatePerGram : 3515;

  const offset24k = parseFloat(state.config.offset24k) || 0;
  const multiplier22k = (parseFloat(state.config.multiplier22k) || 92) / 100;
  const offsetSilver = parseFloat(state.config.offsetSilver) || 0;

  // 1 Tola = 11.6638038 grams
  const tolaTo10gFactor = 10 / 11.6638038;

  // 1. CALCULATE 24K GOLD (Chapawala Gold)
  // User Rule: Add 500 Rs in 24k gold tola price and chapawala gold
  const gold24kTolaToday = Math.round(baseGoldTolaToday + offset24k);
  const gold24kTolaYest = Math.round(baseGoldTolaYest + offset24k);
  const diff24kTola = gold24kTolaToday - gold24kTolaYest;

  // 10 Gram 24K Rate:
  const gold24k10gToday = Math.round(baseGold10gToday + (offset24k * tolaTo10gFactor));
  const gold24k10gYest = Math.round(baseGold10gYest + (offset24k * tolaTo10gFactor));

  // 2. CALCULATE 22K GOLD
  // User Rule: 22k = 24k * 92%
  const gold22kTolaToday = Math.round(gold24kTolaToday * multiplier22k);
  const gold22kTolaYest = Math.round(gold24kTolaYest * multiplier22k);
  const diff22kTola = gold22kTolaToday - gold22kTolaYest;

  const gold22k10gToday = Math.round(gold24k10gToday * multiplier22k);
  const gold22k10gYest = Math.round(gold24k10gYest * multiplier22k);

  // 3. CALCULATE SILVER
  // User Rule: in silver add 15rs in tola
  const silverTolaToday = Math.round(baseSilverTolaToday + offsetSilver);
  const silverTolaYest = Math.round(baseSilverTolaYest + offsetSilver);
  const diffSilverTola = silverTolaToday - silverTolaYest;

  const silver10gToday = Math.round(baseSilver10gToday + (offsetSilver * tolaTo10gFactor));
  const silver10gYest = Math.round(baseSilver10gYest + (offsetSilver * tolaTo10gFactor));

  state.rates = {
    gold24k: {
      tola: gold24kTolaToday,
      tolaYesterday: gold24kTolaYest,
      tolaDiff: diff24kTola,
      g10: gold24k10gToday,
      g10Yesterday: gold24k10gYest
    },
    gold22k: {
      tola: gold22kTolaToday,
      tolaYesterday: gold22kTolaYest,
      tolaDiff: diff22kTola,
      g10: gold22k10gToday,
      g10Yesterday: gold22k10gYest
    },
    silver: {
      tola: silverTolaToday,
      tolaYesterday: silverTolaYest,
      tolaDiff: diffSilverTola,
      g10: silver10gToday,
      g10Yesterday: silver10gYest
    }
  };

  renderRates(state.rates);
}

function renderRates(rates) {
  const isNepali = state.config.useNepaliDigits;

  // 24K Card
  animateValue('price24kTola', rates.gold24k.tola, isNepali);
  animateValue('price24k10g', rates.gold24k.g10, isNepali);
  document.getElementById('yesterday24kTola').textContent = 'रू ' + formatCurrency(rates.gold24k.tolaYesterday, isNepali);
  renderTrend('trend24k', rates.gold24k.tolaDiff, isNepali);

  // 22K Card
  animateValue('price22kTola', rates.gold22k.tola, isNepali);
  animateValue('price22k10g', rates.gold22k.g10, isNepali);
  document.getElementById('yesterday22kTola').textContent = 'रू ' + formatCurrency(rates.gold22k.tolaYesterday, isNepali);
  renderTrend('trend22k', rates.gold22k.tolaDiff, isNepali);

  // Silver Card
  animateValue('priceSilverTola', rates.silver.tola, isNepali);
  animateValue('priceSilver10g', rates.silver.g10, isNepali);
  document.getElementById('yesterdaySilverTola').textContent = 'रू ' + formatCurrency(rates.silver.tolaYesterday, isNepali);
  renderTrend('trendSilver', rates.silver.tolaDiff, isNepali);

  // Update dynamic adjustment notes
  const note24k = document.getElementById('note24k');
  if (note24k) {
    note24k.innerHTML = `<span class="note-icon">✨</span><span>+रू ${toNumStr(state.config.offset24k, isNepali)} प्रति तोला थप गरिएको</span>`;
  }

  const note22k = document.getElementById('note22k');
  if (note22k) {
    note22k.innerHTML = `<span class="note-icon">⚖️</span><span>२४ क्यारेटको ${toNumStr(state.config.multiplier22k, isNepali)}% अनुसार</span>`;
  }

  const noteSilver = document.getElementById('noteSilver');
  if (noteSilver) {
    noteSilver.innerHTML = `<span class="note-icon">✨</span><span>+रू ${toNumStr(state.config.offsetSilver, isNepali)} प्रति तोला थप गरिएको</span>`;
  }
}

function renderTrend(elementId, diff, isNepali) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const arrowEl = el.querySelector('.trend-arrow');
  const textEl = el.querySelector('.trend-text');

  if (diff > 0) {
    el.className = 'rate-trend-badge';
    arrowEl.textContent = '▲';
    textEl.textContent = '+ रू ' + formatCurrency(diff, isNepali);
  } else if (diff < 0) {
    el.className = 'rate-trend-badge trend-down';
    arrowEl.textContent = '▼';
    textEl.textContent = '- रू ' + formatCurrency(Math.abs(diff), isNepali);
  } else {
    el.className = 'rate-trend-badge';
    arrowEl.textContent = '—';
    textEl.textContent = 'स्थिर (No Change)';
  }
}

/* ==========================================================================
   FORMATTING HELPERS (SOUTH ASIAN COMMA & NEPALI DIGITS)
   ========================================================================== */
function formatCurrency(num, nepaliDigits = false) {
  if (isNaN(num)) return '--,---';
  let s = Math.round(num).toString();
  
  // Format as South Asian Indian/Nepali numbering: 2,90,700
  let lastThree = s.substring(s.length - 3);
  let otherNumbers = s.substring(0, s.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  let res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;

  if (nepaliDigits) {
    return convertToNepaliDigits(res);
  }
  return res;
}

function convertToNepaliDigits(str) {
  const map = {
    '0': '०', '1': '१', '2': '२', '3': '३', '4': '४',
    '5': '५', '6': '६', '7': '७', '8': '८', '9': '९'
  };
  return str.replace(/[0-9]/g, w => map[w] || w);
}

function toNumStr(num, nepaliDigits = false) {
  return nepaliDigits ? convertToNepaliDigits(num.toString()) : num.toString();
}

function animateValue(elementId, targetVal, isNepali) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const formatted = formatCurrency(targetVal, isNepali);
  el.textContent = formatted;
  
  // Subtle flash animation on price change
  el.classList.add('price-flash');
  setTimeout(() => el.classList.remove('price-flash'), 800);
}

/* ==========================================================================
   COUNTDOWN TIMER & AUTO-REFRESH
   ========================================================================== */
function startRefreshCountdown() {
  const countdownCircle = document.getElementById('countdownCircle');
  const countdownText = document.getElementById('countdownText');

  state.countdownSec = state.config.refreshSeconds;

  if (state.nextRefreshTimer) clearInterval(state.nextRefreshTimer);

  state.nextRefreshTimer = setInterval(() => {
    state.countdownSec--;

    if (state.countdownSec <= 0) {
      state.countdownSec = state.config.refreshSeconds;
      fetchRates();
    }

    if (countdownText) {
      countdownText.textContent = `${state.countdownSec}s`;
    }

    if (countdownCircle) {
      const pct = (state.countdownSec / state.config.refreshSeconds) * 100;
      countdownCircle.setAttribute('stroke-dasharray', `${pct}, 100`);
    }
  }, 1000);
}

/* ==========================================================================
   CLOCK & NEPALI DATE CALENDAR
   ========================================================================== */
function initClockAndCalendar() {
  function updateTime() {
    const now = new Date();
    
    // Format Time: 03:45:22 PM
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeStr = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    
    const timeEl = document.getElementById('timeDisplay');
    if (timeEl) timeEl.textContent = timeStr;

    // Format English Date: Monday, Oct 19, 2026
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const engDateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    const engEl = document.getElementById('englishDateDisplay');
    if (engEl) engEl.textContent = engDateStr;

    // Format Nepali Date (Bikram Sambat Approximation & Days)
    const nepDays = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
    const nepMonths = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'];
    
    // Approximate BS mapping (AD year + 56/57)
    // 2026 Oct ~ 2083 Kartik
    const bsYear = now.getFullYear() + 57;
    // Oct 19 is approx Kartik 3
    const bsDay = ((now.getDate() + 14) % 30) + 1;
    const nepDateStr = `${nepDays[now.getDay()]}, ${nepMonths[6]} ${convertToNepaliDigits(bsDay.toString())}, ${convertToNepaliDigits(bsYear.toString())}`;
    
    const nepEl = document.getElementById('nepaliDateDisplay');
    if (nepEl) nepEl.textContent = nepDateStr;
  }

  updateTime();
  setInterval(updateTime, 1000);
}

/* ==========================================================================
   SHOWCASE CAROUSEL
   ========================================================================== */
function initSlideshow() {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.indicator-dot');
  const captionNepali = document.getElementById('captionNepali');
  const captionEnglish = document.getElementById('captionEnglish');
  const showcaseTitle = document.getElementById('showcaseTitle');

  function showSlide(index) {
    slides.forEach((s, i) => s.classList.toggle('active', i === index));
    dots.forEach((d, i) => d.classList.toggle('active', i === index));

    const slideData = SLIDES[index];
    if (slideData) {
      if (captionNepali) captionNepali.textContent = slideData.nepali;
      if (captionEnglish) captionEnglish.textContent = slideData.english;
      if (showcaseTitle) showcaseTitle.textContent = slideData.nepali;
    }
    state.currentSlide = index;
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.getAttribute('data-index'), 10);
      showSlide(idx);
      resetSlideshowTimer();
    });
  });

  function nextSlide() {
    let next = (state.currentSlide + 1) % SLIDES.length;
    showSlide(next);
  }

  function resetSlideshowTimer() {
    if (state.slideshowTimer) clearInterval(state.slideshowTimer);
    state.slideshowTimer = setInterval(nextSlide, 7000); // 7s per slide
  }

  resetSlideshowTimer();
}

/* ==========================================================================
   UI CONTROLS & EVENT LISTENERS
   ========================================================================== */
function initEventListeners() {
  // Refresh button
  const btnRefresh = document.getElementById('btnRefresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      fetchRates();
      state.countdownSec = state.config.refreshSeconds;
      showToast('दरभाउ अपडेट गरिँदैछ... (Refreshing live rates)');
    });
  }

  const refreshContainer = document.getElementById('refreshContainer');
  if (refreshContainer) {
    refreshContainer.addEventListener('click', () => {
      fetchRates();
      state.countdownSec = state.config.refreshSeconds;
    });
  }

  // Fullscreen button
  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
  }

  // Settings modal
  const btnSettings = document.getElementById('btnSettings');
  const modal = document.getElementById('settingsModal');
  const btnClose = document.getElementById('btnCloseSettings');
  const backdrop = document.getElementById('settingsBackdrop');
  const btnSave = document.getElementById('btnSaveSettings');
  const btnReset = document.getElementById('btnResetSettings');

  if (btnSettings && modal) {
    btnSettings.addEventListener('click', () => modal.classList.add('active'));
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (backdrop && modal) {
    backdrop.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const cfgPhone = document.getElementById('cfgPhone');
      const cfgAddress = document.getElementById('cfgAddress');
      const cfgNotice = document.getElementById('cfgCustomNotice');
      const cfg24k = document.getElementById('cfgOffset24k');
      const cfg22k = document.getElementById('cfgMultiplier22k');
      const cfgSilver = document.getElementById('cfgOffsetSilver');
      const cfgRefresh = document.getElementById('cfgRefreshSeconds');
      const cfgDigits = document.getElementById('cfgNepaliDigits');

      state.config.phone = cfgPhone ? cfgPhone.value.trim() : state.config.phone;
      state.config.address = cfgAddress ? cfgAddress.value.trim() : state.config.address;
      state.config.customNotice = cfgNotice ? cfgNotice.value.trim() : state.config.customNotice;
      state.config.offset24k = cfg24k ? (parseFloat(cfg24k.value) || 0) : 500;
      state.config.multiplier22k = cfg22k ? (parseFloat(cfg22k.value) || 92) : 92;
      state.config.offsetSilver = cfgSilver ? (parseFloat(cfgSilver.value) || 0) : 15;
      state.config.refreshSeconds = cfgRefresh ? (parseInt(cfgRefresh.value, 10) || 60) : 60;
      state.config.useNepaliDigits = cfgDigits ? cfgDigits.checked : false;

      saveConfig();
      if (modal) modal.classList.remove('active');
      startRefreshCountdown();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('के तपाईं पूर्वनिर्धारित सेटिङ्स फिर्ता ल्याउन चाहनुहुन्छ? (Reset all to defaults?)')) {
        state.config = { ...DEFAULT_CONFIG };
        saveConfig();
        if (modal) modal.classList.remove('active');
      }
    });
  }

  // Keyboard Shortcuts for Android TV Remotes & Keyboards
  document.addEventListener('keydown', (e) => {
    // Press 'F' or 'f' for fullscreen
    if (e.key === 'f' || e.key === 'F') {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        toggleFullscreen();
      }
    }
    // Press 'S' or 's' for settings
    if (e.key === 's' || e.key === 'S') {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        modal.classList.toggle('active');
      }
    }
    // Press 'R' or 'r' for refresh
    if (e.key === 'r' || e.key === 'R') {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        fetchRates();
      }
    }
    // Escape to close settings
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Fullscreen error:', err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

/* ==========================================================================
   WAKE LOCK API (KEEPS TV SCREEN AWAKE)
   ========================================================================== */
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      state.wakeLock = await navigator.wakeLock.request('screen');
      document.addEventListener('visibilitychange', async () => {
        if (state.wakeLock !== null && document.visibilityState === 'visible') {
          state.wakeLock = await navigator.wakeLock.request('screen');
        }
      });
    } catch (err) {
      console.log('WakeLock not granted:', err);
    }
  }
}

/* ==========================================================================
   TOAST NOTIFICATION
   ========================================================================== */
function showToast(msg) {
  const toast = document.getElementById('tvToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3200);
}
