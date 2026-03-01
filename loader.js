<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BC Konfigurator</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>

:root {
  /* Backgrounds */
  --bg: #06060f;
  --bg2: #0a0a18;
  --bg3: #0e0e1f;
  --bg4: #08081a;
  --bg-glass: rgba(255,255,255,0.03);
  --bg-hover: rgba(255,255,255,0.05);

  /* Borders */
  --border: rgba(255,255,255,0.07);
  --border2: rgba(255,255,255,0.12);
  --border-accent: rgba(139,92,246,0.4);

  /* Accent - Electric Violet */
  --purple: #8b5cf6;
  --purple-bright: #a78bfa;
  --purple-dim: #4c1d95;
  --purple-glow: rgba(139,92,246,0.25);
  --purple-glow-strong: rgba(139,92,246,0.5);
  /* compat */
  --pl: #c4b5fd;
  --pd: #2d1b69;

  /* Status colors */
  --green: #34d399;
  --green-bright: #6ee7b7;
  --gd: rgba(6,78,59,0.6);
  --red: #fb7185;
  --rd: rgba(69,10,10,0.7);
  --yellow: #fbbf24;
  --yd: rgba(120,53,15,0.6);
  --blue: #60a5fa;
  --bd: rgba(30,58,95,0.6);
  --orange: #fb923c;
  --od: rgba(124,45,18,0.6);
  --pink: #f472b6;
  --pkd: rgba(131,24,67,0.6);
  --teal: #2dd4bf;

  /* Text */
  --text: #f1f5f9;
  --text2: #94a3b8;
  --text3: #4b5563;
  --text4: #374151;

  /* Radius */
  --r-xs: 4px;
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 16px;
  --r-xl: 22px;
  --r-full: 9999px;

  /* Spacing */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px; --sp-6: 24px;

  /* Transitions */
  --t-fast: 0.1s ease;
  --t-mid: 0.2s ease;
  --t-slow: 0.35s cubic-bezier(0.4,0,0.2,1);

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.5);
  --shadow-purple: 0 0 20px rgba(139,92,246,0.3), 0 4px 16px rgba(0,0,0,0.5);
  --shadow-glow: 0 0 0 1px rgba(139,92,246,0.5), 0 0 20px rgba(139,92,246,0.2);

  /* Gradients */
  --grad-purple: linear-gradient(135deg, #6d28d9, #8b5cf6);
  --grad-green: linear-gradient(135deg, #065f46, #059669);
  --grad-red: linear-gradient(135deg, #7f1d1d, #dc2626);
  --grad-blue: linear-gradient(135deg, #1e3a8a, #3b82f6);
  --grad-orange: linear-gradient(135deg, #7c2d12, #ea580c);
  --grad-surface: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));

  /* Fonts */
  --font-ui: 'Outfit', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;

  /* Focus ring */
  --focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--purple);

  /* compat aliases */
  --radius-sm: var(--r-sm);
  --radius-md: var(--r-md);
  --radius-lg: var(--r-lg);
  --transition: var(--t-mid);
  --shadow-sm-compat: var(--shadow-sm);
}

/* ═══════════════════════════════════════════════
   BASE
═══════════════════════════════════════════════ */
html { scroll-behavior: smooth; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  min-height: 100vh;
  font-size: 13.5px;
  line-height: 1.55;
  background-image:
    radial-gradient(ellipse 80% 60% at 20% -5%, rgba(109,40,217,0.12) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 80% 110%, rgba(45,212,191,0.05) 0%, transparent 50%);
  background-attachment: fixed;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: var(--purple); }

::selection { background: rgba(139,92,246,0.4); color: #fff; }
:focus-visible { outline: none; box-shadow: var(--focus-ring); }
input:focus, select:focus, textarea:focus { outline: none !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.25) !important; border-color: var(--purple) !important; }
::placeholder { color: var(--text3); opacity: 1; }
:disabled { opacity: 0.45; cursor: not-allowed !important; }

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%234b5563' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px !important;
}

@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
@keyframes roomPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes sectionIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

/* ═══════════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════════ */
.topbar {
  background: rgba(6,6,15,0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(139,92,246,0.18);
  padding: 10px 20px;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  position: sticky; top: 0; z-index: 100;
  box-shadow: 0 1px 0 rgba(139,92,246,0.12), 0 4px 24px rgba(0,0,0,0.6);
}
.topbar h1 {
  font-size: 1rem; font-weight: 800; letter-spacing: -0.02em; flex-shrink: 0;
  background: linear-gradient(135deg, #c4b5fd 0%, #a78bfa 50%, #7c3aed 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.tbadge {
  font-family: var(--font-mono); font-size: 0.7rem; font-weight: 600;
  padding: 4px 11px; border-radius: 99px; border: 1px solid; letter-spacing: 0.02em;
  background: rgba(76,29,149,0.25); border-color: rgba(139,92,246,0.35); color: #c4b5fd;
}
.tbadge.outfit {
  background: rgba(124,45,18,0.25); border-color: rgba(251,146,60,0.35); color: var(--orange);
}

/* ═══════════════════════════════════════════════
   BUTTONS
═══════════════════════════════════════════════ */
.btn {
  font-family: var(--font-ui); padding: 7px 17px; border: none; border-radius: 99px;
  font-size: 0.79rem; font-weight: 700; cursor: pointer; transition: all 0.18s ease;
  white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; letter-spacing: 0.01em;
}
.btn:active { transform: scale(0.96); }

.btn-primary {
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  color: #fff; box-shadow: 0 2px 14px rgba(139,92,246,0.32);
}
.btn-primary:hover { box-shadow: 0 4px 22px rgba(139,92,246,0.55); filter: brightness(1.1); }

.btn-green {
  background: linear-gradient(135deg, #065f46, #059669);
  color: #fff; box-shadow: 0 2px 12px rgba(5,150,105,0.3);
}
.btn-green:hover { box-shadow: 0 4px 20px rgba(5,150,105,0.5); filter: brightness(1.1); }
.btn-green:disabled { opacity: 0.4; cursor: not-allowed; filter: none; box-shadow: none; }

.btn-red {
  background: linear-gradient(135deg, #7f1d1d, #dc2626);
  color: #fff; box-shadow: 0 2px 10px rgba(220,38,38,0.25);
}
.btn-red:hover { box-shadow: 0 4px 18px rgba(220,38,38,0.45); filter: brightness(1.1); }

.btn-orange {
  background: linear-gradient(135deg, #7c2d12, #ea580c);
  color: #fff; box-shadow: 0 2px 10px rgba(234,88,12,0.25);
}
.btn-orange:hover { box-shadow: 0 4px 18px rgba(234,88,12,0.45); filter: brightness(1.1); }

.btn-copy {
  font-family: var(--font-ui); width: 100%; margin-top: 10px; padding: 12px 16px;
  font-size: 0.84rem; font-weight: 800; border: none; border-radius: 12px; cursor: pointer;
  transition: all 0.18s ease;
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  color: #fff; box-shadow: 0 3px 16px rgba(139,92,246,0.35); letter-spacing: 0.03em;
}
.btn-copy:hover { box-shadow: 0 5px 24px rgba(139,92,246,0.6); filter: brightness(1.1); }
.btn-copy.copied { background: linear-gradient(135deg, #065f46, #059669); box-shadow: 0 3px 16px rgba(5,150,105,0.35); }

.btn-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

.btn-sync {
  background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  color: #fff; border: none; border-radius: 99px; cursor: pointer;
  transition: all 0.18s ease; white-space: nowrap; font-weight: 700;
  font-family: var(--font-ui); font-size: 0.79rem; padding: 7px 17px;
  box-shadow: 0 2px 12px rgba(59,130,246,0.3);
}
.btn-sync:hover { filter: brightness(1.15); box-shadow: 0 4px 20px rgba(59,130,246,0.5); }
.btn-sync:disabled { opacity: 0.45; cursor: not-allowed; filter: none; }

#execBtn { font-weight: 800; letter-spacing: 0.02em; }

/* ═══════════════════════════════════════════════
   LAYOUT
═══════════════════════════════════════════════ */
.layout { display: grid; grid-template-columns: 268px 1fr; min-height: calc(100vh - 49px); }

.sidebar {
  background: linear-gradient(180deg, rgba(10,10,24,0.9), rgba(8,8,20,0.95));
  border-right: 1px solid rgba(255,255,255,0.06);
  padding: 14px; overflow-y: auto; max-height: calc(100vh - 49px); position: sticky; top: 49px;
}

.sidebar-search {
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 99px; color: var(--text); padding: 8px 15px; font-size: 0.82rem;
  font-family: var(--font-ui); margin-bottom: 12px; transition: all 0.18s ease;
}
.sidebar-search:focus { border-color: var(--purple); box-shadow: 0 0 0 3px rgba(139,92,246,0.2); background: rgba(139,92,246,0.06); }

.group-hdr {
  font-size: 0.76rem; font-weight: 600; color: var(--text3); padding: 6px 10px;
  border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between;
  align-items: center; user-select: none; transition: all 0.15s ease; letter-spacing: 0.02em;
}
.group-hdr:hover { background: rgba(255,255,255,0.05); color: var(--text2); }
.group-hdr.open { background: rgba(139,92,246,0.1); color: #c4b5fd; }

.group-items { display: none; padding-left: 8px; margin-bottom: 4px; }
.group-items.open { display: block; }

.item-row { display: flex; align-items: center; border-radius: 7px; }
.item-btn {
  flex: 1; text-align: left; background: none; border: none; color: var(--text3);
  font-size: 0.79rem; font-family: var(--font-ui); padding: 5px 9px; border-radius: 7px;
  cursor: pointer; transition: all 0.13s ease;
}
.item-btn:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.item-btn.active {
  background: rgba(139,92,246,0.15); color: #c4b5fd; font-weight: 700;
  box-shadow: inset 2px 0 0 var(--purple);
}

.star-btn {
  background: none; border: none; cursor: pointer; font-size: 0.88rem;
  padding: 4px 6px; border-radius: 5px; opacity: 0.3; flex-shrink: 0; transition: opacity 0.15s;
}
.star-btn:hover, .star-btn.fav { opacity: 1; }

.fav-hdr {
  font-size: 0.71rem; font-weight: 800; color: var(--yellow); padding: 6px 10px;
  background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.15);
  border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
  letter-spacing: 0.04em; text-transform: uppercase;
}

.main { padding: 20px; overflow-y: auto; max-height: calc(100vh - 49px); }

/* ═══════════════════════════════════════════════
   IMPORT / CONNECT
═══════════════════════════════════════════════ */
.import-box {
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px; padding: 20px; margin-bottom: 18px;
}
.import-box h2 { font-size: 0.9rem; font-weight: 800; color: #c4b5fd; margin-bottom: 8px; }
.import-box p { font-size: 0.8rem; color: var(--text2); margin-bottom: 10px; line-height: 1.65; }
.import-box textarea {
  width: 100%; height: 90px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: #86efac; font-family: var(--font-mono); font-size: 0.72rem;
  padding: 9px; resize: vertical; transition: border-color 0.18s;
}

#connectHint { border-color: rgba(139,92,246,0.2); background: rgba(139,92,246,0.04); }
#connectHint h2 { color: var(--text); }

/* ═══════════════════════════════════════════════
   SECTIONS (Glass Cards)
═══════════════════════════════════════════════ */
.section {
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 17px; margin-bottom: 13px;
  position: relative; overflow: hidden; animation: sectionIn 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.section::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent);
}

.sec-hdr {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.07);
}
.sec-hdr h3 {
  font-size: 0.71rem; font-weight: 800; color: var(--text2); text-transform: uppercase;
  letter-spacing: 1.6px; margin: 0;
}

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.full { grid-column: 1/-1; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 0.7rem; font-weight: 700; color: var(--text3); letter-spacing: 0.05em; text-transform: uppercase; }
.field input, .field select {
  width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: var(--text); padding: 8px 12px; font-size: 0.82rem;
  font-family: var(--font-ui); transition: all 0.18s ease;
}
.field input:focus, .field select:focus {
  border-color: var(--purple); box-shadow: 0 0 0 3px rgba(139,92,246,0.2);
  background: rgba(139,92,246,0.05);
}

.hint { font-size: 0.7rem; color: var(--text3); margin-top: 3px; line-height: 1.45; }

.warn {
  font-size: 0.73rem; color: var(--yellow);
  background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.2);
  padding: 8px 12px; border-radius: 8px; margin-top: 6px; line-height: 1.55;
}
.info-box {
  font-size: 0.73rem; color: var(--blue);
  background: rgba(96,165,250,0.07); border: 1px solid rgba(96,165,250,0.2);
  padding: 8px 12px; border-radius: 8px; margin-top: 6px; line-height: 1.55;
}
.hidden { display: none !important; }

/* ═══════════════════════════════════════════════
   MODULE / TYPE RECORD
═══════════════════════════════════════════════ */
.arch-badge {
  font-size: 0.65rem; font-weight: 800; padding: 3px 11px; border-radius: 99px;
  border: 1px solid; display: inline-block; margin-bottom: 10px; letter-spacing: 0.05em; text-transform: uppercase;
}
.arch-badge.modular { background: rgba(6,78,59,0.35); color: #6ee7b7; border-color: rgba(52,211,153,0.3); }
.arch-badge.classic { background: rgba(30,27,75,0.5); color: #c7d2fe; border-color: rgba(129,140,248,0.3); }

.dim-block {
  border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
  margin-bottom: 10px; overflow: hidden; transition: border-color 0.18s;
}
.dim-block:hover { border-color: rgba(255,255,255,0.13); }

.dim-hdr {
  display: flex; align-items: center; gap: 9px; padding: 10px 14px;
  background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.06);
}
.key-badge {
  background: rgba(139,92,246,0.18); color: #c4b5fd; padding: 3px 9px;
  border-radius: 99px; font-size: 0.66rem; font-family: var(--font-mono); font-weight: 700;
  flex-shrink: 0; border: 1px solid rgba(139,92,246,0.3);
}
.dim-title { font-size: 0.8rem; font-weight: 500; color: var(--text2); flex: 1; }
.multi-toggle { display: flex; align-items: center; gap: 5px; font-size: 0.69rem; color: var(--text3); cursor: pointer; user-select: none; flex-shrink: 0; }
.multi-toggle input { accent-color: var(--purple); width: 13px; height: 13px; cursor: pointer; }

.dim-opts { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; }

.opt-row {
  border: 1px solid rgba(255,255,255,0.07); border-radius: 9px; overflow: hidden;
  transition: border-color 0.18s, box-shadow 0.18s;
}
.opt-row:hover { border-color: rgba(255,255,255,0.14); }
.opt-row.sel {
  border-color: rgba(139,92,246,0.5);
  box-shadow: 0 0 0 1px rgba(139,92,246,0.12), inset 0 0 14px rgba(139,92,246,0.04);
}

.opt-hdr {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px;
  cursor: pointer; user-select: none; background: rgba(255,255,255,0.015); transition: background 0.13s;
}
.opt-row.sel .opt-hdr { background: rgba(139,92,246,0.1); }
.opt-hdr:hover { background: rgba(255,255,255,0.04); }
.opt-check { width: 15px; height: 15px; accent-color: var(--purple); flex-shrink: 0; pointer-events: none; }
.opt-idx { font-size: 0.63rem; color: rgba(255,255,255,0.2); font-family: var(--font-mono); }
.opt-name { font-size: 0.83rem; color: var(--text2); flex: 1; }
.opt-row.sel .opt-name { color: #c4b5fd; font-weight: 700; }
.opt-badge-row { display: flex; flex-wrap: wrap; gap: 4px; margin-left: auto; }

.b {
  font-size: 0.62rem; padding: 2px 8px; border-radius: 99px; line-height: 1.3;
  white-space: nowrap; font-weight: 700; border: 1px solid;
}
.b.e { background: rgba(6,78,59,0.35); color: #6ee7b7; border-color: rgba(52,211,153,0.25); }
.b.bl { background: rgba(127,29,29,0.35); color: #fca5a5; border-color: rgba(251,113,133,0.25); }
.b.p { background: rgba(30,58,95,0.4); color: #93c5fd; border-color: rgba(96,165,250,0.25); }
.b.y { background: rgba(120,53,15,0.45); color: #fbbf24; border-color: rgba(251,191,36,0.25); }
.b.gr { background: rgba(6,78,59,0.25); color: #86efac; border-color: rgba(134,239,172,0.2); }

.opt-sub { display: none; padding: 10px 14px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.06); }
.opt-row.sel .opt-sub { display: block; }
.sub-info { margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.sub-info-label { font-size: 0.64rem; color: var(--text3); margin-right: 3px; }
.sub-props { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 6px; }
.sub-prop { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 7px 10px; }
.sub-prop-label { font-size: 0.67rem; color: var(--text3); font-family: var(--font-mono); margin-bottom: 4px; font-weight: 600; }
.sub-prop select, .sub-prop input {
  width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 5px; color: var(--text); padding: 4px 8px; font-size: 0.77rem;
  font-family: var(--font-ui); transition: border-color 0.18s;
}
.sub-inline { display: flex; gap: 6px; align-items: center; }
.sub-inline input[type=checkbox] { accent-color: var(--purple); width: 14px; height: 14px; flex-shrink: 0; cursor: pointer; }

/* ═══════════════════════════════════════════════
   COLORS
═══════════════════════════════════════════════ */
.color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px,1fr)); gap: 10px; }
.color-item label { font-size: 0.68rem; font-weight: 700; color: var(--text3); display: block; margin-bottom: 5px; letter-spacing: 0.05em; text-transform: uppercase; }
.color-row { display: flex; gap: 6px; align-items: center; }
.color-row input[type=color] { flex: 1; height: 32px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: none; cursor: pointer; transition: border-color 0.18s; }
.color-row input[type=color]:hover { border-color: var(--purple); }
.color-default-btn {
  font-size: 0.63rem; font-family: var(--font-ui); background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; color: var(--text3);
  padding: 3px 9px; cursor: pointer; white-space: nowrap; transition: all 0.18s; font-weight: 600;
}
.color-default-btn:hover { border-color: var(--purple); color: #c4b5fd; background: rgba(139,92,246,0.1); }
.color-item.is-default label { color: rgba(255,255,255,0.2); }
.color-item.is-default .color-row input[type=color] { opacity: 0.3; }

/* ═══════════════════════════════════════════════
   TIGHTNESS
═══════════════════════════════════════════════ */
.tightness-row { display: flex; align-items: center; gap: 14px; }
.tightness-slider { flex: 1; accent-color: var(--purple); height: 6px; cursor: pointer; }
.tightness-val {
  font-family: var(--font-mono); font-weight: 800; color: #c4b5fd; font-size: 0.92rem;
  min-width: 38px; text-align: right; background: rgba(139,92,246,0.12); padding: 3px 9px;
  border-radius: 99px; border: 1px solid rgba(139,92,246,0.25);
}
.tightness-info { display: flex; gap: 16px; margin-top: 10px; font-size: 0.72rem; color: var(--text3); }
.tightness-info span { color: var(--text2); font-weight: 600; }

/* ═══════════════════════════════════════════════
   LSCG
═══════════════════════════════════════════════ */
.lscg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px,1fr)); gap: 6px; }
.lscg-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 11px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px; cursor: pointer; font-size: 0.81rem; font-family: var(--font-ui);
  transition: all 0.18s;
}
.lscg-item:hover { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); }
.lscg-item.on { background: rgba(244,114,182,0.1); border-color: rgba(244,114,182,0.35); color: #f472b6; }
.lscg-item input[type=checkbox] { accent-color: #f472b6; width: 14px; height: 14px; flex-shrink: 0; }
.lscg-divider { grid-column: 1/-1; border-top: 1px solid rgba(255,255,255,0.06); margin: 4px 0; }
.lscg-curse-row { grid-column: 1/-1; display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: var(--text2); }
.lscg-curse-row select { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--text); padding: 6px 10px; font-size: 0.79rem; flex: 1; }

/* ═══════════════════════════════════════════════
   GLOBAL PROPS
═══════════════════════════════════════════════ */
.props-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px,1fr)); gap: 7px; }
.prop-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 9px 12px; transition: border-color 0.18s; }
.prop-card:hover { border-color: rgba(255,255,255,0.14); }
.prop-name { font-family: var(--font-mono); font-size: 0.73rem; font-weight: 700; color: #c4b5fd; margin-bottom: 5px; }
.prop-ctrl { display: flex; gap: 6px; align-items: center; }
.prop-ctrl select, .prop-ctrl input { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; color: var(--text); padding: 4px 8px; font-size: 0.78rem; flex: 1; font-family: var(--font-ui); transition: border-color 0.18s; }
.prop-ctrl input[type=checkbox] { flex: none; width: 14px; height: 14px; accent-color: var(--purple); cursor: pointer; }

/* ═══════════════════════════════════════════════
   LOCK + OUTPUT
═══════════════════════════════════════════════ */
.timer-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }

.type-preview {
  background: rgba(139,92,246,0.07); border: 1px solid rgba(139,92,246,0.22);
  border-radius: 8px; padding: 10px 14px; font-family: var(--font-mono); font-size: 0.75rem;
  color: #c4b5fd; margin-bottom: 10px; word-break: break-all; line-height: 1.75;
}

textarea.code-out {
  width: 100%; min-height: 290px; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; color: #86efac; font-family: var(--font-mono); font-size: 0.73rem;
  padding: 14px; resize: vertical; line-height: 1.78; transition: border-color 0.18s;
}
textarea.code-out:focus { border-color: var(--purple); box-shadow: 0 0 0 3px rgba(139,92,246,0.18); }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 55vh; color: var(--text3); gap: 10px; font-size: 0.92rem; }

/* ═══════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════ */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 200;
  display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
}
.modal {
  background: rgba(10,10,24,0.97); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px; width: min(720px,95vw); max-height: 90vh;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1);
}
.modal-head {
  padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, rgba(234,88,12,0.07), transparent);
}
.modal-head h2 { font-size: 1rem; font-weight: 800; color: var(--orange); letter-spacing: -0.01em; }
.modal-body { flex: 1; overflow-y: auto; padding: 18px 22px; }
.modal-foot { padding: 14px 22px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; gap: 9px; }

.outfit-item-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 9px; margin-bottom: 7px; transition: border-color 0.18s;
}
.outfit-item-row:hover { border-color: rgba(255,255,255,0.14); }
.outfit-item-name { flex: 1; font-size: 0.85rem; color: var(--text); }
.outfit-item-group { font-size: 0.69rem; color: var(--text3); font-family: var(--font-mono); }
.outfit-item-badges { display: flex; gap: 4px; }
.outfit-add-btn {
  background: linear-gradient(135deg, #7c2d12, #ea580c); color: #fff; border: none;
  border-radius: 9px; padding: 10px 16px; font-size: 0.83rem; font-weight: 700;
  cursor: pointer; width: 100%; margin-top: 8px; transition: all 0.18s; font-family: var(--font-ui);
}
.outfit-add-btn:hover { filter: brightness(1.1); box-shadow: 0 4px 18px rgba(234,88,12,0.35); }
textarea.outfit-code { width: 100%; min-height: 210px; background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #86efac; font-family: var(--font-mono); font-size: 0.71rem; padding: 10px; resize: vertical; line-height: 1.65; }

/* ═══════════════════════════════════════════════
   VIBRATING
═══════════════════════════════════════════════ */
.vib-mode-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
.vib-mode-btn {
  padding: 7px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 99px; color: var(--text2); font-size: 0.79rem; font-weight: 600;
  cursor: pointer; transition: all 0.18s; font-family: var(--font-ui);
}
.vib-mode-btn:hover { border-color: rgba(255,255,255,0.18); color: var(--text); }
.vib-mode-btn.on { background: rgba(52,211,153,0.12); border-color: rgba(52,211,153,0.4); color: #6ee7b7; font-weight: 800; }

.vib-intensity-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.vib-int-btn {
  flex: 1; min-width: 52px; padding: 9px 6px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; color: var(--text2);
  font-size: 0.77rem; cursor: pointer; text-align: center; transition: all 0.18s; font-family: var(--font-ui);
}
.vib-int-btn.on { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.4); color: #c4b5fd; font-weight: 800; }

.vib-effects-row { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 6px; }
.vib-eff-btn { padding: 5px 13px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 99px; color: var(--text3); font-size: 0.74rem; cursor: pointer; transition: all 0.18s; font-family: var(--font-ui); }
.vib-eff-btn.on { background: rgba(52,211,153,0.12); border-color: rgba(52,211,153,0.35); color: #6ee7b7; }

.dir-opts { display: flex; flex-wrap: wrap; gap: 8px; }
.dir-opt-btn { padding: 9px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; color: var(--text2); font-size: 0.84rem; cursor: pointer; transition: all 0.18s; font-family: var(--font-ui); }
.dir-opt-btn:hover { border-color: rgba(255,255,255,0.18); color: var(--text); }
.dir-opt-btn.on { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.5); color: #c4b5fd; font-weight: 800; box-shadow: 0 0 16px rgba(139,92,246,0.14); }

.baseline-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: 8px; }
.bl-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 9px 12px; }
.bl-card-label { font-size: 0.72rem; font-weight: 700; color: var(--text2); margin-bottom: 5px; }
.bl-card select, .bl-card input { width: 100%; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: var(--text); padding: 5px 9px; font-size: 0.79rem; font-family: var(--font-ui); }

/* ═══════════════════════════════════════════════
   PROFILES
═══════════════════════════════════════════════ */
.profile-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 9px; margin-bottom: 14px; }
.profile-card {
  background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 13px; padding: 14px 15px; cursor: pointer; transition: all 0.2s;
  position: relative; overflow: hidden;
}
.profile-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, #6d28d9, #8b5cf6); opacity: 0; transition: opacity 0.2s;
}
.profile-card:hover { border-color: rgba(139,92,246,0.35); box-shadow: 0 4px 20px rgba(139,92,246,0.12), 0 0 0 1px rgba(139,92,246,0.1); }
.profile-card:hover::before { opacity: 1; }
.profile-card-name { font-size: 0.9rem; font-weight: 800; color: #c4b5fd; margin-bottom: 4px; }
.profile-card-info { font-size: 0.7rem; color: var(--text3); }
.profile-new-row { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.profile-name-input { flex: 1; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--text); padding: 7px 12px; font-size: 0.83rem; font-family: var(--font-ui); transition: all 0.18s; }
.profile-name-input:focus { border-color: var(--purple); box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }

/* ═══════════════════════════════════════════════
   STATUS MESSAGES
═══════════════════════════════════════════════ */
.status-msg {
  font-size: 0.75rem; font-weight: 700; padding: 6px 14px; border-radius: 99px;
  margin-left: 6px; animation: fadeIn 0.2s ease; letter-spacing: 0.01em; border: 1px solid;
}
@keyframes fadeIn { from{opacity:0;transform:translateY(-3px)} to{opacity:1;transform:translateY(0)} }
.status-info    { background: rgba(96,165,250,0.1); color: #60a5fa; border-color: rgba(96,165,250,0.25); }
.status-success { background: rgba(52,211,153,0.1); color: #34d399; border-color: rgba(52,211,153,0.25); }
.status-error   { background: rgba(251,113,133,0.1); color: #fb7185; border-color: rgba(251,113,133,0.25); }
#loadingSpinner { animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }

/* ═══════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════ */
.tab-nav {
  display: flex; gap: 0;
  background: rgba(6,6,15,0.85); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  position: sticky; top: 49px; z-index: 99;
  overflow-x: auto; scrollbar-width: none; padding: 0 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.4);
}
.tab-nav::-webkit-scrollbar { display: none; }

.tab-btn {
  padding: 13px 20px; font-size: 0.8rem; font-weight: 700; font-family: var(--font-ui);
  border: none; background: none; color: var(--text3); cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: all 0.2s ease; white-space: nowrap; flex-shrink: 0;
  letter-spacing: 0.01em; position: relative;
}
.tab-btn:hover { color: var(--text2); }
.tab-btn.active { color: #c4b5fd; border-bottom-color: var(--purple); }

.tab-pane { display: none; }
.tab-pane.active { display: block; }

/* ═══════════════════════════════════════════════
   OUTFIT TAB
═══════════════════════════════════════════════ */
.outfit-tab-layout { display: grid; grid-template-columns: 1fr 390px; min-height: calc(100vh - 100px); }
.outfit-left { padding: 20px; overflow-y: auto; max-height: calc(100vh - 100px); }
.outfit-right { background: rgba(10,10,24,0.6); border-left: 1px solid rgba(255,255,255,0.07); padding: 20px; overflow-y: auto; max-height: calc(100vh - 100px); }
.outfit-code-live { width: 100%; height: 270px; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; color: #86efac; font-family: var(--font-mono); font-size: 0.71rem; padding: 12px; resize: vertical; line-height: 1.78; transition: border-color 0.18s; }
.outfit-code-live:focus { border-color: var(--purple); box-shadow: 0 0 0 3px rgba(139,92,246,0.18); }
.outfit-empty-hint { color: var(--text3); font-size: 0.86rem; text-align: center; padding: 46px 24px; border: 1px dashed rgba(255,255,255,0.07); border-radius: 14px; line-height: 1.75; }
.profile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 9px; margin-top: 12px; }
.section-hdr2 { font-size: 0.7rem; font-weight: 800; color: var(--text2); text-transform: uppercase; letter-spacing: 1.6px; padding-bottom: 9px; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 13px; display: flex; align-items: center; justify-content: space-between; }

.outfit-search-row { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.outfit-search { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; color: var(--text); padding: 7px 14px; font-size: 0.81rem; font-family: var(--font-ui); transition: all 0.18s; }
.outfit-search:focus { border-color: var(--purple); box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }

.outfit-target-bar { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
.outfit-target-label { font-size: .73rem; font-weight: 800; color: var(--text3); white-space: nowrap; text-transform: uppercase; letter-spacing: .06em; }
.outfit-member-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.outfit-member-chip { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; padding: 3px 10px; cursor: pointer; transition: all 0.18s; font-size: .75rem; color: var(--text2); }
.outfit-member-chip:hover { border-color: rgba(139,92,246,0.4); color: #c4b5fd; }
.outfit-member-chip.sel { background: rgba(139,92,246,0.14); border-color: rgba(139,92,246,0.5); color: #c4b5fd; font-weight: 700; }

/* ═══════════════════════════════════════════════
   CURSE TAB
═══════════════════════════════════════════════ */
.curse-topbar { display: flex; align-items: center; gap: 9px; padding: 12px 18px; background: rgba(255,255,255,0.01); border-bottom: 1px solid rgba(255,255,255,0.07); flex-wrap: wrap; }
.curse-stats { display: flex; gap: 7px; flex-wrap: wrap; flex: 1; }
.curse-stat { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 99px; padding: 4px 14px; font-size: 0.72rem; white-space: nowrap; }
.curse-stat span { font-weight: 800; color: #c4b5fd; }
.curse-body { padding: 16px; overflow-y: auto; max-height: calc(100vh - 130px); }

.curse-owner-block { margin-bottom: 13px; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; transition: border-color 0.18s; }
.curse-owner-block:hover { border-color: rgba(255,255,255,0.13); }
.curse-owner-hdr { display: flex; align-items: center; gap: 9px; padding: 10px 15px; background: rgba(255,255,255,0.02); cursor: pointer; user-select: none; transition: background 0.13s; }
.curse-owner-hdr:hover { background: rgba(255,255,255,0.04); }
.curse-owner-name { font-size: 0.85rem; font-weight: 800; color: var(--text); flex: 1; }
.curse-owner-num { font-size: 0.65rem; color: var(--text3); font-family: var(--font-mono); }
.curse-owner-count { font-size: 0.66rem; background: rgba(139,92,246,0.18); color: #c4b5fd; padding: 2px 9px; border-radius: 99px; font-weight: 800; border: 1px solid rgba(139,92,246,0.3); }
.curse-owner-chevron { color: var(--text3); font-size: 0.72rem; transition: transform 0.2s ease; }
.curse-owner-block.open .curse-owner-chevron { transform: rotate(90deg); }
.curse-rows { display: none; }
.curse-owner-block.open .curse-rows { display: table; width: 100%; border-collapse: collapse; }

.curse-row { border-top: 1px solid rgba(255,255,255,0.06); }
.curse-row td { padding: 7px 12px; font-size: 0.75rem; vertical-align: top; }
.curse-row:hover { background: rgba(139,92,246,0.04); }
.curse-row.lscg { background: rgba(52,211,153,0.04); }
.curse-row td.cn { color: var(--text); font-weight: 700; min-width: 130px; }
.curse-row td.item { color: var(--text2); font-family: var(--font-mono); font-size: 0.69rem; }
.curse-row td.grp { color: var(--text3); font-size: 0.65rem; font-family: var(--font-mono); }
.curse-row td.badges { white-space: nowrap; }
.curse-row td.lscg-col { color: #34d399; font-size: 0.67rem; }
.curse-row td.comment-col { min-width: 170px; }
.curse-comment-input { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 5px; color: var(--text2); padding: 4px 8px; font-size: 0.73rem; resize: none; height: 34px; transition: border-color 0.18s; font-family: var(--font-ui); }
.curse-comment-input:focus { outline: none; border-color: var(--purple); }
.curse-row td.actions { white-space: nowrap; }
.curse-apply-btn { padding: 4px 12px; border: 1px solid; border-radius: 99px; font-size: 0.69rem; cursor: pointer; font-weight: 800; background: rgba(52,211,153,0.12); color: #6ee7b7; border-color: rgba(52,211,153,0.25); margin-right: 4px; transition: all 0.18s; font-family: var(--font-ui); }
.curse-apply-btn:hover { background: rgba(52,211,153,0.22); }
.curse-apply-btn.other { background: rgba(139,92,246,0.12); color: #c4b5fd; border-color: rgba(139,92,246,0.3); }
.curse-apply-btn.other:hover { background: rgba(139,92,246,0.24); }

.curse-detail-row { background: rgba(0,0,0,0.25); display: none; }
.curse-owner-block.open .curse-detail-row.open { display: table-row; }
.curse-detail-cell { padding: 9px 14px 12px; font-size: 0.69rem; color: var(--text2); }
.curse-detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px,1fr)); gap: 6px; margin-top: 6px; }
.curse-detail-field { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 5px 10px; }
.curse-detail-label { font-size: 0.62rem; color: var(--text3); font-family: var(--font-mono); margin-bottom: 3px; font-weight: 600; }
.curse-detail-val { color: var(--text); font-family: var(--font-mono); font-size: 0.72rem; }
.curse-detail-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 0.63rem; background: rgba(96,165,250,0.1); color: #60a5fa; margin-right: 3px; margin-top: 2px; border: 1px solid rgba(96,165,250,0.18); }
.curse-detail-badge.lscg { background: rgba(52,211,153,0.1); color: #34d399; border-color: rgba(52,211,153,0.18); }
.curse-detail-badge.cursed { background: rgba(139,92,246,0.12); color: #c4b5fd; border-color: rgba(139,92,246,0.22); }

.cursor-detail-toggle { cursor: pointer; color: var(--text3); font-size: 0.72rem; margin-right: 5px; transition: transform 0.15s; display: inline-block; }
.curse-row.expanded .cursor-detail-toggle { transform: rotate(90deg); }
.curse-empty { text-align: center; padding: 52px; color: var(--text3); font-size: 0.9rem; }

.curse-filter-bar { display: flex; align-items: center; gap: 9px; padding: 9px 16px; background: rgba(255,255,255,0.01); border-bottom: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; }
.curse-search { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; color: var(--text); padding: 6px 14px; font-size: 0.78rem; width: 210px; font-family: var(--font-ui); transition: all 0.18s; }
.curse-search:focus { outline: none; border-color: var(--purple); box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }
.filter-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: var(--text3); font-size: 0.72rem; cursor: pointer; user-select: none; transition: all 0.18s; white-space: nowrap; font-weight: 600; font-family: var(--font-ui); }
.filter-chip:hover { border-color: rgba(139,92,246,0.45); color: #c4b5fd; }
.filter-chip.on { border-color: rgba(139,92,246,0.5); background: rgba(139,92,246,0.12); color: #c4b5fd; }
.filter-chip.on.green { border-color: rgba(52,211,153,0.4); background: rgba(52,211,153,0.08); color: #6ee7b7; }
.filter-chip.on.yellow { border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.07); color: #fbbf24; }
.filter-sep { width: 1px; height: 16px; background: rgba(255,255,255,0.08); flex-shrink: 0; }
.slot-filter-wrap { position: relative; }
.slot-select { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; color: var(--text2); padding: 4px 12px; font-size: 0.72rem; cursor: pointer; font-family: var(--font-ui); }

/* ═══════════════════════════════════════════════
   BOT TAB
═══════════════════════════════════════════════ */
.bot-wrap { display: grid; grid-template-columns: 272px 1fr; height: calc(100vh - 112px); overflow: hidden; }
.bot-sidebar { border-right: 1px solid rgba(255,255,255,0.07); display: flex; flex-direction: column; overflow-y: auto; background: rgba(10,10,24,0.8); }
.bot-main { overflow-y: auto; background: var(--bg); }
.bs-head { padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.01); }
.bs-head span { flex: 1; font-size: 0.78rem; font-weight: 800; color: var(--text); letter-spacing: -0.01em; }
.bot-list { flex: 1; overflow-y: auto; }
.bot-item { padding: 11px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); cursor: pointer; display: flex; align-items: center; gap: 9px; transition: background 0.13s; }
.bot-item:hover { background: rgba(255,255,255,0.03); }
.bot-item.sel { background: rgba(139,92,246,0.1); border-left: 3px solid var(--purple); }
.bot-item .bi-name { flex: 1; font-size: 0.78rem; font-weight: 700; color: var(--text); }
.bot-item .bi-stat { font-size: 0.63rem; color: var(--text3); }

.bot-toggle { width: 36px; height: 20px; border-radius: 10px; border: none; cursor: pointer; flex-shrink: 0; transition: all 0.25s ease; position: relative; }
.bot-toggle.on { background: rgba(52,211,153,0.35); box-shadow: 0 0 10px rgba(52,211,153,0.25); }
.bot-toggle.off { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }
.bot-toggle::after { content: ''; position: absolute; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.22s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 1px 3px rgba(0,0,0,0.35); }
.bot-toggle.on::after { left: 19px; }
.bot-toggle.off::after { left: 3px; }

.be-topbar { padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; gap: 9px; background: rgba(255,255,255,0.01); }
.be-topbar input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--text); padding: 6px 12px; font-size: 0.82rem; font-weight: 800; font-family: var(--font-mono); transition: border-color 0.18s; }
.be-body { padding: 20px 22px; }

.bot-status { padding: 7px 20px; font-size: 0.71rem; font-family: var(--font-mono); display: none; }
.bot-status.running { background: rgba(52,211,153,0.06); border-bottom: 1px solid rgba(52,211,153,0.18); color: #6ee7b7; display: block; }
.bot-status.stopped { background: rgba(255,255,255,0.015); border-bottom: 1px solid rgba(255,255,255,0.06); color: var(--text3); display: block; }
.be-empty { padding: 70px 22px; text-align: center; color: var(--text3); font-size: 0.82rem; }
.be-empty .be-empty-icon { font-size: 3rem; margin-bottom: 14px; }
.bot-cfg-panel { background: rgba(255,255,255,0.01); border-bottom: 1px solid rgba(255,255,255,0.07); padding: 10px 20px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.bot-cfg-label { font-size: 0.7rem; color: var(--text3); font-weight: 600; }
.bot-cfg-panel input[type=checkbox] { accent-color: var(--purple); }

.trig-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 13px; margin-bottom: 10px; overflow: hidden; transition: border-color 0.18s; }
.trig-card:hover { border-color: rgba(255,255,255,0.13); }
.trig-card.trig-on { border-color: rgba(139,92,246,0.35); }
.trig-head { display: flex; align-items: center; gap: 9px; padding: 11px 14px; cursor: pointer; user-select: none; transition: background 0.13s; }
.trig-head:hover { background: rgba(255,255,255,0.03); }
.trig-label { font-size: 0.76rem; font-weight: 800; color: #c4b5fd; font-family: var(--font-mono); flex: 1; }
.trig-meta { font-size: 0.63rem; color: var(--text3); }
.trig-body { padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.07); display: none; }
.trig-body.open { display: block; }

.te-section { margin-bottom: 14px; }
.te-section-title { font-size: 0.63rem; text-transform: uppercase; letter-spacing: 0.09em; color: var(--text3); font-weight: 800; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
.te-section-title button { font-size: 0.64rem; padding: 3px 11px; border-radius: 99px; border: 1px dashed rgba(255,255,255,0.1); background: none; color: var(--text3); cursor: pointer; transition: all 0.18s; font-family: var(--font-ui); font-weight: 600; }
.te-section-title button:hover { border-color: rgba(139,92,246,0.5); color: #c4b5fd; }

.cond-card, .act-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; padding: 8px 12px; margin-bottom: 6px; display: grid; grid-template-columns: 1fr auto; gap: 7px; align-items: start; }
.cond-card.cond-op { background: rgba(139,92,246,0.06); border-color: rgba(139,92,246,0.2); }
.card-fields { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.cf { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; color: var(--text); padding: 4px 8px; font-size: 0.7rem; font-family: var(--font-mono); transition: border-color 0.18s; }
.cf:focus { outline: none; border-color: var(--purple); }
.cf-w80{width:80px}.cf-w100{width:100px}.cf-w120{width:120px}.cf-w160{width:160px}.cf-w200{width:200px}.cf-flex{flex:1;min-width:100px}
.rm-btn { background: none; border: none; color: #fb7185; cursor: pointer; font-size: 0.85rem; padding: 3px 5px; line-height: 1; flex-shrink: 0; transition: opacity 0.15s; border-radius: 4px; }
.rm-btn:hover { opacity: 0.7; background: rgba(251,113,133,0.1); }
.act-icon { font-size: 0.95rem; margin-right: 5px; }
.be-addtrig { width: 100%; padding: 10px; background: none; border: 1px dashed rgba(255,255,255,0.08); border-radius: 12px; color: var(--text3); font-size: 0.74rem; cursor: pointer; margin-top: 5px; transition: all 0.18s; font-family: var(--font-ui); }
.be-addtrig:hover { border-color: rgba(139,92,246,0.4); color: #c4b5fd; background: rgba(139,92,246,0.04); }

.trig-order-num { font-size: 0.6rem; font-weight: 800; color: var(--text3); background: rgba(255,255,255,0.05); border-radius: 4px; padding: 2px 6px; flex-shrink: 0; min-width: 20px; text-align: center; }
.order-btn { background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; color: var(--text3); cursor: pointer; font-size: 0.58rem; line-height: 1; padding: 2px 4px; transition: all 0.18s; }
.order-btn:hover:not(:disabled) { border-color: rgba(139,92,246,0.5); color: #c4b5fd; }
.order-btn:disabled { opacity: 0.25; cursor: default; }
.act-kritisch { border-color: rgba(220,38,38,0.4) !important; background: rgba(127,29,29,0.15) !important; }

.event-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; margin-bottom: 9px; overflow: hidden; transition: border-color 0.18s; }
.event-head { display: flex; align-items: center; gap: 8px; padding: 9px 12px; cursor: pointer; user-select: none; transition: background 0.13s; }
.event-head:hover { background: rgba(255,255,255,0.03); }
.event-body { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.07); display: none; }
.event-card.ev-on .event-head { border-left: 3px solid var(--purple); }
.event-card .event-body.open { display: block; }
.ev-label { flex: 1; font-size: 0.76rem; font-weight: 700; color: var(--text); }
.ev-meta { font-size: 0.63rem; color: var(--text3); }
.ev-type-badge { font-size: 0.62rem; padding: 2px 9px; border-radius: 99px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: var(--text3); font-weight: 700; }
.ev-type-badge.manual { background: rgba(139,92,246,0.12); border-color: rgba(139,92,246,0.3); color: #c4b5fd; }
.ev-type-badge.auto { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.3); color: #6ee7b7; }
.ev-type-badge.interval { background: rgba(251,146,60,0.1); border-color: rgba(251,146,60,0.3); color: #fb923c; }
.ev-type-badge.chat-ev { background: rgba(52,211,153,0.06); border-color: rgba(52,211,153,0.18); color: #5f5; }
.ev-type-badge.betritt-ev { background: rgba(244,114,182,0.08); border-color: rgba(244,114,182,0.22); color: #f472b6; }
.be-addevent { display: block; width: 100%; padding: 10px; text-align: center; background: none; border: 1px dashed rgba(139,92,246,0.2); border-radius: 9px; color: rgba(139,92,246,0.6); font-size: 0.73rem; cursor: pointer; margin-top: 5px; transition: all 0.18s; font-family: var(--font-ui); font-weight: 600; }
.be-addevent:hover { border-color: var(--purple); color: #c4b5fd; }

.cond-group-oder::before { content:"ODER"; display:block; font-size:.59rem; color:#fbbf24; font-weight:800; letter-spacing:.09em; text-align:center; margin:4px 0 2px 7px; }
.cond-when-lbl { font-size:.63rem; color:var(--text3); padding:2px 9px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:99px; margin:3px 0 3px 7px; display:inline-block; }
.cond-group { display:flex; flex-direction:column; gap:0; }
.cond-num { font-size:.6rem; font-weight:800; color:var(--text3); background:rgba(255,255,255,0.05); border-radius:4px; padding:2px 6px; flex-shrink:0; min-width:20px; text-align:center; }
.logik-btn { font-size:.6rem; padding:2px 9px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); color:var(--text3); cursor:pointer; line-height:1.5; transition:all 0.18s; }
.logik-btn:first-child { border-radius:5px 0 0 5px; }
.logik-btn:last-child { border-radius:0 5px 5px 0; border-left:none; }
.logik-btn.active { background:rgba(139,92,246,0.2); color:#c4b5fd; border-color:rgba(139,92,246,0.4); }
.tp-slot-valid { font-size:.6rem; padding:2px 8px; border-radius:99px; cursor:pointer; border:1px solid; font-weight:700; transition:all 0.18s; }
.tp-slot-valid.zählt { background:rgba(52,211,153,0.1); color:#5c5; border-color:rgba(52,211,153,0.28); }
.tp-slot-valid.zählt-nicht { background:rgba(220,38,38,0.1); color:#e55; border-color:rgba(220,38,38,0.28); }

/* ═══════════════════════════════════════════════
   LOGS
═══════════════════════════════════════════════ */
.log-entry { display:flex; align-items:center; gap:9px; padding:8px 12px; border-radius:9px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.015); font-size:.74rem; transition:border-color 0.13s; }
.log-entry.log-ok { border-color:rgba(52,211,153,0.2); background:rgba(52,211,153,0.04); }
.log-entry.log-ungueltig { border-color:rgba(251,113,133,0.2); background:rgba(251,113,133,0.04); }
.log-entry.log-skip { border-color:rgba(251,191,36,0.1); background:rgba(251,191,36,0.02); opacity:.7; }
.log-ts { font-size:.62rem; color:var(--text3); white-space:nowrap; min-width:56px; font-family:var(--font-mono); }
.log-badge { font-size:.63rem; padding:2px 9px; border-radius:99px; white-space:nowrap; flex-shrink:0; font-weight:800; border:1px solid; }
.log-badge.ok { background:rgba(52,211,153,0.1); color:#5c5; border-color:rgba(52,211,153,0.2); }
.log-badge.ungueltig { background:rgba(220,38,38,0.1); color:#e55; border-color:rgba(220,38,38,0.2); }
.log-badge.skip { background:rgba(251,191,36,0.07); color:#aa9; border-color:rgba(251,191,36,0.14); }
.log-bot { color:#c4b5fd; font-weight:800; flex-shrink:0; font-family:var(--font-mono); }
.log-trig { color:var(--text2); flex-shrink:0; }
.log-player { color:#34d399; flex:1; }
.log-pos { color:var(--text3); font-size:.62rem; white-space:nowrap; }
.log-filter-btn { font-size:.69rem; padding:4px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:var(--text3); border-radius:99px; cursor:pointer; transition:all 0.18s; font-family:var(--font-ui); font-weight:600; }
.log-filter-btn.active { background:rgba(139,92,246,0.15); border-color:rgba(139,92,246,0.4); color:#c4b5fd; }
.log-badge.join-neu { background:rgba(96,165,250,0.1); color:#5af; border-color:rgba(96,165,250,0.2); }
.log-badge.join-rejoin { background:rgba(167,139,250,0.1); color:#a5f; border-color:rgba(167,139,250,0.2); }
.log-badge.leave { background:rgba(255,255,255,0.04); color:#888; border-color:rgba(255,255,255,0.1); }
.log-entry.log-join { border-color:rgba(96,165,250,0.2); background:rgba(96,165,250,0.03); }
.log-entry.log-leave { border-color:rgba(255,255,255,0.06); background:rgba(255,255,255,0.01); opacity:.6; }

/* ═══════════════════════════════════════════════
   MONEY
═══════════════════════════════════════════════ */
.money-card { display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid rgba(255,255,255,0.08); border-radius:13px; background:rgba(255,255,255,0.02); margin-bottom:9px; transition:all 0.2s; }
.money-card:hover { border-color:rgba(251,191,36,0.2); box-shadow:0 3px 14px rgba(251,191,36,0.06); }
.money-balance { font-size:1.2rem; font-weight:800; color:#f5c842; min-width:76px; text-align:right; font-family:var(--font-mono); }
.money-name { color:var(--text); flex:1; font-size:.84rem; font-weight:600; }
.money-adj { display:flex; gap:5px; align-items:center; }
.money-adj input { width:70px; font-family:var(--font-mono); }
.money-adj button { padding:5px 14px; font-size:.71rem; border:1px solid; border-radius:99px; cursor:pointer; transition:all 0.18s; font-weight:800; font-family:var(--font-ui); }
.money-adj button:hover { filter:brightness(1.25); }
.money-plus { background:rgba(52,211,153,0.12); color:#34d399; border-color:rgba(52,211,153,0.25); }
.money-minus { background:rgba(251,113,133,0.1); color:#fb7185; border-color:rgba(251,113,133,0.2); }

/* ═══════════════════════════════════════════════
   ROOM PANEL
═══════════════════════════════════════════════ */
.room-panel { background: rgba(6,6,15,0.7); border-bottom: 1px solid rgba(255,255,255,0.07); padding: 7px 18px; display: flex; align-items: center; gap: 9px; flex-wrap: wrap; min-height: 36px; }
.room-label { color: var(--text3); flex-shrink: 0; font-size: 0.7rem; white-space: nowrap; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; }
.room-members { display: flex; flex-wrap: wrap; gap: 5px; flex: 1; }
.room-chip { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; padding: 3px 11px; cursor: pointer; transition: all 0.18s; font-size: 0.74rem; color: var(--text2); white-space: nowrap; user-select: none; font-family: var(--font-ui); }
.room-chip:hover { border-color: rgba(139,92,246,0.5); color: #c4b5fd; background: rgba(139,92,246,0.08); }
.room-chip.self { border-color: rgba(52,211,153,0.4); color: #6ee7b7; background: rgba(52,211,153,0.06); cursor: default; }
.room-chip.selected { border-color: rgba(139,92,246,0.5); color: #c4b5fd; background: rgba(139,92,246,0.12); font-weight: 700; }
.room-num { font-size: 0.61rem; color: var(--text3); font-family: var(--font-mono); }
.room-chip.self .room-num { color: rgba(52,211,153,0.65); }
.room-refresh-btn { background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; color: var(--text3); font-size: 0.7rem; padding: 3px 11px; cursor: pointer; flex-shrink: 0; transition: all 0.18s; font-family: var(--font-ui); }
.room-refresh-btn:hover { border-color: rgba(139,92,246,0.5); color: #c4b5fd; }
.room-empty { color: var(--text3); font-style: italic; font-size: 0.73rem; }
.room-scanning { animation: roomPulse 1s infinite; }

/* ═══════════════════════════════════════════════
   ITEM PICKER
═══════════════════════════════════════════════ */
.ipicker-overlay { position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:600; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(12px); }
.ipicker-box { background:rgba(10,10,24,0.98); border:1px solid rgba(255,255,255,0.12); border-radius:20px; width:580px; max-height:80vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.7); }
.ipicker-head { padding:14px 18px; display:flex; gap:9px; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); }
.ipicker-tabs { display:flex; gap:6px; padding:10px 16px; border-bottom:1px solid rgba(255,255,255,0.07); }
.ipicker-tab { padding:5px 14px; border-radius:99px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); color:var(--text3); font-size:.71rem; cursor:pointer; transition:all 0.18s; font-weight:700; font-family:var(--font-ui); }
.ipicker-tab.on { background:rgba(139,92,246,0.18); color:#c4b5fd; border-color:rgba(139,92,246,0.4); }
.ipicker-list { overflow-y:auto; flex:1; }
.ipicker-row { padding:10px 16px; font-size:.75rem; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; gap:9px; align-items:center; transition:background 0.13s; font-family:var(--font-ui); }
.ipicker-row:hover { background:rgba(139,92,246,0.06); color:#c4b5fd; }
.ipicker-tag { font-size:.62rem; background:rgba(139,92,246,0.16); color:#c4b5fd; border-radius:99px; padding:2px 9px; white-space:nowrap; font-weight:700; border:1px solid rgba(139,92,246,0.2); }
.ipicker-tag.green { background:rgba(52,211,153,0.12); color:#6ee7b7; border-color:rgba(52,211,153,0.2); }
.ipicker-tag.purple { background:rgba(139,92,246,0.12); color:#c4b5fd; }

/* ═══════════════════════════════════════════════
   TP SLOT + MISC
═══════════════════════════════════════════════ */
.tp-slot-list { display:flex; flex-direction:column; gap:5px; margin-top:8px; }
.tp-slot-row { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:6px 10px; }
.tp-slot-badge { font-size:.62rem; padding:2px 9px; border-radius:99px; font-weight:800; white-space:nowrap; flex-shrink:0; border:1px solid; }
.tp-slot-badge.primary { background:rgba(52,211,153,0.12); color:#6ee7b7; border-color:rgba(52,211,153,0.25); }
.tp-slot-badge.fallback { background:rgba(96,165,250,0.1); color:#60a5fa; border-color:rgba(96,165,250,0.2); }
.tp-slot-add-btn { width:100%; background:none; border:1px dashed rgba(255,255,255,0.09); color:var(--text3); border-radius:8px; padding:5px; font-size:.69rem; cursor:pointer; margin-top:4px; transition:all 0.18s; font-family:var(--font-ui); }
.tp-slot-add-btn:hover { border-color:rgba(139,92,246,0.4); color:#c4b5fd; }
.tp-no-fb-row { display:flex; align-items:center; gap:5px; margin-top:6px; }
.tp-no-fb-row label { font-size:.65rem; color:var(--text3); flex-shrink:0; }

#targetMember { width:100%; background:rgba(0,0,0,0.4); color:var(--text); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:8px 12px; font-size:.82rem; font-family:var(--font-ui); }

/* cursor fixes */
button { cursor: pointer; }
[title]:not(input):not(select):not(textarea):not(button) { cursor: default; }

/* section animation */
.section { animation: sectionIn .2s ease; }



.curse-row.fav { background: rgba(251,191,36,0.04); }
.curse-row.fav:hover { background: rgba(251,191,36,0.08); }
.fav-cell { width: 28px; text-align: center; cursor: pointer; user-select: none; padding: 6px 4px !important; font-size: 1rem; transition: transform .15s; }
.fav-cell:hover { transform: scale(1.3); }

.change-added   { color: #6fcf97; }
.change-updated { color: #f2994a; }

/* ═══════════════════════════════════════════════
   RANG SYSTEM
═══════════════════════════════════════════════ */
.rank-wrap { display: grid; grid-template-columns: 320px 1fr; height: calc(100vh - 112px); overflow: hidden; }
.rank-cfg { border-right: 1px solid rgba(255,255,255,0.07); overflow-y: auto; background: rgba(10,10,24,0.8); padding: 14px; }
.rank-cfg-title { font-size: .72rem; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.rank-def-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 11px; margin-bottom: 7px; display: flex; align-items: center; gap: 8px; transition: border-color .18s; cursor: default; }
.rank-def-card:hover { border-color: rgba(255,255,255,0.14); }
.rank-def-badge { font-size: .72rem; padding: 3px 11px; border-radius: 99px; font-weight: 800; border: 1px solid; white-space: nowrap; flex-shrink: 0; }
.rank-def-name { flex: 1; font-size: .78rem; font-weight: 700; color: var(--text); }
.rank-def-level { font-size: .62rem; font-family: var(--font-mono); color: var(--text3); flex-shrink: 0; }
.rank-add-btn { width: 100%; padding: 9px; background: none; border: 1px dashed rgba(139,92,246,0.25); border-radius: 9px; color: rgba(139,92,246,0.6); font-size: .72rem; cursor: pointer; transition: all .18s; font-family: var(--font-ui); font-weight: 600; margin-top: 4px; }
.rank-add-btn:hover { border-color: var(--purple); color: #c4b5fd; background: rgba(139,92,246,0.05); }
.rank-players { overflow-y: auto; background: var(--bg); }
.rank-filter-bar { display: flex; align-items: center; gap: 9px; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); flex-wrap: wrap; }
.rank-search { background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; color: var(--text); padding: 6px 14px; font-size: .78rem; width: 200px; font-family: var(--font-ui); transition: all .18s; }
.rank-search:focus { outline: none; border-color: var(--purple); box-shadow: 0 0 0 3px rgba(139,92,246,0.2); }
.rank-player-card { display: flex; align-items: center; gap: 12px; padding: 11px 18px; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background .13s; }
.rank-player-card:hover { background: rgba(255,255,255,0.025); }
.rank-player-name { font-size: .82rem; font-weight: 700; color: var(--text); min-width: 140px; }
.rank-player-num { font-size: .62rem; color: var(--text3); font-family: var(--font-mono); }
.rank-player-rank { flex: 1; }
.rank-badge-none { font-size: .72rem; color: var(--text3); font-style: italic; }
.rank-history-btn { background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; color: var(--text3); font-size: .62rem; padding: 2px 8px; cursor: pointer; transition: all .15s; font-family: var(--font-ui); }
.rank-history-btn:hover { border-color: rgba(139,92,246,0.4); color: #c4b5fd; }

/* ══════════════════ SHOP ══════════════════ */
.shop-wrap { display: grid; grid-template-columns: 340px 1fr; height: calc(100vh - 112px); overflow: hidden; }
.shop-cfg  { border-right: 1px solid rgba(255,255,255,0.07); overflow-y: auto; background: rgba(10,10,24,0.8); padding: 14px; }
.shop-cfg-title { font-size: .72rem; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.shop-item-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 9px 12px; margin-bottom: 7px; display: flex; align-items: center; gap: 9px; transition: border-color .18s; cursor: default; }
.shop-item-card:hover { border-color: rgba(255,255,255,0.14); }
.shop-item-icon { font-size: 1.1rem; flex-shrink: 0; }
.shop-item-name { flex: 1; font-size: .80rem; font-weight: 700; color: var(--text); }
.shop-item-price { font-size: .68rem; font-family: var(--font-mono); color: var(--green); font-weight: 700; flex-shrink: 0; }
.shop-item-inactive { opacity: .45; }
.shop-add-btn { width: 100%; padding: 9px; background: none; border: 1px dashed rgba(52,211,153,0.25); border-radius: 9px; color: rgba(52,211,153,0.6); font-size: .72rem; cursor: pointer; transition: all .18s; font-family: var(--font-ui); font-weight: 600; margin-top: 4px; }
.shop-add-btn:hover { border-color: var(--green); color: var(--green); background: rgba(52,211,153,0.05); }
.shop-right { overflow-y: auto; background: var(--bg); padding: 20px 24px; }
.shop-empty { text-align: center; padding: 60px 20px; color: var(--text3); font-size: .85rem; }
.shop-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.8); z-index: 800; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
.shop-modal { background: var(--bg3); border: 1px solid rgba(52,211,153,0.3); border-radius: 16px; padding: 24px; min-width: 380px; max-width: 480px; box-shadow: 0 12px 48px rgba(0,0,0,.8); }
.shop-modal h3 { font-size: .95rem; font-weight: 800; color: #6ee7b7; margin-bottom: 16px; }
.shop-modal label { display: block; font-size: .67rem; color: var(--text3); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; margin-top: 11px; }
.shop-modal input, .shop-modal select, .shop-modal textarea { width: 100%; }
.shop-modal-btns { display: flex; gap: 8px; margin-top: 18px; justify-content: flex-end; }
.shop-log-card { background: rgba(52,211,153,0.04); border: 1px solid rgba(52,211,153,0.12); border-radius: 8px; padding: 9px 13px; margin-bottom: 6px; font-size: .73rem; }
.shop-log-card .shop-log-who { font-weight: 700; color: var(--green); }
.shop-log-card .shop-log-item { color: var(--text1); }
.shop-log-card .shop-log-meta { color: var(--text3); font-size: .62rem; font-family: var(--font-mono); margin-top: 2px; }
.rank-history-popup { position: fixed; z-index: 700; background: var(--bg3); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 14px 18px; min-width: 260px; box-shadow: 0 8px 32px rgba(0,0,0,0.7); }
.rank-edit-inline { display: flex; gap: 5px; align-items: center; }
.rank-empty { text-align: center; padding: 60px 20px; color: var(--text3); font-size: .85rem; }
.rank-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.8); z-index: 800; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
.rank-modal { background: var(--bg3); border: 1px solid rgba(139,92,246,0.3); border-radius: 16px; padding: 24px; min-width: 340px; max-width: 440px; box-shadow: 0 12px 48px rgba(0,0,0,.8); }
.rank-modal h3 { font-size: .95rem; font-weight: 800; color: #c4b5fd; margin-bottom: 16px; }
.rank-modal label { display: block; font-size: .67rem; color: var(--text3); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; margin-top: 11px; }
.rank-modal input, .rank-modal select { width: 100%; }
.rank-modal-btns { display: flex; gap: 8px; margin-top: 18px; justify-content: flex-end; }

/* UND NICHT */
.logik-btn.active-nicht { background:rgba(251,113,133,0.2); color:#fb7185; border-color:rgba(251,113,133,0.4); }
.cond-group-nicht::before { content:"UND NICHT"; display:block; font-size:.59rem; color:#fb7185; font-weight:800; letter-spacing:.09em; text-align:center; margin:4px 0 2px 7px; }
/* AntiStrip in Aktion */
.as-act-box { margin-top:7px; padding:8px 10px; background:rgba(52,211,153,0.04); border:1px solid rgba(52,211,153,0.18); border-radius:8px; }
.as-act-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:5px; }
.as-act-label { font-size:.6rem; color:var(--text3); white-space:nowrap; }

</style>
</head>
<body>


<!-- TOPBAR -->
<div class="topbar">
  <h1>🔒 BC Konfigurator <span style="font-weight:400;font-size:.72rem;opacity:.4;-webkit-text-fill-color:#94a3b8;background:none">v12</span></h1>
  <span class="tbadge" id="connStatus" style="color:#fb7185" title="Verbindungsstatus mit dem Bondage Club">🔴 Nicht verbunden</span>
  <span class="tbadge" id="playerInfo" style="display:none" title="Aktueller Spieler"></span>
  <span class="tbadge" id="cacheInfo" title="Geladene Item-Daten">Kein Cache</span>
  <button class="btn btn-green" id="loadCacheBtn" onclick="loadCacheFromBC()" title="Item-Daten aus dem laufenden Bondage Club Spiel laden">⚡ Aus Spiel laden</button>
  <button class="btn btn-primary" id="reconnectBtn" onclick="manualReconnect()" title="Verbindung zum Bondage Club neu herstellen">🔄 Verbinden</button>
  <button class="btn btn-red hidden" id="clearBtn" onclick="clearCache()" title="Cache löschen">🗑 Löschen</button>
  <div id="statusMsg" class="status-msg hidden"></div>
</div>

<!-- RAUM-SPIELER -->
<div class="room-panel" id="roomPanel">
  <span class="room-label">👥 Im Raum:</span>
  <div class="room-members" id="roomMembers">
    <span class="room-empty" id="roomEmpty">– noch nicht verbunden –</span>
  </div>
  <button class="room-refresh-btn" id="roomRefreshBtn" onclick="scanRoom()" title="Raum neu scannen">🔄</button>
</div>


<!-- TAB NAVIGATION -->
<div class="tab-nav">
  <button class="tab-btn active" id="tab-items-btn"  onclick="switchTab('items')">🔧 Item Manager</button>
  <button class="tab-btn"        id="tab-outfit-btn" onclick="switchTab('outfit')">👗 Outfit &amp; Profile</button>
  <button class="tab-btn"        id="tab-curse-btn"  onclick="switchTab('curse')">🔮 Craft &amp; Curse</button>
  <button class="tab-btn"        id="tab-bot-btn"    onclick="switchTab('bot')">🤖 Bot</button>
  <button class="tab-btn"        id="tab-log-btn"    onclick="switchTab('log')">📋 Logs</button>
  <button class="tab-btn"        id="tab-money-btn"  onclick="switchTab('money')">💰 Money</button>
  <button class="tab-btn"        id="tab-rank-btn"   onclick="switchTab('rank')">🏆 Rang</button>
  <button class="tab-btn"        id="tab-shop-btn"   onclick="switchTab('shop')">🛒 Shop</button>
</div>

<!-- TAB 1: ITEM MANAGER -->
<div id="tab-items" class="tab-pane active">
<!-- LAYOUT -->
<div class="layout">
  <div class="sidebar">
    <input class="sidebar-search" placeholder="🔍 Item suchen..." oninput="renderGroups(this.value)">
    <div id="favSection" class="hidden">
      <div class="fav-hdr">⭐ Favoriten</div>
      <div id="favList" style="margin-bottom:10px"></div>
    </div>
    <div id="groupsList"></div>
  </div>

  <div class="main">
    <!-- Kein Import-Box mehr – direkt via BC laden -->
    <div id="connectHint" class="import-box" style="text-align:center;padding:40px 28px">
      <div style="font-size:3rem;margin-bottom:16px;filter:drop-shadow(0 0 12px rgba(139,92,246,0.4))">🔗</div>
      <h2 style="margin:0 0 12px;font-size:1.25rem;font-weight:800;background:linear-gradient(135deg,#c4b5fd,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Noch nicht verbunden</h2>
      <p style="color:#64748b;font-size:.84rem;margin-bottom:6px;line-height:1.75;max-width:380px;margin-inline:auto">
        <span style="color:#94a3b8;font-weight:700">Schritt 1:</span> Öffne Bondage Club und lade das Bookmarklet.<br>
        <span style="color:#94a3b8;font-weight:700">Schritt 2:</span> Klicke auf den grünen Button unten.
      </p>
      <p style="color:#374151;font-size:.76rem;margin-bottom:20px">Das Loader-Popup muss geöffnet sein.</p>
      <button class="btn btn-green" onclick="loadCacheFromBC()" style="font-size:.95rem;padding:11px 28px;border-radius:99px;min-width:220px">
        ⚡ Aus Spiel laden
      </button>
      <div id="loadingSpinner" class="hidden" style="margin-top:14px;color:#64748b;font-size:.83rem">
        ⏳ Lade Asset-Daten aus dem Spiel…
      </div>
    </div>

    <div id="configurator" class="hidden">

      <!-- ZIEL -->
      <div class="section">
        <div class="sec-hdr"><h3>🎯 Ziel-Spieler</h3></div>
        <div class="two-col">
          <div class="field">
            <label>Auf wen?</label>
            <select id="targetMode" onchange="onTargetChange()">
              <option value="self">👤 Ich selbst (Player)</option>
              <option value="other">👥 Anderer Spieler</option>
            </select>
          </div>
          <div class="field hidden" id="targetMemberWrap">
            <label>Spieler im Raum</label>
            <select id="targetMember" onchange="generate()">
              <option value="">– Auswählen –</option>
            </select>
            <div class="hint" style="margin-top:4px">Oder direkt: <input type="number" id="targetMemberDirect" placeholder="Member #" style="width:110px;padding:2px 6px;background:var(--card);border:1px solid var(--border1);color:var(--text1);border-radius:4px" oninput="document.getElementById('targetMember').value=this.value;generate()"></div>
          </div>
        </div>
      </div>

      <!-- MODULE -->
      <div class="section hidden" id="moduleSection">
        <div class="sec-hdr">
          <h3>🧩 Module / TypeRecord</h3>
          <span style="font-size:.65rem;color:var(--text3)">☑ = Mehrfachauswahl (Bitmask)</span>
        </div>
        <div id="moduleGrid"></div>
      </div>


      <!-- DIRECT OPTIONS (BallGag, Mittens...) -->
      <div class="section hidden" id="directOptsSection">
        <div class="sec-hdr"><h3>🎛️ Optionen</h3><span class="arch-badge classic" id="dirOptsBadge">📋 Classic Options</span></div>
        <div class="dir-opts" id="directOptsBtns"></div>
      </div>

      <!-- VIBRATING (VibratingEgg, FuturisticTrainingBelt...) -->
      <div class="section hidden" id="vibratingSection">
        <div class="sec-hdr"><h3>🔊 Vibrator-Konfiguration</h3><span class="arch-badge classic" style="background:#1a1a3f;color:#a5b4fc;border-color:#312e81">⚡ Vibrating</span></div>
        <div style="font-size:.68rem;color:var(--text3);margin-bottom:6px">Modus:</div>
        <div class="vib-mode-grid" id="vibModeGrid"></div>
        <div style="font-size:.68rem;color:var(--text3);margin-bottom:6px">Intensität:</div>
        <div class="vib-intensity-row" id="vibIntRow"></div>
        <div style="font-size:.68rem;color:var(--text3);margin-bottom:5px">Aktive Effekte:</div>
        <div class="vib-effects-row" id="vibEffRow"></div>
      </div>

      <!-- BASELINE PROPS (Punishment für Vibrating-Items) -->
      <div class="section hidden" id="baselineSection">
        <div class="sec-hdr"><h3>⚙️ Punishment / Erweiterte Einstellungen</h3></div>
        <div class="baseline-grid" id="baselineGrid"></div>
      </div>
      <!-- FARBEN -->
      <div class="section">
        <div class="sec-hdr">
          <h3>🎨 Farben</h3>
          <button class="btn btn-primary" style="font-size:.65rem;padding:3px 8px" onclick="resetAllColors()">↺ Alle zurücksetzen</button>
        </div>
        <div class="color-grid" id="colorGrid"></div>
      </div>

      <!-- TIGHTNESS -->
      <div class="section hidden" id="tightnessSection">
        <div class="sec-hdr">
          <h3>🔧 Tightness</h3>
          <label style="display:flex;align-items:center;gap:5px;font-size:.68rem;color:var(--text3);cursor:pointer">
            <input type="checkbox" id="tightnessEnabled" onchange="onTightnessToggle()" style="accent-color:var(--purple)">
            Setzen
          </label>
        </div>
        <div id="tightnessBody" class="hidden">
          <div class="tightness-row">
            <input type="range" class="tightness-slider" id="tightnessSlider" min="-10" max="50" value="0" oninput="onTightnessChange()">
            <span class="tightness-val" id="tightnessVal">0</span>
          </div>
          <div class="tightness-info">
            <div>Min: <span id="tightnessMin">-10</span></div>
            <div>Max: <span id="tightnessMax">50</span></div>
            <div>Item-Basis: <span id="tightnessBase">–</span></div>
          </div>
        </div>
      </div>

      <!-- WEITERE PROPS -->
      <div class="section hidden" id="propsSection">
        <div class="sec-hdr">
          <h3>⚙️ Weitere Properties</h3>
          <span style="font-size:.65rem;color:var(--text3)" id="propsHint"></span>
        </div>
        <div class="props-grid" id="propsGrid"></div>
      </div>

      <!-- CRAFT -->
      <div class="section">
        <div class="sec-hdr"><h3>✏️ Craft (optional)</h3></div>
        <div class="two-col">
          <div class="field"><label>Name (max. 40)</label><input type="text" id="craftName" maxlength="40" placeholder="Leer = kein Craft" oninput="generate()"></div>
          <div class="field"><label>Beschreibung (max. 100)</label><input type="text" id="craftDesc" maxlength="100" oninput="generate()"></div>
          <div class="field"><label>Craft Property</label><select id="craftProp" onchange="generate()"></select></div>
        </div>
      </div>

      <!-- SCHLOSS -->
      <div class="section">
        <div class="sec-hdr"><h3>🔒 Schloss</h3></div>
        <div class="two-col">
          <div class="field full">
            <label>Schloss-Typ</label>
            <select id="lockType" onchange="onLockChange()">
              <option value="">Kein Schloss</option>
              <optgroup label="Standard">
                <option value="MetalPadlock">🔒 Metal Padlock</option>
                <option value="SafewordPadlock">🛡️ Safeword Padlock</option>
                <option value="ExclusivePadlock">⭐ Exclusive Padlock</option>
                <option value="HighSecurityPadlock">🔐 High Security Padlock</option>
                <option value="TimerPadlock">⏱️ Timer Padlock</option>
                <option value="CombinationPadlock">🔢 Combination Padlock</option>
                <option value="PasswordPadlock">🔑 Password Padlock</option>
                <option value="TimerPasswordPadlock">⏱️🔑 Timer + Password</option>
              </optgroup>
              <optgroup label="Beziehungs-Schlösser">
                <option value="OwnerPadlock">👑 Owner Padlock</option>
                <option value="LoversPadlock">💕 Lovers Padlock</option>
                <option value="MistressPadlock">🎩 Mistress Padlock</option>
              </optgroup>
              <optgroup label="Addons (BCX)">
                <option value="LewdCrestPadlock">🌸 Lewd Crest (BCX)</option>
                <option value="DeviousPadlock">😈 Devious Padlock (BCX)</option>
                <option value="LuziPadlock">✨ Magic Inscription (SugarChain)</option>
              </optgroup>
            </select>
          </div>

          <!-- Timer -->
          <div class="field full hidden" id="timerGroup">
            <label>⏱️ Timer-Dauer</label>
            <div class="timer-row">
              <div><label style="font-size:.65rem;color:var(--text3)">Stunden</label><input type="number" id="timerH" value="1" min="0" oninput="generate()"></div>
              <div><label style="font-size:.65rem;color:var(--text3)">Minuten</label><input type="number" id="timerM" value="0" min="0" max="59" oninput="generate()"></div>
              <div><label style="font-size:.65rem;color:var(--text3)">Sekunden</label><input type="number" id="timerS" value="0" min="0" max="59" oninput="generate()"></div>
            </div>
          </div>

          <!-- Kombination -->
          <div class="field hidden" id="comboGroup">
            <label>🔢 Kombination (4 Ziffern)</label>
            <input type="text" id="comboCode" value="1234" maxlength="4" oninput="generate()">
          </div>

          <!-- Passwort -->
          <div class="field hidden" id="passwordGroup">
            <label>🔑 Passwort <span style="color:var(--text3);font-size:.65rem">(genau 4 Ziffern, z.B. 1234)</span></label>
            <input type="text" id="lockPassword" value="1234" maxlength="4" pattern="[0-9]{4}" placeholder="1234" oninput="validatePwInput(this);generate()">
            <div class="hint" id="pwHint" style="color:var(--red);display:none">⚠️ BC erwartet genau 4 Ziffern (0-9)</div>
          </div>

          <!-- Beziehungs-Schlösser -->
          <div class="full hidden" id="relLockGroup">
            <div class="warn" style="margin-bottom:7px">⚠️ Beziehungs-Schlösser brauchen eine aktive Beziehung im Spiel.</div>
            <div class="two-col">
              <div class="field">
                <label>Member Number des Owners/Lovers/Mistress</label>
                <input type="number" id="relMemberNum" placeholder="Leer = Player.MemberNumber" oninput="generate()">
              </div>
              <div class="field">
                <label>⏱️ Timer optional (Stunden, 0 = keiner)</label>
                <input type="number" id="relTimerH" value="0" min="0" oninput="generate()">
              </div>
            </div>
          </div>

          <!-- BCX-Hinweis -->
          <div class="full hidden" id="bcxLockHint">
            <div class="info-box">💡 Addon-Schloss: Code prüft ob Asset in ItemMisc oder anderen Gruppen existiert. BCX muss geladen sein.</div>
          </div>
        </div>
      </div>

      <!-- OUTPUT -->
      <div class="section">
        <div class="sec-hdr"><h3>💻 Generierter Code</h3></div>
        <div class="type-preview" id="typePreview">–</div>
        <textarea class="code-out" id="codeOut" readonly></textarea>
        <div class="btn-row">
          <button class="btn btn-green" id="execBtn" onclick="executeCode()" style="flex:1;font-size:.82rem">
            ▶ Direkt ausführen
          </button>
          <button class="btn-copy" id="copyBtn" onclick="copyCode()" style="min-width:140px">📋 Kopieren</button>
          <button class="btn btn-orange" onclick="addToOutfit()" style="min-width:120px">👗 Outfit</button>
        </div>
      </div>

    </div><!-- /configurator -->

    <div class="empty hidden" id="emptyState">
      <div style="font-size:2.2rem">🔍</div>
      <div>Wähle ein Item aus der Sidebar</div>
    </div>
  </div>
</div>

</div><!-- /tab-items -->

<!-- ── TAB 2: OUTFIT & PROFILE ── -->
<div id="tab-outfit" class="tab-pane">
  <div class="outfit-tab-layout">

    <!-- LEFT: Item list + profiles -->
    <div class="outfit-left">
      <div class="outfit-target-bar" style="margin-bottom:12px">
        <span class="outfit-target-label">🎯 Ziel:</span>
        <div class="outfit-member-chips" id="outfitMemberChips">
          <span style="color:var(--text3);font-size:.72rem">– Raum noch nicht geladen –</span>
        </div>
      </div>

      <div class="section-hdr2">
        <span>👗 Outfit Items</span>
        <button class="btn btn-red" style="font-size:.65rem;padding:3px 8px" onclick="clearOutfit()">🗑️ Leeren</button>
      </div>
      <div class="outfit-search-row">
        <input class="outfit-search" id="outfitItemSearch" placeholder="🔍 Item suchen..." oninput="renderOutfitList()">
      </div>
      <div id="outfitList">
        <div class="outfit-empty-hint">Noch keine Items.<br>Konfiguriere ein Item im <strong>Item Manager</strong> und klicke <strong>„👗 Outfit"</strong>.</div>
      </div>

      <!-- PROFILES -->
      <div style="margin-top:20px">
        <div class="section-hdr2">
          <div style="display:flex;align-items:center;gap:6px"><span>📁 Profile</span><input class="outfit-search" id="profileSearch" placeholder="🔍 Profil suchen..." oninput="renderProfileList()" style="width:150px;font-size:.69rem;padding:3px 8px"></div>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="profile-name-input" id="profileNameInput" placeholder="Profilname..." maxlength="40" style="font-size:.72rem;padding:3px 7px">
            <button class="btn btn-green" style="font-size:.68rem;padding:4px 9px" onclick="saveProfile()">💾 Speichern</button>
          </div>
        </div>
        <div id="profileListEl" class="profile-grid">
          <p style="color:var(--text3);font-size:.8rem;grid-column:1/-1">Noch keine Profile.</p>
        </div>
      </div>
    </div>

    <!-- RIGHT: Live code -->
    <div class="outfit-right">
      <div class="section-hdr2" style="margin-bottom:8px">
        <span>💻 Generierter Code</span>
        <span id="outfitAutoStatus" style="font-size:.62rem;color:var(--text3)">– kein Outfit –</span>
      </div>
      <textarea class="outfit-code-live" id="outfitCode" readonly
        placeholder="Code erscheint automatisch wenn du Items hinzufügst..."></textarea>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-green" id="execOutfitBtn" onclick="executeOutfitCode()" style="flex:1;font-size:.8rem">▶ Ausführen</button>
        <button class="btn-copy" onclick="copyOutfitCode()" style="margin-top:0;min-width:120px">📋 Kopieren</button>
      </div>
    </div>
  </div>
</div>
<!-- /tab-outfit -->

<script>
// ══════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════
let CACHE   = {};
let CURRENT = null;
window._BCCurrent = () => CURRENT; // expose for bot tab

let dimMode      = {};
let dimSelected  = {};
let dimSubProps  = {};
let globalPropVals = {};
let colorIsDefault = {};  // i → true wenn "Default" aktiv

let FAVORITES = new Set();
let OUTFIT    = [];

let tightnessOn  = false;
let tightnessVal = 0;

// ── Vibrating state ──────────────────────────────────
let vibratingMode      = 'Off';
let vibratingIntensity = -1;
let vibratingTR        = 0;
let vibratingEffects   = new Set();

// ── Direct options (BallGag) ─────────────────────────
let classicOptionSel = 0;

// ── Baseline / Punishment ────────────────────────────
let baselinePropVals = {};

// ── Outfit Profiles ──────────────────────────────────
let PROFILES = {};
try { PROFILES = JSON.parse(localStorage.getItem('BC_PROFILES_v11') || '{}'); } catch {}


// ── Init ─────────────────────────────────────────────
try {
  const fav = localStorage.getItem('BC_FAVORITES_v9');
  if (fav) FAVORITES = new Set(JSON.parse(fav));
} catch {}

// ══════════════════════════════════════════════════════
//  CACHE
// ══════════════════════════════════════════════════════
function showImport() {
  document.getElementById('importBox').classList.remove('hidden');
}

async function pasteClipboard() {
  try { document.getElementById('importArea').value = await navigator.clipboard.readText(); }
  catch { alert('Clipboard verweigert – manuell einfügen.'); }
}

function loadCache() {
  const raw   = document.getElementById('importArea').value.trim();
  const errEl = document.getElementById('importError');
  try {
    const data  = JSON.parse(raw);
    const items = Object.values(data).reduce((s,g) => s + Object.keys(g).length, 0);
    if (items === 0) throw new Error('Kein gültiger BC-Cache');
    CACHE = data;
    try { localStorage.setItem('BC_CACHE_v11', raw); } catch {}
    errEl.classList.add('hidden');
    document.getElementById('importBox').classList.add('hidden');
    document.getElementById('importArea').value = '';
    const modCount = Object.values(data).flatMap(g => Object.values(g)).filter(i => i.isModular).length;
    document.getElementById('cacheInfo').textContent =
      `${items} Items | ${Object.keys(data).length} Gruppen${modCount ? ` | 🧩 ${modCount} Modular` : ''}`;
    document.getElementById('clearBtn').classList.remove('hidden');
    document.getElementById('outfitBtn')?.classList.remove('hidden');
    document.getElementById('profileBtn')?.classList.remove('hidden');
    renderGroups();
    showEmpty();
  } catch(e) {
    errEl.textContent = '❌ ' + e.message;
    errEl.classList.remove('hidden');
  }
}

// clearCache defined in BC comms block

// [auto-load moved to BC comms block below]

// ══════════════════════════════════════════════════════
//  SIDEBAR & FAVORITES
// ══════════════════════════════════════════════════════
function favKey(g, n) { return `${g}::${n}`; }

function toggleFav(group, name, e) {
  e.stopPropagation();
  const k = favKey(group, name);
  if (FAVORITES.has(k)) FAVORITES.delete(k);
  else FAVORITES.add(k);
  try { localStorage.setItem('BC_FAVORITES_v9', JSON.stringify([...FAVORITES])); } catch {}
  renderGroups(document.querySelector('.sidebar-search')?.value || '');
}

function renderGroups(filter = '') {
  const fl = filter.toLowerCase();

  // Favoriten
  const favEl   = document.getElementById('favSection');
  const favList = document.getElementById('favList');
  const favItems = [...FAVORITES].filter(k => {
    const [g,n] = k.split('::');
    return CACHE[g]?.[n] && (!fl || n.toLowerCase().includes(fl) || g.toLowerCase().includes(fl));
  });
  favEl.classList.toggle('hidden', favItems.length === 0);
  favList.innerHTML = '';
  favItems.forEach(k => {
    const [g,n] = k.split('::');
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <button class="item-btn${CURRENT?.asset===n&&CURRENT?.group===g?' active':''}" onclick="selectItem('${g}','${n}')">${n}</button>
      <button class="star-btn fav" onclick="toggleFav('${g}','${n}',event)" title="Favorit entfernen">⭐</button>`;
    favList.appendChild(row);
  });

  // Gruppen
  const container = document.getElementById('groupsList');
  container.innerHTML = '';
  for (const group in CACHE) {
    const names = Object.keys(CACHE[group]).filter(n =>
      !fl || n.toLowerCase().includes(fl) || group.toLowerCase().includes(fl));
    if (!names.length) continue;
    const wrap    = document.createElement('div');
    const hdr     = document.createElement('div');
    hdr.className = 'group-hdr' + (fl ? ' open' : '');
    hdr.innerHTML = `<span>${group}</span><span style="font-size:.62rem;color:var(--text3)">${names.length}</span>`;
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'group-items' + (fl ? ' open' : '');
    hdr.onclick = () => { hdr.classList.toggle('open'); itemsDiv.classList.toggle('open'); };
    wrap.append(hdr, itemsDiv);
    names.forEach(name => {
      const isFav = FAVORITES.has(favKey(group, name));
      const row   = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <button class="item-btn${CURRENT?.asset===name&&CURRENT?.group===group?' active':''}" id="ib_${group}_${name}" onclick="selectItem('${group}','${name}')">${name}</button>
        <button class="star-btn${isFav?' fav':''}" onclick="toggleFav('${group}','${name}',event)" title="${isFav?'Favorit entfernen':'Zu Favoriten'}">${isFav?'⭐':'☆'}</button>`;
      itemsDiv.appendChild(row);
    });
    container.appendChild(wrap);
  }
}

// ══════════════════════════════════════════════════════
//  ITEM AUSWÄHLEN
// ══════════════════════════════════════════════════════
function selectItem(group, asset) {
  const cfg = CACHE[group]?.[asset];
  if (!cfg) return;
  CURRENT = { group, asset, cfg };
  dimMode = {}; dimSelected = {}; dimSubProps = {}; globalPropVals = {};
  colorIsDefault = {};
  tightnessOn = false; tightnessVal = 0;
  vibratingMode = 'Off'; vibratingIntensity = -1; vibratingTR = 0; vibratingEffects = new Set(['Egged']);
  classicOptionSel = 0; baselinePropVals = {};

  for (const key in (cfg.typeKeys || {})) {
    dimMode[key]     = 'single';
    dimSelected[key] = new Set([0]);
    dimSubProps[key] = {};
    (cfg.typeKeys[key] || []).forEach((_, i) => { dimSubProps[key][i] = {}; });
  }

  buildConfigurator();
  renderGroups(document.querySelector('.sidebar-search')?.value || '');
}

function showEmpty() {
  document.getElementById('configurator').classList.add('hidden');
  document.getElementById('emptyState').classList.remove('hidden');
}

// ══════════════════════════════════════════════════════
//  KONFIGURATOR AUFBAUEN
// ══════════════════════════════════════════════════════
function buildConfigurator() {
  const { cfg } = CURRENT;
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('configurator').classList.remove('hidden');
  buildModules();
  buildDirectOptions();
  buildVibrating();
  buildBaselinePropsUI();
  buildColors();
  buildTightness();
  buildGlobalPropsUI();

  const sel = document.getElementById('craftProp');
  sel.innerHTML = '';
  (cfg.allowedCraftProps?.length ? cfg.allowedCraftProps : ['Normal'])
    .forEach(p => { const o=document.createElement('option'); o.value=p; o.textContent=p; sel.appendChild(o); });
  document.getElementById('craftName').value = '';
  document.getElementById('craftDesc').value = '';
  document.getElementById('lockType').value  = '';
  onLockChange();
  generate();
}

// ── MODULE ─────────────────────────────────────────
function buildModules() {
  const { cfg, asset } = CURRENT;
  const grid    = document.getElementById('moduleGrid');
  grid.innerHTML = '';
  const dimKeys  = Object.keys(cfg.typeKeys || {});
  document.getElementById('moduleSection').classList.toggle('hidden', dimKeys.length === 0);
  if (!dimKeys.length) return;

  const badge = document.createElement('div');
  badge.className = `arch-badge ${cfg.isModular ? 'modular' : 'classic'}`;
  badge.textContent = cfg.isModular ? '🧩 Modular Archetype' : '📋 TypeRecord';
  grid.appendChild(badge);

  dimKeys.forEach(key => {
    const opts    = cfg.typeKeys[key] || [];
    const modName = cfg.moduleNames?.[key] || key;
    const block   = document.createElement('div');
    block.className = 'dim-block';
    block.innerHTML = `<div class="dim-hdr">
      <span class="key-badge">${key}</span>
      <span class="dim-title">${modName} <span style="color:var(--text3);font-size:.66rem">(${opts.length} Optionen)</span></span>
      <label class="multi-toggle">
        <input type="checkbox" id="multi_${key}" onchange="toggleMulti('${key}')"> Multi
      </label></div>
    <div class="dim-opts" id="opts_${key}"></div>`;
    grid.appendChild(block);
    renderDimOpts(key);
  });
}

function renderDimOpts(key) {
  const { cfg } = CURRENT;
  const opts = cfg.typeKeys[key] || [];
  const container = document.getElementById(`opts_${key}`);
  container.innerHTML = '';

  opts.forEach((opt, idx) => {
    const isSel      = dimSelected[key].has(idx);
    const configProps = getPropsForOpt(cfg, key, idx);

    const badges = [
      ...(opt.effect||[]).map(e => `<span class="b e">⬤ ${e}</span>`),
      ...(opt.block ||[]).map(b => `<span class="b bl">⬤ ${b}</span>`),
      ...(opt.hide  ||[]).map(h => `<span class="b y">👁 ${h}</span>`),
      ...(opt.intensity != null ? [`<span class="b p">I:${opt.intensity}</span>`] : []),
      ...(opt.inflate   != null ? [`<span class="b p">↑${opt.inflate}</span>`] : []),
      ...(opt.shock     != null ? [`<span class="b bl">⚡${opt.shock}</span>`] : []),
    ].join('');

    const infoItems = [];
    if (opt.effect?.length)    infoItems.push(`<span class="sub-info-label">Effekte:</span>` + opt.effect.map(e=>`<span class="b e">${e}</span>`).join(''));
    if (opt.block?.length)     infoItems.push(`<span class="sub-info-label">Blockiert:</span>` + opt.block.map(b=>`<span class="b bl">${b}</span>`).join(''));
    if (opt.hide?.length)      infoItems.push(`<span class="sub-info-label">Versteckt:</span>` + opt.hide.map(h=>`<span class="b y">${h}</span>`).join(''));
    if (opt.hideItem?.length)  infoItems.push(`<span class="sub-info-label">HideItem:</span>` + opt.hideItem.map(h=>`<span class="b gr">${h}</span>`).join(''));
    if (opt.prereq?.length)    infoItems.push(`<span class="sub-info-label">Voraussetzung:</span>` + opt.prereq.map(p=>`<span class="b p">${p}</span>`).join(''));
    if (opt.intensity  != null) infoItems.push(`<span class="b p">Intensity: ${opt.intensity}</span>`);
    if (opt.inflate    != null) infoItems.push(`<span class="b p">InflateLevel: ${opt.inflate}</span>`);
    if (opt.shock      != null) infoItems.push(`<span class="b bl">ShockLevel: ${opt.shock}</span>`);
    if (opt.desc)               infoItems.push(`<span style="font-size:.66rem;color:var(--text3)">${opt.desc}</span>`);

    const subInfoHtml = infoItems.length ? infoItems.map(i => `<div class="sub-info">${i}</div>`).join('') : '';

    let subPropsHtml = '';
    if (configProps.length > 0) {
      subPropsHtml = `<div style="font-size:.65rem;color:var(--text3);margin:5px 0 3px">Konfigurierbare Properties:</div>
        <div class="sub-props">` +
        configProps.map(prop => {
          const id    = `sp_${key}_${idx}_${prop}`;
          const cur   = dimSubProps[key]?.[idx]?.[prop];
          const isBool = /^(Show|Punish|Enable|Allow|Has|Is|Can|Auto|Block)/.test(prop);
          const isNum  = /Level|Count|Timer|Num|Max|Min|Amount|Delay|Duration|Speed/.test(prop);
          if (isBool) return `<div class="sub-prop"><div class="sub-prop-label">${prop}</div>
              <select onchange="setSubProp('${key}',${idx},'${prop}',this.value)">
                <option value="null"${cur==null?' selected':''}>– nicht setzen –</option>
                <option value="true"${cur===true?' selected':''}>true</option>
                <option value="false"${cur===false?' selected':''}>false</option>
              </select></div>`;
          if (isNum) return `<div class="sub-prop"><div class="sub-prop-label">${prop}</div>
              <div class="sub-inline">
                <input type="checkbox" id="${id}_en"${cur!=null?' checked':''}
                  onchange="setSubPropN('${key}',${idx},'${prop}',this.checked,document.getElementById('${id}').value)">
                <input type="number" id="${id}" value="${cur??0}"
                  oninput="if(document.getElementById('${id}_en').checked)setSubPropN('${key}',${idx},'${prop}',true,this.value)">
              </div></div>`;
          return `<div class="sub-prop"><div class="sub-prop-label">${prop}</div>
              <div class="sub-inline">
                <input type="checkbox" id="${id}_en"${cur!=null?' checked':''}
                  onchange="setSubPropS('${key}',${idx},'${prop}',this.checked,document.getElementById('${id}').value)">
                <input type="text" id="${id}" value="${cur??''}" placeholder="Wert"
                  oninput="if(document.getElementById('${id}_en').checked)setSubPropS('${key}',${idx},'${prop}',true,this.value)">
              </div></div>`;
        }).join('') + '</div>';
    }

    const hasSubContent = infoItems.length > 0 || configProps.length > 0;
    const subHtml = hasSubContent ? `<div class="opt-sub">${subInfoHtml}${subPropsHtml}</div>` : '';

    const row = document.createElement('div');
    row.className = 'opt-row' + (isSel ? ' sel' : '');
    row.id = `optrow_${key}_${idx}`;
    row.innerHTML = `
      <div class="opt-hdr">
        <input type="checkbox" class="opt-check" ${isSel?'checked':''}>
        <span class="opt-idx">[${idx}]</span>
        <span class="opt-name">${opt.name}</span>
        <div class="opt-badge-row">${badges}</div>
      </div>
      ${subHtml}`;
    row.querySelector('.opt-hdr').addEventListener('click', () => toggleOpt(key, idx));
    container.appendChild(row);
  });
}

function toggleMulti(key) {
  const isMulti = document.getElementById(`multi_${key}`).checked;
  dimMode[key] = isMulti ? 'multi' : 'single';
  if (!isMulti) {
    const first = [...dimSelected[key]].sort((a,b)=>a-b)[0] ?? 0;
    dimSelected[key] = new Set([first]);
  }
  renderDimOpts(key);
  generate();
}

function toggleOpt(key, idx) {
  if (dimMode[key] === 'single') {
    dimSelected[key] = new Set([idx]);
  } else {
    if (dimSelected[key].has(idx)) {
      dimSelected[key].delete(idx);
      if (dimSelected[key].size === 0) dimSelected[key].add(0);
    } else {
      dimSelected[key].add(idx);
    }
  }
  renderDimOpts(key);
  generate();
}

function setSubProp(key, idx, prop, raw)        { dimSubProps[key][idx][prop] = raw==='null'?null:raw==='true'; generate(); }
function setSubPropN(key, idx, prop, en, raw)   { dimSubProps[key][idx][prop] = en?(parseInt(raw)||0):null; generate(); }
function setSubPropS(key, idx, prop, en, val)   { dimSubProps[key][idx][prop] = en?val:null; generate(); }

// ── FARBEN ─────────────────────────────────────────
function buildColors() {
  const { cfg } = CURRENT;
  const grid = document.getElementById('colorGrid');
  grid.innerHTML = '';
  const n    = cfg.colorCount || 1;
  const defs = cfg.defaultColors || [];

  for (let i = 0; i < n; i++) {
    const name       = cfg.layerNames?.[i] || `Layer ${i+1}`;
    const def        = defs[i] || 'Default';
    const isDefault  = !def || def === 'Default' || def === 'default';
    const hasKnown   = /^#[0-9a-fA-F]{6}$/.test(def);
    colorIsDefault[i] = isDefault;

    const div = document.createElement('div');
    div.className = 'color-item' + (isDefault ? ' is-default' : '');
    div.id = `ci_${i}`;

    if (hasKnown) {
      // Echte Hex-Farbe aus dem Asset → direkt anzeigen
      div.innerHTML = `
        <label>${name}</label>
        <div class="color-row">
          <input type="color" id="color_${i}" value="${def}"
            title="Asset-Standard: ${def}" oninput="onColorChange(${i})">
          <button class="color-default-btn" onclick="resetColor(${i})" title="Auf Standard zurücksetzen">↺</button>
        </div>`;
    } else {
      // Kein Hex bekannt → neutraler Platzhalter, Custom-Color auf Wunsch
      div.innerHTML = `
        <label>${name} <span style="color:var(--text3);font-size:.6rem">(BC-Standard)</span></label>
        <div class="color-row">
          <div id="ci_placeholder_${i}" style="flex:1;height:26px;border:1px dashed var(--border2);border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.65rem;color:var(--text3)" title="Klicken um eigene Farbe zu setzen" onclick="activateColorPicker(${i})">
            + Farbe setzen
          </div>
          <input type="color" id="color_${i}" value="#808080" style="display:none" oninput="onColorChange(${i})">
          <button class="color-default-btn" id="ci_reset_${i}" style="display:none" onclick="resetColor(${i})" title="Auf BC-Standard zurücksetzen">↺</button>
        </div>`;
    }
    grid.appendChild(div);
  }
}

function activateColorPicker(i) {
  const el   = document.getElementById(`color_${i}`);
  const ph   = document.getElementById(`ci_placeholder_${i}`);
  const rst  = document.getElementById(`ci_reset_${i}`);
  if (!el) return;
  el.style.display = '';
  el.style.flex = '1';
  if (ph)  ph.style.display  = 'none';
  if (rst) rst.style.display = '';
  el.click(); // Picker direkt öffnen
}

function onColorChange(i) {
  colorIsDefault[i] = false;
  const el  = document.getElementById(`color_${i}`);
  const ci  = document.getElementById(`ci_${i}`);
  const ph  = document.getElementById(`ci_placeholder_${i}`);
  const rst = document.getElementById(`ci_reset_${i}`);
  ci.classList.remove('is-default');
  const lbl = ci.querySelector('label');
  const name = CURRENT.cfg.layerNames?.[i] || `Layer ${i+1}`;
  lbl.textContent = name;
  // Platzhalter ausblenden, echten Picker + Reset zeigen
  if (ph)  ph.style.display  = 'none';
  el.style.display = '';
  el.style.flex    = '1';
  if (rst) rst.style.display = '';
  generate();
}

function resetColor(i) {
  const def     = CURRENT.cfg.defaultColors?.[i] || 'Default';
  const isDefault = !def || def === 'Default';
  const hasKnown  = /^#[0-9a-fA-F]{6}$/.test(def);
  colorIsDefault[i] = isDefault;
  const el = document.getElementById(`color_${i}`);
  const ci = document.getElementById(`ci_${i}`);
  if (hasKnown) {
    el.value = def;
    el.classList.remove('is-default-input');
  } else {
    // Platzhalter wiederherstellen
    el.value = '#808080';
    el.style.display = 'none';
    const ph  = document.getElementById(`ci_placeholder_${i}`);
    const rst = document.getElementById(`ci_reset_${i}`);
    if (ph)  ph.style.display  = '';
    if (rst) rst.style.display = 'none';
  }
  ci.classList.toggle('is-default', isDefault);
  const name = CURRENT.cfg.layerNames?.[i] || `Layer ${i+1}`;
  ci.querySelector('label').innerHTML = name
    + (isDefault ? ' <span style="color:var(--text3);font-size:.6rem">' + (hasKnown ? '' : '(BC-Standard)') + '</span>' : '');
  generate();
}

function resetAllColors() {
  const n = CURRENT.cfg.colorCount || 1;
  for (let i = 0; i < n; i++) resetColor(i);
}

function getColors() {
  const n = CURRENT.cfg.colorCount || 1;
  return Array.from({length:n}, (_,i) => {
    if (colorIsDefault[i]) return 'Default';
    const el = document.getElementById(`color_${i}`);
    return el ? el.value : 'Default';
  });
}

// ── TIGHTNESS ──────────────────────────────────────
function buildTightness() {
  const { cfg } = CURRENT;
  // Anzeigen für alle Items (auch Direct-Options wie HarnessBallGag haben Tightness/Difficulty)
  document.getElementById('tightnessSection').classList.remove('hidden');
  const baseDiff = cfg.difficulty ?? 0;
  document.getElementById('tightnessBase').textContent = baseDiff;
  const minVal = baseDiff > 0 ? Math.max(-10, baseDiff - 20) : -10;
  const maxVal = Math.max(50, baseDiff + 30);
  const slider = document.getElementById('tightnessSlider');
  slider.min = minVal;
  slider.max = maxVal;
  slider.value = baseDiff;
  document.getElementById('tightnessMax').textContent = maxVal;
  const minEl = document.getElementById('tightnessMin'); if(minEl) minEl.textContent = minVal;
  document.getElementById('tightnessVal').textContent = baseDiff;
  document.getElementById('tightnessBody').classList.add('hidden');
  document.getElementById('tightnessEnabled').checked = false;
  tightnessOn  = false;
  tightnessVal = baseDiff;
}

function onTightnessToggle() {
  tightnessOn = document.getElementById('tightnessEnabled').checked;
  document.getElementById('tightnessBody').classList.toggle('hidden', !tightnessOn);
  generate();
}

function onTightnessChange() {
  tightnessVal = parseInt(document.getElementById('tightnessSlider').value) || 0;
  document.getElementById('tightnessVal').textContent = tightnessVal;
  generate();
}

// ── DIRECT OPTIONS (BallGag, FuturisticMittens...) ────
function buildDirectOptions() {
  const { cfg } = CURRENT;
  const sec = document.getElementById('directOptsSection');
  const opts = cfg.directOptions;
  sec.classList.toggle('hidden', !opts?.length);
  if (!opts?.length) return;
  classicOptionSel = 0;
  const container = document.getElementById('directOptsBtns');
  container.innerHTML = '';
  opts.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = 'dir-opt-btn' + (i === 0 ? ' on' : '');
    btn.textContent = name;
    btn.onclick = () => {
      classicOptionSel = i;
      container.querySelectorAll('.dir-opt-btn').forEach((b,j) => b.classList.toggle('on', j === i));
      generate();
    };
    container.appendChild(btn);
  });
  generate();
}

// ── VIBRATING (VibratingEgg, FuturisticTrainingBelt...) ─
function buildVibrating() {
  const { cfg } = CURRENT;
  const sec  = document.getElementById('vibratingSection');
  sec.classList.toggle('hidden', cfg.archetype !== 'vibrating');
  if (cfg.archetype !== 'vibrating') return;

  // BC kombiniert Mode+Intensität in einem einzigen TypeRecord-Wert 0–10
  // Wir zeigen genau dasselbe Grid wie BC intern
  const VIB_OPTIONS = [
    { tr:0,  label:'Off',      mode:'Off',      intensity:-1, group:'intensity' },
    { tr:1,  label:'Low',      mode:'Constant', intensity:0,  group:'intensity' },
    { tr:2,  label:'Medium',   mode:'Constant', intensity:1,  group:'intensity' },
    { tr:3,  label:'High',     mode:'Constant', intensity:2,  group:'intensity' },
    { tr:4,  label:'Maximum',  mode:'Constant', intensity:3,  group:'intensity' },
    { tr:5,  label:'Random',   mode:'Random',   intensity:3,  group:'mode' },
    { tr:6,  label:'Escalate', mode:'Escalate', intensity:3,  group:'mode' },
    { tr:7,  label:'Tease',    mode:'Tease',    intensity:3,  group:'mode' },
    { tr:8,  label:'Deny',     mode:'Deny',     intensity:3,  group:'mode' },
    { tr:9,  label:'Edge',     mode:'Edge',     intensity:3,  group:'mode' },
  ];
  window.__VIB_OPTIONS__ = VIB_OPTIONS;

  // Startzustand: Off
  vibratingMode      = 'Off';
  vibratingIntensity = -1;
  vibratingTR        = 0;

  // Effekte zurücksetzen
  vibratingEffects = new Set(['Egged']);

  // Bestehende Sektionen leeren und neu aufbauen
  const modeGrid = document.getElementById('vibModeGrid');
  const intRow   = document.getElementById('vibIntRow');
  const effRow   = document.getElementById('vibEffRow');
  modeGrid.innerHTML = '';
  intRow.innerHTML   = '';

  // Zeige ALLE Optionen in einem gemeinsamen Grid (wie BC intern)
  const allGrid = modeGrid; // modeGrid als Hauptcontainer
  intRow.style.display = 'none'; // Intensitäts-Reihe ausblenden - nicht mehr separat

  VIB_OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'vib-mode-btn' + (opt.tr === 0 ? ' on' : '');
    btn.textContent = opt.label;
    // Gruppe-Indikator für Modi
    if (opt.group === 'mode') btn.style.borderColor = '#312e81';
    btn.onclick = () => {
      vibratingMode      = opt.mode;
      vibratingIntensity = opt.intensity;
      vibratingTR        = opt.tr;
      allGrid.querySelectorAll('.vib-mode-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      generate();
    };
    allGrid.appendChild(btn);
  });

  // Effekt-Buttons
  effRow.innerHTML = '';
  ['Egged','Vibrating','UseRemote','Edged'].forEach(eff => {
    const btn = document.createElement('button');
    btn.className = 'vib-eff-btn' + (['Egged'].includes(eff) ? ' on' : '');
    btn.textContent = eff;
    btn.onclick = () => {
      if (vibratingEffects.has(eff)) vibratingEffects.delete(eff);
      else vibratingEffects.add(eff);
      btn.classList.toggle('on', vibratingEffects.has(eff));
      generate();
    };
    effRow.appendChild(btn);
  });

  generate();
}

// ── BASELINE / PUNISHMENT PROPS ────────────────────────
function buildBaselinePropsUI() {
  const { cfg } = CURRENT;
  const sec      = document.getElementById('baselineSection');
  const baseline = cfg.vibratingInfo?.baselineProps;
  sec.classList.toggle('hidden', !baseline || Object.keys(baseline).length === 0);
  if (!baseline) return;
  baselinePropVals = { ...baseline };  // mit Defaults initialisieren
  const grid = document.getElementById('baselineGrid');
  grid.innerHTML = '';

  const BOOL_PROPS   = ['ShowText','PunishStruggle','PunishStruggleOther','PunishOrgasm','PunishStandup'];
  const NUM_PROPS    = ['PunishSpeech','PunishRequiredSpeech','PunishProhibitedSpeech'];
  const STR_PROPS    = ['PunishRequiredSpeechWord','PunishProhibitedSpeechWords'];
  const PERM_PROPS   = ['PublicModePermission','PublicModeCurrent'];
  const ACCESS_PROPS = ['AccessMode'];
  const TRIGGER_PROPS= ['TriggerValues'];

  function addCard(prop, ctrl) {
    const card = document.createElement('div');
    card.className = 'bl-card';
    card.innerHTML = '<div class="bl-card-label">' + prop.replace(/([A-Z])/g,' $1').trim() + '</div>';
    const wrapper = document.createElement('div');
    wrapper.appendChild(ctrl);
    card.appendChild(wrapper);
    grid.appendChild(card);
  }

  for (const prop of Object.keys(baseline)) {
    const val = baseline[prop];
    if (BOOL_PROPS.includes(prop)) {
      const sel = document.createElement('select');
      sel.innerHTML = '<option value="false">false</option><option value="true">true</option>';
      sel.value = String(val);
      sel.onchange = () => { baselinePropVals[prop] = sel.value === 'true'; generate(); };
      addCard(prop, sel);
    } else if (NUM_PROPS.includes(prop)) {
      // 0=None 1=Shock 2=Orgasm
      const sel = document.createElement('select');
      sel.innerHTML = '<option value="0">0 – None</option><option value="1">1 – Shock</option><option value="2">2 – Orgasm</option>';
      sel.value = String(val);
      sel.onchange = () => { baselinePropVals[prop] = parseInt(sel.value); generate(); };
      addCard(prop, sel);
    } else if (STR_PROPS.includes(prop)) {
      const inp = document.createElement('input');
      inp.type = 'text'; inp.value = val ?? '';
      inp.oninput = () => { baselinePropVals[prop] = inp.value; generate(); };
      addCard(prop, inp);
    } else if (PERM_PROPS.includes(prop)) {
      const PERM_LABELS = prop === 'PublicModePermission'
        ? ['0-Private','1-Public','2-Friends','3-Owner','4-Mistress','5-Lover']
        : ['0-None','1-Arousal','2-Vibrate','3-Orgasm','4-Edges','5-Deny','6-Punish'];
      const sel = document.createElement('select');
      sel.innerHTML = PERM_LABELS.map((l,i) => '<option value="'+i+'">'+l+'</option>').join('');
      sel.value = String(val ?? 0);
      sel.onchange = () => { baselinePropVals[prop] = parseInt(sel.value); generate(); };
      addCard(prop, sel);
    } else if (ACCESS_PROPS.includes(prop)) {
      // AccessMode: "" = Immer | "Locked" = Nur wenn gesperrt
      const sel = document.createElement('select');
      sel.innerHTML = '<option value="">Immer (Standard)</option><option value="Locked">Nur wenn gesperrt</option>';
      sel.value = String(val ?? '');
      sel.onchange = () => { baselinePropVals[prop] = sel.value; generate(); };
      addCard(prop, sel);
    } else if (TRIGGER_PROPS.includes(prop)) {
      // TriggerValues: kommagetrennte Checkbox-Liste
      const info = CURRENT.cfg.vibratingInfo;
      const allTriggers = info?.availTriggers ?? (val ? String(val).split(',') : ['Increase','Decrease','Disable','Edge','Random','Deny','Tease','Shock']);
      const active = new Set(val ? String(val).split(',') : allTriggers);
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;';
      allTriggers.forEach(t => {
        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:flex;align-items:center;gap:3px;font-size:.7rem;color:var(--text2);cursor:pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.style.accentColor = 'var(--purple)';
        cb.checked = active.has(t);
        cb.onchange = () => {
          if (cb.checked) active.add(t); else active.delete(t);
          baselinePropVals[prop] = [...active].join(',');
          generate();
        };
        lbl.appendChild(cb);
        lbl.append(t);
        wrap.appendChild(lbl);
      });
      baselinePropVals[prop] = [...active].join(',');
      addCard(prop, wrap);
    } else {
      // fallback: text input
      const inp = document.createElement('input');
      inp.type = typeof val === 'number' ? 'number' : 'text';
      inp.value = val ?? '';
      inp.oninput = () => { baselinePropVals[prop] = typeof val === 'number' ? parseFloat(inp.value) : inp.value; generate(); };
      addCard(prop, inp);
    }
  }
}

// ── GLOBALE PROPS ──────────────────────────────────
const KW_GROUPS = {
  shock:   ['shock','punish','stun','zap','electr'],
  voice:   ['voice','trigger','speech','word'],
  inflate: ['inflate','pump','air','pressure'],
  orgasm:  ['orgasm','edge','ruin','denial'],
  vibe:    ['vibrat','buzz','tease','stimul'],
};

function getPropsForOpt(cfg, dimKey, optIdx) {
  const opt = (cfg.typeKeys[dimKey] || [])[optIdx];
  if (!opt || !cfg.props?.length) return [];
  const nameLow = (opt.name || '').toLowerCase();
  const matched = new Set();
  for (const [, kws] of Object.entries(KW_GROUPS)) {
    if (kws.some(k => nameLow.includes(k))) {
      for (const p of cfg.props) if (kws.some(k => p.toLowerCase().includes(k))) matched.add(p);
    }
  }
  const parts = nameLow.split(/\s+/).filter(w => w.length > 3);
  for (const p of cfg.props) if (parts.some(part => p.toLowerCase().includes(part))) matched.add(p);
  for (const eff of [...(opt.effect||[]),...(opt.block||[])]) {
    for (const p of cfg.props) if (p.toLowerCase().includes(eff.toLowerCase())) matched.add(p);
  }
  return [...matched];
}

function getGlobalProps(cfg) {
  if (!cfg.props?.length) return [];
  const used = new Set();
  for (const key in (cfg.typeKeys||{})) {
    const opts = cfg.typeKeys[key]||[];
    for (let i=0; i<opts.length; i++) for (const p of getPropsForOpt(cfg, key, i)) used.add(p);
  }
  return cfg.props.filter(p => !used.has(p));
}

function buildGlobalPropsUI() {
  const { cfg } = CURRENT;
  const grid    = document.getElementById('propsGrid');
  grid.innerHTML = '';
  const gp = getGlobalProps(cfg);
  document.getElementById('propsSection').classList.toggle('hidden', gp.length === 0);
  if (!gp.length) return;
  document.getElementById('propsHint').textContent = `${gp.length} erkannt`;

  gp.forEach(prop => {
    globalPropVals[prop] = null;
    const isBool = /^(Show|Punish|Enable|Allow|Has|Is|Can|Auto|Block)/.test(prop);
    const isNum  = /Level|Count|Timer|Num|Max|Min|Amount|Delay|Duration|Speed/.test(prop);
    const id     = `gp_${prop}`;
    const card   = document.createElement('div');
    card.className = 'prop-card';
    let ctrl = '';
    if (isBool) {
      ctrl = `<select onchange="globalPropVals['${prop}']=this.value==='null'?null:this.value==='true';generate()">
        <option value="null">– nicht setzen –</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>`;
    } else if (isNum) {
      ctrl = `<input type="checkbox" id="${id}_en" style="accent-color:var(--purple);width:13px;height:13px;flex:none"
          onchange="globalPropVals['${prop}']=this.checked?(parseInt(document.getElementById('${id}').value)||0):null;generate()">
        <input type="number" id="${id}" value="0"
          oninput="if(document.getElementById('${id}_en').checked){globalPropVals['${prop}']=parseInt(this.value)||0;generate();}">`;
    } else {
      ctrl = `<input type="checkbox" id="${id}_en" style="accent-color:var(--purple);width:13px;height:13px;flex:none"
          onchange="globalPropVals['${prop}']=this.checked?(document.getElementById('${id}').value||''):null;generate()">
        <input type="text" id="${id}" value="" placeholder="Wert"
          oninput="if(document.getElementById('${id}_en').checked){globalPropVals['${prop}']=this.value;generate();}">`;
    }
    card.innerHTML = `<div class="prop-name">${prop}</div><div class="prop-ctrl">${ctrl}</div>`;
    grid.appendChild(card);
  });
}

// ══════════════════════════════════════════════════════
//  LOCK
// ══════════════════════════════════════════════════════
const REL_LOCKS = ['OwnerPadlock','LoversPadlock','MistressPadlock'];
const BCX_LOCKS = ['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
const PW_LOCKS  = ['PasswordPadlock','TimerPasswordPadlock'];

function onLockChange() {
  const lock  = document.getElementById('lockType').value;
  const isRel = REL_LOCKS.includes(lock);
  const isBcx = BCX_LOCKS.includes(lock);
  document.getElementById('timerGroup').classList.toggle('hidden',    !lock.includes('Timer') || isRel);
  document.getElementById('comboGroup').classList.toggle('hidden',    lock !== 'CombinationPadlock');
  document.getElementById('passwordGroup').classList.toggle('hidden', !PW_LOCKS.includes(lock));
  document.getElementById('relLockGroup').classList.toggle('hidden',  !isRel);
  document.getElementById('bcxLockHint').classList.toggle('hidden',   !isBcx);
  generate();
}

function onTargetChange() {
  document.getElementById('targetMemberWrap').classList.toggle('hidden',
    document.getElementById('targetMode').value !== 'other');
  generate();
}

function validatePwInput(el) {
  const valid = /^[0-9]{4}$/.test(el.value);
  document.getElementById('pwHint').style.display = (!el.value || valid) ? 'none' : 'block';
  el.style.borderColor = valid || !el.value ? '' : 'var(--red)';
}

// ══════════════════════════════════════════════════════
//  CODE GENERIEREN
// ══════════════════════════════════════════════════════
function generate() {
  if (!CURRENT) return;
  const { group, asset, cfg } = CURRENT;
  const isOther   = document.getElementById('targetMode').value === 'other';
  const memberNum = parseInt(document.getElementById('targetMember')?.value) || 0;

  // TypeRecord (modular + classic TR)
  const tr = {};
  for (const key in (cfg.typeKeys||{})) {
    const sel = [...dimSelected[key]].sort((a,b)=>a-b);
    tr[key] = dimMode[key]==='multi' ? sel.reduce((acc,i)=>acc+Math.pow(2,i),0) : (sel[0]??0);
  }
  const hasTypeRecord = Object.keys(tr).length > 0;
  const trStr   = JSON.stringify(tr);
  const typeStr = Object.entries(tr).map(([k,v])=>k+v).join('');
  const colors  = getColors();

  // Sub-props + Global-props
  let propCode = '';
  for (const key in (cfg.typeKeys||{})) {
    for (const idx of dimSelected[key]) {
      const sp = dimSubProps[key]?.[idx]||{};
      for (const [prop,val] of Object.entries(sp)) {
        if (val!=null) propCode += '\n    item.Property.' + prop + ' = ' + encVal(val) + ';';
      }
    }
  }
  for (const [prop,val] of Object.entries(globalPropVals)) {
    if (val!=null) propCode += '\n    item.Property.' + prop + ' = ' + encVal(val) + ';';
  }

  // Tightness → item.Difficulty
  const tightCode = tightnessOn ? '\n    item.Difficulty = ' + tightnessVal + ';' : '';

  // Craft
  const craftName = document.getElementById('craftName').value.trim();
  const craftDesc = document.getElementById('craftDesc').value.trim();
  const craftProp = document.getElementById('craftProp').value;
  const firstColor = colors.find(c => c !== 'Default') ?? '#808080';
  const craftStr  = craftName
    ? ',\n  {\n    Name: ' + JSON.stringify(craftName) + ',\n    Description: ' + JSON.stringify(craftDesc) + ',\n    Property: "' + craftProp + '",\n    Color: ' + JSON.stringify(firstColor) + ',\n    Lock: "", Item: ' + JSON.stringify(asset) + ', Private: false, MemberNumber: Player.MemberNumber,\n  }'
    : '';

  // Lock
  const lock   = document.getElementById('lockType').value;
  const isRel  = REL_LOCKS.includes(lock);
  let lockParams = { timer:0, combo:'', password:'', relMember:0, relTimer:0 };
  if (lock) {
    if (lock.includes('Timer')&&!isRel) {
      const h=parseInt(document.getElementById('timerH').value)||0;
      const m=parseInt(document.getElementById('timerM').value)||0;
      const s=parseInt(document.getElementById('timerS').value)||0;
      lockParams.timer=(h*3600+m*60+s)*1000;
    }
    if (lock==='CombinationPadlock') lockParams.combo    = document.getElementById('comboCode').value||'1234';
    if (PW_LOCKS.includes(lock))     lockParams.password = document.getElementById('lockPassword').value||'1234';
    if (isRel) {
      lockParams.relMember=parseInt(document.getElementById('relMemberNum').value)||0;
      lockParams.relTimer=(parseInt(document.getElementById('relTimerH').value)||0)*3600*1000;
    }
  }

  // ── Archetype-spezifischer Code ──────────────────────
  let archetypeCode = '';

  if (cfg.archetype === 'vibrating') {
    // Vibrating: Mode + Intensity + Effects + Baseline props
    // Auto-sync: Vibrating-Effekt nur wenn Mode nicht Off
    const _effClone = new Set(vibratingEffects);
    if (vibratingMode !== 'Off') _effClone.add('Vibrating'); else _effClone.delete('Vibrating');
    const effArr = JSON.stringify([..._effClone]);
    archetypeCode += '\n    // Vibrating-Konfiguration';
    archetypeCode += '\n    item.Property = { ...item.Property, Mode: ' + JSON.stringify(vibratingMode) + ', Intensity: ' + vibratingIntensity + ', Effect: ' + effArr + ' };';
    archetypeCode += '\n    if (!item.Property.TypeRecord) item.Property.TypeRecord = {};';
    archetypeCode += '\n    item.Property.TypeRecord.vibrating = ' + vibratingTR + ';';
    // Baseline/Punishment + AccessMode + TriggerValues
    for (const [prop,val] of Object.entries(baselinePropVals)) {
      if (val === null || val === undefined) continue;
      // Strings in Anführungszeichen, Booleans/Zahlen direkt
      archetypeCode += '\n    item.Property.' + prop + ' = ' + encVal(val) + ';';
    }

  } else if (cfg.directOptions?.length) {
    // Classic Direct Options (BallGag, FuturisticMittens): TypedItemSetOptionByName
    const optName = cfg.directOptions[classicOptionSel] ?? cfg.directOptions[0];
    archetypeCode += '\n    // Option setzen via TypedItemSetOptionByName';
    archetypeCode += '\n    TypedItemSetOptionByName(TARGET, item, ' + JSON.stringify(optName) + ');';
    archetypeCode += '\n    item.Color = ' + JSON.stringify(colors) + '; // Farbe erneut setzen (TypedItem überschreibt sie)';

  } else if (hasTypeRecord) {
    // Classic TypeRecord / Modular
    archetypeCode += '\n    item.Property.TypeRecord = ' + trStr + ';\n    item.Property.Type = "' + typeStr + '";';
    archetypeCode += propCode;
  } else {
    archetypeCode += propCode;
  }
  archetypeCode += tightCode;

  // ── Code-String zusammenbauen ────────────────────────
  const code = '// ═══════════════════════════════════════════\n'
    + '//  ' + asset + ' (' + group + ')' + (isOther&&memberNum ? ' → Spieler #'+memberNum : ' → Player') + '\n'
    + '// ═══════════════════════════════════════════\n'
    + buildItemCode({ group, asset, cfg, colors, tr, trStr, typeStr, propCode: archetypeCode, craftStr, lock, lockParams, tightCode:'', isOther, memberNum });

  document.getElementById('codeOut').value = code;

  // Preview
  const archLabel = cfg.archetype==='modular' ? '🧩 Modular' : cfg.archetype==='vibrating' ? '⚡ Vibrating' : (hasTypeRecord?'📋 TypeRecord': cfg.directOptions?.length?'🎛️ Classic-Opts':'');
  document.getElementById('typePreview').innerHTML =
    '<span style="color:var(--text3)">' + group + '</span> → <strong>' + asset + '</strong>' +
    (archLabel ? ' <span style="font-size:.62rem;color:var(--text3)">['+archLabel+']</span>' : '') +
    (cfg.archetype==='vibrating' ? '<br>⚡ Mode: '+vibratingMode+' | Intensity: '+vibratingIntensity : '') +
    (cfg.directOptions?.length ? '<br>🎛️ Option: '+cfg.directOptions[classicOptionSel] : '') +
    (hasTypeRecord && cfg.archetype!=='vibrating' ? '<br>TypeRecord: { '+Object.entries(tr).map(([k,v])=>k+':'+v).join(' ')+' }' : '') +
    (tightnessOn ? '<br>🔧 Difficulty: '+tightnessVal : '') +
    (lock ? '<br>🔒 '+lock : '') +
    '<br>' + (isOther&&memberNum ? '👥 Spieler #'+memberNum : '👤 Player (selbst)');
}


function encVal(val) {
  return typeof val === 'boolean' ? val : typeof val === 'number' ? val : JSON.stringify(val);
}

// ── Innerer Code-Block (ohne TARGET-Deklaration) ────
function buildItemInner({ group, asset, colors, tr, trStr, typeStr, propCode, craftStr, lock, lockParams, tightCode, delayOffset }) {
  const delay = delayOffset ?? 600;
  const BCX_LOCKS_L = ['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
  const REL_LOCKS_L = ['OwnerPadlock','LoversPadlock','MistressPadlock'];
  let lockCode = '';
  if (lock) {
    const isBcx = BCX_LOCKS_L.includes(lock);
    const isRel = REL_LOCKS_L.includes(lock);
    let extra = '';
    if (lockParams.timer > 0)  extra += '\n      item.Property.RemoveTimer = Date.now() + ' + lockParams.timer + ';';
    if (lockParams.combo)      extra += '\n      item.Property.CombinationNumber = ' + JSON.stringify(lockParams.combo) + ';';
    if (lockParams.password)   extra += '\n      item.Property.Password = ' + JSON.stringify(lockParams.password) + ';';
    if (isRel) {
      extra += '\n      item.Property.LockMemberNumber = ' + (lockParams.relMember || 'Player.MemberNumber') + ';';
      if (lockParams.relTimer > 0) extra += '\n      item.Property.RemoveTimer = Date.now() + ' + lockParams.relTimer + ';';
    }
    if (isBcx) {
      lockCode = '\n    const lockAsset = Asset.find(a => a.Name === ' + JSON.stringify(lock) + ' && a.Group?.Name === "ItemMisc")'
        + '\n      ?? Asset.find(a => a.Name === ' + JSON.stringify(lock) + ');'
        + '\n    if (lockAsset) {\n      InventoryLock(TARGET, item, { Asset: lockAsset }, Player.MemberNumber, true);' + extra
        + '\n      CharacterLoadCanvas(TARGET);\n    } else { console.warn("⚠️ ' + lock + ' nicht gefunden – Addon geladen?"); }';
    } else {
      lockCode = '\n    const lockAsset = Asset.find(a => a.Name === ' + JSON.stringify(lock) + ' && a.Group?.Name === "ItemMisc");'
        + '\n    if (lockAsset) {\n      InventoryLock(TARGET, item, { Asset: lockAsset }, Player.MemberNumber, true);' + extra
        + '\n      CharacterLoadCanvas(TARGET);\n    } else { console.error("❌ Schloss nicht gefunden: ' + lock + '"); }';
    }
  }
  return '  InventoryWear(TARGET, ' + JSON.stringify(asset) + ', ' + JSON.stringify(group) + ',\n'
    + '    ' + JSON.stringify(colors) + ', 0, null' + craftStr + '\n  );\n'
    + '  setTimeout(() => {\n'
    + '    const item = InventoryGet(TARGET, ' + JSON.stringify(group) + ');\n'
    + '    if (!item) return console.error("❌ Item nicht gefunden: ' + asset + '");\n'
    + '    item.Color = ' + JSON.stringify(colors) + ';\n'
    + '    item.Property = item.Property ?? {};\n'
    + propCode
    + lockCode + '\n'
    + '    CharacterRefresh(TARGET);\n'
    + '    console.log("✅ ' + asset + ' fertig");\n'
    + '  }, ' + delay + ');';
}

// ── Einzelnes Item (mit TARGET-Deklaration + Sync) ──
function buildItemCode({ group, asset, cfg, colors, tr, trStr, typeStr, propCode, craftStr, lock, lockParams, tightCode, isOther, memberNum }) {
  const inner = buildItemInner({ group, asset, colors, tr, trStr, typeStr, propCode, craftStr, lock, lockParams, tightCode });
  const syncLine = (isOther && memberNum)
    ? 'ChatRoomCharacterUpdate(TARGET);'
    : 'ServerPlayerAppearanceSync(); ChatRoomCharacterUpdate(TARGET);';
  const wrapped = inner + '\n  setTimeout(() => { ' + syncLine + ' }, 700);';
  if (isOther && memberNum) {
    return 'const TARGET = ChatRoomCharacter.find(c => c.MemberNumber === ' + memberNum + ');\n'
      + 'if (!TARGET) { console.error("❌ Spieler #' + memberNum + ' nicht im Raum!"); } else {\n' + wrapped + '\n}';
  }
  return 'const TARGET = Player;\n' + wrapped;
}

// ══════════════════════════════════════════════════════
//  COPY
// ══════════════════════════════════════════════════════
function copyCode() {
  const ta = document.getElementById('codeOut');
  const text = ta.value;
  const btn = document.getElementById('copyBtn');
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅ Kopiert!'; btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent='📋 Code kopieren'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    // Fallback für ältere Browser
    ta.select(); document.execCommand('copy');
    btn.textContent = '✅ Kopiert!'; btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent='📋 Code kopieren'; btn.classList.remove('copied'); }, 2000);
  });
}

// ══════════════════════════════════════════════════════
//  OUTFIT BUILDER
// ══════════════════════════════════════════════════════
function openOutfit()  { switchTab('outfit'); }
function closeOutfit() { switchTab('items'); }
function clearOutfit() { OUTFIT = []; renderOutfitList(); _autoOutfitCode(); }

function addToOutfit() {
  if (!CURRENT) return;
  const { group, asset, cfg } = CURRENT;

  const tr = {};
  for (const key in (cfg.typeKeys||{})) {
    const sel = [...dimSelected[key]].sort((a,b)=>a-b);
    tr[key] = dimMode[key]==='multi' ? sel.reduce((acc,i)=>acc+Math.pow(2,i),0) : (sel[0]??0);
  }
  const trStr   = JSON.stringify(tr);
  const typeStr = Object.entries(tr).map(([k,v])=>`${k}${v}`).join('');
  const colors  = getColors();

  let propCode = '';
  for (const key in (cfg.typeKeys||{})) {
    for (const idx of dimSelected[key]) {
      const sp = dimSubProps[key]?.[idx]||{};
      for (const [prop,val] of Object.entries(sp)) {
        if (val!=null) propCode += `\n    item.Property.${prop} = ${encVal(val)};`;
      }
    }
  }
  for (const [prop,val] of Object.entries(globalPropVals)) {
    if (val!=null) propCode += `\n    item.Property.${prop} = ${encVal(val)};`;
  }

  const lock = document.getElementById('lockType').value;
  const isRel = REL_LOCKS.includes(lock);
  let lockParams = { timer:0, combo:'', password:'', relMember:0, relTimer:0 };
  if (lock) {
    if (lock.includes('Timer')&&!isRel) {
      const h=parseInt(document.getElementById('timerH').value)||0;
      const m=parseInt(document.getElementById('timerM').value)||0;
      const s=parseInt(document.getElementById('timerS').value)||0;
      lockParams.timer=(h*3600+m*60+s)*1000;
    }
    if (lock==='CombinationPadlock') lockParams.combo=document.getElementById('comboCode').value||'1234';
    if (PW_LOCKS.includes(lock))     lockParams.password=document.getElementById('lockPassword').value||'1234';
    if (isRel) {
      lockParams.relMember=parseInt(document.getElementById('relMemberNum').value)||0;
      lockParams.relTimer=(parseInt(document.getElementById('relTimerH').value)||0)*3600*1000;
    }
  }

  const craftName = document.getElementById('craftName').value.trim();
  const craftDesc = document.getElementById('craftDesc').value.trim();
  const craftProp = document.getElementById('craftProp').value;
  const craftStr = craftName ? `,\n  {\n    Name: ${JSON.stringify(craftName)},\n    Description: ${JSON.stringify(craftDesc)},\n    Property: "${craftProp}",\n    Color: ${JSON.stringify(colors[0]==='Default'?'#808080':colors[0])},\n    Lock: "", Item: ${JSON.stringify(asset)}, Private: false, MemberNumber: Player.MemberNumber,\n  }` : '';

  const isOther   = document.getElementById('targetMode').value === 'other';
  const memberNum = parseInt(document.getElementById('targetMember')?.value)||0;


  // ── Konflikt-Check: Neues Item blockt existierende Outfit-Slots ──────────
  if (cfg) {
    const blockedByAsset = new Set(cfg.block || []);

    // Optionen-Block: aktiv für gerade gewählte Optionen
    const blockedByOptions = new Set();
    for (const key in (cfg.typeKeys || {})) {
      for (const idx of (dimSelected[key] || new Set())) {
        const opt = cfg.typeKeys[key][idx];
        for (const b of (opt?.block || [])) blockedByOptions.add(b);
      }
    }
    const allBlocked = new Set([...blockedByAsset, ...blockedByOptions]);

    // Vorhandene Items die durch das neue blockiert würden
    const conflicts = OUTFIT.filter(item => allBlocked.has(item.group));
    if (conflicts.length > 0) {
      const src = blockedByAsset.size ? 'Asset-Block' : 'Options-Block';
      const msg =
        `⚠️ Slot-Konflikt!\n\n` +
        `„${asset}" (${group}) hat Block-Gruppen [${src}]:\n` +
        `${[...allBlocked].map(b => '  • ' + b).join('\n')}\n\n` +
        `Folgende Items würden dadurch entfernt:\n` +
        `${conflicts.map(i => `  • ${i.group}  →  „${i.asset}"`).join('\n')}\n\n` +
        `→ OK = Trotzdem hinzufügen   → Abbrechen = Nichts ändern`;
      if (!confirm(msg)) return;
    }

    // Umgekehrter Check: existierende Items blocken das neue
    const blockedByExisting = [];
    for (const existing of OUTFIT) {
      const eb = new Set(existing.cfg?.block || []);
      for (const key in (existing.cfg?.typeKeys || {})) {
        const selVal = (existing.tr || {})[key];
        if (selVal != null) {
          const opts = existing.cfg.typeKeys[key] || [];
          for (let idx = 0; idx < opts.length; idx++) {
            const isSel = (selVal & Math.pow(2, idx)) > 0 || selVal === idx;
            if (isSel) for (const b of (opts[idx]?.block || [])) eb.add(b);
          }
        }
      }
      if (eb.has(group)) blockedByExisting.push(existing);
    }
    if (blockedByExisting.length > 0) {
      const msg =
        `⚠️ Umgekehrter Konflikt!\n\n` +
        `Folgende Outfit-Items blockieren „${asset}" (${group}):\n` +
        `${blockedByExisting.map(i => `  • „${i.asset}" (${i.group})`).join('\n')}\n\n` +
        `Das bedeutet: „${asset}" würde von BC wieder entfernt.\n\n` +
        `→ OK = Trotzdem hinzufügen   → Abbrechen = Nichts ändern`;
      if (!confirm(msg)) return;
    }
  }

  OUTFIT.push({
    group, asset, cfg, colors, tr, trStr, typeStr, propCode, craftStr,
    lock, lockParams,
    tightCode: tightnessOn ? `\n    item.Difficulty=${tightnessVal};` : '',
    isOther, memberNum,
    label: `${asset} (${group})`,
  });

  _autoOutfitCode();
}


function renderOutfitList() {
  const list = document.getElementById('outfitList');
  const q = (document.getElementById('outfitItemSearch')?.value || '').toLowerCase();
  const visItems = OUTFIT.map((item, i) => ({...item, _origIdx: i}))
                         .filter(item => !q || item.asset?.toLowerCase().includes(q) || item.group?.toLowerCase().includes(q));
  if (!visItems.length) {
    list.innerHTML = OUTFIT.length
      ? '<div class="outfit-empty-hint">🔍 Keine Treffer.</div>'
      : '<div class="outfit-empty-hint">Noch keine Items.<br>Konfiguriere ein Item im <strong>Item Manager</strong> und klicke <strong>„👗 Outfit"</strong>.</div>';
    return;
  }
  list.innerHTML = '';
  visItems.forEach(item => {
    const i = item._origIdx;
    const row = document.createElement('div');
    row.className = 'outfit-item-row';
    row.innerHTML = `
      <div style="flex:1">
        <div class="outfit-item-name">${item.asset}</div>
        <div class="outfit-item-group">${item.group}${item.lock ? ' | 🔒 '+item.lock : ''}${Object.keys(item.tr||{}).length ? ' | '+item.typeStr : ''}</div>
      </div>
      <div style="display:flex;gap:5px;align-items:center">
        <button class="btn btn-primary" style="padding:3px 8px;font-size:.68rem" onclick="moveOutfitItem(${i},-1)">↑</button>
        <button class="btn btn-primary" style="padding:3px 8px;font-size:.68rem" onclick="moveOutfitItem(${i},1)">↓</button>
        <button class="btn btn-red" style="padding:3px 7px;font-size:.68rem" onclick="removeOutfitItem(${i})">✕</button>
      </div>`;
    list.appendChild(row);
  });
}

function removeOutfitItem(i) { OUTFIT.splice(i,1); renderOutfitList(); _autoOutfitCode(); }
function moveOutfitItem(i, d) {
  const j = i + d;
  if (j < 0 || j >= OUTFIT.length) return;
  [OUTFIT[i], OUTFIT[j]] = [OUTFIT[j], OUTFIT[i]];
  renderOutfitList();
  _autoOutfitCode();
}

function generateOutfitCode() {
  if (!OUTFIT.length) return;
  // Outfit-Ziel hat Vorrang; Fallback auf altes OUTFIT[0]-Ziel für Rückwärtskompatibilität
  const isOther   = _outfitTargetNum !== null;
  const memberNum = _outfitTargetNum ?? 0;

  let count = OUTFIT.length;
  let code = '// ═══════════════════════════════════════════\n//  OUTFIT – ' + count + ' Items';
  if (isOther) code += ' → Spieler #' + memberNum;
  code += '\n// ═══════════════════════════════════════════\n';

  if (isOther && memberNum) {
    code += 'const TARGET = ChatRoomCharacter.find(c => c.MemberNumber === ' + memberNum + ');\n'
          + 'if (!TARGET) { console.error("❌ Spieler #' + memberNum + ' nicht im Raum!"); } else {\n\n';
  } else {
    code += 'const TARGET = Player;\n\n';
  }

  OUTFIT.forEach((item, i) => {
    code += '// ── ' + (i+1) + '. ' + item.asset + ' (' + item.group + ') ──\n';
    code += buildItemInner({ ...item, isOther, memberNum, delayOffset: 600 + i * 700 });
    code += '\n\n';
  });

  const syncLine = (isOther && memberNum)
    ? 'ChatRoomCharacterUpdate(TARGET);'
    : 'ServerPlayerAppearanceSync(); ChatRoomCharacterUpdate(TARGET);';
  const finalDelay = 600 + OUTFIT.length * 700 + 200;
  code += 'setTimeout(function() { ' + syncLine + ' console.log("✅ Outfit fertig!"); }, ' + finalDelay + ');\n';

  if (isOther && memberNum) code += '}\n';

  document.getElementById('outfitCode').value = code;
}

function copyOutfitCode() {
  const ta = document.getElementById('outfitCode');
  navigator.clipboard.writeText(ta.value).then(() => {
    showStatus('✅ Outfit-Code kopiert!', 'success');
  }).catch(() => {
    ta.select(); document.execCommand('copy');
    showStatus('✅ Outfit-Code kopiert!', 'success');
  });
}

// ══════════════════════════════════════════════════════
//  OUTFIT-PROFILE
// ══════════════════════════════════════════════════════
function openProfiles()  { switchTab('outfit'); renderProfileList(); }
function closeProfiles() { switchTab('outfit'); }

function saveProfile() {
  if (!OUTFIT.length) { showStatus('❌ Erst Outfit-Items hinzufügen!', 'error'); return; }
  const name = document.getElementById('profileNameInput').value.trim();
  if (!name) { showStatus('❌ Profilname eingeben!', 'error'); return; }

  // Nur die nötigen Felder speichern – cfg/propCode/craftStr sind zu groß (localStorage-Limit)
  const SAVE_KEYS = ['group','asset','colors','tr','trStr','typeStr','tightCode','lock','lockParams','isOther','memberNum','label'];
  const stripped = OUTFIT.map(item => {
    const out = {};
    SAVE_KEYS.forEach(k => { if (item[k] !== undefined) out[k] = item[k]; });
    return out;
  });

  PROFILES[name] = { name, date: new Date().toLocaleDateString('de-DE'), items: stripped };

  try {
    const json = JSON.stringify(PROFILES);
    localStorage.setItem('BC_PROFILES_v11', json);
    renderProfileList();
    document.getElementById('profileNameInput').value = '';
    showStatus('✅ Profil "' + name + '" gespeichert (' + stripped.length + ' Items)', 'success');
  } catch(e) {
    showStatus('❌ Speichern fehlgeschlagen: ' + e.message, 'error');
  }
}

function loadProfile(name) {
  const profile = PROFILES[name];
  if (!profile) return;

  if (!Object.keys(CACHE).length) {
    showStatus('❌ Cache nicht geladen! Erst Dump-Script ausführen und Cache importieren.', 'error');
    return;
  }

  const restored = [];
  for (const item of profile.items) {
    // cfg aus CACHE rekonstruieren
    const cfg = CACHE[item.group]?.[item.asset];
    if (!cfg) {
      console.warn('⚠️ Item nicht im Cache: ' + item.group + '/' + item.asset);
    }
    // propCode + craftStr neu generieren (leer – werden beim Benutzen via generate() neu gesetzt)
    restored.push({ ...item, cfg: cfg ?? {}, propCode: '', craftStr: '' });
  }

  OUTFIT = restored;
  switchTab('outfit');
  renderOutfitList();
  _autoOutfitCode();
}

function deleteProfile(name) {
  if (!confirm('Profil "' + name + '" löschen?')) return;
  delete PROFILES[name];
  try { localStorage.setItem('BC_PROFILES_v11', JSON.stringify(PROFILES)); } catch {}
  renderProfileList();
}

function renderProfileList() {
  const el = document.getElementById('profileListEl');
  const q = (document.getElementById('profileSearch')?.value || '').toLowerCase();
  const keys = Object.keys(PROFILES).filter(k => !q || k.toLowerCase().includes(q));
  if (!keys.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.8rem">Noch keine Profile gespeichert.</p>';
    return;
  }
  el.innerHTML = '<div class="profile-list">' + keys.map((k, idx) => {
    const p = PROFILES[k];
    // Use data-idx on buttons to avoid quote-in-onclick issues
    return '<div class="profile-card">'
      + '<div class="profile-card-name">📁 ' + p.name + '</div>'
      + '<div class="profile-card-info">' + (p.items?.length ?? 0) + ' Items · ' + (p.date || '') + '</div>'
      + '<div class="btn-row" style="margin-top:6px">'
      + '<button class="btn btn-green" style="flex:1;font-size:.68rem" data-pkey="' + idx + '" onclick="loadProfileByIdx(this.dataset.pkey)">📥 Laden</button>'
      + '<button class="btn btn-red" style="font-size:.68rem" data-pkey="' + idx + '" onclick="deleteProfileByIdx(this.dataset.pkey)">🗑️</button>'
      + '</div></div>';
  }).join('') + '</div>';
  // Store key mapping for index-based access
  el._profileKeys = keys;
}

function loadProfileByIdx(idx) {
  const el = document.getElementById('profileListEl');
  const keys = el._profileKeys;
  if (!keys || !keys[idx]) return;
  loadProfile(keys[idx]);
}

function deleteProfileByIdx(idx) {
  const el = document.getElementById('profileListEl');
  const keys = el._profileKeys;
  if (!keys || !keys[idx]) return;
  deleteProfile(keys[idx]);
}

// Init profile button visibility
(function() {
  // FIX: was 'BC_CACHE_v11' (wrong version) and also duplicated the same key in fallback
  const s = localStorage.getItem('BC_CACHE_v12');
  if (s) {
    try {
      const data = JSON.parse(s);
      const items = Object.values(data).reduce((n,g)=>n+Object.keys(g).length,0);
      if (items > 0) {
        document.getElementById('profileBtn')?.classList.remove('hidden');
      }
    } catch {}
  }
})();


// ══════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════
let _activeTab = 'items';
function switchTab(tab) {
  _activeTab = tab;
  ['items','outfit','curse','bot','log','money','events','rank','shop'].forEach(t => {
    document.getElementById('tab-'+t)?.classList.toggle('active', t===tab);
    document.getElementById('tab-'+t+'-btn')?.classList.toggle('active', t===tab);
  });
  if (tab === 'outfit') { renderOutfitList(); renderOutfitMemberChips(); renderProfileList(); _autoOutfitCode(); }
  if (tab === 'curse')  { renderCurseTab(); }
  if (tab === 'bot')    { renderBotTab(); }
  if (tab === 'log')    { renderLogTab(); }
  if (tab === 'money')  { renderMoneyTab(); }
  if (tab === 'rank')   { renderRankTab(); }
  if (tab === 'shop')   { renderShopTab(); }

}

// ── addToOutfit: auto-switch tab + auto-generate code after adding ──

// ══════════════════════════════════════════════════════
//  OUTFIT AUTO-CODE
// ══════════════════════════════════════════════════════
function _autoOutfitCode() {
  if (!OUTFIT.length) {
    document.getElementById('outfitCode').value = '';
    document.getElementById('outfitAutoStatus').textContent = '– kein Outfit –';
    return;
  }
  generateOutfitCode();
  document.getElementById('outfitAutoStatus').textContent =
    OUTFIT.length + ' Items · ' + (_outfitTargetNum ? 'Spieler #'+_outfitTargetNum : 'Player');
}

// ══════════════════════════════════════════════════════
//  CURSE STATE
// ══════════════════════════════════════════════════════

// ── Intervall-Event Laufzeit-Status (Countdown im UI) ────────────────────
let _evIntervalStatus = {};
function _evIntervalStatusUpdate(evId, nextMs, lo, hi, cnt) {
  _evIntervalStatus[evId] = { nextFireAt: Date.now() + nextMs, lo, hi, cnt };
  if (_activeTab === 'bot') _renderIntervalCountdowns();
}
function _renderIntervalCountdowns() {
  Object.entries(_evIntervalStatus).forEach(([evId, s]) => {
    const el = document.getElementById('trig-countdown-' + evId);
    if (!el) return;
    const rem = Math.max(0, Math.ceil((s.nextFireAt - Date.now()) / 1000));
    el.textContent = '⏱ ' + rem + 's | 🔥 ' + s.cnt + '×';
  });
}
setInterval(() => {
  if (_activeTab === 'bot' && Object.keys(_evIntervalStatus).length) _renderIntervalCountdowns();
}, 1000);

// ── Auto-Curse-Scan ───────────────────────────────────────────
let _autoCurseScanTimer = null;
function toggleAutoCurseScan() {
  const btn = document.getElementById('csAutoScanBtn');
  if (_autoCurseScanTimer) {
    clearInterval(_autoCurseScanTimer);
    _autoCurseScanTimer = null;
    if (btn) { btn.textContent = '⏰ Auto-Scan'; btn.classList.remove('on'); }
    showStatus('⏰ Auto-Scan deaktiviert', 'info');
  } else {
    _autoCurseScanTimer = setInterval(() => {
      if (_connected) {
        const prevDb = JSON.stringify(CURSE_DB);
        bcSend({ type: 'SCAN_CURSES', _auto: true });
        bcSend({ type: 'GET_CACHE' });
      }
    }, 30000);
    if (btn) { btn.textContent = '⏰ Auto (30s)'; btn.classList.add('on'); }
    showStatus('⏰ Auto-Scan aktiv – alle 30s', 'success');
  }
}

// ── Change-Detection für Curse-Scan ──────────────────────────
function _showChangeBadge(added, updated) {
  const el = document.getElementById('csChangeBadge');
  if (!el) return;
  if (!added.length && !updated.length) { el.style.display = 'none'; return; }
  const parts = [];
  if (added.length)   parts.push(`<span class="change-added">+${added.length} neu</span>`);
  if (updated.length) parts.push(`<span class="change-updated">~${updated.length} geändert</span>`);
  el.innerHTML = '🔔 Änderungen: ' + parts.join(' · ');
  el.style.display = '';
  setTimeout(() => { el.style.display = 'none'; }, 15000);
}

let CURSE_DB    = {};   // key → entry (from CurseScanner.database)
let CURSE_LSCG  = {};   // key → entry (from CurseScanner.lscgTable)
let CURSE_CACHE_LSCG = {}; // from lscgCache

// Comments: persisted in localStorage
let CURSE_COMMENTS = {};
try { CURSE_COMMENTS = JSON.parse(localStorage.getItem('BC_CURSE_COMMENTS_v1') || '{}'); } catch {}

function _saveCurseComments() {
  try { localStorage.setItem('BC_CURSE_COMMENTS_v1', JSON.stringify(CURSE_COMMENTS)); } catch {}
}
// ── Favoriten ────────────────────────────────────────────────
let CURSE_FAVOURITES = new Set();
try { CURSE_FAVOURITES = new Set(JSON.parse(localStorage.getItem('BC_CURSE_FAV_v1') || '[]')); } catch {}
function _saveCurseFavourites() {
  try { localStorage.setItem('BC_CURSE_FAV_v1', JSON.stringify([...CURSE_FAVOURITES])); } catch {}
}
function toggleCurseFavourite(dbKey, cellEl) {
  const wasFav = CURSE_FAVOURITES.has(dbKey);
  if (wasFav) CURSE_FAVOURITES.delete(dbKey); else CURSE_FAVOURITES.add(dbKey);
  _saveCurseFavourites();
  if (cellEl) {
    const isFav = !wasFav;
    cellEl.innerHTML = isFav ? '⭐' : '<span style="opacity:.25;font-size:.85em">☆</span>';
    const row = cellEl.closest('tr');
    if (row) row.classList.toggle('fav', isFav);
    // Fav-Zähler im Owner-Block aktualisieren
    const block = cellEl.closest('.curse-owner-block');
    if (block) {
      const badge = block.querySelector('.curse-owner-fav-badge');
      const cnt = block.querySelectorAll('.curse-row.fav').length;
      if (badge) {
        badge.textContent = '⭐ ' + cnt;
        badge.style.display = cnt > 0 ? '' : 'none';
      }
    }
  } else {
    renderCurseTab();
  }
}



// ── Scan ─────────────────────────────────────────────
function curseScan() {
  const statusEl = document.getElementById('csScanStatus');
  statusEl.textContent = '⏳ Scanne...';
  // Gleichzeitig Cache-Scan auslösen
  bcSend({ type: 'SCAN_CURSES' });
  bcSend({ type: 'GET_CACHE' });
}

// ── Handle SCAN_RESULT ────────────────────────────────
// called from postMessage handler
function _handleCurseData(data) {
  if (data.err) { showStatus('❌ Curse-Scan: ' + data.err, 'error'); return; }
  const prevDB = {...CURSE_DB};
  CURSE_DB         = data.database    ?? {};
  CURSE_LSCG       = data.lscgTable   ?? {};
  CURSE_CACHE_LSCG = data.lscgCache   ?? {};
  _updateCurseStats();
  _populateSlotFilter();
  if (_activeTab === 'curse') renderCurseTab();
  const total = Object.keys(CURSE_DB).length;
  const isAuto = data._auto === true;
  // Change-Detection
  const added   = Object.keys(CURSE_DB).filter(k => !prevDB[k]);
  const updated = Object.keys(CURSE_DB).filter(k => prevDB[k] && JSON.stringify(prevDB[k]) !== JSON.stringify(CURSE_DB[k]));
  let statusText = '✅ ' + total + ' Crafts';
  if (added.length || updated.length) {
    statusText += ' | +' + added.length + ' neu, ' + updated.length + ' geändert';
    _showChangeBadge(added, updated);
  } else if (!isAuto) {
    statusText += ' | keine Änderungen';
  }
  document.getElementById('csScanStatus').textContent = isAuto
    ? '🔄 ' + new Date().toLocaleTimeString() + ' — ' + total + ' Crafts'
    : statusText;
  if (!isAuto || added.length || updated.length) {
    showStatus(statusText, added.length + updated.length > 0 ? 'success' : 'info');
  }
  // persist
  try { localStorage.setItem('BC_CURSE_DB_v1', JSON.stringify({database:CURSE_DB,lscgTable:CURSE_LSCG,lscgCache:CURSE_CACHE_LSCG,favourites:[...CURSE_FAVOURITES]})); } catch {}
}


// ── CURSE FILTER STATE ───────────────────────────────
let _curseFilter  = 'all';  // 'all' | 'cursed' | 'lscg'
let _pendingExport = false;
let _curseEntryMap = {};    // rowId → dbKey, for safe onclick

function toggleCacheFilter() {
  const el = document.getElementById('fc-cache');
  if (el) el.classList.toggle('on');
  renderCurseTab();
}

function setCurseFilter(f) {
  _curseFilter = f;
  ['all','cursed','lscg','fav'].forEach(k => {
    const el = document.getElementById('fc-' + k);
    if (el) el.classList.toggle('on', k === f);
  });
  renderCurseTab();
}

function _populateSlotFilter() {
  const sel = document.getElementById('slotFilter');
  if (!sel) return;
  const current = sel.value;
  const slots = [...new Set(Object.values(CURSE_DB).map(e => e.Gruppe).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Alle Slots</option>' +
    slots.map(s => '<option value="' + s + '"' + (s === current ? ' selected' : '') + '>' + s + '</option>').join('');
}

function _updateCurseStats() {
  const entries = Object.values(CURSE_DB);
  document.getElementById('csStat-total').textContent  = entries.length;
  document.getElementById('csStat-cursed').textContent = entries.filter(e=>e.IstCursed).length;
  document.getElementById('csStat-lscg').textContent   = Object.keys(CURSE_LSCG).length;
  document.getElementById('csStat-cache').textContent  = Object.keys(CURSE_CACHE_LSCG).length;
}

// ── Render Curse Tab ──────────────────────────────────
function renderCurseTab() {
  const body   = document.getElementById('curseBody');
  const empty  = document.getElementById('curseEmpty');
  if (!body) return;

  // ── Apply filters ──
  const searchTerm = (document.getElementById('curseSearch')?.value || '').toLowerCase();
  const slotFilter = document.getElementById('slotFilter')?.value || '';
  const cacheOnly  = document.getElementById('fc-cache')?.classList.contains('on') ?? false;

  let entries = Object.values(CURSE_DB);
  if (_curseFilter === 'cursed') entries = entries.filter(e => !!e.IstCursed);
  if (_curseFilter === 'lscg')   entries = entries.filter(e => !!e.IstLSCGCurse);
  if (_curseFilter === 'fav') {
    entries = entries.filter(e => {
      const k = (e.Besitzer?.Nummer ?? '') + ':' + e.ItemName + ':' + e.CraftName;
      return CURSE_FAVOURITES.has(k);
    });
  }
  if (cacheOnly)   entries = entries.filter(e => !!e.IstLSCGCurse);
  if (slotFilter)  entries = entries.filter(e => e.Gruppe === slotFilter);
  if (searchTerm)  entries = entries.filter(e =>
    e.CraftName?.toLowerCase().includes(searchTerm) ||
    e.ItemName?.toLowerCase().includes(searchTerm)  ||
    e.Gruppe?.toLowerCase().includes(searchTerm)    ||
    e.Besitzer?.Name?.toLowerCase().includes(searchTerm)
  );

  if (!entries.length) {
    empty.style.display = '';
    empty.querySelector ? (empty.innerHTML = Object.keys(CURSE_DB).length
      ? '<div style="font-size:1.5rem;margin-bottom:8px">🔍</div>Keine Treffer für die gewählten Filter.'
      : '<div style="font-size:2rem;margin-bottom:8px">🔮</div>Noch kein Scan. Klicke <strong>Scannen</strong>.') : null;
    body.querySelectorAll('.curse-owner-block').forEach(b => b.remove());
    return;
  }
  empty.style.display = 'none';

  // Group by owner
  const byOwner = {};
  entries.forEach((e, idx) => {
    const key = e.Besitzer?.Nummer + ':' + e.Besitzer?.Name;
    if (!byOwner[key]) byOwner[key] = { name: e.Besitzer?.Name, num: e.Besitzer?.Nummer, items: [] };
    byOwner[key].items.push({ ...e, _idx: idx });
  });

  // Remove existing owner blocks and rebuild
  body.querySelectorAll('.curse-owner-block').forEach(b => b.remove());

  Object.entries(byOwner).forEach(([ownerKey, owner]) => {
    const blockId = 'co_' + owner.num;
    const wasOpen = document.getElementById(blockId)?.classList.contains('open');

    const block = document.createElement('div');
    block.className = 'curse-owner-block' + (wasOpen ? ' open' : '');
    block.id = blockId;

    const lscgCount = owner.items.filter(i => i.IstLSCGCurse).length;
    const cursedCount = owner.items.filter(i => i.IstCursed).length;
    const ownerFavCount = owner.items.filter(i => {
      const k2 = (i.Besitzer?.Nummer ?? '') + ':' + i.ItemName + ':' + i.CraftName;
      return CURSE_FAVOURITES.has(k2);
    }).length;

    block.innerHTML =
      '<div class="curse-owner-hdr" onclick="toggleCurseOwner(\'' + blockId + '\')">'+
        '<span class="curse-owner-name">'+escHtml(owner.name)+'</span>'+
        '<span class="curse-owner-num">#'+owner.num+'</span>'+
        (lscgCount ? '<span class="curse-owner-count" style="background:var(--gd);color:var(--green)">🧿 '+lscgCount+'</span>' : '')+
        (cursedCount ? '<span class="curse-owner-count">🔮 '+cursedCount+'</span>' : '')+
        '<span class="curse-owner-count" style="background:var(--bg3);color:var(--text2)">'+owner.items.length+'</span>'+
        (ownerFavCount ? '<span class="curse-owner-count curse-owner-fav-badge" style="background:rgba(251,191,36,.12);color:#fbbf24;border-color:rgba(251,191,36,.3)">⭐ '+ownerFavCount+'</span>' : '<span class="curse-owner-fav-badge" style="display:none"></span>')+
        '<span class="curse-owner-chevron">▶</span>'+
      '</div>'+
      '<table class="curse-rows"><thead><tr style="background:var(--bg3)">'+
        '<th style="padding:4px 4px;font-size:.63rem;color:var(--text3);text-align:center;font-weight:500" title="Favorit">⭐</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Name</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Item</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Gruppe</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Flags</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">LSCG</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:center;font-weight:500;white-space:nowrap">Cache</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500;min-width:160px">Kommentar</th>'+
        '<th style="padding:4px 10px;font-size:.63rem;color:var(--text3);text-align:left;font-weight:500">Aktionen</th>'+
      '</tr></thead><tbody id="cb_'+owner.num+'"></tbody></table>';

    body.appendChild(block);

    const tbody = document.getElementById('cb_' + owner.num);
    owner.items.forEach((entry, rowIdx) => {
      const dbKey = entry.Besitzer.Nummer + ':' + entry.ItemName + ':' + entry.CraftName;
      const rowId = 'cr_' + owner.num + '_' + rowIdx;
      const detId = 'cd_' + owner.num + '_' + rowIdx;
      const comment = CURSE_COMMENTS[dbKey] || '';
      const isLSCG  = entry.IstLSCGCurse;
      const isCursed = entry.IstCursed;

      const tr = document.createElement('tr');
      const isFav = CURSE_FAVOURITES.has(dbKey);
    tr.className = 'curse-row' + (isLSCG ? ' lscg' : '') + (isFav ? ' fav' : '');
      tr.id = rowId;

      const lscgText = isLSCG
        ? '<span class="curse-detail-badge lscg" title="' + (entry.LSCGAusCache ? 'Aus Cache' : 'Live') + '">'
          + (entry.LSCGAusCache ? '💾' : '✅') + '</span> ' + escHtml(entry.LSCG?.Name || '?')
        : '<span style="color:var(--text3)">–</span>';

      tr.innerHTML =
        '<td class="fav-cell" onclick="toggleCurseFavourite(\'' + dbKey.replace(/'/g,"&apos;") + '\',this)" title="Favorit">'+
          (isFav ? '⭐' : '<span style="opacity:.25;font-size:.85em">☆</span>')+
        '</td>'+
        '<td class="cn"><span class="cursor-detail-toggle" onclick="toggleCurseDetail(\'' + detId + '\',\'' + rowId + '\')">▶</span>'+escHtml(entry.CraftName)+'</td>'+
        '<td class="item">'+escHtml(entry.ItemName)+'</td>'+
        '<td class="grp">'+escHtml(entry.Gruppe)+'</td>'+
        '<td class="badges">'+
          (isCursed ? '<span class="curse-detail-badge cursed">🔮</span>' : '')+
          (entry.Private ? '<span class="curse-detail-badge">🔒</span>' : '')+
          (entry.Property ? '<span class="curse-detail-badge">'+escHtml(entry.Property)+'</span>' : '')+
        '</td>'+
        '<td class="lscg-col">'+lscgText+'</td>'+
        '<td style="text-align:center;vertical-align:middle">'+
          (isLSCG ? '<span title="'+(entry.LSCGAusCache ? 'Aus LSCG-Cache' : 'Live-Daten')+'" style="font-size:1rem;cursor:default">'+(entry.LSCGAusCache ? '✅' : '🟢')+'</span>' : '<span style="color:var(--text3)">–</span>')+
        '</td>'+
        '<td class="comment-col"><textarea class="curse-comment-input" placeholder="Notiz..." '+
          'data-rowid="' + rowId + '" onchange="saveCurseCommentById(this.dataset.rowid,this.value)">'+escHtml(comment)+'</textarea></td>'+
        '<td class="actions">'+
          (function(){ _curseEntryMap[rowId] = dbKey; return ''; })()+
          '<button class="curse-apply-btn" data-rid="' + rowId + '" data-tgt="" onclick="wearCurseByData(this)" title="Auf mich anwenden">👤</button>'+
          (_selectedMemberNum ? '<button class="curse-apply-btn other" data-rid="' + rowId + '" data-tgt="' + _selectedMemberNum + '" onclick="wearCurseByData(this)" title="Auf #'+_selectedMemberNum+'">👥 #'+_selectedMemberNum+'</button>' : '')+
        '</td>';

      tbody.appendChild(tr);

      // Detail row
      const lscgEntry = entry.LSCG;
      const detailFields = [
        ['Beschreibung', entry.Description || '–'],
        ['Farbe', entry.Farbe || '–'],
        ['Property', entry.Property || '–'],
        ['Private', entry.Private ? 'Ja' : 'Nein'],
        ['Zuletzt', entry.ZuletztGesehen],
        ...(isLSCG ? [
          ['LSCG Name', lscgEntry?.Name || '–'],
          ['Outfit Key', lscgEntry?.OutfitKey || '–'],
          ['Speed', lscgEntry?.Speed ?? '–'],
          ['Enabled', lscgEntry?.Enabled ? 'Ja' : 'Nein'],
          ['Inexhaustable', lscgEntry?.Inexhaustable ? 'Ja' : 'Nein'],
          ['Aus Cache', entry.LSCGAusCache ? 'Ja 💾' : 'Nein ✅'],
        ] : []),
      ];

      const detTr = document.createElement('tr');
      detTr.className = 'curse-detail-row';
      detTr.id = detId;
      detTr.innerHTML =
        '<td class="curse-detail-cell" colspan="7">'+
        '<div style="font-size:.63rem;color:var(--text3);margin-bottom:4px">Details für '+escHtml(entry.CraftName)+'</div>'+
        '<div class="curse-detail-grid">'+
        detailFields.map(([label, val]) =>
          '<div class="curse-detail-field">'+
          '<div class="curse-detail-label">'+label+'</div>'+
          '<div class="curse-detail-val">'+escHtml(String(val))+'</div>'+
          '</div>'
        ).join('')+
        '</div></td>';
      tbody.appendChild(detTr);
    });
  });
}

function toggleCurseOwner(id) {
  document.getElementById(id)?.classList.toggle('open');
}

function toggleCurseDetail(detId, rowId) {
  const det = document.getElementById(detId);
  const row = document.getElementById(rowId);
  if (!det || !row) return;
  const open = det.classList.toggle('open');
  row.classList.toggle('expanded', open);
  // Make sure owner block stays open
  const block = det.closest('.curse-owner-block');
  if (open && block) block.classList.add('open');
}

function saveCurseCommentById(rowId, val) {
  const key = _curseEntryMap[rowId];
  if (key) saveCurseComment(key, val);
}

function saveCurseComment(key, val) {
  if (val.trim()) CURSE_COMMENTS[key] = val.trim();
  else delete CURSE_COMMENTS[key];
  _saveCurseComments();
}

function wearCurseByData(btn) {
  const rowId = btn.dataset.rid;
  const tgt   = btn.dataset.tgt;
  const targetNum = tgt ? parseInt(tgt) : null;
  const key = _curseEntryMap[rowId];
  if (!key) { showStatus('❌ Eintrag nicht gefunden', 'error'); return; }
  wearCurse(key, targetNum);
}

function wearCurse(dbKey, targetNum) {
  if (!_connected) { showStatus('❌ Nicht verbunden', 'error'); return; }
  const entry = CURSE_DB[dbKey] ?? null;
  if (!entry) { showStatus('❌ Eintrag nicht in DB: ' + dbKey, 'error'); return; }
  bcSend({ type: 'WEAR_CURSE', dbKey, targetNum, entry });
  showStatus('⏳ Curse wird angelegt...', 'info');
}

// ── Export / Import ───────────────────────────────────
// Gesammelte Caches für Export
let _exportLscgCache  = null;
let _exportCraftCache = null;

function _tryFinishExport() {
  if (_exportLscgCache === null || _exportCraftCache === null) return; // warten bis beide da
  const mergedLscg  = Object.assign({}, CURSE_CACHE_LSCG, _exportLscgCache);
  const mergedCraft = Object.assign({}, CURSE_DB, _exportCraftCache);
  Object.assign(CURSE_CACHE_LSCG, _exportLscgCache);
  Object.assign(CURSE_DB, _exportCraftCache);
  try { localStorage.setItem('BC_CURSE_DB_v1', JSON.stringify({database:CURSE_DB,lscgTable:CURSE_LSCG,lscgCache:CURSE_CACHE_LSCG,favourites:[...CURSE_FAVOURITES]})); } catch {}
  const payload = {
    _meta: { exportedAt: new Date().toISOString(), version: 3 },
    database: mergedCraft,
    lscgTable: CURSE_LSCG,
    lscgCache: mergedLscg,
    comments: CURSE_COMMENTS,
  };
  _exportLscgCache = null; _exportCraftCache = null;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'CurseScanner_' + new Date().toISOString().slice(0,10) + '.json';
  a.click(); URL.revokeObjectURL(url);
  showStatus('✅ Export: ' + Object.keys(mergedCraft).length + ' Crafts, ' + Object.keys(mergedLscg).length + ' LSCG-Cache-Einträge', 'success');
}

function curseExport() {
  if (!Object.keys(CURSE_DB).length) { showStatus('❌ Nichts zum Exportieren', 'error'); return; }
  if (_connected) {
    showStatus('⏳ Lade Cache aus BC...', 'info');
    _pendingExport = true;
    _exportLscgCache  = null;
    _exportCraftCache = null;
    bcSend({ type: 'GET_LSCG_CACHE' });
    bcSend({ type: 'GET_CRAFT_CACHE' });
  } else {
    _exportLscgCache  = {};
    _exportCraftCache = {};
    _tryFinishExport();
  }
}

function curseImport() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = e => {
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        CURSE_DB   = d.database  ?? d;
        CURSE_LSCG = d.lscgTable ?? {};
        CURSE_CACHE_LSCG = d.lscgCache ?? {};
        if (d.comments) Object.assign(CURSE_COMMENTS, d.comments);
        _saveCurseComments();
        try { localStorage.setItem('BC_CURSE_DB_v1', JSON.stringify({database:CURSE_DB,lscgTable:CURSE_LSCG,lscgCache:CURSE_CACHE_LSCG,favourites:[...CURSE_FAVOURITES]})); } catch {}
        if (_connected && Object.keys(CURSE_DB).length > 0) {
          bcSend({ type: 'LOAD_CURSE_DB', database: CURSE_DB }, true);
          if (Object.keys(CURSE_CACHE_LSCG).length > 0) {
            bcSend({ type: 'LOAD_LSCG_CACHE', cache: CURSE_CACHE_LSCG }, true);
          }
          // Craft-Cache ebenfalls in BC localStorage schreiben
          bcSend({ type: 'LOAD_CRAFT_CACHE', cache: CURSE_DB }, true);
        }
        _updateCurseStats();
        if (_activeTab === 'curse') renderCurseTab();
        if (d.favourites) { d.favourites.forEach(k => CURSE_FAVOURITES.add(k)); _saveCurseFavourites(); }
                showStatus('✅ Import: ' + Object.keys(CURSE_DB).length + ' Crafts', 'success');
      } catch (err) { showStatus('❌ Import fehlgeschlagen: ' + err.message, 'error'); }
    };
    r.readAsText(e.target.files[0]);
  };
  inp.click();
}

function curseClear() {
  const total = Object.keys(CURSE_DB).length;
  if (!total) { showStatus('ℹ️ Datenbank ist bereits leer', 'info'); return; }
  if (!confirm('Alle ' + total + ' Einträge löschen?\nDanach kannst du neu scannen oder importieren.')) return;
  CURSE_DB         = {};
  CURSE_LSCG       = {};
  CURSE_CACHE_LSCG = {};
  try { localStorage.removeItem('BC_CURSE_DB_v1'); } catch {}
  _updateCurseStats();
  renderCurseTab();
  showStatus('🗑️ Datenbank geleert', 'success');
}

function curseClearAndScan() {
  const total = Object.keys(CURSE_DB).length;
  const msg = total
    ? 'Alle ' + total + ' Einträge löschen und dann neu scannen?'
    : 'Neu scannen?';
  if (!confirm(msg)) return;
  CURSE_DB         = {};
  CURSE_LSCG       = {};
  CURSE_CACHE_LSCG = {};
  try { localStorage.removeItem('BC_CURSE_DB_v1'); } catch {}
  _updateCurseStats();
  renderCurseTab();
  curseScan();
  showStatus('🔄 Datenbank geleert – Scan läuft...', 'info');
}

// ── Load curse DB from localStorage on startup ────────
(function() {
  try {
    const s = localStorage.getItem('BC_CURSE_DB_v1');
    if (s) {
      const d = JSON.parse(s);
      CURSE_DB         = d.database  ?? {};
      CURSE_LSCG       = d.lscgTable ?? {};
      CURSE_CACHE_LSCG = d.lscgCache ?? {};
      _updateCurseStats();
      console.log('[BCK-Popup] Curse DB geladen: ' + Object.keys(CURSE_DB).length + ' Crafts');
    }
  } catch {}
})();

// ══════════════════════════════════════════════════════
//  POSTMESSAGE KOMMUNIKATION MIT BC
// ══════════════════════════════════════════════════════
const APP = 'BCKonfigurator';

// ── Ping-Retry ────────────────────────────────────────
let _pingInterval = null;
let _connected    = false;

function startPingRetry() {
  if (_pingInterval) clearInterval(_pingInterval);
  let n = 0;
  _pingInterval = setInterval(function() {
    if (_connected) { clearInterval(_pingInterval); _pingInterval = null; return; }
    n++;
    const ok = !!window.opener && !window.opener.closed;
    console.log('[BCK-Popup] Ping-Retry #' + n + ' | opener=' + ok);
    if (ok) window.opener.postMessage({ app: APP, type: 'PING' }, '*');
  }, 3000);
}

function manualReconnect() {
  _connected = false;
  stopRoomScan();
  document.getElementById('connStatus').textContent = '\U0001f534 Nicht verbunden';
  document.getElementById('connStatus').style.color = 'var(--red)';
  console.log('[BCK-Popup] manualReconnect()');
  bcSend({ type: 'PING' });
  startPingRetry();
}

function bcSend(msg, silent) {
  try {
    const ok = !!window.opener && !window.opener.closed;
    if (!ok) {
      console.warn('[BCK-Popup] bcSend FAIL – kein opener', msg.type);
      if (!silent) showStatus('\u274c BC-Fenster nicht verf\u00fcgbar \u2013 Bookmarklet nochmal klicken', 'error');
      return false;
    }
    if (!silent || msg.type !== 'PING') console.log('[BCK-Popup] bcSend \u2192', msg.type);
    window.opener.postMessage({ app: APP, ...msg }, '*');
    return true;
  } catch(e) {
    console.error('[BCK-Popup] bcSend Exception:', e.message);
    if (!silent) showStatus('\u274c postMessage Fehler: ' + e.message, 'error');
    return false;
  }
}

window.addEventListener('message', function(ev) {
  if (!ev.data || ev.data.app !== APP) return;
  console.log('[BCK-Popup] \u2190 message:', ev.data.type);

  switch (ev.data.type) {

    case 'PONG':
      console.log('[BCK-Popup] PONG \u2705 Verbunden!');
      if (!_connected) {
        _connected = true;
        if (_pingInterval) { clearInterval(_pingInterval); _pingInterval = null; }
        document.getElementById('connStatus').textContent = '\U0001f7e2 Verbunden';
        document.getElementById('connStatus').style.color = 'var(--green)';
        document.getElementById('connectHint')?.classList.add('hidden');
        // Curse-DB an Loader pushen → Wear nach Browserwechsel/Neustart möglich
        if (Object.keys(CURSE_DB).length > 0) {
          bcSend({ type: 'LOAD_CURSE_DB', database: CURSE_DB }, true);
          // FIX: was incorrectly sending CURSE_DB as craft cache - craft entries are already in CURSE_DB
          // Only send LSCG cache separately as it uses a different table
          if (Object.keys(CURSE_CACHE_LSCG).length > 0) {
            bcSend({ type: 'LOAD_LSCG_CACHE', cache: CURSE_CACHE_LSCG }, true);
          }
        }
        // Sofort Raum scannen + Interval starten
        bcSend({ type: 'GET_PLAYER' }, true);
        startRoomScan();
      }
      break;

    case 'CACHE_DATA': {
      console.log('[BCK-Popup] CACHE_DATA err=' + ev.data.err, 'groups=' + Object.keys(ev.data.cache ?? {}).length);
      document.getElementById('loadingSpinner').classList.add('hidden');
      document.getElementById('loadCacheBtn').disabled = false;
      if (ev.data.err) { showStatus('\u274c ' + ev.data.err, 'error'); return; }
      const _data  = ev.data.cache ?? {};
      const _items = Object.values(_data).reduce((s,g) => s + Object.keys(g).length, 0);
      if (_items === 0) { showStatus('\u274c Kein Cache erhalten \u2013 Bist du im Spiel?', 'error'); return; }
      CACHE = _data;
      try { localStorage.setItem('BC_CACHE_v12', JSON.stringify(_data)); } catch {}
      const _mc = Object.values(_data).flatMap(g => Object.values(g)).filter(i => i.archetype === 'modular').length;
      document.getElementById('cacheInfo').textContent = '\u2705 ' + _items + ' Items \u00b7 ' + Object.keys(_data).length + ' Gruppen \u00b7 \U0001f9e9 ' + _mc + ' modular';
      document.getElementById('clearBtn').classList.remove('hidden');
      document.getElementById('outfitBtn')?.classList.remove('hidden');
      document.getElementById('profileBtn')?.classList.remove('hidden');
      document.getElementById('connectHint')?.classList.add('hidden');
      renderGroups();
      showEmpty();
      showStatus('\u2705 ' + _items + ' Items geladen!', 'success');
      bcSend({ type: 'GET_PLAYER' });
      break;
    }

    case 'PLAYER_DATA':
      if (!ev.data.err) {
        const _pi = document.getElementById('playerInfo');
        if (_pi) { _pi.textContent = '\U0001f464 ' + ev.data.name + ' #' + ev.data.memberNumber; _pi.style.display = ''; }
        renderRoomMembers(ev.data);
      } else {
        console.warn('[BCK-Popup] PLAYER_DATA Fehler:', ev.data.err);
      }
      break;

    case 'BOT_EV_STATUS':
      _evIntervalStatusUpdate(ev.data.evId, ev.data.nextMs, ev.data.lo, ev.data.hi, ev.data.cnt);
      break;
    case 'BOT_LOG':
      logPush(ev.data.entry);
      break;

    case 'BOT_MONEY':
      _moneyApply(ev.data.memberNum, ev.data.name, ev.data.delta, ev.data.setVal);
      break;

    case 'BOT_SHOP': {
      _shopLogPurchase(ev.data);
      break;
    }

    case 'BOT_RANG':
      _rankApply(ev.data.memberNum, ev.data.name, ev.data.rankId, 'bot');
      break;

    case 'RANG_INIT': {
      // Spieler registrieren ohne Rang – nur wenn noch nicht bekannt
      const rid = String(ev.data.memberNum);
      if (rid && !_rankData.players[rid]) {
        _rankData.players[rid] = { name: ev.data.name || ('#'+rid), rankId: null, assignedAt: Date.now(), history: [] };
        _saveRank();
        if (document.getElementById('tab-rank')?.classList.contains('active')) renderRankPlayers();
        const btn = document.getElementById('tab-rank-btn');
        if (btn) { const total = Object.values(_rankData.players).filter(x=>x.rankId).length; btn.textContent = '🏆 Rang ('+total+')'; }
      } else if (rid && _rankData.players[rid]) {
        // Name aktuell halten bei Rejoin
        _rankData.players[rid].name = ev.data.name || _rankData.players[rid].name;
        _saveRank();
      }
      break;
    }

    case 'MONEY_INIT_NEW': {
      // Neuer Spieler - nur eintragen wenn noch nicht vorhanden (0 Gold)
      const mn = ev.data.memberNum;
      if (mn && !_money.balances[mn]) {
        _money.balances[mn] = { name: ev.data.name, balance: 0 };
        _saveMoney();
        if (document.getElementById('tab-money')?.classList.contains('active')) renderMoneyTab();
      }
      break;
    }
    case 'MONEY_QUERY': {
      const id = ev.data.memberNum; // raw MemberNumber key
      const p = _money.balances[id];
      const bal = p?.balance ?? 0;
      const cur = _money.settings.name || 'Gold';
      const name = ev.data.name || ('#'+ev.data.memberNum);
      // Find any active bot to send the response
      const actBot = _bots.find(b=>b.laufend);
      if (actBot) {
        const queryTyp = _money.settings.queryTyp ?? 'whisper';
        const msgType = queryTyp === 'whisper' ? 'Whisper' : 'Chat';
        const memberNum = ev.data.memberNum;
        const msg = `Du hast ${bal} ${cur}`;
        const code = msgType === 'Whisper'
          ? `ServerSend('ChatRoomChat',{Content:${JSON.stringify(msg)},Type:'Whisper',Target:${memberNum}});`
          : `ServerSend('ChatRoomChat',{Content:${JSON.stringify(name+': '+msg)},Type:'Chat'});`;
        bcSend({type:'EXEC', code});
      }
      break;
    }

    case 'BOT_ROOM_EVER': {
      // Spieler die je da waren persistieren – überlebt Konfigurator-Neustart
      const reKey = 'BC_RoomEver_v1';
      try {
        const reData = JSON.parse(localStorage.getItem(reKey)||'{}');
        reData[ev.data.botId] = ev.data.members;
        localStorage.setItem(reKey, JSON.stringify(reData));
      } catch {}
      break;
    }

    case 'EXEC_OK':
      console.log('[BCK-Popup] EXEC_OK \u2705');
      showStatus('\u2705 Ausgef\u00fchrt!', 'success');
      break;

    case 'EXEC_ERR':
      console.error('[BCK-Popup] EXEC_ERR:', ev.data.msg);
      showStatus('\u274c Fehler: ' + ev.data.msg, 'error');
      break;

    case 'CURSE_DATA':
      _handleCurseData(ev.data);
      break;

    case 'LSCG_CACHE_DATA':
      Object.assign(CURSE_CACHE_LSCG, ev.data.cache ?? {});
      if (_pendingExport) {
        _exportLscgCache = ev.data.cache ?? {};
        _tryFinishExport();
      }
      break;

    case 'CRAFT_CACHE_DATA':
      // FIX: was incorrectly merging into CURSE_DB, corrupting it with craft-cache entries
      // Craft-cache is already part of CURSE_DB structure; just merge missing keys safely
      if (ev.data.cache) {
        for (const [k, v] of Object.entries(ev.data.cache)) {
          if (!CURSE_DB[k]) CURSE_DB[k] = v; // only add truly new entries, don't overwrite
        }
      }
      if (_pendingExport) {
        _exportCraftCache = ev.data.cache ?? {};
        _tryFinishExport();
      }
      break;

    case 'WEAR_CURSE_OK':
      showStatus('\u2705 ' + (ev.data.msg || 'Curse angelegt!'), 'success');
      break;

    case 'WEAR_CURSE_ERR':
      showStatus('\u274c Curse-Fehler: ' + ev.data.msg, 'error');
      break;
  }
});

function loadCacheFromBC() {
  console.log('[BCK-Popup] loadCacheFromBC() | opener=' + !!window.opener + ' closed=' + window.opener?.closed);
  const btn = document.getElementById('loadCacheBtn');
  btn.disabled = true;
  document.getElementById('loadingSpinner').classList.remove('hidden');
  showStatus('\u23f3 Verbinde mit Spiel\u2026', 'info');
  if (!bcSend({ type: 'GET_CACHE' })) {
    document.getElementById('loadingSpinner').classList.add('hidden');
    btn.disabled = false;
  }
}

function clearCache() {
  if (!confirm('Cache l\u00f6schen?')) return;
  CACHE = {};
  try { localStorage.removeItem('BC_CACHE_v12'); } catch {}
  document.getElementById('cacheInfo').textContent = 'Kein Cache';
  document.getElementById('clearBtn').classList.add('hidden');
  document.getElementById('outfitBtn')?.classList.add('hidden');
  document.getElementById('profileBtn')?.classList.add('hidden');
  document.getElementById('connectHint')?.classList.remove('hidden');
  document.getElementById('groupsList').innerHTML = '';
  showEmpty();
}

function showStatus(msg, type) {
  type = type || 'info';
  const el = document.getElementById('statusMsg');
  if (!el) return;
  el.textContent = msg;
  el.className = 'status-msg status-' + type;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.classList.add('hidden'); }, 4000);
}

function executeCode() {
  const code = document.getElementById('codeOut').value.trim();
  if (!code) return;
  showStatus('\u23f3 Wird ausgef\u00fchrt\u2026', 'info');
  bcSend({ type: 'EXEC', code });
}

// copyCode: see above

function executeOutfitCode() {
  const code = document.getElementById('outfitCode').value.trim();
  if (!code) return;
  showStatus('\u23f3 Outfit wird ausgef\u00fchrt\u2026', 'info');
  bcSend({ type: 'EXEC', code });
}

// copyOutfitCode: see above


// ══════════════════════════════════════════════════════
//  RAUM-SCANNER
// ══════════════════════════════════════════════════════
let _roomScanInterval = null;
let _myMemberNumber    = null;
let _selectedMemberNum = null;  // Konfigurator-Ziel
let _outfitTargetNum   = null;  // Outfit-Ziel (null = selbst)
let _lastRoomMembers   = [];    // letzter bekannter Raum-Snapshot

// Grace-Period: Spieler muss GRACE_NEEDED aufeinanderfolgende Scans fehlen
// bevor er als "verlassen" gilt. BC leert ChatRoomCharacter kurz beim Sync.
const GRACE_NEEDED = 2;  // 2 × 5s = 10s grace for sync drops
const _missCount   = {};  // memberNum → aufeinanderfolgende Fehlscans

function scanRoom() {
  if (!_connected) return;
  const btn = document.getElementById('roomRefreshBtn');
  if (btn) { btn.textContent = '⏳'; btn.classList.add('room-scanning'); }
  bcSend({ type: 'GET_PLAYER' }, true);
}

function startRoomScan() {
  if (_roomScanInterval) clearInterval(_roomScanInterval);
  _roomScanInterval = setInterval(function() {
    if (_connected) scanRoom();
  }, 5000);
  console.log('[BCK-Popup] Raum-Scanner gestartet (alle 5s)');
}

function stopRoomScan() {
  if (_roomScanInterval) { clearInterval(_roomScanInterval); _roomScanInterval = null; }
}

function renderRoomMembers(data) {
  const container = document.getElementById('roomMembers');
  const btn       = document.getElementById('roomRefreshBtn');
  if (!container) return;
  if (btn) { btn.textContent = '🔄'; btn.classList.remove('room-scanning'); }

  _myMemberNumber = data.memberNumber;
  const freshMembers = data.members ?? [];
  const freshNums    = new Set(freshMembers.map(m => m.num));

  // ── Grace-Period-Logik ────────────────────────────────────────────────────
  // Frische Spieler: Miss-Zähler auf 0 zurücksetzen
  for (const m of freshMembers) _missCount[m.num] = 0;

  // Vermisste Spieler: Zähler hochzählen, erst nach GRACE_NEEDED resetten
  const tracked = new Set([
    ...(_selectedMemberNum ? [_selectedMemberNum] : []),
    ...(_outfitTargetNum   ? [_outfitTargetNum]   : []),
  ]);
  for (const num of tracked) {
    if (!freshNums.has(num)) {
      _missCount[num] = (_missCount[num] || 0) + 1;
      console.log('[BCK-Popup] Spieler #' + num + ' fehlt im Scan (' + _missCount[num] + '/' + GRACE_NEEDED + ')');
    }
  }

  // Konfigurator-Ziel zurücksetzen wenn GRACE_NEEDED überschritten
  if (_selectedMemberNum && (_missCount[_selectedMemberNum] || 0) >= GRACE_NEEDED) {
    console.log('[BCK-Popup] Spieler #' + _selectedMemberNum + ' hat Raum verlassen → reset Konfig-Ziel');
    delete _missCount[_selectedMemberNum];
    _selectedMemberNum = null;
    const modeEl = document.getElementById('targetMode');
    if (modeEl) { modeEl.value = 'self'; onTargetChange(); }
  }

  // Outfit-Ziel zurücksetzen wenn GRACE_NEEDED überschritten
  if (_outfitTargetNum && (_missCount[_outfitTargetNum] || 0) >= GRACE_NEEDED) {
    console.log('[BCK-Popup] Outfit-Ziel #' + _outfitTargetNum + ' hat Raum verlassen → reset');
    delete _missCount[_outfitTargetNum];
    _outfitTargetNum = null;
  }

  // ── Snapshot: frische Daten PLUS bekannte aber kurz fehlende speichern ────
  // Spieler die noch innerhalb der Grace-Period sind trotzdem in der Liste lassen
  const graceMembers = _lastRoomMembers.filter(m =>
    !freshNums.has(m.num) &&
    m.num !== _myMemberNumber &&
    (_missCount[m.num] || 0) < GRACE_NEEDED
  );
  _lastRoomMembers = [...freshMembers, ...graceMembers];

  // ── Raum-Panel rendern ────────────────────────────────────────────────────
  const displayList = _lastRoomMembers;
  if (!displayList.length) {
    container.innerHTML = '<span class="room-empty">– Niemand im Raum –</span>';
  } else {
    container.innerHTML = displayList.map(m => {
      const isSelf  = m.num === _myMemberNumber;
      const isSel   = m.num === _selectedMemberNum;
      const inGrace = !freshNums.has(m.num) && !isSelf;
      const cls = 'room-chip' + (isSelf ? ' self' : '') + (isSel ? ' selected' : '') + (inGrace ? ' grace' : '');
      const click = isSelf ? '' : 'onclick="selectRoomMember(' + m.num + ')"';
      const title = isSelf ? 'Du selbst' : (inGrace ? 'Sync... (kurz nicht sichtbar)' : 'Als Ziel setzen');
      return '<span class="' + cls + '" ' + click + ' title="' + title + '">'
        + (isSelf ? '👤' : (inGrace ? '⏳' : '👥')) + ' ' + escHtml(m.name)
        + ' <span class="room-num">#' + m.num + '</span></span>';
    }).join('');
  }

  // ── Konfigurator-Dropdown aktualisieren ───────────────────────────────────
  const sel = document.getElementById('targetMember');
  if (sel) {
    const others = _lastRoomMembers.filter(m => m.num !== _myMemberNumber);
    sel.innerHTML = '<option value="">– Auswählen –</option>' +
      others.map(m => '<option value="' + m.num + '"' + (m.num === _selectedMemberNum ? ' selected' : '') + '>' + escHtml(m.name) + ' #' + m.num + '</option>').join('');
    if (_selectedMemberNum) sel.value = _selectedMemberNum;
  }

  // ── Outfit-Chips aktualisieren ────────────────────────────────────────────
  renderOutfitMemberChips();
}

function renderOutfitMemberChips() {
  const el = document.getElementById('outfitMemberChips');
  if (!el) return;
  const members = _lastRoomMembers;
  if (!members.length) {
    el.innerHTML = '<span style="color:var(--text3);font-size:.72rem">– Niemand im Raum –</span>';
    return;
  }
  el.innerHTML = members.map(m => {
    const isSelf = m.num === _myMemberNumber;
    const isSel  = isSelf ? _outfitTargetNum === null : m.num === _outfitTargetNum;
    const cls    = 'outfit-chip' + (isSelf ? ' self' : '') + (isSel ? ' sel-out' : '');
    return '<span class="' + cls + '" onclick="setOutfitTarget(' + (isSelf ? 'null' : m.num) + ')">'
      + (isSelf ? '👤' : '👥') + ' ' + escHtml(m.name)
      + ' <span class="onum">#' + m.num + '</span></span>';
  }).join('');
}

function setOutfitTarget(num) {
  _outfitTargetNum = num;
  renderOutfitMemberChips();
  // Code neu generieren falls bereits vorhanden
  _autoOutfitCode();
  console.log('[BCK-Popup] Outfit-Ziel:', num === null ? 'selbst (Player)' : '#' + num);
  // FIX: removed duplicate _autoOutfitCode() call that was here
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function selectRoomMember(num) {
  _selectedMemberNum = num;
  // Ziel-Dropdown auf "Anderer Spieler" setzen
  const modeEl = document.getElementById('targetMode');
  if (modeEl) { modeEl.value = 'other'; onTargetChange(); }
  const sel = document.getElementById('targetMember');
  if (sel) { sel.value = num; }
  const direct = document.getElementById('targetMemberDirect');
  if (direct) { direct.value = num; }
  // Chips neu rendern (selected-Klasse)
  document.querySelectorAll('.room-chip').forEach(chip => {
    chip.classList.toggle('selected', parseInt(chip.querySelector('.room-num')?.textContent?.replace('#','')) === num);
  });
  if (typeof generate === 'function') generate();
  console.log('[BCK-Popup] Ziel gesetzt: #' + num);
}

// ── Auto-load + initial PING ──────────────────────────
(function() {
  console.log('[BCK-Popup] Auto-Init | opener=' + !!window.opener);
  try {
    const s = localStorage.getItem('BC_CACHE_v12');
    if (s) {
      CACHE = JSON.parse(s);
      const items = Object.values(CACHE).reduce((n,g) => n + Object.keys(g).length, 0);
      if (items > 0) {
        const mc = Object.values(CACHE).flatMap(g => Object.values(g)).filter(i => i.archetype === 'modular').length;
        document.getElementById('cacheInfo').textContent = '\u2705 ' + items + ' Items (lokal gecacht) \u00b7 \U0001f9e9 ' + mc + ' modular';
        document.getElementById('clearBtn').classList.remove('hidden');
        document.getElementById('outfitBtn')?.classList.remove('hidden');
        document.getElementById('profileBtn')?.classList.remove('hidden');
        document.getElementById('connectHint')?.classList.add('hidden');
        renderGroups(); showEmpty(); renderProfileList();
        console.log('[BCK-Popup] Cache aus localStorage: ' + items + ' Items');
      }
    }
  } catch(e) { console.warn('[BCK-Popup] localStorage Fehler:', e.message); }

  // Sofortiger PING + Retry-Schleife
  if (window.opener && !window.opener.closed) {
    console.log('[BCK-Popup] Sende ersten PING...');
    window.opener.postMessage({ app: APP, type: 'PING' }, '*');
  }
  // Always render sidebar on startup
  renderGroups();
  renderProfileList();
  startPingRetry();
})();
</script>



<!-- ── TAB 3: CRAFT & CURSE ── -->
<div id="tab-curse" class="tab-pane">
  <div class="curse-topbar">
    <button class="btn btn-green" onclick="curseScan()">🔍 Scannen</button>
    <button class="btn btn-green" onclick="curseClearAndScan()" title="Alte Einträge löschen und frisch scannen">🔄 Neu scannen</button>
    <button class="btn btn-primary" id="csAutoScanBtn" onclick="toggleAutoCurseScan()" title="Automatisch alle 30s scannen">⏰ Auto-Scan</button>
    <button class="btn btn-primary" onclick="curseExport()">⬇️ Export</button>
    <button class="btn btn-primary" onclick="curseImport()">⬆️ Import</button>
    <button class="btn btn-red" onclick="curseClear()" title="Alle gespeicherten Einträge löschen">🗑️ Leeren</button>
    <div class="curse-stats">
      <div class="curse-stat">Crafts: <span id="csStat-total">0</span></div>
      <div class="curse-stat">🔮 Cursed: <span id="csStat-cursed">0</span></div>
      <div class="curse-stat">🧿 LSCG: <span id="csStat-lscg">0</span></div>
      <div class="curse-stat">💾 Cache: <span id="csStat-cache">0</span></div>
    </div>
    <span id="csScanStatus" style="font-size:.7rem;color:var(--text3)"></span>
  </div>
  <div id="csChangeBadge" style="display:none;padding:4px 10px;font-size:.68rem;background:var(--bg3);border-bottom:1px solid var(--border);color:var(--text2)">
  </div>
  <!-- Filter bar -->
  <div class="curse-filter-bar" id="curseFilterBar">
    <input class="curse-search" id="curseSearch" placeholder="🔍 Name, Item, Gruppe..." oninput="renderCurseTab()">
    <div class="filter-sep"></div>
    <span class="filter-chip on" id="fc-all"      onclick="setCurseFilter('all')"     >Alle</span>
    <span class="filter-chip"    id="fc-cursed"   onclick="setCurseFilter('cursed')"  >🔮 Cursed</span>
    <span class="filter-chip"    id="fc-lscg"     onclick="setCurseFilter('lscg')"   >🧿 LSCG</span>
    <div class="filter-sep"></div>
    <span class="filter-chip" id="fc-fav" onclick="setCurseFilter('fav')" title="Nur Favoriten">⭐ Favoriten</span>
    <div class="filter-sep"></div>
    <span class="filter-chip" id="fc-cache" onclick="toggleCacheFilter()" title="Nur Einträge mit LSCG-Daten anzeigen">💾 Im Cache</span>
    <div class="filter-sep"></div>
    <div class="slot-filter-wrap">
      <select class="slot-select" id="slotFilter" onchange="renderCurseTab()">
        <option value="">Alle Slots</option>
      </select>
    </div>
  </div>
  <div class="curse-body" id="curseBody">
    <div class="curse-empty" id="curseEmpty">
      <div style="font-size:2rem;margin-bottom:8px">🔮</div>
      Noch kein Scan. Klicke <strong>Scannen</strong> um alle Crafts zu laden.
    </div>
  </div>
</div>
<!-- /tab-curse -->



<!-- ══ BOT TAB ══════════════════════════════════════════════ -->
<div id="tab-bot" class="tab-pane">
  <div class="bot-wrap">

    <!-- Sidebar: Bot list -->
    <div class="bot-sidebar">
      <div class="bs-head">
        <span>🤖 Meine Bots</span>
        <button class="btn btn-green" onclick="botNew()" style="font-size:.65rem;padding:3px 8px">+ Neu</button>
      </div>
      <div class="bot-list" id="botList"></div>
    </div>

    <!-- Main: Editor -->
    <div class="bot-main" id="botEditor">
      <div class="be-empty"><div class="be-empty-icon">🤖</div>Wähle einen Bot aus oder erstelle einen neuen.</div>
    </div>
  </div>
</div>

<!-- Item/Curse/Profile Picker Modal -->
<div class="ipicker-overlay" id="ipickerOverlay" style="display:none" onclick="if(event.target===this)ipickerClose()">
  <div class="ipicker-box">
    <div class="ipicker-head">
      <span style="font-size:.78rem;font-weight:600">Auswählen</span>
      <input class="cf cf-flex" id="ipickerSearch" placeholder="🔍 Suchen..." oninput="ipickerRender()">
      <button class="btn btn-red" onclick="ipickerClose()" style="font-size:.65rem;padding:3px 8px">✕</button>
    </div>
    <div class="ipicker-tabs" id="ipickerTabs"></div>
    <div class="ipicker-list" id="ipickerList"></div>
  </div>
</div>

<div id="tab-log" class="tab-pane">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;border-bottom:1px solid var(--border)">
    <span style="font-weight:600;font-size:.85rem;color:var(--text1)">📋 Bot-Logs</span>
    <div style="display:flex;gap:8px;align-items:center">
      <span id="log-count" style="font-size:.68rem;color:var(--text3)"></span>
      <button onclick="logFilter('')"             id="logf-all"    class="log-filter-btn active">Alle</button>
      <button onclick="logFilter('ok')"           id="logf-ok"    class="log-filter-btn">✅ Ausgelöst</button>
      <button onclick="logFilter('ungueltig')"    id="logf-ug"    class="log-filter-btn">❌ Ungültig</button>
      <button onclick="logFilter('skip')"         id="logf-skip"  class="log-filter-btn">⏭ Übersprungen</button>
      <button onclick="logFilter('join')"         id="logf-join"  class="log-filter-btn">👋 Joins</button>
      <button onclick="logFilter('leave')"        id="logf-leave" class="log-filter-btn">🚪 Verlassen</button>
      <button onclick="logFilter('join')"       id="logf-join"  class="log-filter-btn">👋 Joins/Leaves</button>
      <button onclick="logFilter('join')"       id="logf-join"  class="log-filter-btn">👋 Beitritte</button>
      <button onclick="logClearFiltered()" style="font-size:.68rem;padding:3px 10px;background:#2a0a0a;border:1px solid var(--red);color:var(--red);border-radius:5px;cursor:pointer">🗑 Sichtbare löschen</button>
      <button onclick="logClearAll()" style="font-size:.68rem;padding:3px 10px;background:var(--bg3);border:1px solid var(--border);color:var(--text3);border-radius:5px;cursor:pointer">Alle löschen</button>
    </div>
  </div>
  <div id="log-entries" style="overflow-y:auto;height:calc(100vh - 162px);padding:10px 14px;display:flex;flex-direction:column;gap:4px"></div>
</div>



<div id="tab-money" class="tab-pane">
  <div style="display:flex;gap:18px;padding:14px 18px;border-bottom:1px solid var(--border);align-items:center;flex-wrap:wrap">
    <span style="font-weight:600;font-size:.85rem">💰 Money System</span>
    <label style="font-size:.7rem;color:var(--text3)">Währungsname:
      <input id="money-name-inp" class="cf" style="width:100px;margin-left:4px" placeholder="Gold"
        value="" oninput="moneySetName(this.value)">
    </label>
    <label style="font-size:.7rem;color:var(--text3)">Abfrage-Befehl (Chat):
      <input id="money-cmd-inp" class="cf" style="width:100px;margin-left:4px" placeholder="!gold"
        value="" oninput="moneySetCmd(this.value)">
    </label>
    <label style="font-size:.7rem;color:var(--text3)">Antwort:
      <select id="money-typ-inp" class="cf" style="margin-left:4px" onchange="moneySetTyp(this.value)">
        <option value="whisper">🤫 Whisper</option>
        <option value="chat">💬 Chat</option>
      </select>
    </label>
    <button onclick="moneyAddPlayer()" style="font-size:.68rem;padding:4px 11px;background:var(--pd);border:none;color:var(--pl);border-radius:5px;cursor:pointer">+ Spieler hinzufügen</button>
    <button onclick="moneyResetAll()" style="font-size:.68rem;padding:4px 11px;background:#2a0a0a;border:1px solid var(--red);color:var(--red);border-radius:5px;cursor:pointer">Alle zurücksetzen</button>
  </div>
  <div id="money-entries" style="overflow-y:auto;height:calc(100vh - 162px);padding:10px 14px"></div>
</div>

<!-- TAB: RANG SYSTEM -->
<div id="tab-rank" class="tab-pane">
  <div class="rank-wrap">
    <!-- LEFT: Rang Definitionen -->
    <div class="rank-cfg">
      <div class="rank-cfg-title">🏆 Rang-Definitionen
        <button onclick="rankExport()" title="Exportieren" style="margin-left:auto;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 8px;cursor:pointer">⬇️</button>
        <button onclick="rankImport()" title="Importieren" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 8px;cursor:pointer">⬆️</button>
      </div>
      <div style="font-size:.65rem;color:var(--text3);margin-bottom:10px;line-height:1.55">
        Definiere Ränge mit Namen, Icon und Farbe. Level 1 = niedrigster Rang.<br>
        Im Bot kannst du Ränge per Aktion setzen, erhöhen oder entfernen.
      </div>
      <div id="rank-def-list"></div>
      <button class="rank-add-btn" onclick="rankDefNew()">+ Neuen Rang hinzufügen</button>

      <div style="margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.07)">
        <div class="rank-cfg-title">⚙️ Abfrage-Befehl</div>
        <div style="display:flex;flex-direction:column;gap:7px">
          <label style="font-size:.65rem;color:var(--text3)">Chat-Befehl für Rang-Abfrage:
            <input id="rank-cmd-inp" class="cf" style="width:100%;margin-top:3px" placeholder="!rang"
              value="" oninput="rankSetCmd(this.value)">
          </label>
          <label style="font-size:.65rem;color:var(--text3)">Antwort-Typ:
            <select id="rank-cmdtyp-inp" class="cf" style="margin-top:3px;width:100%" onchange="rankSetCmdTyp(this.value)">
              <option value="whisper">🤫 Whisper (privat)</option>
              <option value="chat">💬 Chat (öffentlich)</option>
            </select>
          </label>
          <div style="font-size:.6rem;color:var(--text3)">Variablen: {name} {rang} {rang_icon} {rang_level}</div>
          <label style="font-size:.65rem;color:var(--text3)">Antwort-Text:
            <input id="rank-cmdtext-inp" class="cf" style="width:100%;margin-top:3px" 
              placeholder="{name} hat Rang: {rang_icon} {rang}"
              value="" oninput="rankSetCmdText(this.value)">
          </label>
        </div>
      </div>

      <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.07)">
        <div class="rank-cfg-title">🗑 Daten</div>
        <button onclick="rankResetAllPlayers()" style="width:100%;font-size:.68rem;padding:6px;background:#2a0a0a;border:1px solid var(--red);color:var(--red);border-radius:6px;cursor:pointer">Alle Spieler-Ränge zurücksetzen</button>
      </div>
    </div>

    <!-- RIGHT: Spieler-Ränge -->
    <div class="rank-players">
      <div class="rank-filter-bar">
        <span style="font-weight:700;font-size:.82rem">👥 Spieler-Ränge</span>
        <input class="rank-search" id="rank-search" placeholder="🔍 Spieler suchen…" oninput="renderRankPlayers()">
        <select id="rank-filter-sel" class="cf" style="width:150px" onchange="renderRankPlayers()">
          <option value="">Alle Ränge</option>
        </select>
        <button onclick="rankAddPlayerManual()" style="font-size:.68rem;padding:4px 12px;background:var(--pd);border:none;color:var(--pl);border-radius:5px;cursor:pointer;margin-left:auto">+ Spieler hinzufügen</button>
      </div>
      <div id="rank-player-list">
        <div class="rank-empty">🏆 Noch keine Spieler-Ränge.<br><span style="font-size:.72rem;color:var(--text3)">Ränge werden automatisch gesetzt wenn ein Bot die Aktion „Rang setzen" ausführt.</span></div>
      </div>
    </div>
  </div>
</div>

<!-- Rang Edit Modal -->
<div id="rank-modal-overlay" class="rank-modal-overlay" style="display:none" onclick="if(event.target===this)rankModalClose()">
  <div class="rank-modal">
    <h3 id="rank-modal-title">🏆 Rang bearbeiten</h3>
    <input type="hidden" id="rank-modal-id">
    <label>Name</label>
    <input class="cf" id="rank-modal-name" placeholder="z.B. Neuling, Meister, Legende…">
    <label>Icon / Emoji</label>
    <input class="cf" id="rank-modal-icon" placeholder="🏆" style="width:80px">
    <label>Farbe</label>
    <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
      <input type="color" id="rank-modal-color" value="#c4b5fd" style="width:40px;height:28px;padding:1px;border:none;background:none;cursor:pointer">
      <input class="cf" id="rank-modal-color-hex" placeholder="#c4b5fd" style="width:90px" oninput="document.getElementById('rank-modal-color').value=this.value">
    </div>
    <label>Level (Reihenfolge)</label>
    <input class="cf" id="rank-modal-level" type="number" min="1" value="1" placeholder="1">
    <div class="rank-modal-btns">
      <button onclick="rankModalClose()" style="padding:7px 16px;border:1px solid rgba(255,255,255,0.1);background:none;color:var(--text3);border-radius:8px;cursor:pointer;font-family:var(--font-ui);font-size:.78rem">Abbrechen</button>
      <button onclick="rankModalSave()" class="btn btn-primary" style="font-size:.78rem;padding:7px 18px">✓ Speichern</button>
    </div>
  </div>
</div>

<!-- TAB: SHOP SYSTEM -->
<div id="tab-shop" class="tab-pane">
  <div class="shop-wrap">
    <!-- LEFT: Shop-Artikel Definitionen -->
    <div class="shop-cfg">
      <div class="shop-cfg-title">🛒 Shop-Artikel
        <button onclick="shopExport()" title="Exportieren" style="margin-left:auto;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 8px;cursor:pointer">⬇️</button>
        <button onclick="shopImport()" title="Importieren" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 8px;cursor:pointer">⬆️</button>
      </div>
      <div style="font-size:.65rem;color:var(--text3);margin-bottom:10px;line-height:1.5">
        Definiere kaufbare Artikel. Jeder Artikel löst Trigger mit der Bedingung <b>🛒 Shop-Kauf</b> aus.<br>
        Befehl: <code style="color:var(--green)">&lt;!pay&gt; "Artikelname"</code> · Für anderen: <code style="color:var(--green)">&lt;!pay&gt; "Artikel" "Spielername"</code> · Für alle: <code style="color:var(--yellow)">&lt;!pay&gt; "Artikel" All</code>
      </div>
      <div id="shop-item-list"></div>
      <button class="shop-add-btn" onclick="shopItemNew()">+ Neuen Artikel hinzufügen</button>

      <div style="margin-top:18px">
        <div class="shop-cfg-title">⚙️ Shop-Einstellungen</div>
        <label style="font-size:.65rem;color:var(--text3)">Pay-Befehl (Chat):
          <input id="shop-cmd-inp" class="cf" style="width:100%;margin-top:3px" placeholder="!pay"
            value="" oninput="shopSetCmd(this.value)">
        </label>
        <label style="font-size:.65rem;color:var(--text3);margin-top:8px;display:block">Standard-Bestätigung (Whisper an Käufer):
          <input id="shop-confirm-inp" class="cf" style="width:100%;margin-top:3px"
            placeholder="{name} kauft: {item} für {preis} {waehrung}. Kontostand: {kontostand}"
            value="" oninput="shopSetConfirm(this.value)">
        </label>
        <label style="font-size:.65rem;color:var(--text3);margin-top:8px;display:block">Fremdkauf-Ankündigung (Chat, wenn für anderen Spieler):
          <input id="shop-announce-inp" class="cf" style="width:100%;margin-top:3px"
            placeholder="{name} hat für {ziel} das Item {item} gekauft."
            value="" oninput="shopSetAnnounce(this.value)">
        </label>
        <label style="font-size:.65rem;color:var(--text3);margin-top:8px;display:block">All-Kauf Ankündigung (Chat, für alle Spieler):
          <input id="shop-announce-all-inp" class="cf" style="width:100%;margin-top:3px"
            placeholder="{name} kauft {item} für alle ({anzahl} Spieler, {gesamt} {waehrung})."
            value="" oninput="shopSetAnnounceAll(this.value)">
        </label>
        <label style="font-size:.65rem;color:var(--text3);margin-top:8px;display:block">Standard-Fehlermeldung (zu wenig Coins):
          <input id="shop-error-inp" class="cf" style="width:100%;margin-top:3px"
            placeholder="Nicht genug {waehrung}! Du hast {kontostand}, benötigt: {preis}."
            value="" oninput="shopSetError(this.value)">
        </label>
        <div style="font-size:.59rem;color:var(--text3);margin-top:6px">Variablen: {name} {ziel} {item} {preis} {waehrung} {kontostand} · All-Kauf: {anzahl} {gesamt}</div>
      </div>

      <div style="margin-top:18px">
        <div class="shop-cfg-title">🗑 Daten</div>
        <button onclick="shopResetLog()" style="width:100%;font-size:.68rem;padding:6px;background:#0a1a0a;border:1px solid var(--green);color:var(--green);border-radius:6px;cursor:pointer;margin-bottom:6px">Kauf-Log leeren</button>
        <button onclick="shopResetAll()" style="width:100%;font-size:.68rem;padding:6px;background:#2a0a0a;border:1px solid var(--red);color:var(--red);border-radius:6px;cursor:pointer">Alle Shop-Daten zurücksetzen</button>
      </div>
    </div>

    <!-- RIGHT: Kauf-Log -->
    <div class="shop-right">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.07)">
        <span style="font-size:.85rem;font-weight:700;color:var(--text1)">📋 Kauf-Verlauf</span>
        <span id="shop-log-count" style="font-size:.65rem;color:var(--text3)"></span>
      </div>
      <div id="shop-log-list">
        <div class="shop-empty">🛒 Noch keine Käufe.<br><span style="font-size:.72rem;color:var(--text3)">Käufe erscheinen hier wenn der Bot aktiv ist und ein Spieler einen Artikel kauft.</span></div>
      </div>
    </div>
  </div>
</div>

<!-- Shop Item Edit Modal -->
<div id="shop-modal-overlay" class="shop-modal-overlay" style="display:none" onclick="if(event.target===this)shopModalClose()">
  <div class="shop-modal">
    <h3 id="shop-modal-title">🛒 Artikel bearbeiten</h3>
    <input type="hidden" id="shop-modal-id">
    <label>Artikelname (wird im Befehl verwendet)</label>
    <input class="cf" id="shop-modal-name" placeholder="z.B. Gag, Handschellen, VIP…">
    <label>Beschreibung (optional, für Log)</label>
    <input class="cf" id="shop-modal-desc" placeholder="z.B. Ein einfacher Knebel">
    <label>Icon / Emoji</label>
    <input class="cf" id="shop-modal-icon" placeholder="🛒" style="width:80px">
    <label>Preis (Coins)</label>
    <input class="cf" id="shop-modal-preis" type="number" min="0" value="10">
    <label>Aktiv</label>
    <select class="cf" id="shop-modal-aktiv">
      <option value="true">✅ Aktiv</option>
      <option value="false">❌ Deaktiviert</option>
    </select>
    <label>Bestätigungsnachricht (leer = Standard)</label>
    <input class="cf" id="shop-modal-confirm" placeholder="Leer = Standard-Nachricht">
    <label>Fremdkauf-Ankündigung (öffentlicher Chat, leer = Standard)</label>
    <input class="cf" id="shop-modal-announce" placeholder="Leer = Standard-Nachricht">
    <label>All-Kauf Ankündigung (öffentlicher Chat, leer = Standard)</label>
    <input class="cf" id="shop-modal-announce-all" placeholder="Leer = Standard-Nachricht">
    <label>Fehlermeldung bei zu wenig Coins (leer = Standard)</label>
    <input class="cf" id="shop-modal-error" placeholder="Leer = Standard-Nachricht">
    <div style="font-size:.59rem;color:var(--text3);margin-top:4px">Variablen: {name} {ziel} {item} {preis} {waehrung} {kontostand} · All-Kauf: {anzahl} {gesamt}</div>
    <div class="shop-modal-btns">
      <button onclick="shopModalClose()" style="padding:7px 16px;border:1px solid rgba(255,255,255,0.1);background:none;color:var(--text3);border-radius:8px;cursor:pointer;font-family:var(--font-ui);font-size:.78rem">Abbrechen</button>
      <button onclick="shopModalSave()" style="padding:7px 18px;background:var(--green);border:none;color:#000;border-radius:8px;cursor:pointer;font-family:var(--font-ui);font-size:.78rem;font-weight:700">✓ Speichern</button>
    </div>
  </div>
</div>

<script>
// ══ BOT ENGINE ══════════════════════════════════════════════

const BOT_KEY = 'BC_Bots_v2';
const MONEY_KEY = 'BC_Money_v1';

// Money storage: { settings: {name, queryCmd}, balances: { memberNum: {name, balance} } }
let _money = { settings: { name: 'Gold', queryCmd: '!gold', queryTyp: 'whisper' }, balances: {} };
(()=>{ try { const s=localStorage.getItem(MONEY_KEY); if(s){ const d=JSON.parse(s); _money=Object.assign(_money,d); } } catch{} })();
function _saveMoney() { try { localStorage.setItem(MONEY_KEY, JSON.stringify(_money)); } catch {} }

let _bots      = [];
let _selBotId  = null;
let _ipickerCb = null;
let _ipickerTab= 'item';
// Item Manager integration: pending trigger context
let _trigPending = null; // {tid, ai, cb} – set when IM opened from trigger
let _ipickerForActContext = null; // {tid, ai} for restoring open state

// ── Persistence ───────────────────────────────────────────────
function _saveBots() {
  try { localStorage.setItem(BOT_KEY, JSON.stringify(_bots)); } catch {}
}
function _loadBots() {
  try { const s = localStorage.getItem(BOT_KEY); if (s) _bots = JSON.parse(s); } catch {}
}
function _selBot() { return _bots.find(b => b.id === _selBotId) ?? null; }

// ── Tab entry ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════
//  MONEY SYSTEM
// ══════════════════════════════════════════════════════
function renderMoneyTab() {
  // Init UI values
  document.getElementById('money-name-inp').value = _money.settings.name ?? 'Gold';
  document.getElementById('money-cmd-inp').value  = _money.settings.queryCmd ?? '!gold';
  const typSel = document.getElementById('money-typ-inp');
  if (typSel) typSel.value = _money.settings.queryTyp ?? 'whisper';
  const entries = Object.entries(_money.balances);
  const cur = _money.settings.name || 'Gold';
  if (!entries.length) {
    document.getElementById('money-entries').innerHTML = `<div style="color:var(--text3);font-size:.75rem;text-align:center;margin-top:40px">Noch keine Spieler – „+ Spieler hinzufügen" oder wird automatisch via Bot befüllt</div>`;
    return;
  }
  const html = entries.sort((a,b)=>b[1].balance-a[1].balance).map(([id, p]) => `
    <div class="money-card" id="mcrd-${id}">
      <span class="money-name">👤 ${escHtml(p.name||id)}</span>
      <span class="money-balance">${p.balance ?? 0}</span>
      <span style="font-size:.65rem;color:var(--text3)">${escHtml(cur)}</span>
      <div class="money-adj">
        <input class="cf" type="number" id="madj-${id}" value="0" style="width:64px">
        <button class="money-plus" onclick="moneyAdj('${id}',+1)">+</button>
        <button class="money-minus" onclick="moneyAdj('${id}',-1)">−</button>
        <button onclick="moneySet('${id}',prompt('Genauen Wert setzen für ${escHtml(p.name||id)}:',${p.balance??0}))" style="font-size:.62rem;padding:3px 7px;background:var(--bg3);border:1px solid var(--border2);color:var(--text3);border-radius:4px;cursor:pointer">= Setzen</button>
        <button onclick="moneyRemovePlayer('${id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 6px">✕</button>
      </div>
    </div>`).join('');
  document.getElementById('money-entries').innerHTML = html;
}

function moneySetName(v) { _money.settings.name = v.trim()||'Gold'; _saveMoney(); }
function moneySetCmd(v)  { _money.settings.queryCmd = v.trim(); _saveMoney(); }
function moneySetTyp(v)  { _money.settings.queryTyp = v; _saveMoney(); }

function moneyAdj(id, sign) {
  const amt = +document.getElementById('madj-'+id)?.value || 0;
  if (!amt) return;
  const p = _money.balances[id]; if (!p) return;
  p.balance = (p.balance??0) + sign*amt;
  _saveMoney(); renderMoneyTab();
}

function moneySet(id, val) {
  if (val === null || val === '') return;
  const p = _money.balances[id]; if (!p) return;
  p.balance = parseInt(val)||0;
  _saveMoney(); renderMoneyTab();
}

function moneyAddPlayer() {
  const name = prompt('Spielername oder MemberNumber:');
  if (!name?.trim()) return;
  const id = 'manual_'+Date.now();
  _money.balances[id] = { name: name.trim(), balance: 0 };
  _saveMoney(); renderMoneyTab();
}

function moneyRemovePlayer(id) {
  delete _money.balances[id]; _saveMoney(); renderMoneyTab();
}

function moneyResetAll() {
  if (!confirm('Alle Guthaben auf 0 zurücksetzen?')) return;
  Object.values(_money.balances).forEach(p => p.balance = 0);
  _saveMoney(); renderMoneyTab();
}

// Called by bot via postMessage
function _moneyApply(memberNum, name, delta, setVal) {
  const id = memberNum; // key = raw MemberNumber
  if (!_money.balances[id]) _money.balances[id] = { name: name||('#'+memberNum), balance: 0 };
  const p = _money.balances[id];
  p.name = name || p.name;
  if (setVal !== undefined) p.balance = parseInt(setVal)||0;
  else p.balance = (p.balance??0) + (parseInt(delta)||0);
  _saveMoney();
  // Live update if tab open
  if (document.getElementById('tab-money')?.classList.contains('active')) renderMoneyTab();
  // Update tab badge
  const btn = document.getElementById('tab-money-btn');
  if (btn) btn.textContent = '💰 Money (' + Object.keys(_money.balances).length + ')';
}


// ══════════════════════════════════════════════════════
//  RANG SYSTEM
// ══════════════════════════════════════════════════════
const RANK_KEY = 'BC_Rank_v1';
let _rankData = {
  settings: { queryCmd: '!rang', queryCmdTyp: 'whisper', queryCmdText: '{name} hat Rang: {rang_icon} {rang}' },
  defs: [],
  players: {}
};
(()=>{
  try { const s=localStorage.getItem(RANK_KEY); if(s) _rankData = Object.assign({settings:{queryCmd:'!rang',queryCmdTyp:'whisper',queryCmdText:'{name} hat Rang: {rang_icon} {rang}'},defs:[],players:{}},JSON.parse(s)); } catch{}
})();
function _saveRank() { try { localStorage.setItem(RANK_KEY, JSON.stringify(_rankData)); } catch {} }
function _rankById(id) { return _rankData.defs.find(r=>r.id===id)??null; }
function _rankSorted() { return [..._rankData.defs].sort((a,b)=>a.level-b.level); }

// ══════════════════════════════════════════════════════
//  SHOP SYSTEM
// ══════════════════════════════════════════════════════
const SHOP_KEY = 'BC_Shop_v1';
let _shop = {
  settings: { cmd: '!pay', confirmMsg: '', errorMsg: '' },
  items: [],
  log: []
};
(()=>{
  try { const s=localStorage.getItem(SHOP_KEY); if(s) _shop = Object.assign({settings:{cmd:'!pay',confirmMsg:'',errorMsg:''},items:[],log:[]},JSON.parse(s)); } catch{}
})();
function _saveShop() { try { localStorage.setItem(SHOP_KEY, JSON.stringify(_shop)); } catch {} }
function _shopById(id) { return _shop.items.find(i=>i.id===id)??null; }

function renderShopTab() {
  // Sync settings inputs
  const cmdEl = document.getElementById('shop-cmd-inp');
  if (cmdEl) cmdEl.value = _shop.settings.cmd ?? '!pay';
  const confEl = document.getElementById('shop-confirm-inp');
  if (confEl) confEl.value = _shop.settings.confirmMsg ?? '';
  const annEl = document.getElementById('shop-announce-inp');
  if (annEl) annEl.value = _shop.settings.announceMsg ?? '';
  const annAllEl = document.getElementById('shop-announce-all-inp');
  if (annAllEl) annAllEl.value = _shop.settings.announceAllMsg ?? '';
  const errEl = document.getElementById('shop-error-inp');
  if (errEl) errEl.value = _shop.settings.errorMsg ?? '';
  renderShopItems();
  renderShopLog();
  // Update tab badge
  const btn = document.getElementById('tab-shop-btn');
  if (btn) btn.textContent = '🛒 Shop (' + _shop.items.filter(i=>i.aktiv).length + ')';
}

function renderShopItems() {
  const el = document.getElementById('shop-item-list'); if (!el) return;
  const items = _shop.items;
  if (!items.length) { el.innerHTML = '<div style="font-size:.7rem;color:var(--text3);text-align:center;padding:12px 0">Noch keine Artikel.</div>'; return; }
  el.innerHTML = items.map(item => `
    <div class="shop-item-card ${item.aktiv?'':'shop-item-inactive'}">
      <span class="shop-item-icon">${escHtml(item.icon||'🛒')}</span>
      <div style="flex:1;min-width:0">
        <div class="shop-item-name">${escHtml(item.name||'–')}</div>
        ${item.beschreibung?`<div style="font-size:.62rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(item.beschreibung)}</div>`:''}
      </div>
      <span class="shop-item-price">${item.preis??0} 💰</span>
      <button onclick="shopItemEdit('${item.id}')" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 7px;cursor:pointer">✏️</button>
      <button onclick="shopItemDelete('${item.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">✕</button>
    </div>
  `).join('');
}

function renderShopLog() {
  const el = document.getElementById('shop-log-list'); if (!el) return;
  const log = [...(_shop.log||[])].reverse();
  const cntEl = document.getElementById('shop-log-count');
  if (cntEl) cntEl.textContent = log.length + ' Käufe';
  if (!log.length) {
    el.innerHTML = '<div class="shop-empty">🛒 Noch keine Käufe.<br><span style="font-size:.72rem;color:var(--text3)">Käufe erscheinen hier wenn der Bot aktiv ist und ein Spieler einen Artikel kauft.</span></div>';
    return;
  }
  el.innerHTML = log.map(e => {
    const d = new Date(e.ts);
    const timeStr = d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    let targetStr = '';
    if (e.isAll) {
      targetStr = ` → <span style="color:#fbbf24">Alle (${e.anzahl} Spieler)</span>`;
    } else if (e.targetName && e.targetName !== e.buyerName) {
      targetStr = ` → <span style="color:#60a5fa">${escHtml(e.targetName)}</span>`;
    }
    const preisLabel = e.isAll
      ? `<span style="color:var(--yellow)">${e.preis} 💰</span> <span style="font-size:.6rem;color:var(--text3)">(${e.anzahl}×${e.preis/e.anzahl})</span>`
      : `<span style="color:var(--green)">${e.preis} 💰</span>`;
    return `<div class="shop-log-card">
      <span class="shop-log-who">${escHtml(e.buyerName||('#'+e.buyerNum))}</span>${targetStr}
      kauft <span class="shop-log-item">${e.isAll?'🌍 ':''}${escHtml(e.itemName||'?')}</span>
      für ${preisLabel}
      <div class="shop-log-meta">${timeStr} · #${e.buyerNum}${e.targetNum&&e.targetNum!==e.buyerNum&&!e.isAll?' → #'+e.targetNum:''}</div>
    </div>`;
  }).join('');
}

function shopSetCmd(v)        { _shop.settings.cmd = v.trim(); _saveShop(); }
function shopSetConfirm(v)    { _shop.settings.confirmMsg = v; _saveShop(); }
function shopSetAnnounce(v)   { _shop.settings.announceMsg = v; _saveShop(); }
function shopSetAnnounceAll(v){ _shop.settings.announceAllMsg = v; _saveShop(); }
function shopSetError(v)      { _shop.settings.errorMsg = v; _saveShop(); }

function shopItemNew() {
  document.getElementById('shop-modal-id').value = '';
  document.getElementById('shop-modal-title').textContent = '🛒 Neuer Artikel';
  document.getElementById('shop-modal-name').value = '';
  document.getElementById('shop-modal-desc').value = '';
  document.getElementById('shop-modal-icon').value = '🛒';
  document.getElementById('shop-modal-preis').value = '10';
  document.getElementById('shop-modal-aktiv').value = 'true';
  document.getElementById('shop-modal-confirm').value = '';
  document.getElementById('shop-modal-announce').value = '';
  document.getElementById('shop-modal-announce-all').value = '';
  document.getElementById('shop-modal-error').value = '';
  document.getElementById('shop-modal-overlay').style.display = 'flex';
}

function shopItemEdit(id) {
  const item = _shopById(id); if (!item) return;
  document.getElementById('shop-modal-id').value = id;
  document.getElementById('shop-modal-title').textContent = '✏️ Artikel bearbeiten';
  document.getElementById('shop-modal-name').value = item.name||'';
  document.getElementById('shop-modal-desc').value = item.beschreibung||'';
  document.getElementById('shop-modal-icon').value = item.icon||'🛒';
  document.getElementById('shop-modal-preis').value = item.preis??10;
  document.getElementById('shop-modal-aktiv').value = item.aktiv !== false ? 'true' : 'false';
  document.getElementById('shop-modal-confirm').value = item.confirmMsg||'';
  document.getElementById('shop-modal-announce').value = item.announceMsg||'';
  document.getElementById('shop-modal-announce-all').value = item.announceAllMsg||'';
  document.getElementById('shop-modal-error').value = item.errorMsg||'';
  document.getElementById('shop-modal-overlay').style.display = 'flex';
}

function shopModalClose() { document.getElementById('shop-modal-overlay').style.display = 'none'; }

function shopModalSave() {
  const id = document.getElementById('shop-modal-id').value;
  const name = document.getElementById('shop-modal-name').value.trim();
  if (!name) { alert('Artikelname ist erforderlich.'); return; }
  const data = {
    name,
    beschreibung: document.getElementById('shop-modal-desc').value.trim(),
    icon: document.getElementById('shop-modal-icon').value.trim()||'🛒',
    preis: parseInt(document.getElementById('shop-modal-preis').value)||0,
    aktiv: document.getElementById('shop-modal-aktiv').value !== 'false',
    confirmMsg: document.getElementById('shop-modal-confirm').value.trim(),
    announceMsg: document.getElementById('shop-modal-announce').value.trim(),
    announceAllMsg: document.getElementById('shop-modal-announce-all').value.trim(),
    errorMsg: document.getElementById('shop-modal-error').value.trim(),
  };
  if (id) {
    const item = _shopById(id); if (item) Object.assign(item, data);
  } else {
    _shop.items.push({ id:'shop'+Date.now(), ...data });
  }
  _saveShop(); shopModalClose(); renderShopItems();
  const btn = document.getElementById('tab-shop-btn');
  if (btn) btn.textContent = '🛒 Shop (' + _shop.items.filter(i=>i.aktiv).length + ')';
}

function shopItemDelete(id) {
  if (!confirm('Artikel wirklich löschen?')) return;
  _shop.items = _shop.items.filter(i=>i.id!==id);
  _saveShop(); renderShopItems();
}

function shopResetLog() {
  if (!confirm('Kauf-Log wirklich leeren?')) return;
  _shop.log = []; _saveShop(); renderShopLog();
}

function shopResetAll() {
  if (!confirm('Alle Shop-Daten wirklich zurücksetzen?')) return;
  _shop.items = []; _shop.log = []; _saveShop(); renderShopTab();
}

function shopExport() {
  const blob = new Blob([JSON.stringify({items:_shop.items,settings:_shop.settings},null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='shop_export.json'; a.click();
}

function shopImport() {
  const inp = document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange = e => {
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(d.items){_shop.items=d.items;_saveShop();renderShopItems();}}catch{alert('Ungültige Shop-Datei.');}};
    r.readAsText(f);
  };
  inp.click();
}

// Called from bot via postMessage when a purchase occurs
function _shopLogPurchase(data) {
  _shop.log = _shop.log || [];
  _shop.log.push({ ts: Date.now(), buyerNum: data.buyerNum, buyerName: data.buyerName, targetNum: data.targetNum, targetName: data.targetName, itemName: data.itemName, preis: data.preis, isAll: data.isAll||false, anzahl: data.anzahl||1 });
  // Keep last 200 entries
  if (_shop.log.length > 200) _shop.log = _shop.log.slice(-200);
  _saveShop();
  if (document.getElementById('tab-shop')?.classList.contains('active')) renderShopLog();
}

function renderRankTab() {
  const si = document.getElementById('rank-cmd-inp');      if(si) si.value = _rankData.settings.queryCmd??'!rang';
  const st = document.getElementById('rank-cmdtyp-inp');   if(st) st.value = _rankData.settings.queryCmdTyp??'whisper';
  const sx = document.getElementById('rank-cmdtext-inp');  if(sx) sx.value = _rankData.settings.queryCmdText??'{name} hat Rang: {rang_icon} {rang}';
  renderRankDefs(); renderRankPlayers(); _rankUpdateFilterSelect();
}

function renderRankDefs() {
  const el = document.getElementById('rank-def-list'); if(!el) return;
  const sorted = _rankSorted();
  if(!sorted.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:.72rem;text-align:center;padding:18px 0">Noch keine Raenge. Fuege deinen ersten Rang hinzu!</div>';
    return;
  }
  el.innerHTML = sorted.map((r,i)=>`
    <div class="rank-def-card" id="rdef-${r.id}">
      <span style="display:flex;flex-direction:column;gap:1px">
        <button class="order-btn" onclick="rankDefMoveUp('${r.id}')" ${i===0?'disabled':''}>&#9650;</button>
        <button class="order-btn" onclick="rankDefMoveDown('${r.id}')" ${i===sorted.length-1?'disabled':''}>&#9660;</button>
      </span>
      <span class="rank-def-badge" style="background:${r.farbe}22;color:${r.farbe};border-color:${r.farbe}55">${escHtml(r.icon||'\uD83C\uDFC5')} ${escHtml(r.name)}</span>
      <span class="rank-def-level">Lv.${r.level}</span>
      <span style="flex:1"></span>
      <button onclick="rankDefEdit('${r.id}')" style="background:none;border:1px solid rgba(255,255,255,0.1);border-radius:5px;color:var(--text3);font-size:.62rem;padding:2px 7px;cursor:pointer">&#9999;&#65039;</button>
      <button onclick="rankDefDelete('${r.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">&#x2715;</button>
    </div>`).join('');
}

function renderRankPlayers() {
  const el = document.getElementById('rank-player-list'); if(!el) return;
  const search = (document.getElementById('rank-search')?.value||'').toLowerCase();
  const filterRank = document.getElementById('rank-filter-sel')?.value||'';
  let entries = Object.entries(_rankData.players);
  if(search) entries = entries.filter(([,p])=>(p.name||'').toLowerCase().includes(search));
  if(filterRank==='__none__') entries = entries.filter(([,p])=>!p.rankId);
  else if(filterRank) entries = entries.filter(([,p])=>p.rankId===filterRank);
  if(!entries.length) {
    el.innerHTML = `<div class="rank-empty">&#127942; Keine Spieler gefunden.<br><span style="font-size:.72rem;color:var(--text3)">Raenge werden automatisch gesetzt wenn der Bot die Aktion "Rang setzen" ausfuehrt.</span></div>`;
    return;
  }
  const sorted = _rankSorted();
  el.innerHTML = entries.sort((a,b)=>{ const la=_rankById(a[1].rankId)?.level??-1; const lb=_rankById(b[1].rankId)?.level??-1; return lb-la; }).map(([num,p])=>{
    const rank=_rankById(p.rankId);
    const badge=rank?`<span class="rank-def-badge" style="background:${rank.farbe}22;color:${rank.farbe};border-color:${rank.farbe}55;font-size:.69rem">${escHtml(rank.icon||'\uD83C\uDFC5')} ${escHtml(rank.name)}</span>`:`<span class="rank-badge-none">- Kein Rang -</span>`;
    const ts=p.assignedAt?new Date(p.assignedAt).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
    const histCount=(p.history||[]).length;
    return `<div class="rank-player-card">
      <div><div class="rank-player-name">${escHtml(p.name||('#'+num))}</div><div class="rank-player-num">#${num}</div></div>
      <div class="rank-player-rank">${badge}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        <select class="cf" style="font-size:.68rem;width:160px" onchange="rankSetPlayerDirect('${num}',this.value)">
          <option value="">- Kein Rang -</option>
          ${sorted.map(r=>`<option value="${r.id}" ${p.rankId===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
        </select>
        ${histCount?`<button class="rank-history-btn" onclick="rankShowHistory('${num}')" title="${histCount} Eintraege">&#128345; ${histCount}</button>`:''}
        <span style="font-size:.6rem;color:var(--text3);white-space:nowrap">${ts}</span>
        <button onclick="rankRemovePlayer('${num}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 5px">&#x2715;</button>
      </div>
    </div>`;
  }).join('');
}

function _rankUpdateFilterSelect() {
  const sel = document.getElementById('rank-filter-sel'); if(!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Alle Raenge</option><option value="__none__">- Kein Rang -</option>' +
    _rankSorted().map(r=>`<option value="${r.id}" ${cur===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)}</option>`).join('');
}

function rankDefNew() { _rankOpenModal(null); }
function rankDefEdit(id) { _rankOpenModal(id); }

function _rankOpenModal(id) {
  const r = id ? _rankById(id) : null;
  const maxLevel = _rankData.defs.length ? Math.max(..._rankData.defs.map(x=>x.level))+1 : 1;
  document.getElementById('rank-modal-id').value = id||'';
  document.getElementById('rank-modal-title').textContent = r ? 'Rang bearbeiten' : 'Neuen Rang erstellen';
  document.getElementById('rank-modal-name').value = r?.name||'';
  document.getElementById('rank-modal-icon').value = r?.icon||'\uD83C\uDFC5';
  document.getElementById('rank-modal-color').value = r?.farbe||'#c4b5fd';
  document.getElementById('rank-modal-color-hex').value = r?.farbe||'#c4b5fd';
  document.getElementById('rank-modal-level').value = r?.level??maxLevel;
  document.getElementById('rank-modal-overlay').style.display='flex';
  setTimeout(()=>document.getElementById('rank-modal-name')?.focus(),50);
}

document.addEventListener('input', e=>{
  if(e.target.id==='rank-modal-color') document.getElementById('rank-modal-color-hex').value=e.target.value;
  if(e.target.id==='rank-modal-color-hex') document.getElementById('rank-modal-color').value=e.target.value;
});

function rankModalClose() { document.getElementById('rank-modal-overlay').style.display='none'; }

function rankModalSave() {
  const id = document.getElementById('rank-modal-id').value;
  const name = document.getElementById('rank-modal-name').value.trim();
  const icon = document.getElementById('rank-modal-icon').value.trim()||'\uD83C\uDFC5';
  const farbe = document.getElementById('rank-modal-color').value||'#c4b5fd';
  const level = parseInt(document.getElementById('rank-modal-level').value)||1;
  if(!name) { alert('Bitte gib einen Namen fuer den Rang ein.'); return; }
  if(id) { const r=_rankById(id); if(!r) return; r.name=name; r.icon=icon; r.farbe=farbe; r.level=level; }
  else { _rankData.defs.push({id:'r'+Date.now(), name, icon, farbe, level}); }
  _saveRank(); rankModalClose(); renderRankDefs(); _rankUpdateFilterSelect(); renderRankPlayers();
}

function rankDefDelete(id) {
  const r=_rankById(id); if(!r||!confirm('Rang "'+r.name+'" loeschen?')) return;
  _rankData.defs=_rankData.defs.filter(x=>x.id!==id);
  Object.values(_rankData.players).forEach(p=>{ if(p.rankId===id) p.rankId=null; });
  _saveRank(); renderRankDefs(); _rankUpdateFilterSelect(); renderRankPlayers();
}

function _rankRelevel() { _rankSorted().forEach((r,i)=>{ const d=_rankById(r.id); if(d) d.level=i+1; }); _saveRank(); }

function rankDefMoveUp(id) {
  const s=_rankSorted(); const i=s.findIndex(r=>r.id===id); if(i<=0) return;
  [s[i].level,s[i-1].level]=[s[i-1].level,s[i].level]; _rankRelevel(); renderRankDefs();
}

function rankDefMoveDown(id) {
  const s=_rankSorted(); const i=s.findIndex(r=>r.id===id); if(i<0||i>=s.length-1) return;
  [s[i].level,s[i+1].level]=[s[i+1].level,s[i].level]; _rankRelevel(); renderRankDefs();
}

function rankSetPlayerDirect(memberNum, rankId) {
  _rankApply(memberNum, _rankData.players[memberNum]?.name||('#'+memberNum), rankId||null, 'manuell');
  renderRankPlayers();
}

function rankRemovePlayer(memberNum) {
  if(!confirm('Spieler-Eintrag loeschen?')) return;
  delete _rankData.players[memberNum]; _saveRank(); renderRankPlayers();
}

function rankAddPlayerManual() {
  const name = prompt('Spielername oder MemberNumber:');
  if(!name?.trim()) return;
  const num = 'manual_'+Date.now();
  _rankData.players[num] = {name:name.trim(), rankId:null, assignedAt:Date.now(), history:[]};
  _saveRank(); renderRankPlayers();
}

function rankShowHistory(memberNum) {
  const p=_rankData.players[memberNum]; if(!p) return;
  const hist=(p.history||[]).slice(-20).reverse();
  const lines=hist.map(h=>{
    const r=_rankById(h.rankId);
    const ts=new Date(h.ts).toLocaleString('de-DE');
    return `<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <span style="font-size:.6rem;color:var(--text3);white-space:nowrap">${ts}</span>
      ${r?`<span style="font-size:.69rem;font-weight:700;color:${r.farbe}">${escHtml(r.icon+' '+r.name)}</span>`:'<span style="color:var(--text3);font-size:.69rem">- Entfernt -</span>'}
      ${h.source?`<span style="font-size:.58rem;color:var(--text3)">(${escHtml(h.source)})</span>`:''}
    </div>`;
  }).join('');
  const existing=document.getElementById('_rankHistPopup'); if(existing) existing.remove();
  const popup=document.createElement('div');
  popup.id='_rankHistPopup'; popup.className='rank-history-popup';
  popup.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:700;max-height:320px;overflow-y:auto;min-width:300px';
  popup.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <span style="font-size:.78rem;font-weight:700;color:#c4b5fd">Rang-Verlauf: ${escHtml(p.name||('#'+memberNum))}</span>
    <button onclick="document.getElementById('_rankHistPopup').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.85rem">&#x2715;</button>
  </div>${lines||'<div style="color:var(--text3);font-size:.72rem">Kein Verlauf vorhanden.</div>'}`;
  document.body.appendChild(popup);
  setTimeout(()=>{ const close=(e)=>{ if(!popup.contains(e.target)){popup.remove();document.removeEventListener('click',close);} }; document.addEventListener('click',close); },200);
}

function _rankApply(memberNum, name, rankId, source) {
  const id=String(memberNum);
  if(!_rankData.players[id]) _rankData.players[id]={name:name||('#'+id),rankId:null,assignedAt:null,history:[]};
  const p=_rankData.players[id];
  p.name=name||p.name; if(!p.history) p.history=[];
  p.history.push({rankId,ts:Date.now(),source:source||'bot'});
  if(p.history.length>50) p.history.shift();
  p.rankId=rankId; p.assignedAt=Date.now(); _saveRank();
  if(document.getElementById('tab-rank')?.classList.contains('active')) renderRankPlayers();
  const btn=document.getElementById('tab-rank-btn');
  if(btn){ const total=Object.values(_rankData.players).filter(x=>x.rankId).length; btn.textContent='\uD83C\uDFC6 Rang ('+total+')'; }
}

function rankSetCmd(v)     { _rankData.settings.queryCmd=v.trim(); _saveRank(); }
function rankSetCmdTyp(v)  { _rankData.settings.queryCmdTyp=v; _saveRank(); }
function rankSetCmdText(v) { _rankData.settings.queryCmdText=v; _saveRank(); }

function rankResetAllPlayers() {
  if(!confirm('Alle Spieler-Raenge zuruecksetzen?')) return;
  Object.values(_rankData.players).forEach(p=>{p.rankId=null;p.history=[];});
  _saveRank(); renderRankPlayers();
}

function rankExport() {
  const blob=new Blob([JSON.stringify({defs:_rankData.defs,settings:_rankData.settings},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='rang-system.json'; a.click();
}

function rankImport() {
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange=e=>{ const r=new FileReader(); r.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(d.defs) _rankData.defs=d.defs;
      if(d.settings) _rankData.settings=Object.assign(_rankData.settings,d.settings);
      _saveRank(); renderRankTab(); showStatus('Rang-System importiert','success');
    }catch(err){showStatus('Fehler: '+err.message,'error');} }; r.readAsText(e.target.files[0]); }; inp.click();
}

// ══════════════════════════════════════════════════════
//  BOT LOG SYSTEM
// ══════════════════════════════════════════════════════
window._BCBotLog = window._BCBotLog ?? [];
// Logs aus localStorage laden (persistiert über Konfigurator-Neustarts)
if (!window._BCBotLog.length) {
  try { const s=localStorage.getItem('BCBot_Logs'); if(s) window._BCBotLog=JSON.parse(s); } catch(e) {}
}
let _logFilter = '';

function logPush(entry) {
  window._BCBotLog.unshift(entry); // Neueste zuerst
  if (window._BCBotLog.length > 2000) window._BCBotLog.length = 2000; // Max 2000 Einträge
  _saveLogsToStorage(); // Persistent
  // Live-Update wenn Log-Tab aktiv
  if (document.getElementById('tab-log')?.classList.contains('active')) renderLogTab();
  // Badge auf Tab-Button aktualisieren
  const btn = document.getElementById('tab-log-btn');
  if (btn) btn.textContent = '📋 Logs' + (window._BCBotLog.length ? ' ('+window._BCBotLog.length+')' : '');
}

function logFilter(f) {
  _logFilter = f;
  ['all','ok','ug','skip','join','leave'].forEach(k => document.getElementById('logf-'+k)?.classList.remove('active'));
  const map = {'':'all','ok':'ok','ungueltig':'ug','skip':'skip','join':'join','leave':'leave'};
  document.getElementById('logf-'+(map[f]??'all'))?.classList.add('active');
  renderLogTab();
}

function _logEntries() {
  if (!_logFilter) return window._BCBotLog;
  return window._BCBotLog.filter(e => {
    if (_logFilter === 'skip') return e.status.startsWith('skip');
    if (_logFilter === 'join') return e.status.startsWith('join') || e.status === 'leave';
    return e.status === _logFilter;
  });
}

// Gibt zurück ob ein Spieler laut Logs als "bekannt" gilt (war schon im Raum)
function _logKnownPlayers(botId) {
  const known = new Set();
  // Durchsuche Logs rückwärts (älteste zuerst = letztes Element im Array)
  const logs = [...window._BCBotLog].reverse();
  logs.forEach(e => {
    if (!botId || e.botId === botId) {
      if (e.status === 'join' || e.status === 'join_rejoin') {
        if (e.memberNum) known.add(e.memberNum);
      }
    }
  });
  return known;
}

function renderLogTab() {
  const entries = _logEntries();
  const count = document.getElementById('log-count');
  if (count) count.textContent = entries.length + ' / ' + window._BCBotLog.length + ' Einträge';

  const statusLabel = {
    ok:          '<span class="log-badge ok">✅ Ausgelöst</span>',
    ungueltig:   '<span class="log-badge ungueltig">❌ Ungültig</span>',
    skip_wdh:    '<span class="log-badge skip">⏭ Einmalig</span>',
    skip_max:    '<span class="log-badge skip">⏭ Max erreicht</span>',
    join:        '<span class="log-badge" style="background:#0a1a0a;color:#5f5;border:1px solid #1a5a1a">🆕 Erstes Mal</span>',
    join_rejoin: '<span class="log-badge" style="background:#0a0a2a;color:#88f;border:1px solid #1a1a5a">🔄 Rejoin</span>',
    leave:       '<span class="log-badge" style="background:#111;color:#777;border:1px solid #333">🚪 Verlassen</span>',
  };

  const html = entries.map((e, i) => {
    const d = new Date(e.ts);
    const ts = d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const pos = (e.x||e.y) ? `X${e.x} Y${e.y}` : '';
    const badge = statusLabel[e.status] ?? `<span class="log-badge skip">⏭ ${escHtml(e.status)}</span>`;
    const isJoinLeave = ['join','join_rejoin','leave'].includes(e.status);
    const cls = e.status === 'ok' ? 'log-ok' : e.status === 'ungueltig' ? 'log-ungueltig' : isJoinLeave ? '' : 'log-skip';
    const realIdx = window._BCBotLog.indexOf(e);
    const trigPart = isJoinLeave ? '' : `<span style="color:var(--text3);font-size:.65rem">→</span><span class="log-trig">🎯 ${escHtml(e.trigName||'')}</span><span style="color:var(--text3);font-size:.65rem">von</span>`;
    return `<div class="log-entry ${cls}" id="loge-${realIdx}">
      <span class="log-ts">${ts}</span>
      ${badge}
      <span class="log-bot">${escHtml(e.botName||'')}</span>
      ${trigPart}
      <span class="log-player">👤 ${escHtml(e.player||'')}</span>
      ${pos ? `<span class="log-pos">📍 ${pos}</span>` : ''}
      ${e.msg ? `<span style="font-size:.62rem;color:var(--text3);font-style:italic">${escHtml(e.msg)}</span>` : ''}
      <button onclick="logDeleteEntry(${realIdx})" style="margin-left:auto;background:none;border:none;color:var(--text3);cursor:pointer;font-size:.7rem;padding:1px 5px;opacity:.5" onmouseover="this.style.opacity=1;this.style.color='var(--red)'" onmouseout="this.style.opacity=.5;this.style.color='var(--text3)'">✕</button>
    </div>`;
  }).join('');

  document.getElementById('log-entries').innerHTML = html || `<div style="color:var(--text3);font-size:.75rem;text-align:center;margin-top:40px">Noch keine Einträge</div>`;
}

function logDeleteEntry(idx) {
  window._BCBotLog.splice(idx, 1);
  _saveLogsToStorage();
  renderLogTab();
  const btn = document.getElementById('tab-log-btn');
  if (btn) btn.textContent = '📋 Logs' + (window._BCBotLog.length ? ' ('+window._BCBotLog.length+')' : '');
}

function logClearFiltered() {
  const entries = _logEntries();
  entries.forEach(e => {
    const i = window._BCBotLog.indexOf(e);
    if (i >= 0) window._BCBotLog.splice(i, 1);
  });
  _saveLogsToStorage();
  renderLogTab();
}

function logClearAll() {
  window._BCBotLog.length = 0;
  // Auch Bot-States in BC zurücksetzen (alle laufenden Bots)
  _bots.forEach(b=>{
    const safeId = b.id.replace(/\W/g,'_');
    if (b.laufend) bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].clearState();else{delete window['__BCKBotState_${safeId}'];}` });
    // RoomEver löschen = nächstes Mal ist jeder "neu"
  });
  try { localStorage.removeItem('BC_RoomEver_v1'); } catch {}
  renderLogTab();
  const btn = document.getElementById('tab-log-btn');
  if (btn) btn.textContent = '📋 Logs';
}

// ══════════════════════════════════════════════════════
//  EVENTS SYSTEM
// ══════════════════════════════════════════════════════

function renderEventsTab() {
  const bot = _selBot();
  const container = document.getElementById('events-container');
  if (!container) return;
  if (!bot) {
    container.innerHTML = `<div style="color:var(--text3);font-size:.75rem;text-align:center;margin-top:40px">Wähle zuerst einen Bot im 🤖 Bot-Tab.</div>`;
    return;
  }
  const events = bot.events ?? [];
  const html = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span style="font-weight:600;font-size:.85rem">⚡ Events — Bot: <span style="color:var(--pl)">${escHtml(bot.name)}</span></span>
      <button class="be-addevent" onclick="eventNew()" style="width:auto;padding:4px 14px;display:inline-block">+ Event hinzufügen</button>
    </div>
    ${events.map((e,i)=>renderEventCard(bot,e,i)).join('')}
    ${events.length ? '' : '<div style="color:var(--text3);font-size:.73rem;text-align:center;margin-top:30px">Noch keine Events.<br>Events feuern Aktionen manuell oder automatisch auf Spieler im Raum.</div>'}
  `;
  container.innerHTML = html;
}

function _evBadge(e) {
  const beds = e.bedingungen ?? [];
  if (!e.aktiv) return {cls:'manual', lbl:'⏸ Pausiert'};
  if (beds.some(c=>c.typ==='ev_interval')) return {cls:'interval', lbl:'🔁 Intervall'};
  if (beds.some(c=>c.typ==='ev_timer'))    return {cls:'auto',     lbl:'⏱ Timer'};
  if (beds.some(c=>c.typ==='player_betritt')) return {cls:'betritt-ev', lbl:'🚪 Betritt'};
  if (beds.some(c=>c.typ==='wort'))        return {cls:'chat-ev',  lbl:'💬 Chat'};
  return {cls:'manual', lbl:'🖱 Manuell'};
}

function renderEventCard(bot, e, i) {
  const total = (bot.events||[]).length;
  const actN = (e.aktionen||[]).length;
  const condN = (e.bedingungen||[]).length;
  const bodyOpen = document.getElementById('evb-'+e.id)?.classList.contains('open');
  const ziel = e.ziel ?? 'ausloeser';
  const wdh = e.wiederholung ?? 'immer';
  const evVon = e.von ?? 'alle';
  const badge = _evBadge(e);

  const vonHtml = `<label style="font-size:.65rem;color:var(--text3)">Von:
    <select class="cf" style="margin-left:4px" onchange="evField('${e.id}','von',this.value);evRerender('${e.id}')">
      <option value="alle"   ${evVon==='alle'?'selected':''}>👥 Alle</option>
      <option value="bot"    ${evVon==='bot'?'selected':''}>🤖 Bot (ich)</option>
      <option value="nummer" ${evVon==='nummer'?'selected':''}>🔢 Nummer…</option>
    </select></label>
  ${evVon==='nummer'?`<input class="cf cf-w80" type="number" placeholder="MemberNr" value="${e.vonNummer??''}" oninput="evField('${e.id}','vonNummer',+this.value)">`:``}`;

  return `<div class="event-card ${e.aktiv?'ev-on':''}" id="ec-${e.id}">
    <div class="event-head" onclick="evToggleBody('${e.id}')">
      <span style="display:flex;flex-direction:column;gap:1px">
        <button class="order-btn" onclick="event.stopPropagation();evMoveUp('${e.id}')" ${i===0?'disabled':''}>▲</button>
        <button class="order-btn" onclick="event.stopPropagation();evMoveDown('${e.id}')" ${i===total-1?'disabled':''}>▼</button>
      </span>
      <input type="checkbox" ${e.aktiv?'checked':''} onclick="event.stopPropagation();evField('${e.id}','aktiv',this.checked)" style="accent-color:var(--purple)">
      <span class="ev-type-badge ${badge.cls}">${badge.lbl}</span>
      <span class="ev-label">${escHtml(e.name||'Event')}</span>
      <span class="ev-meta">${condN} Bed. · ${actN} Akt.</span>
      <button onclick="event.stopPropagation();evFireImmediate('${e.id}')" style="font-size:.62rem;padding:2px 9px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer" title="Sofort auslösen (ignoriert Timer/Wdh)">▶️ Feuern</button>
      <button onclick="event.stopPropagation();evDelete('${e.id}')" class="rm-btn">✕</button>
    </div>
    <div class="event-body ${bodyOpen?'open':''}" id="evb-${e.id}">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <label style="font-size:.65rem;color:var(--text3)">Name:
          <input class="cf cf-w160" style="margin-left:4px" value="${escHtml(e.name||'')}" oninput="evField('${e.id}','name',this.value)">
        </label>
        ${vonHtml}
        <label style="font-size:.65rem;color:var(--text3)">Ziel:
          <select class="cf" style="margin-left:4px" onchange="evField('${e.id}','ziel',this.value);evRerender('${e.id}')">
            <option value="ausloeser" ${ziel==='ausloeser'?'selected':''}>👤 Player (Auslöser/Random)</option>
            <option value="alle"      ${ziel==='alle'?'selected':''}>👥 Alle im Raum</option>
            <option value="liste"     ${ziel==='liste'?'selected':''}>📋 Liste</option>
          </select>
        </label>
        ${ziel==='liste'?`<input class="cf" style="width:180px;font-size:.65rem" placeholder="MemberNr: 1234,5678"
          value="${escHtml((e.zielListe||[]).join(','))}"
          oninput="evField('${e.id}','zielListe',this.value.split(',').map(x=>+x.trim()).filter(Boolean))">`:``}
        <label style="font-size:.65rem;color:var(--text3)">🔁 Wdh.:
          <select class="cf" style="margin-left:4px" onchange="evField('${e.id}','wiederholung',this.value);evRerender('${e.id}')">
            <option value="immer"    ${wdh==='immer'?'selected':''}>∞ Unbegrenzt</option>
            <option value="einmalig" ${wdh==='einmalig'?'selected':''}>1× Einmalig</option>
            <option value="n_mal"    ${wdh==='n_mal'?'selected':''}>N× N-mal</option>
          </select>
        </label>
        ${wdh==='n_mal'?`<input class="cf cf-w80" type="number" min="1" value="${e.maxMal??2}" oninput="evField('${e.id}','maxMal',+this.value)">×`:''}
      </div>

      <div class="te-section">
        <div class="te-section-title">🔎 Bedingungen
          <button onclick="evAddCond('${e.id}','ev_timer')" title="Einmalig nach X Sekunden">⏱ Timer</button>
          <button onclick="evAddCond('${e.id}','ev_interval')" title="Wiederholt alle X-Y Sekunden">🔁 Intervall</button>
          <button onclick="evAddCond('${e.id}','player_betritt')" title="Wenn Spieler den Raum betritt">🚪 Betritt</button>
          <button onclick="evAddCond('${e.id}','wort')">+ Wort</button>
          <button onclick="evAddCond('${e.id}','zone_rect')">+ Zone Bereich</button>
          <button onclick="evAddCond('${e.id}','zone')">+ Zone Punkt</button>
          <button onclick="evAddCond('${e.id}','item_traegt')">+ Item trägt</button>
          <button onclick="evAddCond('${e.id}','item_traegt_nicht')">+ Item trägt NICHT</button>
          <button onclick="evAddCond('${e.id}','trigger_war')">+ Vortrigger</button>
          <button onclick="evAddCond('${e.id}','rang')">🏆 Rang</button>
        </div>
        <div id="evconds-${e.id}">${(e.bedingungen||[]).map((c,ci)=>renderEvCond(bot,e.id,c,ci)).join('')}</div>
      </div>

      <div class="te-section">
        <div class="te-section-title">⚡ Aktionen
          <button onclick="evAddAct('${e.id}')">+ Aktion</button>
        </div>
        <div id="evacts-${e.id}">${(e.aktionen||[]).map((a,ai)=>renderEvAct(e.id,a,ai)).join('')}</div>
      </div>

      <div class="te-section">
        <div class="te-section-title">🔙 Fallback
          <small style="font-weight:normal;text-transform:none">(bei ❌ Trigger ungültig)</small>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <select class="cf" style="width:140px" onchange="evField('${e.id}','fallbackTyp',this.value);evRerender('${e.id}')">
            <option value="nichts" ${(!e.fallbackTyp||e.fallbackTyp==='nichts')?'selected':''}>Nichts</option>
            <option value="chat"   ${e.fallbackTyp==='chat'?'selected':''}>💬 Chat</option>
            <option value="emote"  ${e.fallbackTyp==='emote'?'selected':''}>✨ Emote</option>
          </select>
          ${e.fallbackTyp&&e.fallbackTyp!=='nichts'?`<input class="cf cf-flex" value="${escHtml(e.fallbackText||'')}" oninput="evField('${e.id}','fallbackText',this.value)" placeholder="Nachricht…">`:``}
        </div>
      </div>
    </div>
  </div>`;
}

function renderEvCond(bot, eid, c, ci) {
  // Special standalone conditions (timer, interval, betritt)
  if (c.typ === 'ev_timer') {
    return `<div class="cond-group" id="evcond-${eid}-${ci}">
      <div class="cond-when-lbl">⏱ Timer</div>
      <div class="cond-card" style="background:#0a2a0a;border-color:#1a5a1a">
        <div class="card-fields">
          <span style="font-size:.65rem;color:var(--text3)">Einmalig nach</span>
          <input class="cf cf-w80" type="number" min="0.1" step="0.1" value="${c.sek??10}"
            oninput="evCondField('${eid}',${ci},'sek',+this.value)">
          <span style="font-size:.65rem;color:var(--text3)">Sek</span>
        </div>
        <button class="rm-btn" onclick="evCondRemove('${eid}',${ci})">✕</button>
      </div></div>`;
  }
  if (c.typ === 'ev_interval') {
    return `<div class="cond-group" id="evcond-${eid}-${ci}">
      <div class="cond-when-lbl">🔁 Intervall</div>
      <div class="cond-card" style="background:#0a1a2a;border-color:#1a3a5a">
        <div class="card-fields">
          <span style="font-size:.65rem;color:var(--text3)">Alle</span>
          <input class="cf cf-w70" type="number" min="1" value="${c.sek_min??20}"
            oninput="evCondField('${eid}',${ci},'sek_min',+this.value)">
          <span style="font-size:.62rem;color:var(--text3)">–</span>
          <input class="cf cf-w70" type="number" min="1" value="${c.sek_max??60}"
            oninput="evCondField('${eid}',${ci},'sek_max',+this.value)">
          <span style="font-size:.65rem;color:var(--text3)">Sek</span>
        </div>
        <button class="rm-btn" onclick="evCondRemove('${eid}',${ci})">✕</button>
      </div></div>`;
  }
  if (c.typ === 'player_betritt') {
    const bt = c.betritt_typ ?? 'alle';
    return `<div class="cond-group" id="evcond-${eid}-${ci}">
      <div class="cond-when-lbl">🚪 Betritt</div>
      <div class="cond-card" style="background:#1a0a2a;border-color:#5a1a7a">
        <div class="card-fields">
          <select class="cf" onchange="evCondField('${eid}',${ci},'betritt_typ',this.value)">
            <option value="alle"   ${bt==='alle'?'selected':''}>Alle Spieler</option>
            <option value="neu"    ${bt==='neu'?'selected':''}>🆕 Nur Neue</option>
            <option value="rejoin" ${bt==='rejoin'?'selected':''}>🔄 Nur Rejoin</option>
          </select>
        </div>
        <button class="rm-btn" onclick="evCondRemove('${eid}',${ci})">✕</button>
      </div></div>`;
  }
  // Standard conditions (same as trigger, different callbacks)
  const icons = {wort:'💬',zone:'🗺️',zone_rect:'📐',item_traegt:'👗',item_traegt_nicht:'🚫',trigger_war:'🔗',rang:'🏆'};
  let inner = '';
  if (c.typ === 'wort') {
    inner = `<input class="cf cf-w120" value="${escHtml(c.wort||'')}" oninput="evCondField('${eid}',${ci},'wort',this.value)" placeholder="Triggerwort">
      <select class="cf" onchange="evCondField('${eid}',${ci},'typ_msg',this.value)">
        <option value="any" ${(!c.typ_msg||c.typ_msg==='any')?'selected':''}>Chat+Emote+Whisper</option>
        <option value="chat" ${c.typ_msg==='chat'?'selected':''}>Nur Chat</option>
        <option value="emote" ${c.typ_msg==='emote'?'selected':''}>Nur Emote</option>
        <option value="whisper" ${c.typ_msg==='whisper'?'selected':''}>Nur Whisper</option>
      </select>`;
  } else if (c.typ === 'zone') {
    inner = `<input class="cf cf-w100" value="${escHtml(c.name||'')}" oninput="evCondField('${eid}',${ci},'name',this.value)" placeholder="Zonenname">
      X<input class="cf" style="width:46px" type="number" value="${c.x??0}" oninput="evCondField('${eid}',${ci},'x',+this.value)">
      Y<input class="cf" style="width:46px" type="number" value="${c.y??0}" oninput="evCondField('${eid}',${ci},'y',+this.value)">
      ±<input class="cf" style="width:38px" type="number" value="${c.puffer??1}" oninput="evCondField('${eid}',${ci},'puffer',+this.value)">`;
  } else if (c.typ === 'zone_rect') {
    inner = `<span style="font-size:.62rem;color:var(--text3)">Von</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x1??0}" oninput="evCondField('${eid}',${ci},'x1',+this.value)">
      Y<input class="cf" style="width:44px" type="number" value="${c.y1??0}" oninput="evCondField('${eid}',${ci},'y1',+this.value)">
      <span style="font-size:.62rem;color:var(--text3)">Bis</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x2??2}" oninput="evCondField('${eid}',${ci},'x2',+this.value)">
      Y<input class="cf" style="width:44px" type="number" value="${c.y2??2}" oninput="evCondField('${eid}',${ci},'y2',+this.value)">`;
  } else if (c.typ === 'item_traegt' || c.typ === 'item_traegt_nicht') {
    const negLabel = c.typ === 'item_traegt_nicht' ? '<span style="color:#e55;font-size:.65rem;font-weight:600;margin-right:4px">🚫 NICHT</span>' : '';
    inner = `${negLabel}<span style="font-size:.68rem;color:var(--text2)">${c.gruppe?escHtml(c.gruppe)+' / ':''}<b>${escHtml(c.item||'–')}</b></span>
      <button onclick="ipickerOpen('item',v=>{evCondField('${eid}',${ci},'item',v.asset||v.name);evCondField('${eid}',${ci},'gruppe',v.group);evCondRerender('${eid}');})" style="font-size:.62rem;padding:2px 7px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer">📦 Wählen</button>`;
  } else if (c.typ === 'trigger_war') {
    const trigs = bot?.triggers ?? [];
    const opts = trigs.map(t=>`<option value="${t.id}" ${c.trigId===t.id?'selected':''}>${escHtml(t.name||t.id)}</option>`).join('');
    inner = `<select class="cf cf-w160" onchange="evCondField('${eid}',${ci},'trigId',this.value)">
        <option value="">– Trigger wählen –</option>${opts}
      </select>
      <span style="font-size:.62rem;color:var(--text3)">muss ausgelöst worden sein</span>`;
  } else if (c.typ === 'rang') {
    const rop = c.rang_op ?? '=';
    const ranks = _rankSorted();
    inner = `
      <select class="cf" style="width:80px" onchange="evCondField('${eid}',${ci},'rang_op',this.value);evCondRerender('${eid}')">
        <option value="="   ${rop==='='  ?'selected':''}>= Genau</option>
        <option value="min" ${rop==='min'?'selected':''}>≥ Min.</option>
        <option value="max" ${rop==='max'?'selected':''}>≤ Max.</option>
        <option value="kein"${rop==='kein'?'selected':''}>∅ Kein Rang</option>
      </select>
      ${rop!=='kein'?`<select class="cf" style="flex:1;min-width:130px" onchange="evCondField('${eid}',${ci},'rang_id',this.value)">
        <option value="">– Rang wählen –</option>
        ${ranks.map(r=>`<option value="${r.id}" ${c.rang_id===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
      </select>`:''}`;
  }
  const logik = c.logik ?? 'und';
  const logikBadge = ci === 0
    ? `<div class="cond-when-lbl">WENN</div>`
    : `<div style="display:flex;align-items:center;gap:0;margin:2px 0;padding-left:6px">
        <button onclick="evCondLogik('${eid}',${ci},'und')" class="logik-btn ${logik==='und'?'active':''}">UND</button>
        <button onclick="evCondLogik('${eid}',${ci},'oder')" class="logik-btn ${logik==='oder'?'active':''}">ODER</button>
        <button onclick="evCondLogik('${eid}',${ci},'und_nicht')" class="logik-btn ${logik==='und_nicht'?'active active-nicht':''}" style="border-left:none;border-radius:0 3px 3px 0" title="UND NICHT">UND NICHT</button>
      </div>`;
  return `<div class="cond-group ${logik==='oder'?'cond-group-oder':logik==='und_nicht'?'cond-group-nicht':''}" id="evcond-${eid}-${ci}">
    ${logikBadge}
    <div class="cond-card cond-op">
      <div class="card-fields">
        <span class="cond-num">${ci+1}</span>
        <span style="font-size:.7rem;font-weight:600;color:var(--purple)">${icons[c.typ]??'❓'}</span>
        ${inner}
      </div>
      <button class="rm-btn" onclick="evCondRemove('${eid}',${ci})">✕</button>
    </div>
  </div>`;
}

// Event actions reuse renderAct but with ev-specific field update
function renderEvAct(eid, a, ai) {
  // Temporarily set context for renderAct to use ev callbacks
  // Simple approach: render a stripped-down action card for events
  const types = [
    ['chat','💬 Chat'],['emote','✨ Emote'],['whisper','🤫 Whisper'],
    ['item','📦 Item'],['item_entf','🗑️ Item entf.'],['teleport','🌀 TP'],['money','💰 Money'],['rang','🏆 Rang'],
  ];
  const typeOpts = types.map(([v,l])=>`<option value="${v}" ${a.typ===v?'selected':''}>${l}</option>`).join('');
  let extra = '';
  if (['chat','emote','whisper'].includes(a.typ)) {
    extra = `<textarea class="cf" style="width:100%;resize:vertical;min-height:38px;margin-top:4px" rows="2"
        oninput="evActField('${eid}',${ai},'text',this.value)">${escHtml(a.text||'')}</textarea>
      <div style="font-size:.59rem;color:var(--text3);margin-top:2px">Variablen: {name} {wort} {x} {y}</div>`;
  } else if (a.typ === 'item') {
    const cfgInfo = a.itemConfig ? ` <span style="font-size:.58rem;background:var(--gd);color:var(--green);padding:1px 4px;border-radius:3px">✓ Konfig</span>` : '';
    const label = a.itemConfig ? `📦 ${a.itemConfig.group}/${a.itemConfig.asset}` : a.profilName ? `👗 ${a.profilName}` : a.curseName ? `🔮 ${a.curseName}` : a.item ? `📦 ${a.gruppe||'?'}/${a.item}` : '– nichts gewählt –';
    extra = `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap">
        <span style="font-size:.7rem;color:var(--text2);flex:1">${escHtml(label)}${cfgInfo}</span>
        <button onclick="ipickerOpenForEvAct('${eid}',${ai})" style="font-size:.63rem;padding:3px 9px;background:var(--pd);border:none;color:var(--pl);border-radius:5px;cursor:pointer">📂 Wählen</button>
      </div>`;
  } else if (a.typ === 'item_entf') {
    extra = `<input class="cf" style="width:100%;margin-top:4px" value="${escHtml(a.gruppe||'')}"
        oninput="evActField('${eid}',${ai},'gruppe',this.value)" placeholder="Gruppe (z.B. ItemMouth)">`;
  } else if (a.typ === 'teleport') {
    const slots = a.tpSlots ?? [];
    const slotsHtml = slots.map((s,si) => `<div class="tp-slot-row">
      <span class="tp-slot-badge ${si===0?'primary':'fallback'}">${si===0?'Primär':'FB '+(si)}</span>
      X<input class="cf" type="number" style="width:50px" value="${s.x??0}" oninput="evTpField('${eid}',${ai},${si},'x',+this.value)">
      Y<input class="cf" type="number" style="width:50px" value="${s.y??0}" oninput="evTpField('${eid}',${ai},${si},'y',+this.value)">
      <button onclick="evTpRemove('${eid}',${ai},${si})" style="background:none;border:none;color:var(--red);cursor:pointer">✕</button>
    </div>`).join('');
    extra = `<div class="tp-slot-list">${slotsHtml}</div>
      <button class="tp-slot-add-btn" onclick="evTpAdd('${eid}',${ai})">+ Position/Fallback</button>`;
  } else if (a.typ === 'money') {
    const mop = a.money_op ?? 'add';
    const moneyName = _money?.settings?.name || 'Gold';
    extra = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:130px" onchange="evActField('${eid}',${ai},'money_op',this.value)">
        <option value="add" ${mop==='add'?'selected':''}>➕ Hinzufügen</option>
        <option value="sub" ${mop==='sub'?'selected':''}>➖ Abziehen</option>
        <option value="set" ${mop==='set'?'selected':''}>= Setzen auf</option>
        <option value="reset" ${mop==='reset'?'selected':''}>🔄 Zurücksetzen</option>
      </select>
      ${mop!=='reset'?`<input class="cf cf-w80" type="number" value="${a.money_val??1}" oninput="evActField('${eid}',${ai},'money_val',+this.value)">
        <span style="font-size:.68rem;color:var(--text3)">${escHtml(moneyName)}</span>`:''}
    </div>`;
  } else if (a.typ === 'rang') {
    const rop = a.rang_op ?? 'setzen';
    const ranks = _rankSorted();
    extra = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:155px" onchange="evActField('${eid}',${ai},'rang_op',this.value);document.getElementById('evacts-'+\`${eid}\`).innerHTML=((_selBot()?.events?.find(x=>x.id==='${eid}')?.aktionen)||[]).map((a2,ai2)=>renderEvAct('${eid}',a2,ai2)).join('')">
        <option value="setzen"    ${rop==='setzen'?'selected':''}>🏆 Rang setzen</option>
        <option value="entfernen" ${rop==='entfernen'?'selected':''}>❌ Rang entfernen</option>
        <option value="naechster" ${rop==='naechster'?'selected':''}>⬆️ Nächster Rang</option>
        <option value="vorheriger"${rop==='vorheriger'?'selected':''}>⬇️ Vorheriger Rang</option>
      </select>
      ${rop==='setzen'?`<select class="cf" style="flex:1;min-width:140px" onchange="evActField('${eid}',${ai},'rang_id',this.value)">
        <option value="">– Rang wählen –</option>
        ${ranks.map(r=>`<option value="${r.id}" ${a.rang_id===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
      </select>`:''}
    </div>`;
  }
  const bf = a.bei_fehler ?? 'ignorieren';
  return `<div class="act-card" id="evact-${eid}-${ai}">
    <div style="flex:1">
      <div style="display:flex;gap:6px;align-items:center">
        <span class="trig-order-num">${ai+1}</span>
        <select class="cf" style="flex:1" onchange="evActChangeType('${eid}',${ai},this.value)">${typeOpts}</select>
        <input class="cf cf-w80" type="number" value="${a.delay??0}" oninput="evActField('${eid}',${ai},'delay',+this.value)"> ms
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:5px;padding:5px 8px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.12);border-radius:6px;flex-wrap:wrap">
        <span style="font-size:.62rem;font-weight:700;color:#60a5fa;white-space:nowrap">🎯 Ziel</span>
        <select class="cf" style="width:150px;font-size:.68rem" onchange="evActField('${eid}',${ai},'aktZiel',this.value);document.getElementById('evacts-'+\`${eid}\`).innerHTML=((_selBot()?.events?.find(x=>x.id==='${eid}')?.aktionen)||[]).map((a2,ai2)=>renderEvAct('${eid}',a2,ai2)).join('')">
          <option value="ausloeser" ${(!a.aktZiel||a.aktZiel==='ausloeser')?'selected':''}>👤 Auslöser</option>
          <option value="shop_kaeufer" ${a.aktZiel==='shop_kaeufer'?'selected':''}>💳 Käufer (bei Shop)</option>
          <option value="alle"      ${a.aktZiel==='alle'?'selected':''}>👥 Alle im Raum</option>
          <option value="whitelist" ${a.aktZiel==='whitelist'?'selected':''}>📋 Whitelist</option>
        </select>
        ${a.aktZiel==='whitelist'?`<input class="cf" style="flex:1;min-width:150px;font-size:.68rem" value="${escHtml((a.aktZielNummern||[]).join(', '))}"
          oninput="evActField('${eid}',${ai},'aktZielNummern',this.value.split(',').map(x=>+x.trim()).filter(x=>x>0))"
          placeholder="MemberNummer, z.B. 12345, 67890">`:''}
      </div>
      ${extra}
    </div>
    <button class="rm-btn" onclick="evActRemove('${eid}',${ai})">✕</button>
  </div>`;
}

// ── Event CRUD ───────────────────────────────────────────────
function eventNew() {
  const b = _selBot(); if (!b) return;
  if (!b.events) b.events = [];
  const e = {
    id:'ev'+Date.now(), name:'Neues Event', aktiv:true,
    ziel:'ausloeser', zielListe:[], wiederholung:'immer', maxMal:2,
    von:'alle', vonNummer:0,
    bedingungen:[], aktionen:[], fallbackTyp:'nichts', fallbackText:''
  };
  b.events.push(e); _saveBots(); renderEventsTab();
  setTimeout(()=>document.getElementById('evb-'+e.id)?.classList.add('open'),50);
}

function evDelete(eid) {
  const b = _selBot(); if (!b) return;
  b.events = (b.events||[]).filter(e=>e.id!==eid); _saveBots(); renderEventsTab();
}

function evToggleBody(eid) {
  document.getElementById('evb-'+eid)?.classList.toggle('open');
}

function evRerender(eid) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  const i = b.events.indexOf(e);
  const el = document.getElementById('ec-'+eid); if (!el) return;
  const wasOpen = document.getElementById('evb-'+eid)?.classList.contains('open');
  const tmp = document.createElement('div');
  tmp.innerHTML = renderEventCard(b, e, i);
  if (wasOpen) tmp.firstElementChild.querySelector('.event-body')?.classList.add('open');
  el.replaceWith(tmp.firstElementChild);
}

function evField(eid, key, val) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e[key] = val; _saveBots();
  if (key === 'name') evRerender(eid);
}

function evMoveUp(eid) {
  const b = _selBot(); if (!b) return;
  const i = b.events.findIndex(e=>e.id===eid); if (i<=0) return;
  [b.events[i-1],b.events[i]]=[b.events[i],b.events[i-1]]; _saveBots(); renderEventsTab();
}
function evMoveDown(eid) {
  const b = _selBot(); if (!b) return;
  const i = b.events.findIndex(e=>e.id===eid); if (i<0||i>=b.events.length-1) return;
  [b.events[i],b.events[i+1]]=[b.events[i+1],b.events[i]]; _saveBots(); renderEventsTab();
}

// Condition CRUD for events
function evAddCond(eid, typ) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.bedingungen = e.bedingungen || [];
  const def = {wort:{typ:'wort',wort:'',logik:'und'},zone:{typ:'zone',x:0,y:0,puffer:1,logik:'und'},item_traegt:{typ:'item_traegt',item:'',gruppe:'',logik:'und'},trigger_war:{typ:'trigger_war',trigId:'',logik:'und'},rang:{typ:'rang',rang_op:'=',rang_id:'',logik:'und'}};
  e.bedingungen.push(def[typ]||{typ,logik:'und'}); _saveBots();
  evCondRerender(eid);
}
function evCondRemove(eid, ci) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.bedingungen.splice(ci,1); _saveBots(); evCondRerender(eid);
}
function evCondField(eid, ci, key, val) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  if (e.bedingungen[ci]) e.bedingungen[ci][key]=val; _saveBots();
}
function evCondLogik(eid, ci, val) {
  evCondField(eid, ci, 'logik', val); evCondRerender(eid);
}
function evCondRerender(eid) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  const el = document.getElementById('evconds-'+eid); if (!el) return;
  el.innerHTML = (e.bedingungen||[]).map((c,ci)=>renderEvCond(b,eid,c,ci)).join('');
}

// Action CRUD for events
function evAddAct(eid) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen = e.aktionen || [];
  e.aktionen.push({typ:'chat', text:'', delay:0}); _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai)=>renderEvAct(eid,a,ai)).join('');
}
function evActRemove(eid, ai) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen.splice(ai,1); _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai2)=>renderEvAct(eid,a,ai2)).join('');
}
function evActField(eid, ai, key, val) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  if (e.aktionen[ai]) e.aktionen[ai][key]=val; _saveBots();
}
function evActChangeType(eid, ai, typ) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen[ai] = {typ, delay:e.aktionen[ai]?.delay??0}; _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai2)=>renderEvAct(eid,a,ai2)).join('');
}
function evTpAdd(eid, ai) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen[ai].tpSlots = e.aktionen[ai].tpSlots||[];
  e.aktionen[ai].tpSlots.push({x:0,y:0,gueltig:true}); _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai2)=>renderEvAct(eid,a,ai2)).join('');
}
function evTpRemove(eid, ai, si) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  e.aktionen[ai].tpSlots?.splice(si,1); _saveBots();
  document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a,ai2)=>renderEvAct(eid,a,ai2)).join('');
}
function evTpField(eid, ai, si, key, val) {
  const b = _selBot(); if (!b) return;
  const e = b.events?.find(x=>x.id===eid); if (!e) return;
  const slots = e.aktionen[ai].tpSlots||[];
  if (slots[si]) slots[si][key]=val; _saveBots();
}
function ipickerOpenForEvAct(eid, ai) {
  ipickerOpen('item', v => {
    const b = _selBot(); if (!b) return;
    const e = b.events?.find(x=>x.id===eid); if (!e) return;
    const a = e.aktionen[ai]; if (!a) return;
    // Clear old type data (same as trigger)
    delete a.item; delete a.gruppe; delete a.farbe;
    delete a.curseKey; delete a.curseName; delete a.curseEntry;
    delete a.profilName; delete a.profilItems; delete a.itemConfig;
    if (v.type === 'item') {
      if (v.itemConfig) {
        a.itemConfig = v.itemConfig;
        a.item   = v.itemConfig.asset;
        a.gruppe = v.itemConfig.group;
      } else {
        a.item   = v.asset || v.name;
        a.gruppe = v.group;
        a.farbe  = '#ffffff';
      }
    } else if (v.type === 'curse') {
      a.curseKey   = v.key;
      a.curseName  = v.name;
      a.curseEntry = v.entry;
    } else if (v.type === 'profil') {
      a.profilName  = v.name;
      a.profilItems = PROFILES[v.name]?.items ?? [];
    }
    _saveBots();
    document.getElementById('evacts-'+eid).innerHTML = (e.aktionen||[]).map((a2,ai2)=>renderEvAct(eid,a2,ai2)).join('');
  });
}

// Fire event manually from popup
function evFire(eid) { evFireImmediate(eid); }
function evFireImmediate(eid) {
  const b = _selBot(); if (!b) return;
  if (!_connected) { showStatus('❌ Nicht verbunden','error'); return; }
  const safeId = b.id.replace(/\W/g,'_');
  bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].fireEventNow('${eid}');else console.warn('[Bot] Nicht aktiv – erst starten');` });
  showStatus('▶️ Event sofort ausgelöst','success');
}

function renderBotTab() {
  // Nur beim ersten Laden aus localStorage lesen – nie In-Memory-State überschreiben
  if (!_bots.length) _loadBots();
  renderBotList();
  // Falls _selBotId nicht gesetzt aber Bots vorhanden: ersten selektieren
  if (!_selBotId && _bots.length) _selBotId = _bots[0].id;
  if (_selBotId) renderBotEditor();
}

// ── Bot Sidebar ───────────────────────────────────────────────
function renderBotList() {
  const el = document.getElementById('botList');
  if (!el) return;
  if (!_bots.length) {
    el.innerHTML = '<div style="padding:20px;color:var(--text3);font-size:.71rem;text-align:center">Noch keine Bots.<br>Klicke + Neu.</div>';
    return;
  }
  el.innerHTML = _bots.map(b => `
    <div class="bot-item${b.id===_selBotId?' sel':''}" onclick="botSelect('${b.id}')">
      <div style="flex:1">
        <div class="bi-name">${escHtml(b.name)}</div>
        <div class="bi-stat">${(b.triggers||[]).filter(t=>t.aktiv).length} Trigger aktiv</div>
      </div>
      <button class="bot-toggle ${b.laufend?'on':'off'}" onclick="event.stopPropagation();botToggleLaufend('${b.id}')" title="${b.laufend?'Läuft':'Gestoppt'}"></button>
      <button onclick="event.stopPropagation();botDelete('${b.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem;padding:2px 4px">✕</button>
    </div>`).join('');
}

function botNew() {
  const bot = {
    id: 'b' + Date.now(), name: 'Mein Bot', laufend: false,
    settings: { modus:'both', hearChat:true, hearEmote:true, hearWhisper:true, nurEigene:false, logAktiv:true },
    triggers: [], events: [],
  };
  _bots.push(bot); _selBotId = bot.id; _saveBots();
  renderBotList(); renderBotEditor();
}

function botSelect(id) {
  _selBotId = id; renderBotList(); renderBotEditor();
}

function botToggleLaufend(id) {
  const b = _bots.find(x => x.id === id); if (!b) return;
  if (b.laufend) botStopById(id); else botDeployById(id);
}

function botDelete(id) {
  const b = _bots.find(x => x.id === id);
  if (!b || !confirm(`Bot "${b.name}" löschen?`)) return;
  _bots = _bots.filter(x => x.id !== id);
  if (_selBotId === id) { _selBotId = _bots[0]?.id ?? null; }
  _saveBots(); renderBotList();
  if (_selBotId) renderBotEditor();
  else document.getElementById('botEditor').innerHTML = '<div class="be-empty"><div class="be-empty-icon">🤖</div>Wähle einen Bot aus oder erstelle einen neuen.</div>';
}

// ── Bot Editor ────────────────────────────────────────────────
function renderBotEditor() {
  const bot = _selBot(); if (!bot) return;
  // Offene Trigger-Bodies vor Re-Render sichern
  const openTids = new Set(
    (bot.triggers||[]).map(t=>t.id).filter(id=>document.getElementById('tb-'+id)?.classList.contains('open'))
  );
  const s = bot.settings;
  const statusCls = bot.laufend ? 'running' : 'stopped';
  const statusTxt = bot.laufend ? '▶️ Bot läuft · <span style="font-size:.62rem;opacity:.7">Änderungen → 🔄 Sync klicken</span>' : '⏹ Nicht gestartet';

  const html = `
    <div class="be-topbar">
      <input value="${escHtml(bot.name)}" oninput="botField('name',this.value)" style="width:180px;font-size:.78rem;font-weight:600;background:var(--bg3);border:1px solid var(--border2);border-radius:5px;color:var(--text);padding:4px 10px;font-family:var(--mono)">
      <div style="flex:1"></div>
      <label class="bot-cfg-label" title="Normale Chatnachrichten"><input type="checkbox" ${s.hearChat?'checked':''} onchange="botSetting('hearChat',this.checked)"> Chat</label>
      <label class="bot-cfg-label" title="Emotes"><input type="checkbox" ${s.hearEmote?'checked':''} onchange="botSetting('hearEmote',this.checked)"> *Emote*</label>
      <label class="bot-cfg-label" title="Whisper"><input type="checkbox" ${s.hearWhisper?'checked':''} onchange="botSetting('hearWhisper',this.checked)"> Whisper</label>
      <label class="bot-cfg-label" title="Nur eigene Nachrichten überwachen"><input type="checkbox" ${s.nurEigene?'checked':''} onchange="botSetting('nurEigene',this.checked)"> Nur eigene</label>
      <label class="bot-cfg-label"><input type="checkbox" ${s.logAktiv?'checked':''} onchange="botSetting('logAktiv',this.checked)"> Log</label>
      <select class="cf" onchange="botSetting('modus',this.value)" style="width:110px">
        <option value="chat"  ${s.modus==='chat'?'selected':''}>Nur Chat</option>
        <option value="zone"  ${s.modus==='zone'?'selected':''}>Nur Zone</option>
        <option value="both"  ${s.modus==='both'?'selected':''}>Chat + Zone</option>
      </select>
      ${bot.laufend
        ? `<button class="btn btn-red" onclick="botStop()" style="font-size:.68rem;padding:4px 12px">⏹ Stoppen</button>
           <button class="btn btn-sync" id="syncBtn" onclick="botSync()" title="Bot stoppen, Änderungen speichern und neu starten" style="font-size:.68rem;padding:4px 12px">🔄 Sync</button>`
        : `<button class="btn btn-green" onclick="botDeploy()" style="font-size:.68rem;padding:4px 12px">▶️ Starten</button>`
      }
      <button class="btn btn-primary" onclick="botExportConfig()" title="Export" style="font-size:.65rem;padding:4px 8px">⬇️</button>
      <button class="btn btn-primary" onclick="botImportConfig()" title="Import" style="font-size:.65rem;padding:4px 8px">⬆️</button>
    </div>
    <div class="bot-status ${statusCls}" id="bot-status-bar">${statusTxt}</div>
    <div class="be-body">
      <div id="trig-list">${(bot.triggers||[]).map((t,i)=>renderTrigCard(bot,t,i)).join('')}</div>
      <button class="be-addtrig" onclick="botAddTrig()">+ Trigger hinzufügen</button>
    </div>`;
  document.getElementById('botEditor').innerHTML = html;
  // Offene Trigger-Bodies wiederherstellen
  openTids.forEach(tid => document.getElementById('tb-'+tid)?.classList.add('open'));
}

function botField(field, val) {
  const b = _selBot(); if (!b) return;
  b[field] = val; _saveBots();
  if (field === 'name') renderBotList();
}

function botSetting(key, val) {
  const b = _selBot(); if (!b) return;
  b.settings[key] = val; _saveBots();
}

// ── Trigger Cards ─────────────────────────────────────────────
function renderTrigCard(bot, t, i) {
  const condN = (t.bedingungen||[]).length;
  const actN  = (t.aktionen||[]).length;
  const total = bot.triggers.length;
  const wdh   = t.wiederholung ?? 'immer';
  const wdh_lbl = wdh==='einmalig'?'1x':wdh==='n_mal'?(t.maxMal??2)+'x':'∞';
  const wdh_color = wdh==='immer'?'var(--text3)':'var(--pl)';
  return `<div class="trig-card ${t.aktiv?'trig-on':''}" id="tc-${t.id}">
    <div class="trig-head" onclick="trigToggleBody('${t.id}')">
      <span class="trig-order-num">${i+1}</span>
      <span style="display:flex;flex-direction:column;gap:1px;margin-right:2px">
        <button class="order-btn" onclick="event.stopPropagation();trigMoveUp('${t.id}')" ${i===0?'disabled':''} title="Nach oben">▲</button>
        <button class="order-btn" onclick="event.stopPropagation();trigMoveDown('${t.id}')" ${i===total-1?'disabled':''} title="Nach unten">▼</button>
      </span>
      <input type="checkbox" ${t.aktiv?'checked':''} onclick="event.stopPropagation();trigField('${t.id}','aktiv',this.checked)" style="accent-color:var(--purple)">
      <span class="trig-label" id="tlabel-${t.id}">${escHtml(t.name||'Trigger')}</span>
      <span class="trig-meta">${condN} Bed. · ${actN} Akt. · <span style="color:${wdh_color}">${wdh_lbl}</span></span>
      <button onclick="event.stopPropagation();trigDelete('${t.id}')" class="rm-btn" title="Trigger löschen">✕</button>
    </div>
    <div class="trig-body" id="tb-${t.id}">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <label style="font-size:.65rem;color:var(--text3)">Name:</label>
        <input class="cf cf-w160" value="${escHtml(t.name||'')}" oninput="trigField('${t.id}','name',this.value)" placeholder="Trigger-Name">
        <label style="font-size:.65rem;color:var(--text3)">Delay:</label>
        <input class="cf cf-w80" type="number" value="${t.delay??0}" oninput="trigField('${t.id}','delay',+this.value)"> ms
        <label style="font-size:.65rem;color:var(--text3)">🔁 Wiederholung:</label>
        <select class="cf" onchange="trigField('${t.id}','wiederholung',this.value);trigRerender('${t.id}')">
          <option value="immer"    ${wdh==='immer'?'selected':''}>∞ Unbegrenzt</option>
          <option value="einmalig" ${wdh==='einmalig'?'selected':''}>1× Einmalig</option>
          <option value="n_mal"    ${wdh==='n_mal'?'selected':''}>N× N-mal</option>
        </select>
        ${wdh==='n_mal'?`<input class="cf cf-w80" type="number" min="1" value="${t.maxMal??2}" oninput="trigField('${t.id}','maxMal',+this.value)" title="Wie oft max. feuern">× max.`:''}
        <label style="font-size:.65rem;color:var(--text3);margin-left:8px">🔑 Als Vorbedingung:</label>
        <select class="cf" style="width:170px" title="Wie zählt dieser Trigger als Vorbedingung für andere Trigger?" onchange="trigField('${t.id}','charSpec',this.value==='true');trigRerender('${t.id}')">
          <option value="false" ${!t.charSpec?'selected':''}>🌐 Global – einmal gilt für alle</option>
          <option value="true"  ${t.charSpec?'selected':''}>👤 Pro Spieler – jeder selbst</option>
        </select>
        ${t.charSpec?`<label style="font-size:.65rem;color:var(--text3);display:flex;align-items:center;gap:4px;cursor:pointer;margin-left:4px" title="Wenn aktiviert: Beim Verlassen des Raums wird der State zurückgesetzt – Rejoin-Vortrigger greifen dann nicht mehr">
          <input type="checkbox" ${t.resetOnLeave?'checked':''} onchange="trigField('${t.id}','resetOnLeave',this.checked)" style="accent-color:var(--purple)">
          <span>↩️ Reset bei Verlassen</span>
        </label>`:''}
      </div>

      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;padding:7px 10px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.12);border-radius:8px">
        <span style="font-size:.65rem;font-weight:700;color:var(--purple)">🎯 Auslöser-Filter</span>
        <label style="font-size:.65rem;color:var(--text3)">Wer darf feuern?</label>
        <select class="cf" style="width:160px" onchange="trigField('${t.id}','von',this.value);trigRerender('${t.id}')">
          <option value="alle"      ${(!t.von||t.von==='alle')?'selected':''}>👥 Alle Spieler</option>
          <option value="bot"       ${t.von==='bot'?'selected':''}>🤖 Nur der Bot</option>
          <option value="whitelist" ${t.von==='whitelist'?'selected':''}>📋 Whitelist</option>
        </select>
        ${(t.von==='whitelist')?`<input class="cf" style="min-width:180px;flex:1" value="${escHtml((t.vonNummern||[]).join(', '))}"
          oninput="trigField('${t.id}','vonNummern',this.value.split(',').map(x=>+x.trim()).filter(x=>x>0))"
          placeholder="MemberNummer, z.B. 12345, 67890">`:''}
      </div>

      <div class="te-section">
        <div class="te-section-title">🔎 Bedingungen
          <button onclick="trigAddCond('${t.id}','wort')">+ Wort/Chat</button>
          <button onclick="trigAddCond('${t.id}','zone_rect')">+ Zone Bereich</button>
          <button onclick="trigAddCond('${t.id}','zone')">+ Zone Punkt</button>
          <button onclick="trigAddCond('${t.id}','item_traegt')">+ Item trägt</button>
          <button onclick="trigAddCond('${t.id}','item_traegt_nicht')">+ Item trägt NICHT</button>
          <button onclick="trigAddCond('${t.id}','trigger_war')">+ Vortrigger</button>
          <button onclick="trigAddCond('${t.id}','player_betritt')">+ Spieler betritt</button>
          <button onclick="trigAddCond('${t.id}','rang')">🏆 Rang</button>
          <button onclick="trigAddCond('${t.id}','shop_kauf')" title="Wird ausgelöst wenn ein Spieler einen Shop-Artikel kauft">🛒 Shop-Kauf</button>
          <button onclick="trigAddCond('${t.id}','ev_timer')" title="Einmalig nach X Sekunden automatisch feuern">⏱ Timer</button>
          <button onclick="trigAddCond('${t.id}','ev_interval')" title="Wiederholt alle X–Y Sekunden feuern">🔁 Intervall</button>
        </div>
        <div id="conds-${t.id}">${(t.bedingungen||[]).map((c,ci)=>renderCond(bot,t.id,c,ci)).join('')}</div>
      </div>

      <div class="te-section">
        <div class="te-section-title">⚡ Aktionen
          <button onclick="trigAddAct('${t.id}')">+ Aktion</button>
        </div>
        <div id="acts-${t.id}">${(t.aktionen||[]).map((a,ai)=>renderAct(t.id,a,ai)).join('')}</div>
      </div>

      <div class="te-section">
        <div class="te-section-title">🔙 Fallback <small style="font-weight:normal;text-transform:none;letter-spacing:0">(läuft wenn eine Aktion ❌ Trigger ungültig auslöst – Trigger zählt dann nicht)</small></div>
        <div style="display:flex;gap:6px;align-items:center">
          <select class="cf" style="width:140px" onchange="trigField('${t.id}','fallbackTyp',this.value);trigRerender('${t.id}')">
            <option value="nichts" ${(!t.fallbackTyp||t.fallbackTyp==='nichts')?'selected':''}>Nichts (still)</option>
            <option value="chat"   ${t.fallbackTyp==='chat'?'selected':''}>💬 Chat-Nachricht</option>
            <option value="emote"  ${t.fallbackTyp==='emote'?'selected':''}>✨ Emote</option>
          </select>
          ${t.fallbackTyp&&t.fallbackTyp!=='nichts'?`<input class="cf cf-flex" value="${escHtml(t.fallbackText||'')}" oninput="trigField('${t.id}','fallbackText',this.value)" placeholder="Nachricht… {name} {wort} {x} {y}">`:''} 
        </div>
      </div>
    </div>
  </div>`;
}

// ── Conditions ────────────────────────────────────────────────
function renderCond(bot, tid, c, ci) {
  let inner = '';
  if (c.typ === 'wort') {
    inner = `
      <input class="cf cf-w120" value="${escHtml(c.wort||'')}" oninput="condField('${tid}',${ci},'wort',this.value)" placeholder="Triggerwort (lowercase)">
      <select class="cf" onchange="condField('${tid}',${ci},'typ_msg',this.value)">
        <option value="any"     ${(!c.typ_msg||c.typ_msg==='any')?'selected':''}>Chat+Emote+Whisper</option>
        <option value="chat"    ${c.typ_msg==='chat'?'selected':''}>Nur Chat</option>
        <option value="emote"   ${c.typ_msg==='emote'?'selected':''}>Nur Emote</option>
        <option value="whisper" ${c.typ_msg==='whisper'?'selected':''}>Nur Whisper</option>
      </select>`;
  } else if (c.typ === 'zone') {
    inner = `
      <input class="cf cf-w100" value="${escHtml(c.name||'')}" oninput="condField('${tid}',${ci},'name',this.value)" placeholder="Zonenname (optional)">
      X<input class="cf" style="width:46px" type="number" value="${c.x??0}" oninput="condField('${tid}',${ci},'x',+this.value)">
      Y<input class="cf" style="width:46px" type="number" value="${c.y??0}" oninput="condField('${tid}',${ci},'y',+this.value)">
      ±<input class="cf" style="width:38px" type="number" value="${c.puffer??1}" oninput="condField('${tid}',${ci},'puffer',+this.value)" title="Puffer">`;
  } else if (c.typ === 'item_traegt' || c.typ === 'item_traegt_nicht') {
    const negLabel = c.typ === 'item_traegt_nicht' ? '<span style="color:#e55;font-size:.65rem;font-weight:600;margin-right:4px">🚫 NICHT</span>' : '';
    inner = `
      ${negLabel}
      <span style="font-size:.68rem;color:var(--text2)">${c.gruppe?escHtml(c.gruppe)+' / ':''}<b>${escHtml(c.item||'–')}</b></span>
      <button onclick="ipickerOpen('item',v=>{condField('${tid}',${ci},'item',v.asset||v.name);condField('${tid}',${ci},'gruppe',v.group);condRerender('${tid}');})" style="font-size:.62rem;padding:2px 7px;background:var(--pd);border:none;color:var(--pl);border-radius:4px;cursor:pointer">📦 Wählen</button>`;
  } else if (c.typ === 'zone_rect') {
    inner = `
      <span style="font-size:.62rem;color:var(--text3)">Von</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x1??0}" oninput="condField('${tid}',${ci},'x1',+this.value)" title="X-Start">
      Y<input class="cf" style="width:44px" type="number" value="${c.y1??0}" oninput="condField('${tid}',${ci},'y1',+this.value)" title="Y-Start">
      <span style="font-size:.62rem;color:var(--text3)">Bis</span>
      X<input class="cf" style="width:44px" type="number" value="${c.x2??2}" oninput="condField('${tid}',${ci},'x2',+this.value)" title="X-Ende">
      Y<input class="cf" style="width:44px" type="number" value="${c.y2??2}" oninput="condField('${tid}',${ci},'y2',+this.value)" title="Y-Ende">`;
  } else if (c.typ === 'trigger_war') {
    const trigs = bot?.triggers ?? [];
    const opts = trigs.filter(t=>t.id!==tid).map(t=>`<option value="${t.id}" ${c.trigId===t.id?'selected':''}>${escHtml(t.name||t.id)}</option>`).join('');
    const refTrig = trigs.find(t=>t.id===c.trigId);
    const modeBadge = refTrig
      ? refTrig.charSpec
        ? `<span style="font-size:.58rem;background:#1a1040;border:1px solid var(--purple);color:var(--pl);padding:1px 5px;border-radius:3px">👤 Pro Spieler</span>`
        : `<span style="font-size:.58rem;background:#0a1a0a;border:1px solid var(--green);color:var(--green);padding:1px 5px;border-radius:3px">🌐 Global</span>`
      : '';
    inner = `
      <select class="cf cf-w160" onchange="condField('${tid}',${ci},'trigId',this.value);condRerender('${tid}')">
        <option value="">– Trigger wählen –</option>${opts}
      </select>
      ${modeBadge}
      <span style="font-size:.62rem;color:var(--text3)">muss zuerst ausgelöst worden sein</span>`;
  } else if (c.typ === 'player_betritt') {
    const bt = c.betritt_typ ?? 'alle';
    inner = `
      <select class="cf" style="width:200px" onchange="condField('${tid}',${ci},'betritt_typ',this.value)">
        <option value="alle"   ${bt==='alle'?'selected':''}>👋 Jedes Mal (auch Erstbesuch)</option>
        <option value="neu"    ${bt==='neu'?'selected':''}>🆕 Erstes Mal in dieser Session</option>
        <option value="rejoin" ${bt==='rejoin'?'selected':''}>🔄 Nur Rejoin (war schon da)</option>
      </select>`;
  } else if (c.typ === 'rang') {
    const rop = c.rang_op ?? '=';
    const ranks = _rankSorted();
    inner = `
      <select class="cf" style="width:80px" onchange="condField('${tid}',${ci},'rang_op',this.value);condRerender('${tid}')">
        <option value="="   ${rop==='='  ?'selected':''}>= Genau</option>
        <option value="min" ${rop==='min'?'selected':''}>≥ Min.</option>
        <option value="max" ${rop==='max'?'selected':''}>≤ Max.</option>
        <option value="kein"${rop==='kein'?'selected':''}>∅ Kein Rang</option>
      </select>
      ${rop!=='kein'?`<select class="cf" style="flex:1;min-width:130px" onchange="condField('${tid}',${ci},'rang_id',this.value)">
        <option value="">– Rang wählen –</option>
        ${ranks.map(r=>`<option value="${r.id}" ${c.rang_id===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
      </select>`:''}`;
  } else if (c.typ === 'shop_kauf') {
    const shopItems = _shop.items;
    inner = `
      <select class="cf" style="flex:1;min-width:180px" onchange="condField('${tid}',${ci},'shop_id',this.value)">
        <option value="">🛒 Jeder Shop-Kauf</option>
        ${shopItems.map(i=>`<option value="${i.id}" ${c.shop_id===i.id?'selected':''}>${escHtml(i.icon+' '+i.name)} (${i.preis} 💰)</option>`).join('')}
      </select>
      <span style="font-size:.62rem;color:var(--text3)">Auslöser = Käufer · C = Kaufziel</span>`;
  }
  if (c.typ === 'ev_timer') {
    inner = `<span style="font-size:.65rem;color:var(--text3)">Einmalig nach</span>
      <input class="cf cf-w80" type="number" min="1" step="1" value="${c.sek??10}"
        oninput="condField('${tid}',${ci},'sek',+this.value)">
      <span style="font-size:.65rem;color:var(--text3)">Sekunden automatisch feuern</span>`;
  } else if (c.typ === 'ev_interval') {
    inner = `<span style="font-size:.65rem;color:var(--text3)">Alle</span>
      <input class="cf cf-w70" type="number" min="1" value="${c.sek_min??30}"
        oninput="condField('${tid}',${ci},'sek_min',+this.value)">
      <span style="font-size:.62rem;color:var(--text3)">–</span>
      <input class="cf cf-w70" type="number" min="1" value="${c.sek_max??180}"
        oninput="condField('${tid}',${ci},'sek_max',+this.value)">
      <span style="font-size:.65rem;color:var(--text3)">Sekunden wiederholt feuern</span>`;
  }
  const icons = {wort:'💬',zone:'🗺️',zone_rect:'📐',item_traegt:'👗',item_traegt_nicht:'🚫',trigger_war:'🔗',player_betritt:'👋',ev_timer:'⏱',ev_interval:'🔁',rang:'🏆',shop_kauf:'🛒'};
  // Logik-Operator: verbindet diese Bedingung mit der vorherigen
  const logik = c.logik ?? 'und';
  const logikBadge = ci === 0
    ? `<div class="cond-when-lbl">WENN</div>`
    : `<div style="display:flex;align-items:center;gap:0;margin:2px 0;padding-left:6px">
        <button onclick="condLogik('${tid}',${ci},'und')" class="logik-btn ${logik==='und'?'active':''}" title="UND – alle müssen zutreffen">UND</button>
        <button onclick="condLogik('${tid}',${ci},'oder')" class="logik-btn ${logik==='oder'?'active':''}" title="ODER – mind. eine muss zutreffen">ODER</button>
        <button onclick="condLogik('${tid}',${ci},'und_oder')" class="logik-btn ${logik==='und_oder'?'active':''}" title="Egal – mindestens eine genügt">UND/ODER</button>
        <button onclick="condLogik('${tid}',${ci},'und_nicht')" class="logik-btn ${logik==='und_nicht'?'active active-nicht':''}" style="border-left:none;border-radius:0 3px 3px 0" title="UND NICHT – Bedingung darf NICHT zutreffen">UND NICHT</button>
      </div>`;
  return `<div class="cond-group ${logik==='oder'?'cond-group-oder':logik==='und_nicht'?'cond-group-nicht':''}">
    ${logikBadge}
    <div class="cond-card cond-op" id="cond-${tid}-${ci}">
      <div class="card-fields">
        <span class="cond-num">${ci+1}</span>
        <span style="font-size:.7rem;font-weight:600;color:var(--purple);flex-shrink:0">${icons[c.typ]??'❓'}</span>
        ${inner}
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">
        <button class="order-btn" onclick="condMoveUp('${tid}',${ci})" ${ci===0?'disabled':''}>▲</button>
        <button class="order-btn" onclick="condMoveDown('${tid}',${ci})" title="Nach unten">▼</button>
        <button class="rm-btn" style="margin-top:2px" onclick="condRemove('${tid}',${ci})">✕</button>
      </div>
    </div>
  </div>`;
}

// ── Actions ───────────────────────────────────────────────────
function _actBeiF(bf) {
  return {ignorieren:'⬇️ Ignorieren – weiter',kette_stoppen:'⏹ Kette stoppen',trigger_ungueltig:'❌ Trigger ungültig'}[bf]??'⬇️ Ignorieren – weiter';
}

function renderAct(tid, a, ai) {
  const b   = _selBot();
  const t   = b?.triggers.find(x=>x.id===tid);
  const tot = t?.aktionen?.length ?? 0;

  const types = [
    ['chat','💬 Chat senden'],['emote','✨ Emote senden'],['whisper','🤫 Whisper senden'],
    ['item','📦 Item / Curse / Profil anlegen'],['item_entf','🗑️ Item entfernen'],
    ['teleport','🌀 Teleport'],
    ['money','💰 Money ändern'],
    ['rang','🏆 Rang setzen'],
  ];
  const typeOpts = types.map(([v,l])=>`<option value="${v}" ${a.typ===v?'selected':''}>${l}</option>`).join('');

  let extra = '';
  if (['chat','emote','whisper'].includes(a.typ)) {
    extra = `<textarea class="cf" style="width:100%;resize:vertical;min-height:44px;margin-top:4px" rows="2"
        oninput="actField('${tid}',${ai},'text',this.value)"
        placeholder="{name} schrieb: {wort} – Pos: {x}/{y}">${escHtml(a.text||'')}</textarea>
      <div style="font-size:.59rem;color:var(--text3);margin-top:2px">Variablen: {name} {wort} {typ} {x} {y}</div>`;
  } else if (a.typ === 'item') {
    const cfgInfo = a.itemConfig ? ` <span style="font-size:.58rem;background:var(--gd);color:var(--green);padding:1px 4px;border-radius:3px">✓ Konfig</span>` : '';
    const label = a.itemConfig ? `📦 ${a.itemConfig.group}/${a.itemConfig.asset}` : a.profilName ? `👗 ${a.profilName}` : a.curseName ? `🔮 ${a.curseName}` : a.item ? `📦 ${a.gruppe||'?'}/${a.item}` : '– nichts gewählt –';
    const asLabel = a.antiStrip_itemConfig ? `📦 ${a.antiStrip_itemConfig.group}/${a.antiStrip_itemConfig.asset}`
                  : a.antiStrip_curseName  ? `🔮 ${a.antiStrip_curseName}`
                  : a.antiStrip_ersatz     ? `📦 ${a.antiStrip_gruppe||'?'}/${a.antiStrip_ersatz}`
                  : '– kein Ersatz gewählt (= gleiches Item) –';
    const antiStripRows = a.antiStrip ? `
      <div class="as-act-row">
        <span class="as-act-label">Ersatz-Item:</span>
        <span style="font-size:.68rem;color:var(--text2);flex:1">${escHtml(asLabel)}</span>
        <button onclick="ipickerOpenForActAntiStrip('${tid}',${ai})" style="font-size:.63rem;padding:3px 9px;background:var(--pd);border:none;color:var(--pl);border-radius:5px;cursor:pointer">📂 Wählen</button>
        ${a.antiStrip_ersatz && !a.antiStrip_itemConfig ? `<input class="cf" type="color" value="${a.antiStrip_farbe||'#ff0000'}" oninput="actField('${tid}',${ai},'antiStrip_farbe',this.value)" style="width:28px;padding:1px;cursor:pointer" title="Farbe">` : ''}
      </div>
      <div class="as-act-row">
        <span class="as-act-label">Delay:</span>
        <input class="cf" type="number" value="${a.antiStrip_delay??500}" min="0" step="100"
          oninput="actField('${tid}',${ai},'antiStrip_delay',+this.value)"
          style="width:72px;font-size:.68rem"> ms
        <span style="font-size:.6rem;color:var(--text3)">(Wartezeit nach Entfernen)</span>
      </div>` : '';
    extra = `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap">
        <span style="font-size:.7rem;color:var(--text2);flex:1">${escHtml(label)}${cfgInfo}</span>
        <button onclick="ipickerOpenForAct('${tid}',${ai})" style="font-size:.63rem;padding:3px 9px;background:var(--pd);border:none;color:var(--pl);border-radius:5px;cursor:pointer">📂 Auswählen…</button>
        ${a.item && !a.itemConfig ? `<input class="cf" type="color" value="${a.farbe||'#ffffff'}" oninput="actField('${tid}',${ai},'farbe',this.value)" style="width:28px;padding:1px;cursor:pointer" title="Farbe">` : ''}
      </div>
      <div class="as-act-box">
        <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.65rem;color:var(--text2)">
          <input type="checkbox" ${a.antiStrip?'checked':''} onchange="actField('${tid}',${ai},'antiStrip',this.checked);actRerender('${tid}',${ai})">
          🛡️ AntiStrip – Item wird wieder angelegt wenn der Spieler es entfernt
        </label>
        ${antiStripRows}
      </div>`;
  } else if (a.typ === 'item_entf') {
    extra = `<input class="cf" style="width:100%;margin-top:4px" value="${escHtml(a.gruppe||'')}"
        oninput="actField('${tid}',${ai},'gruppe',this.value)" placeholder="Gruppe (z.B. ItemMouth, ItemArms …)">`;
  } else if (a.typ === 'teleport') {
    const slots = a.tpSlots ?? [];
    const slotsHtml = slots.map((s, si) => {
      const gueltig = s.gueltig ?? true; // Fallback zählt als Erfolg?
      return `<div class="tp-slot-row" id="tpslot-${tid}-${ai}-${si}">
        <span class="tp-slot-badge ${si===0?'primary':'fallback'}">${si===0?'Primär':'Fallback '+(si)}</span>
        <span style="font-size:.63rem;color:var(--text3)">X</span>
        <input class="cf" type="number" style="width:54px" value="${s.x??0}" oninput="tpSlotField('${tid}',${ai},${si},'x',+this.value)" placeholder="X">
        <span style="font-size:.63rem;color:var(--text3)">Y</span>
        <input class="cf" type="number" style="width:54px" value="${s.y??0}" oninput="tpSlotField('${tid}',${ai},${si},'y',+this.value)" placeholder="Y">
        <button class="tp-slot-valid ${gueltig?'zählt':'zählt-nicht'}"
          onclick="tpSlotField('${tid}',${ai},${si},'gueltig',!${gueltig});actRerender('${tid}',${ai})"
          title="${gueltig?'Dieser Slot zählt als Erfolg – klicken um zu ändern':'Dieser Slot gilt als Fehler (bei_fehler greift) – klicken um zu ändern'}">
          ${gueltig?'✅ Gültig':'❌ Fehler'}
        </button>
        <button onclick="tpSlotRemove('${tid}',${ai},${si})" style="margin-left:auto;background:none;border:none;color:var(--red);cursor:pointer;font-size:.7rem;padding:1px 4px" title="Entfernen">✕</button>
      </div>`;
    }).join('');
    extra = `
      <div style="font-size:.63rem;color:var(--text3);margin-top:5px">
        🌀 Teleportiert den Auslöser. Wenn alle Positionen belegt sind → gilt als Fehler.
      </div>
      <div class="tp-slot-list" id="tpslots-${tid}-${ai}">${slotsHtml}</div>
      <button class="tp-slot-add-btn" onclick="tpSlotAdd('${tid}',${ai})">+ Position / Fallback hinzufügen</button>`;
  } else if (a.typ === 'money') {
    const moneyName = _money?.settings?.name || 'Gold';
    const mop = a.money_op ?? 'add';
    extra = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:130px" onchange="actField('${tid}',${ai},'money_op',this.value);actRerender('${tid}',${ai})">
        <option value="add"   ${mop==='add'?'selected':''}>➕ Hinzufügen</option>
        <option value="sub"   ${mop==='sub'?'selected':''}>➖ Abziehen</option>
        <option value="set"   ${mop==='set'?'selected':''}>= Setzen auf</option>
        <option value="reset" ${mop==='reset'?'selected':''}>🔄 Zurücksetzen (0)</option>
      </select>
      ${mop!=='reset'?`<input class="cf cf-w80" type="number" value="${a.money_val??1}" oninput="actField('${tid}',${ai},'money_val',+this.value)">
      <span style="font-size:.68rem;color:var(--text3)">${escHtml(moneyName)}</span>`:''}
      <span style="font-size:.62rem;color:var(--text3)">Ziel: Auslöser</span>
    </div>`;
  } else if (a.typ === 'rang') {
    const rop = a.rang_op ?? 'setzen';
    const ranks = _rankSorted();
    extra = `<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">
      <select class="cf" style="width:155px" onchange="actField('${tid}',${ai},'rang_op',this.value);actRerender('${tid}',${ai})">
        <option value="setzen"    ${rop==='setzen'?'selected':''}>🏆 Rang setzen</option>
        <option value="entfernen" ${rop==='entfernen'?'selected':''}>❌ Rang entfernen</option>
        <option value="naechster" ${rop==='naechster'?'selected':''}>⬆️ Nächster Rang</option>
        <option value="vorheriger"${rop==='vorheriger'?'selected':''}>⬇️ Vorheriger Rang</option>
      </select>
      ${rop==='setzen'?`<select class="cf" style="flex:1;min-width:140px" onchange="actField('${tid}',${ai},'rang_id',this.value)">
        <option value="">– Rang wählen –</option>
        ${ranks.map(r=>`<option value="${r.id}" ${a.rang_id===r.id?'selected':''}>${escHtml(r.icon+' '+r.name)} (Lv.${r.level})</option>`).join('')}
      </select>`:''}
      ${rop==='naechster'||rop==='vorheriger'?`<span style="font-size:.62rem;color:var(--text3)">Bei Lv.Max/Min: kein Wechsel</span>`:''}
    </div>`;
  }

  // Chat/Emote/Whisper sind immer erfolgreich → kein Dann/Sonst
  const canBranch = ['teleport','item','item_entf'].includes(a.typ);

  // Dann/Sonst Inline-Nachrichten
  function renderMsg(field, label, color, placeholder) {
    const val = a[field] ?? '';
    const typField = field+'_typ';
    const mt = a[typField] ?? 'chat';
    if (!canBranch) return '';
    return `<div style="display:flex;gap:5px;align-items:center;margin-top:4px">
      <span style="font-size:.62rem;font-weight:600;color:${color};white-space:nowrap;min-width:42px">${label}</span>
      <select class="cf" style="width:86px;font-size:.62rem" onchange="actField('${tid}',${ai},'${typField}',this.value);actRerender('${tid}',${ai})">
        <option value="nichts"   ${mt==='nichts'?'selected':''}>– nichts</option>
        <option value="chat"    ${mt==='chat'?'selected':''}>💬 Chat</option>
        <option value="emote"   ${mt==='emote'?'selected':''}>✨ Emote</option>
        <option value="whisper" ${mt==='whisper'?'selected':''}>🤫 Whisper</option>
      </select>
      ${mt!=='nichts'?`<input class="cf cf-flex" style="font-size:.68rem" value="${escHtml(val)}"
        oninput="actField('${tid}',${ai},'${field}',this.value)"
        placeholder="${placeholder}">`:''}
    </div>`;
  }

  const branchSection = canBranch ? `
    <div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--border2)">
      ${renderMsg('dann_msg','✅ Dann:','#5c5','{name} teleportiert nach X{x} Y{y}')}
      ${renderMsg('sonst_msg','❌ Sonst:','#e55','Kein freier Platz für {name}!')}
    </div>` : '';

  // Bei Fehler (canBranch Aktionen können fehlschlagen)
  const bf = a.bei_fehler ?? 'ignorieren';
  const bfColors = {ignorieren:'var(--text3)',kette_stoppen:'#e8a020',trigger_ungueltig:'#e05050'};
  const bfRow = canBranch ? `<div style="display:flex;gap:6px;align-items:center;margin-top:4px">
    <span style="font-size:.6rem;color:var(--text3);white-space:nowrap">Wenn fehlschlägt:</span>
    <select class="cf" style="flex:1;color:${bfColors[bf]??'var(--text3)'}" onchange="actField('${tid}',${ai},'bei_fehler',this.value);actRerender('${tid}',${ai})">
      <option value="ignorieren"        ${bf==='ignorieren'?'selected':''}>⬇️ Weiter mit nächster Aktion</option>
      <option value="kette_stoppen"     ${bf==='kette_stoppen'?'selected':''}>⏹ Kette stoppen (Trigger zählt)</option>
      <option value="trigger_ungueltig" ${bf==='trigger_ungueltig'?'selected':''}>❌ Trigger ungültig (Fallback läuft)</option>
    </select>
  </div>` : '';

  const bfBorder = {kette_stoppen:'#664400',trigger_ungueltig:'#660000'}[bf] ?? '';
  return `<div class="act-card" id="act-${tid}-${ai}" style="${bfBorder?'border-color:'+bfBorder+';background:#0d0906;':''}">
    <div style="flex:1">
      <div style="display:flex;gap:4px;align-items:center">
        <span style="display:flex;flex-direction:column;gap:1px;flex-shrink:0">
          <button class="order-btn" onclick="actMoveUp('${tid}',${ai})" ${ai===0?'disabled':''}>▲</button>
          <button class="order-btn" onclick="actMoveDown('${tid}',${ai})" ${ai===tot-1?'disabled':''}>▼</button>
        </span>
        <span class="trig-order-num" style="margin-right:2px">${ai+1}</span>
        <select class="cf" style="flex:1" onchange="actChangeType('${tid}',${ai},this.value)">${typeOpts}</select>
        <input class="cf cf-w80" type="number" value="${a.delay??0}" oninput="actField('${tid}',${ai},'delay',+this.value)" title="Delay nach vorheriger Aktion (ms)"> ms
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:5px;padding:5px 8px;background:rgba(96,165,250,0.05);border:1px solid rgba(96,165,250,0.12);border-radius:6px;flex-wrap:wrap">
        <span style="font-size:.62rem;font-weight:700;color:#60a5fa;white-space:nowrap">🎯 Ziel</span>
        <select class="cf" style="width:150px;font-size:.68rem" onchange="actField('${tid}',${ai},'aktZiel',this.value);actRerender('${tid}',${ai})">
          <option value="ausloeser" ${(!a.aktZiel||a.aktZiel==='ausloeser')?'selected':''}>👤 Auslöser / Kaufziel</option>
          <option value="shop_kaeufer" ${a.aktZiel==='shop_kaeufer'?'selected':''}>💳 Käufer (bei Shop)</option>
          <option value="alle"      ${a.aktZiel==='alle'?'selected':''}>👥 Alle im Raum</option>
          <option value="whitelist" ${a.aktZiel==='whitelist'?'selected':''}>📋 Whitelist</option>
        </select>
        ${a.aktZiel==='whitelist'?`<input class="cf" style="flex:1;min-width:150px;font-size:.68rem" value="${escHtml((a.aktZielNummern||[]).join(', '))}"
          oninput="actField('${tid}',${ai},'aktZielNummern',this.value.split(',').map(x=>+x.trim()).filter(x=>x>0))"
          placeholder="MemberNummer, z.B. 12345, 67890">`:''}
      </div>
      ${extra}
      ${branchSection}
      ${bfRow}
    </div>
    <button class="rm-btn" onclick="actRemove('${tid}',${ai})">✕</button>
  </div>`;
}

// ── Trigger CRUD helpers ───────────────────────────────────────
function botAddTrig() {
  const b = _selBot(); if (!b) return;
  const t = { id:'t'+Date.now(), name:'Neuer Trigger', aktiv:true, delay:0, bedingungen:[], aktionen:[] };
  b.triggers.push(t); _saveBots(); renderBotEditor();
  setTimeout(() => {
    document.getElementById('tb-'+t.id)?.classList.add('open');
    document.getElementById('tc-'+t.id)?.scrollIntoView({behavior:'smooth',block:'start'});
  }, 50);
}

function trigToggleBody(tid) { document.getElementById('tb-'+tid)?.classList.toggle('open'); }


function trigField(tid, field, val) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t[field] = val; _saveBots();
  if (field === 'aktiv') {
    document.getElementById('tc-'+tid)?.classList.toggle('trig-on', !!val);
  }
  if (field === 'name') {
    const el = document.getElementById('tlabel-'+tid);
    if (el) el.textContent = val || 'Trigger';
  }
}

function trigDelete(tid) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid);
  if (!t || !confirm(`Trigger "${t.name||tid}" löschen?`)) return;
  b.triggers = b.triggers.filter(x=>x.id!==tid); _saveBots();
  document.getElementById('tc-'+tid)?.remove();
}

function trigMoveUp(tid) {
  const b = _selBot(); if (!b) return;
  const i = b.triggers.findIndex(x=>x.id===tid); if (i<=0) return;
  [b.triggers[i-1], b.triggers[i]] = [b.triggers[i], b.triggers[i-1]];
  _saveBots();
  const wasOpen = document.getElementById('tb-'+tid)?.classList.contains('open');
  renderBotEditor();
  if (wasOpen) setTimeout(()=>document.getElementById('tb-'+tid)?.classList.add('open'), 10);
}

function trigMoveDown(tid) {
  const b = _selBot(); if (!b) return;
  const i = b.triggers.findIndex(x=>x.id===tid); if (i<0||i>=b.triggers.length-1) return;
  [b.triggers[i], b.triggers[i+1]] = [b.triggers[i+1], b.triggers[i]];
  _saveBots();
  const wasOpen = document.getElementById('tb-'+tid)?.classList.contains('open');
  renderBotEditor();
  if (wasOpen) setTimeout(()=>document.getElementById('tb-'+tid)?.classList.add('open'), 10);
}

function trigRerender(tid) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const i = b.triggers.indexOf(t);
  const card = document.getElementById('tc-'+tid); if (!card) return;
  const wasOpen = document.getElementById('tb-'+tid)?.classList.contains('open');
  const tmp = document.createElement('div');
  tmp.innerHTML = renderTrigCard(b, t, i);
  card.replaceWith(tmp.firstElementChild);
  if (wasOpen) document.getElementById('tb-'+tid)?.classList.add('open');
}

// Conditions
function trigAddCond(tid, typ) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const defs = {
    wort:           {typ:'wort', wort:'', typ_msg:'any'},
    zone:           {typ:'zone', name:'', x:0, y:0, puffer:1},
    item_traegt:    {typ:'item_traegt', item:'', gruppe:''},
    trigger_war:    {typ:'trigger_war', trigId:''},
    player_betritt: {typ:'player_betritt'},
    rang:           {typ:'rang', rang_op:'=', rang_id:''},
    shop_kauf:      {typ:'shop_kauf', shop_id:''},
    ev_timer:       {typ:'ev_timer', sek:10},
    ev_interval:    {typ:'ev_interval', sek_min:30, sek_max:180},
  };
  t.bedingungen = t.bedingungen ?? [];
  t.bedingungen.push(defs[typ]??{typ});
  _saveBots();
  document.getElementById('conds-'+tid).innerHTML = t.bedingungen.map((c,ci)=>renderCond(b,tid,c,ci)).join('');
  document.getElementById('tb-'+tid)?.classList.add('open');
}

function condField(tid, ci, field, val) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  if (!t.bedingungen[ci]) return;
  t.bedingungen[ci][field] = val; _saveBots();
}

function condLogik(tid, ci, logik) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  if (!t.bedingungen[ci]) return;
  t.bedingungen[ci].logik = logik; _saveBots();
  condRerender(tid);
}

function condMoveUp(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t || ci<=0) return;
  [t.bedingungen[ci-1], t.bedingungen[ci]] = [t.bedingungen[ci], t.bedingungen[ci-1]];
  _saveBots(); condRerender(tid);
}

function condMoveDown(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t || ci>=t.bedingungen.length-1) return;
  [t.bedingungen[ci], t.bedingungen[ci+1]] = [t.bedingungen[ci+1], t.bedingungen[ci]];
  _saveBots(); condRerender(tid);
}

function condRemove(tid, ci) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t.bedingungen.splice(ci,1); _saveBots();
  document.getElementById('conds-'+tid).innerHTML = t.bedingungen.map((c,ci2)=>renderCond(b,tid,c,ci2)).join('');
}

function condRerender(tid) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  document.getElementById('conds-'+tid).innerHTML = (t.bedingungen||[]).map((c,ci)=>renderCond(b,tid,c,ci)).join('');
}

// Actions
function trigAddAct(tid) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t.aktionen = t.aktionen ?? [];
  t.aktionen.push({typ:'chat', delay:0, text:''});
  _saveBots();
  document.getElementById('acts-'+tid).innerHTML = t.aktionen.map((a,ai)=>renderAct(tid,a,ai)).join('');
  document.getElementById('tb-'+tid)?.classList.add('open');
}

function actField(tid, ai, field, val) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  if (!t.aktionen[ai]) return;
  t.aktionen[ai][field] = val; _saveBots();
}

function actRerender(tid, ai) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t||!t.aktionen[ai]) return;
  const el = document.getElementById('act-'+tid+'-'+ai);
  if (el) { const tmp=document.createElement('div'); tmp.innerHTML=renderAct(tid,t.aktionen[ai],ai); el.replaceWith(tmp.firstElementChild); }
}

function actChangeType(tid, ai, typ) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const delay = t.aktionen[ai]?.delay ?? 0;
  t.aktionen[ai] = {typ, delay};
  if (typ === 'teleport') {
    t.aktionen[ai].tpSlots = [{ x: 0, y: 0 }];
    t.aktionen[ai].keinFallbackMsg = '';
  }
  _saveBots();
  // Re-render just this action card
  const el = document.getElementById('act-'+tid+'-'+ai);
  if (el) { const tmp=document.createElement('div'); tmp.innerHTML=renderAct(tid,t.aktionen[ai],ai); el.replaceWith(tmp.firstElementChild); }
}

function actRemove(tid, ai) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  t.aktionen.splice(ai,1); _saveBots();
  document.getElementById('acts-'+tid).innerHTML = t.aktionen.map((a,ai2)=>renderAct(tid,a,ai2)).join('');
}

function actMoveUp(tid, ai) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t||ai<=0) return;
  [t.aktionen[ai-1], t.aktionen[ai]] = [t.aktionen[ai], t.aktionen[ai-1]];
  _saveBots();
  document.getElementById('acts-'+tid).innerHTML = t.aktionen.map((a,ai2)=>renderAct(tid,a,ai2)).join('');
}

function actMoveDown(tid, ai) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t||ai>=t.aktionen.length-1) return;
  [t.aktionen[ai], t.aktionen[ai+1]] = [t.aktionen[ai+1], t.aktionen[ai]];
  _saveBots();
  document.getElementById('acts-'+tid).innerHTML = t.aktionen.map((a,ai2)=>renderAct(tid,a,ai2)).join('');
}

// ── TP Slot helpers ───────────────────────────────────────────────
function tpSlotAdd(tid, ai) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const a = t.aktionen[ai]; if (!a) return;
  a.tpSlots = a.tpSlots ?? [];
  a.tpSlots.push({ x: 0, y: 0 });
  _saveBots();
  const el = document.getElementById('act-'+tid+'-'+ai);
  if (el) { const tmp=document.createElement('div'); tmp.innerHTML=renderAct(tid,a,ai); el.replaceWith(tmp.firstElementChild); }
}

function tpSlotRemove(tid, ai, si) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const a = t.aktionen[ai]; if (!a) return;
  a.tpSlots = a.tpSlots ?? [];
  a.tpSlots.splice(si, 1);
  _saveBots();
  const el = document.getElementById('act-'+tid+'-'+ai);
  if (el) { const tmp=document.createElement('div'); tmp.innerHTML=renderAct(tid,a,ai); el.replaceWith(tmp.firstElementChild); }
}

function tpSlotField(tid, ai, si, field, val) {
  const b = _selBot(); if (!b) return;
  const t = b.triggers.find(x=>x.id===tid); if (!t) return;
  const a = t.aktionen[ai]; if (!a) return;
  a.tpSlots = a.tpSlots ?? [];
  if (!a.tpSlots[si]) return;
  a.tpSlots[si][field] = val;
  _saveBots();
}

// ── Unified Item/Curse/Profile Picker ─────────────────────────
function ipickerOpenForAct(tid, ai) {
  _ipickerForActContext = {tid, ai};
  ipickerOpen('item', v => {
    const b = _selBot(); if (!b) return;
    const t = b.triggers.find(x=>x.id===tid); if (!t||!t.aktionen[ai]) return;
    const a = t.aktionen[ai];
    // Clear old type data
    delete a.item; delete a.gruppe; delete a.farbe;
    delete a.curseKey; delete a.curseName; delete a.curseEntry;
    delete a.profilName; delete a.profilItems; delete a.itemConfig;

    if (v.type === 'item') {
      if (v.itemConfig) {
        // Full Item Manager config captured
        a.itemConfig = v.itemConfig;
        a.item   = v.itemConfig.asset;
        a.gruppe = v.itemConfig.group;
      } else {
        a.item   = v.name;
        a.gruppe = v.group;
        a.farbe  = '#ffffff';
      }
    } else if (v.type === 'curse') {
      a.curseKey  = v.key;
      a.curseName = v.name;
      a.curseEntry = v.entry;
    } else if (v.type === 'profil') {
      a.profilName  = v.name;
      a.profilItems = PROFILES[v.name]?.items ?? [];
    }
    _saveBots();
    // Re-render action card
    const el = document.getElementById('act-'+tid+'-'+ai);
    if (el) { const tmp=document.createElement('div'); tmp.innerHTML=renderAct(tid,a,ai); el.replaceWith(tmp.firstElementChild); }
  });
}

function ipickerOpenForActAntiStrip(tid, ai) {
  ipickerOpen('item', v => {
    const b = _selBot(); if (!b) return;
    const t = b.triggers.find(x=>x.id===tid); if (!t||!t.aktionen[ai]) return;
    const a = t.aktionen[ai];
    delete a.antiStrip_ersatz; delete a.antiStrip_gruppe; delete a.antiStrip_farbe;
    delete a.antiStrip_itemConfig; delete a.antiStrip_curseName; delete a.antiStrip_curseEntry;
    if (v.type === 'item') {
      if (v.itemConfig) {
        a.antiStrip_itemConfig = v.itemConfig;
        a.antiStrip_ersatz = v.itemConfig.asset;
        a.antiStrip_gruppe = v.itemConfig.group;
        a.antiStrip_farbe  = v.itemConfig.colors?.[0] ?? '#ff0000';
      } else {
        a.antiStrip_ersatz = v.name;
        a.antiStrip_gruppe = v.group;
        a.antiStrip_farbe  = '#ff0000';
      }
    } else if (v.type === 'curse') {
      a.antiStrip_curseName  = v.name;
      a.antiStrip_curseEntry = v.entry;
      a.antiStrip_gruppe     = v.entry?.Gruppe ?? '';
    }
    _saveBots();
    actRerender(tid, ai);
  });
}

function ipickerOpen(defaultTab, cb) {
  _ipickerCb  = cb;
  _ipickerTab = defaultTab;
  document.getElementById('ipickerOverlay').style.display = 'flex';
  document.getElementById('ipickerSearch').value = '';
  _ipickerRenderTabs();
  ipickerRender();
}

function ipickerClose() {
  document.getElementById('ipickerOverlay').style.display = 'none';
  _ipickerCb = null;
}

function _ipickerRenderTabs() {
  const tabs = [{id:'item',l:'📦 BC-Items'},{id:'curse',l:'🔮 Curses'},{id:'profil',l:'👗 Profile'}];
  document.getElementById('ipickerTabs').innerHTML = tabs.map(t=>
    `<span class="ipicker-tab${_ipickerTab===t.id?' on':''}" onclick="ipickerSetTab('${t.id}')">${t.l}</span>`
  ).join('');
}

function ipickerSetTab(tab) {
  if (tab === 'item') {
    // If there's a pending action context, go to Item Manager with button
    if (_ipickerCb) {
      _trigPending = {cb: _ipickerCb, tid: _ipickerForActContext?.tid, ai: _ipickerForActContext?.ai};
      _ipickerCb = null;
      _ipickerForActContext = null;
    }
    ipickerClose();
    switchTab('items');
    // Show "Zum Trigger hinzufügen" banner in item manager
    _showTriggerAddBanner();
    return;
  }
  _ipickerTab = tab; _ipickerRenderTabs(); ipickerRender();
}

// Lookup cache: avoids putting complex objects in onclick attributes
const _ipickerCache = {};
let _ipickerCacheIdx = 0;

function ipickerRender() {
  const search = (document.getElementById('ipickerSearch')?.value??'').toLowerCase();
  const el = document.getElementById('ipickerList');
  if (!el) return;
  // Reset cache on each render
  Object.keys(_ipickerCache).forEach(k => delete _ipickerCache[k]);
  _ipickerCacheIdx = 0;

  let html = '';
  if (_ipickerTab === 'curse') {
    const entries = Object.entries(CURSE_DB).filter(([k,e])=>
      !search || k.toLowerCase().includes(search) || (e.CraftName||'').toLowerCase().includes(search) || (e.ItemName||'').toLowerCase().includes(search)
    ).slice(0, 150);
    if (!entries.length) { el.innerHTML='<div style="padding:20px;color:var(--text3);font-size:.72rem;text-align:center">Keine Curses. Bitte Craft & Curse scannen/importieren.</div>'; return; }
    html = entries.map(([k,e])=>{
      const idx = _ipickerCacheIdx++;
      _ipickerCache[idx] = {type:'curse', key:k, name:e.CraftName||e.ItemName, entry:e};
      return `<div class="ipicker-row" onclick="ipickerSelectIdx(${idx})">
        <span class="ipicker-tag purple">${escHtml(e.Gruppe||'?')}</span>
        <span style="flex:1">${escHtml(e.CraftName||e.ItemName)}</span>
        <span style="color:var(--text3);font-size:.6rem">${escHtml(e.Besitzer?.Name||'')}</span>
        ${e.IstLSCGCurse?'<span class="ipicker-tag green">🧿</span>':''}
      </div>`;
    }).join('');
  } else if (_ipickerTab === 'profil') {
    const profiles = Object.keys(PROFILES).filter(p=>!search||p.toLowerCase().includes(search));
    if (!profiles.length) { el.innerHTML='<div style="padding:20px;color:var(--text3);font-size:.72rem;text-align:center">Keine Profile. Zuerst ein Outfit-Profil speichern.</div>'; return; }
    html = profiles.map(p=>{
      const idx = _ipickerCacheIdx++;
      _ipickerCache[idx] = {type:'profil', name:p};
      return `<div class="ipicker-row" onclick="ipickerSelectIdx(${idx})">
        <span class="ipicker-tag green">👗</span>
        <span style="flex:1">${escHtml(p)}</span>
        <span style="color:var(--text3);font-size:.6rem">${PROFILES[p]?.date||''}</span>
      </div>`;
    }).join('');
  }
  el.innerHTML = html;
}

function ipickerSelectIdx(idx) {
  const val = _ipickerCache[idx];
  if (!val) return;
  ipickerSelect(val);
}

function ipickerSelect(val) {
  if (_ipickerCb) {
    const cb = _ipickerCb;
    ipickerClose(); // close first so cb can re-open if needed
    cb(val);
  } else {
    ipickerClose();
  }
}

// ── Item Manager Integration ──────────────────────────────────
// Shows a banner in item manager: "Zum Trigger hinzufügen" per selected item
function _showTriggerAddBanner() {
  // Remove old banner if exists
  document.getElementById('_trigBanner')?.remove();
  if (!_trigPending) return;
  const banner = document.createElement('div');
  banner.id = '_trigBanner';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:400;background:#1e1040;border-top:2px solid var(--purple);padding:8px 18px;display:flex;align-items:center;gap:12px;font-size:.73rem';
  banner.innerHTML = `<span style="color:var(--pl)">🎯 Item für Trigger wählen:</span>
    <span style="color:var(--text3);flex:1">Klicke ein Item in der Sidebar, dann auf <b style="color:var(--pl)">➕ Zum Trigger</b></span>
    <button onclick="_cancelTrigPending()" style="background:var(--rd);border:none;color:var(--red);border-radius:5px;padding:4px 10px;cursor:pointer;font-size:.68rem">✕ Abbrechen</button>`;
  document.body.appendChild(banner);

  // Patch the action buttons area to show "Zum Trigger" button
  _patchItemManagerForTrigger();
}

function _patchItemManagerForTrigger() {
  // Observe the btn-row to add our button when an item is selected
  // FIX: Use module-level _origBuildConf (no const/let) so _restoreBuildConf() can access it
  if (!window.buildConfigurator) return;
  _origBuildConf = window.buildConfigurator;
  window.buildConfigurator = function(...args) {
    _origBuildConf.apply(this, args);
    _injectTriggerButton();
  };
}

function _injectTriggerButton() {
  if (!_trigPending) { _restoreBuildConf(); return; }
  const btnRow = document.querySelector('.btn-row');
  if (!btnRow || document.getElementById('_trigAddBtn')) return;
  const btn = document.createElement('button');
  btn.id = '_trigAddBtn';
  btn.className = 'btn btn-green';
  btn.style.cssText = 'min-width:130px;font-size:.8rem;border:2px solid var(--green)';
  btn.textContent = '➕ Zum Trigger';
  btn.onclick = _addCurrentItemToTrigger;
  btnRow.appendChild(btn);
}

function _addCurrentItemToTrigger() {
  const cur = window._BCCurrent ? window._BCCurrent() : null;
  if (!_trigPending || !cur) { showStatus('❌ Kein Item ausgewählt – bitte erst ein Item in der Sidebar anklicken','error'); return; }
  const { group, asset, cfg } = cur;

  // Serialize current Item Manager config (TypeRecord, colors, props)
  const tr = {};
  for (const key in (cfg.typeKeys||{})) {
    const sel = [...(dimSelected[key]??new Set([0]))].sort((a,b)=>a-b);
    tr[key] = dimMode[key]==='multi' ? sel.reduce((acc,i)=>acc+Math.pow(2,i),0) : (sel[0]??0);
  }
  const colors = (typeof getColors === 'function') ? getColors() : ['#ffffff'];
  const props = {};
  for (const key in (cfg.typeKeys||{})) {
    for (const idx of (dimSelected[key]??[0])) {
      const sp = dimSubProps[key]?.[idx]||{};
      for (const [p,v] of Object.entries(sp)) if (v!=null) props[p] = v;
    }
  }
  for (const [p,v] of Object.entries(globalPropVals||{})) if (v!=null) props[p] = v;
  const typeStr = Object.entries(tr).map(([k,v])=>k+v).join('');

  // Craft (Name/Beschreibung) aus dem Item Manager auslesen
  const craftName = document.getElementById('craftName')?.value.trim() ?? '';
  const craftDesc = document.getElementById('craftDesc')?.value.trim() ?? '';
  const craftProp = document.getElementById('craftProp')?.value ?? 'Leash_Full';
  const firstColor = colors.find(c => c !== 'Default') ?? '#808080';
  const craft = craftName ? { Name: craftName, Description: craftDesc, Property: craftProp, Color: firstColor, Lock: '', Item: asset, Private: false } : null;

  // Lock aus dem Item Manager auslesen
  const lockType = document.getElementById('lockType')?.value ?? '';
  let lockParams = { timer: 0, combo: '', password: '', relMember: 0, relTimer: 0 };
  if (lockType) {
    const isRelLock = REL_LOCKS.includes(lockType);
    if (lockType.includes('Timer') && !isRelLock) {
      const lh = parseInt(document.getElementById('timerH')?.value) || 0;
      const lm = parseInt(document.getElementById('timerM')?.value) || 0;
      const ls = parseInt(document.getElementById('timerS')?.value) || 0;
      lockParams.timer = (lh * 3600 + lm * 60 + ls) * 1000;
    }
    if (lockType === 'CombinationPadlock') lockParams.combo = document.getElementById('comboCode')?.value || '1234';
    if (PW_LOCKS.includes(lockType))       lockParams.password = document.getElementById('lockPassword')?.value || '1234';
    if (isRelLock) {
      lockParams.relMember = parseInt(document.getElementById('relMemberNum')?.value) || 0;
      lockParams.relTimer  = (parseInt(document.getElementById('relTimerH')?.value) || 0) * 3600 * 1000;
    }
  }

  const itemConfig = { asset, group, colors, tr, typeStr, props, archetype: cfg.archetype, craft, lock: lockType, lockParams };
  const val = { type:'item', name: asset, group: group, itemConfig };
  const _pendingTid = _trigPending?.tid; // save before cancel
  _trigPending.cb(val);
  _cancelTrigPending();
  switchTab('bot');
  showStatus('✅ ' + asset + ' mit vollständiger Konfiguration zum Trigger hinzugefügt','success');
  // Trigger-Body öffnen + scrollen
  if (_pendingTid) {
    setTimeout(() => {
      const tb = document.getElementById('tb-' + _pendingTid);
      if (tb && !tb.classList.contains('open')) tb.classList.add('open');
      document.getElementById('tc-' + _pendingTid)?.scrollIntoView({behavior:'smooth', block:'nearest'});
    }, 50);
  }
}

let _origBuildConf = null;
function _restoreBuildConf() {
  if (_origBuildConf) { window.buildConfigurator = _origBuildConf; _origBuildConf = null; }
}

function _cancelTrigPending() {
  _trigPending = null;
  document.getElementById('_trigBanner')?.remove();
  document.getElementById('_trigAddBtn')?.remove();
  _restoreBuildConf();
}

// ── Config Export / Import ────────────────────────────────────
function botExportConfig() {
  const b = _selBot(); if (!b) { showStatus('❌ Kein Bot ausgewählt','error'); return; }
  // Include logs for this bot + system events
  const botLogs = (window._BCBotLog||[]).filter(e => e.botName === b.name || e.trigId === '__system__');
  const pkg = { ...b, _exportedLogs: botLogs, _exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(pkg,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='BCBot_'+b.name.replace(/\W+/g,'_')+'_'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); URL.revokeObjectURL(url);
  showStatus('✅ Bot + Logs exportiert','success');
}

function botImportConfig() {
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.json';
  inp.onchange = e => {
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        // Restore logs if present
        if (Array.isArray(d._exportedLogs) && d._exportedLogs.length) {
          window._BCBotLog = window._BCBotLog ?? [];
          // Merge: add imported logs that aren't already present (by ts+player)
          const existing = new Set(window._BCBotLog.map(l=>l.ts+'_'+l.player));
          d._exportedLogs.forEach(l => { if (!existing.has(l.ts+'_'+l.player)) window._BCBotLog.push(l); });
          window._BCBotLog.sort((a,b)=>b.ts-a.ts);
        }
        delete d._exportedLogs; delete d._exportedAt;
        const cur = _selBot();
        if (cur && confirm('Aktuellen Bot überschreiben?\n(Abbrechen = Als neuen Bot importieren)')) {
          Object.assign(cur, d, {id:cur.id}); _selBotId = cur.id;
          // FIX: rebuild roomEver with the correct final ID (cur.id, not the imported d.id)
          _rebuildRoomEverFromLogs(cur.id);
        } else {
          d.id = 'b'+Date.now(); _bots.push(d); _selBotId = d.id;
          // FIX: rebuild roomEver AFTER assigning the new ID so the correct ID is used
          _rebuildRoomEverFromLogs(d.id);
        }
        _saveBots(); renderBotList(); renderBotEditor();
        showStatus('✅ Bot importiert','success');
      } catch(err) { showStatus('❌ '+err.message,'error'); }
    };
    r.readAsText(e.target.files[0]);
  };
  inp.click();
}

// Gibt Set<memberNum> aller Spieler zurück die laut Logs je da waren
function _getKnownMembersFromLogs(botId) {
  const known = new Set();
  (window._BCBotLog||[]).forEach(e => {
    if (e.memberNum && (e.botId === botId || !botId)) known.add(e.memberNum);
  });
  return known;
}

// Gibt Set<memberNum> zurück die laut Logs im Raum sind (joined aber nicht verlassen)
function _getPresentMembersFromLogs(botId) {
  // Replay join/leave events chronologically
  const entries = (window._BCBotLog||[]).filter(e => e.botId === botId && (e.status==='join'||e.status==='leave'));
  entries.sort((a,b) => a.ts - b.ts);
  const present = new Set();
  entries.forEach(e => {
    if (e.status === 'join') present.add(e.memberNum);
    else if (e.status === 'leave') present.delete(e.memberNum);
  });
  return present;
}

// Rebuild roomEver from log entries (called after log import)
function _rebuildRoomEverFromLogs(botId) {
  if (!_connected) return;
  const known = _getKnownMembersFromLogs(botId);
  const present = _getPresentMembersFromLogs(botId);
  const b = _bots.find(x=>x.id===botId) ?? _selBot();
  if (!b) return;
  const safeId = b.id.replace(/\W/g,'_');
  const everArr = JSON.stringify([...known]);
  bcSend({type:'EXEC', code:`(()=>{const s=window['__BCKBotState_${safeId}']??{};s.roomEver=${everArr};window['__BCKBotState_${safeId}']=s;try{const ls=JSON.parse(localStorage.getItem('__BCKBotStates')||'{}');ls['${safeId}']=s;localStorage.setItem('__BCKBotStates',JSON.stringify(ls));}catch(e){}console.log('[Bot] roomEver aus Logs: ',${everArr}.length,' bekannt');})();`});
}

// Logs in localStorage persistieren
function _saveLogsToStorage() {
  try { localStorage.setItem('BCBot_Logs', JSON.stringify(window._BCBotLog||[])); } catch(e) {}
}
function _loadLogsFromStorage() {
  try {
    const s = localStorage.getItem('BCBot_Logs');
    if (s) window._BCBotLog = JSON.parse(s);
  } catch(e) {}
}

// ── Deploy ────────────────────────────────────────────────────
function _buildBotCode(bot) {
  const s = bot.settings;
  const triggers = (bot.triggers||[]).filter(t=>t.aktiv).map(t => ({
    id: t.id, name: t.name, delay: t.delay??0,
      wiederholung: t.wiederholung??'immer', maxMal: t.maxMal??2,
      fallbackTyp: t.fallbackTyp??'nichts', fallbackText: t.fallbackText??'',
      charSpec: !!t.charSpec, resetOnLeave: !!t.resetOnLeave,
      von: t.von??'alle',
      vonNummern: (t.vonNummern||[]).map(Number),
    bedingungen: (t.bedingungen||[]),
    aktionen: (t.aktionen||[]).map(a => {
      const base = a.typ==='item' && a.curseKey && !a.curseEntry ? {...a, curseEntry: CURSE_DB[a.curseKey]??null}
                 : a.typ==='item' && a.profilName && (!a.profilItems||!a.profilItems.length) ? {...a, profilItems: PROFILES[a.profilName]?.items??[]}
                 : {...a};
      // Ensure aktZiel fields are preserved and numbers are typed correctly
      base.aktZiel = a.aktZiel ?? 'ausloeser';
      base.aktZielNummern = (a.aktZielNummern||[]).map(Number);
      return base;
    }),
  }));
  const safeId   = bot.id.replace(/\W/g,'_');
  const safeName = bot.name.replace(/\\/g,'\\\\').replace(/`/g,'\\`');

  const cfgJson  = JSON.stringify({hearChat:s.hearChat,hearEmote:s.hearEmote,hearWhisper:s.hearWhisper,nurEigene:s.nurEigene,logAktiv:s.logAktiv??true,modus:s.modus,moneyQueryCmd:_money?.settings?.queryCmd??'',moneyQueryTyp:_money?.settings?.queryTyp??'whisper',moneyName:_money?.settings?.name??'Gold',rankQueryCmd:_rankData?.settings?.queryCmd??'',rankQueryTyp:_rankData?.settings?.queryCmdTyp??'whisper',rankQueryText:_rankData?.settings?.queryCmdText??'{name} hat Rang: {rang_icon} {rang}',rankDefs:_rankData?.defs??[],rankPlayers:Object.fromEntries(Object.entries(_rankData?.players??{}).map(([k,v])=>[k,v.rankId??null])),shopCmd:_shop?.settings?.cmd??'!pay',shopConfirmMsg:_shop?.settings?.confirmMsg??'',shopAnnounceMsg:_shop?.settings?.announceMsg??'',shopAnnounceAllMsg:_shop?.settings?.announceAllMsg??'',shopErrorMsg:_shop?.settings?.errorMsg??'',shopItems:(_shop?.items??[]).filter(i=>i.aktiv!==false),moneyBalances:Object.fromEntries(Object.entries(_money?.balances??{}).map(([k,v])=>[k,{balance:v.balance??0,name:v.name??''}]))});
  const trigsJson = JSON.stringify(triggers).replace(/`/g,'\\`').replace(/\${/g,'\\${');
  const events = (bot.events||[]).filter(e=>e.aktiv).map(e => ({
    id: e.id, name: e.name,
    von: e.von??'alle', vonNummer: e.vonNummer??0,
    ziel: e.ziel??'ausloeser', zielListe: e.zielListe??[],
    wiederholung: e.wiederholung??'immer', maxMal: e.maxMal??2,
    fallbackTyp: e.fallbackTyp??'nichts', fallbackText: e.fallbackText??'',
    bedingungen: e.bedingungen??[],
    aktionen: (e.aktionen||[]).map(a => {
      if (a.typ==='item' && a.curseKey && !a.curseEntry) return {...a, curseEntry: CURSE_DB[a.curseKey]??null};
      if (a.typ==='item' && a.profilName && (!a.profilItems||!a.profilItems.length)) return {...a, profilItems: PROFILES[a.profilName]?.items??[]};
      return a;
    }),
  }));
  const eventsJson = JSON.stringify(events).replace(/`/g,'\\`').replace(/\${/g,'\\${');
  // Build roomEver from logs – members who joined and haven't left yet
  // This is the authoritative source: Log löschen = Erstes Mal joinen
  const persistedRoomEver = (() => {
    const logs = window._BCBotLog || [];
    const botLogs = logs.filter(e => e.botId === bot.id && (e.status==='join'||e.status==='join_rejoin'||e.status==='leave'));
    botLogs.sort((a,b) => a.ts - b.ts);
    const ever = new Set();
    botLogs.forEach(e => {
      if (e.status === 'join' || e.status === 'join_rejoin') ever.add(e.memberNum);
      // leave doesn't remove from roomEver – only from present
    });
    return [...ever];
  })();
  const roomEverJson = JSON.stringify(persistedRoomEver);

  return `(function(){
const _BID='${safeId}';
if(window['_BCBot_'+_BID]){console.warn('[Bot] Bereits aktiv – erst stoppen!');return;}
// ── AntiStrip ────────────────────────────────────────────────
// Deklaration ganz oben damit _asRegister / _asUnregister
// von _execAct aufgerufen werden können bevor _asH definiert ist.
var _asWatchers = {};           // key: memberNum+'_'+gruppe
var _asH = null;               // wird unten gesetzt
function _asRegister(C, a) {
  var gruppe = (a.antiStrip_itemConfig && a.antiStrip_itemConfig.group)
    || (a.antiStrip_curseEntry && a.antiStrip_curseEntry.Gruppe)
    || a.antiStrip_gruppe
    || (a.itemConfig && a.itemConfig.group)
    || (a.curseEntry && a.curseEntry.Gruppe)
    || a.gruppe || '';
  if (!gruppe) { _log('\u26A0 AntiStrip: Gruppe nicht erkannt'); return; }
  var key = C.MemberNumber + '_' + gruppe;
  _asWatchers[key] = {
    memberNum: C.MemberNumber,
    gruppe:    gruppe,
    delay:     a.antiStrip_delay != null ? a.antiStrip_delay : 500,
    ersatz:    a.antiStrip_ersatz || null,
    farbe:     a.antiStrip_farbe  || '#ffffff',
    itemConfig: a.antiStrip_itemConfig || null,
    curseEntry: a.antiStrip_curseEntry || null,
  };
  _log('\u{1F6E1}\uFE0F AntiStrip aktiv: ' + C.Name + ' / ' + gruppe
    + (a.antiStrip_ersatz ? ' \u2192 ' + a.antiStrip_ersatz : ' (gleiches Item)'));
}
function _asUnregister(C, gruppe) {
  if (!gruppe) return;
  var key = C.MemberNumber + '_' + gruppe;
  if (_asWatchers[key]) {
    delete _asWatchers[key];
    _log('\u{1F6E1}\uFE0F AntiStrip beendet (Bot entfernt/ändert Item): ' + C.Name + ' / ' + gruppe);
  }
}
// ─────────────────────────────────────────────────────────────
const _cfg=${cfgJson};
const _moneyCfg={queryCmd:_cfg.moneyQueryCmd??''};
const _trigs=${trigsJson};
// State-Persistenz: beim Sync (Stop+Start) bleiben Fired-States erhalten
const _stateKey='__BCKBotState_${safeId}';
// Priorität: window (Sync) > localStorage (Reload) > leer
const _lsSaved=(()=>{try{return JSON.parse(localStorage.getItem('__BCKBotStates')||'{}')['${safeId}']??{};}catch(e){return {};}})();
const _savedState=window[_stateKey]??_lsSaved;
const _fired    =_savedState.fired    ??{}; // trigId -> last timestamp (global latch)
const _firedCnt =_savedState.firedCnt ??{}; // trigId -> fire count
const _firedChar=_savedState.firedChar??{}; // trigId_memberNum -> timestamp
// FIX: also persist evFiredCnt so einmalig/n_mal events survive bot restart/sync
const _evFiredCnt=Object.assign({},_savedState.evFiredCnt??{});
// roomEver: merge window-state + popup-persisted (build-time injected) + log-based
const _roomEver=new Set([...(_savedState.roomEver??[]),...(${roomEverJson})]);
// State sofort zurückschreiben damit Referenz live ist
window[_stateKey]={fired:_fired,firedCnt:_firedCnt,firedChar:_firedChar,roomEver:_roomEver};
// Quick lookup: trigId -> trigger config (for charSpec)
const _trigMap=Object.fromEntries(_trigs.map(t=>[t.id,t]));
// Rejoin-Fenster: memberNum → true – schließt wenn Nicht-Rejoin-Trigger feuert
const _rejoinWindow=new Map(); // memberNum → timestamp when opened
const _REJOIN_GRACE=1000; // ms window stays open regardless of other triggers
const _evts=${eventsJson};

// Rang-State: memberNum -> aktueller rankId (laut Popup-State)
// Beim Start mit gespeicherten Spieler-Rang-Zuweisungen initialisieren
const _rangState=Object.assign({},_cfg.rankPlayers??{});

// Shop-Konfiguration (Snapshot beim Bot-Start)
const _shopCfg={
  cmd:(_cfg.shopCmd||'!pay').trim(),
  items:_cfg.shopItems??[],
  confirmMsg:_cfg.shopConfirmMsg??'',
  announceMsg:_cfg.shopAnnounceMsg??'',
  announceAllMsg:_cfg.shopAnnounceAllMsg??'',
  errorMsg:_cfg.shopErrorMsg??'',
  moneyName:_cfg.moneyName??'Gold',
};
// Money-Balances: lokale Kopie für Echtzeit-Prüfungen (wird bei Abbuchung synchron aktualisiert)
const _moneyBalances=Object.assign({},_cfg.moneyBalances??{});

function _log(...a){if(_cfg.logAktiv)console.log('[Bot:${safeName}]',...a);}

// bei_fehler: 'ignorieren' | 'kette_stoppen' | 'trigger_ungueltig'
// Executed sequentially – each action's result determines if chain continues

// Direkt C.X/C.Y verwenden – exakt wie funktionierendes ZoneMonitor-Pattern
// Kein Lookup nötig: [Player,...ChatRoomCharacter] enthält bereits korrekte Positionen

function _ok(trig,rohText,typKey,C){
  const cx=C.X??-999,cy=C.Y??-999;
  const beds=trig.bedingungen??[];
  if(!beds.length)return true;
  // AND/OR Auswertung: logik-Feld pro Bedingung verbindet mit vorheriger
  // Ablauf: Bedingungen in OR-Gruppen aufteilen (trennend bei "oder"), dann alle Gruppen mit AND prüfen
  function checkOne(c){
    if(c.typ==='wort'){
      const m=c.typ_msg||'any';
      if(m!=='any'&&m!==typKey)return false;
      return!c.wort||(rohText||'').toLowerCase().includes((c.wort||'').toLowerCase());
    }
    if(c.typ==='zone'){
      const p=c.puffer??1;
      const ok=cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;
      if(!ok)_log('Zone miss: X='+cx+' Y='+cy+' erwartet X='+c.x+' Y='+c.y+'±'+p);
      return ok;
    }
    if(c.typ==='zone_rect'){
      const ok=cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);
      return ok;
    }
    if(c.typ==='item_traegt'){
      const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
      return(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);
    }
    if(c.typ==='item_traegt_nicht'){
      const Cf=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
      return!(Cf.Appearance??[]).some(a=>a.Asset?.Name===c.item);
    }
    if(c.typ==='trigger_war'){
      const ref=_trigMap[c.trigId];
      return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];
    }
    if(c.typ==='rang'){
      const op=c.rang_op??'=';
      const currentId=_rangState[C.MemberNumber]??null;
      if(op==='kein') return !currentId;
      if(!c.rang_id) return false;
      const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
      const targetDef=defs.find(r=>r.id===c.rang_id);
      const currentDef=defs.find(r=>r.id===currentId);
      if(!targetDef) return false;
      if(!currentDef) return false; // kein Rang → nicht erfüllt wenn level gebraucht
      const tl=targetDef.level, cl=currentDef.level;
      if(op==='=')   return cl===tl;
      if(op==='min') return cl>=tl;
      if(op==='max') return cl<=tl;
      return false;
    }
    if(c.typ==='shop_kauf') return false; // Nur via _handleShopCmd auslösbar
    if(c.typ==='player_betritt')return true; // handled by poll
    return true;
  }
  // Split into OR-groups (oder + und_oder both split groups)
  const groups=[[]];
  for(const c of beds){
    if(c.logik==='oder'||c.logik==='und_oder')groups.push([]);
    groups[groups.length-1].push(c);
  }
  // UND NICHT: Bedingung muss FALSCH sein
  return groups.some(g=>g.every(c=>c.logik==='und_nicht'?!checkOne(c):checkOne(c)));
}
function _istBesetzt(x,y,ausschliessen){
  // Ignore target positions at 0,0 — BC hasn't synced position yet
  if(x===0&&y===0)return false;
  return[Player,...(ChatRoomCharacter||[])].some(C=>{
    if(ausschliessen.includes(C.MemberNumber))return false;
    if(C.X===0&&C.Y===0)return false; // character position not yet loaded
    return C.X===x&&C.Y===y;
  });
}

function _teleport(a,C){
  const allSlots=a.tpSlots??[];
  if(!allSlots.length){_log('⚠️ Keine TP-Slots');return false;}
  // Find first free slot (respecting gueltig flag for return value)
  const ziel=allSlots.find(s=>!_istBesetzt(s.x,s.y,[C.MemberNumber]));
  if(!ziel){
    _log('⚠️ Alle TP-Slots belegt für '+C.Name);
    return false;
  }
  const si=allSlots.indexOf(ziel);
  ServerSend('ChatRoomChat',{
    Content:'ChatRoomMapViewTeleport',Type:'Hidden',
    Dictionary:[{Tag:'MapViewTeleport',Position:{X:ziel.x,Y:ziel.y}}],
    Target:C.MemberNumber,
  });
  _log('🌀 TP '+C.Name+' → X='+ziel.x+' Y='+ziel.y+(si>0?' [Fallback '+si+']':''));
  // Gültig-Flag: wenn Slot auf ❌ Fehler gesetzt → Aktion gilt als fehlgeschlagen
  const gueltig=ziel.gueltig??true;
  if(!gueltig)_log('⚠️ Slot '+si+' hat gueltig=false → gilt als Fehler');
  return gueltig;
}

// Tiefkopie eines Appearance-Items für Snapshot
function _snapItem(i){return{Asset:i.Asset,Group:i.Asset?.Group?.Name??'',Color:JSON.parse(JSON.stringify(i.Color??'#ffffff')),Craft:i.Craft??null,Property:JSON.parse(JSON.stringify(i.Property??{}))};}

// Nach InventoryWear: alle Items wiederherstellen die durch Block/Conflict entfernt wurden
// Ausnahme: der absichtlich geänderte Slot (targetGroup) wird nicht berührt
function _restoreDisplaced(C, snapshot, targetGroup){
  setTimeout(()=>{
    snapshot.forEach(snap=>{
      if(snap.Group===targetGroup)return; // dieser Slot wurde absichtlich geändert
      const stillThere=InventoryGet(C,snap.Group);
      if(!stillThere&&snap.Asset){
        // Item wurde durch InventoryWear verdrängt → wiederherstellen
        _log('♻️ Wiederherstellen: '+snap.Group+'/'+snap.Asset.Name+' (verdrängt durch '+targetGroup+')');
        try{
          InventoryWear(C,snap.Asset.Name,snap.Group,snap.Color,0,Player.MemberNumber,snap.Craft);
          const restored=InventoryGet(C,snap.Group);
          if(restored&&snap.Property&&Object.keys(snap.Property).length){
            restored.Property=snap.Property;
          }
        }catch(e){_log('⚠️ Wiederherstellen fehlgeschlagen für '+snap.Group+': '+e.message);}
      }
    });
    CharacterRefresh(C);ChatRoomCharacterUpdate(C);
  },150);
}

function _applyItemAction(a, C){
  try{
    // Snapshot ALLER aktuellen Items vor dem Anlegen
    const snapshot=(C.Appearance??[]).filter(i=>i.Asset?.Group?.Name).map(_snapItem);

    if(a.itemConfig){
      // Full Item Manager config: colors, TypeRecord, props, lock
      const ic=a.itemConfig;
      let col=ic.colors??['#ffffff'];
      if(typeof col==='string'&&col.includes(','))col=col.split(',');
      InventoryWear(C,ic.asset,ic.group,col,0,Player.MemberNumber,ic.craft??null);
      // Sofort TypeRecord setzen (vor CharacterRefresh) damit BC es direkt übernimmt
      const itemNow=InventoryGet(C,ic.group);
      if(itemNow){
        itemNow.Color=col;
        itemNow.Property=itemNow.Property??{};
        if(ic.tr&&Object.keys(ic.tr).length){
          itemNow.Property.TypeRecord=ic.tr;
          itemNow.Property.Type=ic.typeStr??'';
        }
        if(ic.props)Object.assign(itemNow.Property,ic.props);
      }
      CharacterRefresh(C);
      ChatRoomCharacterUpdate(C);
      _restoreDisplaced(C,snapshot,ic.group);
      // Zweiter Sync nach _restoreDisplaced (stellt sicher dass TypeRecord + Lock erhalten bleibt)
      setTimeout(()=>{
        const item=InventoryGet(C,ic.group);
        if(!item){
          // Item wurde durch _restoreDisplaced verdrängt → nochmal anlegen
          InventoryWear(C,ic.asset,ic.group,col,0,Player.MemberNumber,ic.craft??null);
          const reItem=InventoryGet(C,ic.group);
          if(reItem){
            reItem.Property=reItem.Property??{};
            if(ic.tr&&Object.keys(ic.tr).length){reItem.Property.TypeRecord=ic.tr;reItem.Property.Type=ic.typeStr??'';}
            if(ic.props)Object.assign(reItem.Property,ic.props);
          }
        } else {
          // TypeRecord nochmal sicherstellen (könnte durch _restoreDisplaced verloren gegangen sein)
          item.Property=item.Property??{};
          if(ic.tr&&Object.keys(ic.tr).length){item.Property.TypeRecord=ic.tr;item.Property.Type=ic.typeStr??'';}
          if(ic.props)Object.assign(item.Property,ic.props);
        }
        // Schloss anlegen (nach TypeRecord-Sync)
        if(ic.lock){
          const BCX_L=['LewdCrestPadlock','DeviousPadlock','LuziPadlock'];
          const REL_L=['OwnerPadlock','LoversPadlock','MistressPadlock'];
          const isBcx=BCX_L.includes(ic.lock);
          const isRel=REL_L.includes(ic.lock);
          const lp=ic.lockParams??{};
          const lockAsset=isBcx
            ?(Asset.find(a=>a.Name===ic.lock&&a.Group?.Name==='ItemMisc')??Asset.find(a=>a.Name===ic.lock))
            :Asset.find(a=>a.Name===ic.lock&&a.Group?.Name==='ItemMisc');
          if(lockAsset){
            const itemForLock=InventoryGet(C,ic.group);
            if(itemForLock){
              InventoryLock(C,itemForLock,{Asset:lockAsset},Player.MemberNumber,true);
              itemForLock.Property=itemForLock.Property??{};
              if(lp.timer>0)   itemForLock.Property.RemoveTimer=Date.now()+lp.timer;
              if(lp.combo)     itemForLock.Property.CombinationNumber=lp.combo;
              if(lp.password)  itemForLock.Property.Password=lp.password;
              if(isRel){
                itemForLock.Property.LockMemberNumber=lp.relMember||Player.MemberNumber;
                if(lp.relTimer>0)itemForLock.Property.RemoveTimer=Date.now()+lp.relTimer;
              }
              CharacterRefresh(C);
              _log('🔒 Schloss angelegt: '+ic.lock+' auf '+ic.asset+' ('+C.Name+')');
            }
          } else {
            _log('⚠️ Schloss nicht gefunden: '+ic.lock);
          }
        }
        CharacterRefresh(C);ChatRoomCharacterUpdate(C);
      },500);
    }else if(a.curseEntry){
      let col=a.curseEntry.Farbe;if(typeof col==='string'&&col.includes(','))col=col.split(',');
      InventoryWear(C,a.curseEntry.ItemName,a.curseEntry.Gruppe,col,0,Player.MemberNumber,a.curseEntry.Craft);
      _restoreDisplaced(C,snapshot,a.curseEntry.Gruppe);
    }else if(a.profilName){
      // Profil: alle Items nacheinander anlegen, kein Restore (Profil setzt bewusst mehrere Slots)
      (a.profilItems??[]).forEach(item=>{
        let col=item.colors??item.cfg?.Color??'#ffffff';
        if(typeof col==='string'&&col.includes(','))col=col.split(',');
        InventoryWear(C,item.asset,item.group,col,0,Player.MemberNumber);CharacterRefresh(C);
      });
      ChatRoomCharacterUpdate(C);
    }else if(a.item){
      InventoryWear(C,a.item,a.gruppe,a.farbe??'#ffffff',0,Player.MemberNumber);
      _restoreDisplaced(C,snapshot,a.gruppe);
    }
  }catch(ex){_log('item Fehler:',ex.message);}
}

// Führt eine einzelne Aktion aus; gibt true/false zurück (Erfolg)
function _execAct(a,C,vars){
  let ok=false;
  try{
    if(a.typ==='chat'){ServerSend('ChatRoomChat',{Content:_tpl(a.text,vars),Type:'Chat'});ok=true;}
    else if(a.typ==='emote'){ServerSend('ChatRoomChat',{Content:_tpl(a.text,vars),Type:'Emote'});ok=true;}
    else if(a.typ==='whisper'){ServerSend('ChatRoomChat',{Content:_tpl(a.text,vars),Type:'Whisper',Target:C.MemberNumber});ok=true;}
    else if(a.typ==='item_entf'){const _entfGruppe=a.gruppe;InventoryRemove(C,_entfGruppe);CharacterRefresh(C);ChatRoomCharacterUpdate(C);_asUnregister(C,_entfGruppe);ok=true;}
    else if(a.typ==='item'){_applyItemAction(a,C);if(a.antiStrip)_asRegister(C,a);ok=true;}
    else if(a.typ==='teleport'){ok=_teleport(a,C);}
    else if(a.typ==='money'){
      const op=a.money_op??'add';
      const val=a.money_val??0;
      const delta=op==='add'?val:op==='sub'?-val:0;
      const setVal=op==='set'?val:op==='reset'?0:undefined;
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MONEY',
        memberNum:C.MemberNumber,name:C.Name,delta,setVal},'*');
      ok=true;
    }
    else if(a.typ==='rang'){
      const op=a.rang_op??'setzen';
      const defs=_cfg.rankDefs??[];
      const sorted=[...defs].sort((x,y)=>x.level-y.level);
      const currentRankId=_rangState[C.MemberNumber]??null;
      const curIdx=sorted.findIndex(r=>r.id===currentRankId);
      let newRankId=currentRankId;
      if(op==='setzen') newRankId=a.rang_id||null;
      else if(op==='entfernen') newRankId=null;
      else if(op==='naechster'){ if(curIdx<sorted.length-1) newRankId=sorted[curIdx+1].id; }
      else if(op==='vorheriger'){ if(curIdx>0) newRankId=sorted[curIdx-1].id; }
      _rangState[C.MemberNumber]=newRankId;
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_RANG',
        memberNum:C.MemberNumber,name:C.Name,rankId:newRankId},'*');
      ok=true;
    }
    else ok=true;
  }catch(ex){_log('\u26A0 Aktion '+a.typ+' Fehler:',ex.message);ok=false;}
  // Dann / Sonst Nachrichten senden
  const msgField=ok?'dann_msg':'sonst_msg';
  const msgTypField=msgField+'_typ';
  const msgTyp=a[msgTypField]??'chat';
  const msgText=a[msgField];
  if(msgText&&msgTyp!=='nichts'){
    setTimeout(()=>{
      const txt=_tpl(msgText,vars);
      if(msgTyp==='whisper')ServerSend('ChatRoomChat',{Content:txt,Type:'Whisper',Target:C.MemberNumber});
      else if(msgTyp==='emote')ServerSend('ChatRoomChat',{Content:txt,Type:'Emote'});
      else ServerSend('ChatRoomChat',{Content:txt,Type:'Chat'});
    },200);
  }
  return ok;
}

// Aktionen sequenziell ausführen (Reihenfolge + bei_fehler)
function _runSeq(aktionen,C,vars,trigBase,onDone,onUngueltig){
  if(!aktionen.length){onDone();return;}
  const [a,...rest]=aktionen;
  setTimeout(()=>{
    // Ziel-Filter: welche Characters werden durch diese Aktion beeinflusst?
    const allChars=[Player,...(ChatRoomCharacter||[])];
    let targets;
    if(a.aktZiel==='alle'){
      targets=allChars;
    } else if(a.aktZiel==='whitelist'){
      const nrs=(a.aktZielNummern||[]).map(Number);
      targets=allChars.filter(ch=>nrs.includes(Number(ch.MemberNumber)));
    } else if(a.aktZiel==='shop_kaeufer'){
      // Zielt auf den Käufer (vars.shopBuyer), nicht das Kaufziel
      const buyerNum=vars.shopBuyer?.MemberNumber;
      const buyerChar=buyerNum?allChars.find(ch=>ch.MemberNumber===buyerNum):null;
      targets=buyerChar?[buyerChar]:[C];
    } else {
      targets=[C]; // 'ausloeser' / default
    }
    // Chat/Emote sind Broadcast-Nachrichten → nur 1x senden egal wieviele Ziele
    // Whisper, Item, Teleport, Money → pro Ziel ausführen
    let overallOk=true;
    if(['chat','emote'].includes(a.typ)&&targets.length>0){
      // Sende einmal mit Variablen des Auslösers
      const ok=_execAct(a,C,vars);
      if(!ok)overallOk=false;
    } else {
      targets.forEach(ch=>{
        const chVars=ch===C?vars:{...vars,name:ch.Name,x:ch.X??0,y:ch.Y??0,C:ch};
        const ok=_execAct(a,ch,chVars);
        if(!ok)overallOk=false;
      });
    }
    if(!overallOk){
      const bf=a.bei_fehler??'ignorieren';
      _log('\u26A0 Aktion '+a.typ+' fehlgeschlagen → '+bf);
      if(bf==='kette_stoppen'){onDone();return;}
      if(bf==='trigger_ungueltig'){onUngueltig();return;}
    }
    _runSeq(rest,C,vars,trigBase,onDone,onUngueltig);
  },a.delay??0);
}


// Sendet einen Log-Eintrag an den Tab im Index
// Sendet Log-Eintrag via PostMessage-Brücke zurück an das Popup
// ── Events Runtime ────────────────────────────────────────
const _evTimers={};
// NOTE: _evFiredCnt is declared above with persisted state
const _evState={}; // for interval state

function _okEv(ev,C,rohText,typKey){
  const beds=ev.bedingungen??[];
  if(!beds.length)return true;
  const cx=C.X??-999,cy=C.Y??-999;
  function checkOne(c){
    if(c.typ==='wort'){
      if(!rohText)return true; // no chat context → skip wort check (timer/interval)
      const m=c.typ_msg||'any';
      if(m!=='any'&&m!==typKey)return false;
      return!c.wort||(rohText||'').toLowerCase().includes((c.wort||'').toLowerCase());
    }
    if(c.typ==='zone'){const p=c.puffer??1;return cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;}
    if(c.typ==='zone_rect'){return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);}
    if(c.typ==='item_traegt'){return(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='item_traegt_nicht'){return!(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);}
    if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
    if(c.typ==='rang'){
      const op=c.rang_op??'=';
      const currentId=_rangState[C.MemberNumber]??null;
      if(op==='kein') return !currentId;
      if(!c.rang_id) return false;
      const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
      const targetDef=defs.find(r=>r.id===c.rang_id);
      const currentDef=defs.find(r=>r.id===currentId);
      if(!targetDef) return false;
      if(!currentDef) return false;
      const tl=targetDef.level, cl=currentDef.level;
      if(op==='=')   return cl===tl;
      if(op==='min') return cl>=tl;
      if(op==='max') return cl<=tl;
      return false;
    }
    return true;
  }
  const groups=[[]];
  for(const c of beds){
    if(c.logik==='oder'||c.logik==='und_oder')groups.push([]);
    groups[groups.length-1].push(c);
  }
  return groups.some(g=>g.every(c=>c.logik==='und_nicht'?!checkOne(c):checkOne(c)));
}

function _fireEv(ev){
  // Wiederholung check
  const cnt=_evFiredCnt[ev.id]??0;
  if(ev.wiederholung==='einmalig'&&cnt>=1){_log('⏭ Event "'+ev.name+'" bereits (1×)');return;}
  if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2)){_log('⏭ Event "'+ev.name+'" max erreicht');return;}

  // Targets
  const allChars=[Player,...(ChatRoomCharacter||[])];
  let targets=[];
  if(ev.ziel==='alle'){targets=allChars;}
  else if(ev.ziel==='liste'){targets=allChars.filter(C=>(ev.zielListe||[]).includes(C.MemberNumber));}
  else{// ausloeser / random
    const eligible=allChars.filter(C=>_okEv(ev,C,ev._rohText,ev._typKey));
    if(eligible.length)targets=[eligible[Math.floor(Math.random()*eligible.length)]];
  }
  if(!targets.length){_log('⚠️ Event "'+ev.name+'" – kein gültiges Ziel');return;}

  _log('⚡ Event "'+ev.name+'" → '+targets.length+' Ziel(e)');
  targets.forEach(C=>{
    if(!_okEv(ev,C,ev._rohText,ev._typKey)){_log('⏭ Event "'+ev.name+'" Bed. nicht erfüllt für '+C.Name);return;}
    const vars={name:C.Name,wort:ev._rohText||'',typ:'Event',x:C.X??0,y:C.Y??0,zone:'',C};
    _runSeq(ev.aktionen??[],C,vars,ev,
      ()=>{
        _evFiredCnt[ev.id]=(cnt+1);
        _log('✅ Event "'+ev.name+'" abgeschlossen für '+C.Name+' #'+_evFiredCnt[ev.id]);
        _pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});
      },
      ()=>{
        _log('❌ Event "'+ev.name+'" ungültig für '+C.Name);
        _pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});
        if(ev.fallbackTyp&&ev.fallbackTyp!=='nichts'&&ev.fallbackText){
          const typ={chat:'Chat',emote:'Emote'}[ev.fallbackTyp]??'Chat';
          ServerSend('ChatRoomChat',{Content:_tpl(ev.fallbackText,vars),Type:typ});
        }
      }
    );
  });
}

// Scheduling via condition types ev_timer / ev_interval
function _scheduleEv(ev){
  if(!ev.aktiv)return;
  const beds=ev.bedingungen??[];
  const timerC=beds.find(c=>c.typ==='ev_timer');
  const intC=beds.find(c=>c.typ==='ev_interval');
  if(timerC){
    const ms=(timerC.sek??10)*1000;
    _evTimers[ev.id+'_t']=setTimeout(()=>{
      _fireEv(ev);
    },ms);
  }
  if(intC){
    const lo=(intC.sek_min??20)*1000, hi=(intC.sek_max??60)*1000;
    const go=()=>{
      const cnt=_evFiredCnt[ev.id]??0;
      if(ev.wiederholung==='einmalig'&&cnt>=1)return;
      if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2))return;
      _fireEv(ev);
      _evTimers[ev.id+'_i']=setTimeout(go,lo+Math.random()*(hi-lo));
    };
    _evTimers[ev.id+'_i']=setTimeout(go,lo+Math.random()*(hi-lo));
  }
}

// Start alle aktiven Events die Timer/Interval haben
_evts.forEach(ev=>{if(ev.aktiv)_scheduleEv(ev);});
// ──────────────────────────────────────────────────────

function _pushLog(extra,vars,trig){
  const entry={
    ts:Date.now(),
    botId:'${safeId}',
    botName:'${safeName}',
    trigName:trig?.name??'?',
    trigId:trig?.id??'',
    player:(vars?.name??'?')+' #'+(vars?.C?.MemberNumber??'?'),
    memberNum:vars?.C?.MemberNumber,
    x:vars?.x??0,
    y:vars?.y??0,
    ...extra,
  };
  // Brücke: postMessage zurück an Popup (window.__BCK_popupRef = gespeichert in loader.js)
  try{
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_LOG',entry},'*');
  }catch(e){}
}

// Sendet roomEver ans Popup zur Persistenz
function _syncRoomEver(){
  try{
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_ROOM_EVER',botId:'${safeId}',members:[..._roomEver]},'*');
  }catch(e){}
}

function _run(trig,vars){
  const C=vars.C??Player;

  // ── Rejoin-Fenster: schließen wenn Nicht-Rejoin-Trigger feuert ──
  const _isRejoinTrig=(trig.bedingungen??[]).some(c=>c.typ==='player_betritt'&&c.betritt_typ==='rejoin');
  if(!_isRejoinTrig && _rejoinWindow.has(C.MemberNumber)){
    const openedAt=_rejoinWindow.get(C.MemberNumber);
    if(Date.now()-openedAt >= _REJOIN_GRACE){
      _rejoinWindow.delete(C.MemberNumber);
      _log('\u{1F6AA} Rejoin-Fenster für #'+C.MemberNumber+' geschlossen (Nicht-Rejoin Trigger "'+trig.name+'")');
    } else {
      _log('\u{1F6AA} Rejoin-Gnadenfrist aktiv für #'+C.MemberNumber+' – Fenster noch '+((_REJOIN_GRACE-(Date.now()-openedAt))|0)+'ms offen');
    }
  }
  // Rejoin-Trigger: nur überspringen wenn Fenster geschlossen (nach Gnadenfrist)
  if(_isRejoinTrig && !_rejoinWindow.has(C.MemberNumber)){
    _log('\u23ED [Rejoin] "'+trig.name+'" – Fenster geschlossen (Gnadenfrist abgelaufen), übersprungen');
    return;
  }

  // ── Wiederholung prüfen ──────────────────────────────────
  const wdh=trig.wiederholung??'immer';
  const cnt=_firedCnt[trig.id]??0;
  if(wdh==='einmalig'&&cnt>=1){
    _log('⏭ "'+trig.name+'" bereits ausgelöst (1×)');
    _pushLog({status:'skip_wdh',msg:'1× bereits ausgelöst'},vars,trig);
    return;
  }
  if(wdh==='n_mal'&&cnt>=(trig.maxMal??2)){
    _log('⏭ "'+trig.name+'" max '+trig.maxMal+'× erreicht');
    _pushLog({status:'skip_max',msg:'Max '+trig.maxMal+'× erreicht'},vars,trig);
    return;
  }

  _log('\u{1F3AF} "'+trig.name+'" von '+vars.name+' | X='+vars.x+' Y='+vars.y+' | #'+(cnt+1)+(wdh==='n_mal'?' von '+trig.maxMal:''));

  // ── Aktionen sequenziell mit Basis-Delay starten ─────────
  setTimeout(()=>{
    _runSeq(
      trig.aktionen??[],C,vars,trig,
      // onDone – Trigger erfolgreich gezählt
      ()=>{
        const now=Date.now();
        _fired[trig.id]=now;
        _firedChar[trig.id+'_'+C.MemberNumber]=now;
        _firedCnt[trig.id]=(cnt+1);
        _log('\u2705 Trigger "'+trig.name+'" abgeschlossen #'+_firedCnt[trig.id]+(trig.charSpec?' [pro Spieler]':' [global]'));
        _pushLog({status:'ok'},vars,trig);
        _syncRoomEver();
      },
      // onUngueltig – eine Aktion hat ❌ Trigger ungültig ausgelöst
      ()=>{
        _log('\u274C Trigger "'+trig.name+'" ungültig – nicht gezählt');
        _pushLog({status:'ungueltig'},vars,trig);
        if(trig.fallbackTyp&&trig.fallbackTyp!=='nichts'&&trig.fallbackText){
          const typ={chat:'Chat',emote:'Emote'}[trig.fallbackTyp]??'Chat';
          ServerSend('ChatRoomChat',{Content:_tpl(trig.fallbackText,vars),Type:typ});
        }
      }
    );
  },trig.delay??0);
}

function _tpl(s,v){
  const cur=_shopCfg.moneyName||'Gold';
  return(s??'')
    .replace(/{name}/gi,v.name??'')
    .replace(/{wort}/gi,v.wort??'')
    .replace(/{typ}/gi,v.typ??'')
    .replace(/{x}/gi,v.x??'')
    .replace(/{y}/gi,v.y??'')
    .replace(/{zone}/gi,v.zone??'')
    .replace(/{käufer}/gi,v.shopBuyer?.Name??v.name??'')
    .replace(/{kaeufer}/gi,v.shopBuyer?.Name??v.name??'')
    .replace(/{ziel}/gi,v.C?.Name??v.name??'')
    .replace(/{item}/gi,v.shopItem?.name??'')
    .replace(/{preis}/gi,String(v.shopItem?.preis??''))
    .replace(/{waehrung}/gi,cur)
    .replace(/{kontostand}/gi,String((_moneyBalances[v.shopBuyer?.MemberNumber??v.C?.MemberNumber]?.balance)??0))
    .replace(/{anzahl}/gi,String(v.shopAnzahl??''))
    .replace(/{gesamt}/gi,String(v.shopGesamt??''));
}

// ── Shop-Befehl Parsing ───────────────────────────────
function _parseShopArgs(rest){
  // Parst gequotete und ungequotete Argumente + Flags (/w /u)
  const args=[];
  const flags=new Set();
  let pos=0;
  rest=rest.trim();
  while(pos<rest.length){
    while(pos<rest.length&&rest[pos]===' ')pos++;
    if(pos>=rest.length)break;
    // Flag-Erkennung: /w oder /u (case-insensitive, als eigenes Token)
    if(rest[pos]==='/'&&pos+1<rest.length){
      const fl=rest[pos+1].toLowerCase();
      if(fl==='w'||fl==='u'){
        flags.add(fl);
        pos+=2;
        continue;
      }
    }
    if(rest[pos]==='"'||rest[pos]==="'"){
      const q=rest[pos]; pos++;
      const end=rest.indexOf(q,pos);
      if(end===-1){args.push(rest.slice(pos));break;}
      args.push(rest.slice(pos,end)); pos=end+1;
    } else {
      const sp=rest.indexOf(' ',pos);
      if(sp===-1){args.push(rest.slice(pos));break;}
      args.push(rest.slice(pos,sp)); pos=sp+1;
    }
  }
  return {args:args.filter(a=>a.length>0),flags};
}

// ── Shop-Kauf Handler ────────────────────────────────────
// Hilfsfunktion: Template mit Shop-Variablen ersetzen (inline, ohne _tpl damit keine C-Abhängigkeit)
function _shopTpl(raw, buyerC, targetC, shopItem, preis, newBal, anzahl, gesamt){
  const cur=_shopCfg.moneyName||'Gold';
  return(raw||'')
    .replace(/{name}/gi,buyerC.Name)
    .replace(/{käufer}/gi,buyerC.Name)
    .replace(/{kaeufer}/gi,buyerC.Name)
    .replace(/{ziel}/gi,targetC?targetC.Name:'')
    .replace(/{item}/gi,shopItem.name)
    .replace(/{preis}/gi,String(preis))
    .replace(/{waehrung}/gi,cur)
    .replace(/{kontostand}/gi,String(newBal??0))
    .replace(/{anzahl}/gi,String(anzahl??''))
    .replace(/{gesamt}/gi,String(gesamt??''));
}

function _handleShopCmd(rohText,buyerC){
  const cmd=_shopCfg.cmd.trim();
  const rest=rohText.trim().slice(cmd.length);
  const {args,flags}=_parseShopArgs(rest);
  if(!args.length)return;

  const flagWhisper=flags.has('w');   // /w = Ankündigung als Whisper statt Chat
  const flagUnknown=flags.has('u');   // /u = Käufername wird als "Unbekannt" angezeigt

  const itemName=args[0].toLowerCase();
  const shopItem=_shopCfg.items.find(i=>i.name.toLowerCase()===itemName);
  if(!shopItem){
    _log('🛒 Kein Shop-Artikel "'+args[0]+'" gefunden');
    return;
  }

  const preis=shopItem.preis??0;
  const cur=_shopCfg.moneyName||'Gold';
  const allChars=[Player,...(ChatRoomCharacter||[])];
  // Angezeigter Käufername (für öffentliche Nachrichten)
  const displayBuyer=flagUnknown?{Name:'Unbekannt',MemberNumber:buyerC.MemberNumber}:buyerC;

  // ── ALL-Kauf ──────────────────────────────────────────
  if(args[1]&&args[1].toLowerCase()==='all'){
    const targets=allChars.filter(c=>c.MemberNumber!==Player.MemberNumber);
    const anzahl=targets.length;
    if(anzahl===0){
      ServerSend('ChatRoomChat',{Content:'Niemand im Raum.',Type:'Whisper',Target:buyerC.MemberNumber});
      return;
    }
    const gesamt=preis*anzahl;
    const buyerBalance=(_moneyBalances[buyerC.MemberNumber]?.balance)??0;

    if(buyerBalance<gesamt){
      const rawMsg=shopItem.errorMsg||_shopCfg.errorMsg||('Nicht genug '+cur+'! Du hast {kontostand} '+cur+', benötigt: {gesamt} '+cur+' ('+anzahl+'×'+preis+').');
      const msg=_shopTpl(rawMsg,buyerC,null,shopItem,preis,buyerBalance,anzahl,gesamt);
      ServerSend('ChatRoomChat',{Content:msg,Type:'Whisper',Target:buyerC.MemberNumber});
      _log('🛒 All-Kauf abgelehnt: '+buyerC.Name+' hat '+buyerBalance+', braucht '+gesamt+' ('+anzahl+'×'+preis+')');
      return;
    }

    // Coins abziehen
    if(!_moneyBalances[buyerC.MemberNumber])
      _moneyBalances[buyerC.MemberNumber]={balance:0,name:buyerC.Name};
    _moneyBalances[buyerC.MemberNumber].balance-=gesamt;
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MONEY',
      memberNum:buyerC.MemberNumber,name:buyerC.Name,delta:-gesamt},'*');

    const newBal=_moneyBalances[buyerC.MemberNumber].balance;
    _log('🛒 All-Kauf: '+buyerC.Name+' kauft "'+shopItem.name+'" für alle ('+anzahl+'×'+preis+'='+gesamt+' '+cur+'). Kontostand: '+newBal+(flagUnknown?' [/u]':'')+(flagWhisper?' [/w]':''));

    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_SHOP',
      buyerNum:buyerC.MemberNumber,buyerName:buyerC.Name,
      targetNum:null,targetName:'Alle ('+anzahl+')',
      itemName:shopItem.name,preis:gesamt,isAll:true,anzahl},'*');

    // All-Ankündigung
    const rawAnnAll=shopItem.announceAllMsg||_shopCfg.announceAllMsg||
      (displayBuyer.Name+' kauft '+shopItem.icon+' '+shopItem.name+' für alle ('+anzahl+' Spieler, '+gesamt+' '+cur+').');
    const annAllTxt=_shopTpl(rawAnnAll,displayBuyer,null,shopItem,preis,newBal,anzahl,gesamt);
    if(flagWhisper){
      // Als Whisper an alle Zielspieler
      targets.forEach(tc=>ServerSend('ChatRoomChat',{Content:annAllTxt,Type:'Whisper',Target:tc.MemberNumber}));
    } else {
      ServerSend('ChatRoomChat',{Content:annAllTxt,Type:'Chat'});
    }

    // Bestätigung an Käufer
    const rawConf=shopItem.confirmMsg||_shopCfg.confirmMsg||
      ('✅ Gekauft für alle '+anzahl+' Spieler. Bezahlt: '+gesamt+' '+cur+'. Kontostand: '+newBal+' '+cur+'.');
    ServerSend('ChatRoomChat',{Content:_shopTpl(rawConf,buyerC,null,shopItem,preis,newBal,anzahl,gesamt),Type:'Whisper',Target:buyerC.MemberNumber});

    // Trigger für jeden Ziel-Spieler
    targets.forEach(targetC=>{
      const shopVars={name:buyerC.Name,wort:rohText,typ:'🛒 Shop All',x:buyerC.X??0,y:buyerC.Y??0,
        C:targetC,shopBuyer:buyerC,shopItem,shopAnzahl:anzahl,shopGesamt:gesamt};
      _trigs.forEach(trig=>{
        const shopConds=(trig.bedingungen??[]).filter(c=>c.typ==='shop_kauf');
        if(!shopConds.length)return;
        const itemMatch=shopConds.every(c=>!c.shop_id||c.shop_id===shopItem.id);
        if(!itemMatch)return;
        const vonOk=(()=>{
          if(trig.von==='bot')return buyerC.MemberNumber===Player.MemberNumber;
          if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(buyerC.MemberNumber));
          return true;
        })();
        if(!vonOk)return;
        const otherConds=(trig.bedingungen??[]).filter(c=>c.typ!=='shop_kauf');
        const otherOk=otherConds.every(c=>{
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const cid=_rangState[buyerC.MemberNumber]??null;
            if(op==='kein') return !cid;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const td=defs.find(r=>r.id===c.rang_id),cd=defs.find(r=>r.id===cid);
            if(!td||!cd) return false;
            if(op==='=') return cd.level===td.level;
            if(op==='min') return cd.level>=td.level;
            if(op==='max') return cd.level<=td.level;
          }
          return true;
        });
        if(!otherOk)return;
        _run(trig,shopVars);
      });
    });
    return;
  }

  // ── Einzel-Kauf ───────────────────────────────────────
  let targetC=buyerC;

  if(args[1]){
    const arg2=args[1].trim();
    if(/^\d+$/.test(arg2)){
      const num=parseInt(arg2);
      targetC=allChars.find(c=>c.MemberNumber===num)||buyerC;
    } else {
      const nameMatches=allChars.filter(c=>c.Name.toLowerCase()===arg2.toLowerCase());
      if(nameMatches.length===1){
        targetC=nameMatches[0];
      } else if(nameMatches.length>1){
        const ids=nameMatches.map(c=>c.Name+' (#'+c.MemberNumber+')').join(', ');
        ServerSend('ChatRoomChat',{Content:'⚠️ Mehrere Spieler mit dem Namen "'+arg2+'". Bitte MemberNummer verwenden: '+ids,Type:'Whisper',Target:buyerC.MemberNumber});
        return;
      }
    }
  }

  const buyerBalance=(_moneyBalances[buyerC.MemberNumber]?.balance)??0;

  if(buyerBalance<preis){
    const rawMsg=shopItem.errorMsg||_shopCfg.errorMsg||('Nicht genug '+cur+'! Du hast {kontostand} '+cur+', benötigt: {preis} '+cur+'.');
    ServerSend('ChatRoomChat',{Content:_shopTpl(rawMsg,buyerC,targetC,shopItem,preis,buyerBalance),Type:'Whisper',Target:buyerC.MemberNumber});
    _log('🛒 Kauf abgelehnt: '+buyerC.Name+' hat '+buyerBalance+' '+cur+', braucht '+preis);
    return;
  }

  // Coins abziehen
  if(!_moneyBalances[buyerC.MemberNumber])
    _moneyBalances[buyerC.MemberNumber]={balance:0,name:buyerC.Name};
  _moneyBalances[buyerC.MemberNumber].balance-=preis;
  window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_MONEY',
    memberNum:buyerC.MemberNumber,name:buyerC.Name,delta:-preis},'*');

  const newBal=_moneyBalances[buyerC.MemberNumber].balance;
  const isFremdkauf=targetC.MemberNumber!==buyerC.MemberNumber;
  _log('🛒 Kauf: '+buyerC.Name+' kauft "'+shopItem.name+'" für '+preis+' '+cur+(isFremdkauf?' → Ziel: '+targetC.Name:'')+' | Kontostand: '+newBal+(flagUnknown?' [/u]':'')+(flagWhisper?' [/w]':''));

  window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'BOT_SHOP',
    buyerNum:buyerC.MemberNumber,buyerName:buyerC.Name,
    targetNum:targetC.MemberNumber,targetName:targetC.Name,
    itemName:shopItem.name,preis},'*');

  // Bestätigungs-Whisper an Käufer
  const rawConf=shopItem.confirmMsg||_shopCfg.confirmMsg||
    ('✅ '+(isFremdkauf?'Du kaufst '+shopItem.name+' für '+targetC.Name:shopItem.name+' gekauft')+'. Bezahlt: '+preis+' '+cur+'. Kontostand: '+newBal+' '+cur+'.');
  ServerSend('ChatRoomChat',{Content:_shopTpl(rawConf,buyerC,targetC,shopItem,preis,newBal),Type:'Whisper',Target:buyerC.MemberNumber});

  // Fremdkauf-Ankündigung (nur wenn für anderen Spieler)
  if(isFremdkauf){
    const rawAnn=shopItem.announceMsg||_shopCfg.announceMsg||
      (displayBuyer.Name+' hat für '+targetC.Name+' das Item '+shopItem.icon+' '+shopItem.name+' gekauft.');
    const annTxt=_shopTpl(rawAnn,displayBuyer,targetC,shopItem,preis,newBal);
    if(flagWhisper){
      // Whisper direkt an das Ziel
      ServerSend('ChatRoomChat',{Content:annTxt,Type:'Whisper',Target:targetC.MemberNumber});
    } else {
      ServerSend('ChatRoomChat',{Content:annTxt,Type:'Chat'});
    }
  }

  // Shop-Trigger auslösen
  const shopVars={name:buyerC.Name,wort:rohText,typ:'🛒 Shop',x:buyerC.X??0,y:buyerC.Y??0,C:targetC,shopBuyer:buyerC,shopItem};
  _trigs.forEach(trig=>{
    const shopConds=(trig.bedingungen??[]).filter(c=>c.typ==='shop_kauf');
    if(!shopConds.length)return;
    const itemMatch=shopConds.every(c=>!c.shop_id||c.shop_id===shopItem.id);
    if(!itemMatch)return;
    const vonOk=(()=>{
      if(trig.von==='bot')return buyerC.MemberNumber===Player.MemberNumber;
      if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(buyerC.MemberNumber));
      return true;
    })();
    if(!vonOk)return;
    const otherConds=(trig.bedingungen??[]).filter(c=>c.typ!=='shop_kauf');
    const otherOk=otherConds.every(c=>{
      if(c.typ==='rang'){
        const op=c.rang_op??'=';
        const currentId=_rangState[buyerC.MemberNumber]??null;
        if(op==='kein') return !currentId;
        if(!c.rang_id) return false;
        const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
        const td=defs.find(r=>r.id===c.rang_id);
        const cd=defs.find(r=>r.id===currentId);
        if(!td||!cd) return false;
        if(op==='=') return cd.level===td.level;
        if(op==='min') return cd.level>=td.level;
        if(op==='max') return cd.level<=td.level;
        return false;
      }
      return true;
    });
    if(!otherOk)return;
    _run(trig,shopVars);
  });
}

function _proc(rohText,typKey,C){
  if(!rohText)return;
  // Money query command
  const qCmd=(_moneyCfg?.queryCmd||'').trim().toLowerCase();
  if(qCmd&&rohText.trim().toLowerCase()===qCmd.toLowerCase()){
    window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'MONEY_QUERY',memberNum:C.MemberNumber,name:C.Name},'*');
    return;
  }
  // Rang query command
  const rqCmd=(_cfg.rankQueryCmd||'').trim().toLowerCase();
  if(rqCmd&&rohText.trim().toLowerCase()===rqCmd.toLowerCase()){
    const defs=_cfg.rankDefs??[];
    const rankId=_rangState[C.MemberNumber]??null;
    const rank=defs.find(r=>r.id===rankId);
    const tpl=s=>s.replace(/{name}/gi,C.Name).replace(/{rang}/gi,rank?.name||'Kein Rang').replace(/{rang_icon}/gi,rank?.icon||'–').replace(/{rang_level}/gi,String(rank?.level||0));
    const txt=tpl(_cfg.rankQueryText||'{name} hat Rang: {rang_icon} {rang}');
    const typ=_cfg.rankQueryTyp||'whisper';
    if(typ==='whisper')ServerSend('ChatRoomChat',{Content:txt,Type:'Whisper',Target:C.MemberNumber});
    else ServerSend('ChatRoomChat',{Content:txt,Type:'Chat'});
    return;
  }
  // Shop Pay-Befehl
  const shopCmd=(_shopCfg.cmd||'').trim().toLowerCase();
  if(shopCmd&&rohText.trim().toLowerCase().startsWith(shopCmd+' ')||rohText.trim().toLowerCase()===shopCmd){
    _handleShopCmd(rohText,C);
    return;
  }
  const pos={X:C.X??0,Y:C.Y??0}; // direkt vom Character
  const typLabel={chat:'\u{1F4AC} Chat',emote:'\u{2728} Emote',whisper:'\u{1F917} Whisper'}[typKey]??typKey;
  _trigs.forEach(trig=>{
    // Trigger mit player_betritt -> nur Join-Poll, nie Nachrichten
    if((trig.bedingungen??[]).some(c=>c.typ==='player_betritt'))return;
    // Trigger mit item_traegt aber ohne wort -> nur Polling
    const hasItem=(trig.bedingungen??[]).some(c=>c.typ==='item_traegt');
    const hasWort=(trig.bedingungen??[]).some(c=>c.typ==='wort');
    if(hasItem&&!hasWort)return;
    // Von-Filter: wer darf diesen Trigger auslösen?
    const vonOk=(()=>{
      if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;
      if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));
      return true; // 'alle'
    })();
    if(!vonOk)return;
    // Alle anderen: _ok prueft Bedingungen (wort, zone, vortrigger)
    if(_ok(trig,rohText,typKey,C))_run(trig,{name:C.Name,wort:rohText,typ:typLabel,x:pos.X,y:pos.Y,zone:'',C});
  });

  // ── Chat-Events prüfen ──
  _procEvents(rohText,typKey,C);
}

function _procEvents(rohText,typKey,C){
  // FIX: Define typLabel here so it's available whether called from _proc or directly from _msgH
  const typLabel={chat:'\u{1F4AC} Chat',emote:'\u{2728} Emote',whisper:'\u{1F917} Whisper'}[typKey]??typKey;
  _evts.forEach(ev=>{
    if(!ev.aktiv)return;
    // Chat-Events: brauchen wort-Bedingung und KEIN ev_timer/ev_interval
    // Von-Filter: wer darf das Event auslösen?
    const vonOk=(()=>{
      if(ev.von==='bot')return C.MemberNumber===Player.MemberNumber;
      if(ev.von==='nummer')return ev.vonNummer&&C.MemberNumber===ev.vonNummer;
      return true; // 'alle'
    })();
    if(!vonOk)return;
    // Wort-Bedingungen prüfen
    const hasTimerBed=(ev.bedingungen??[]).some(c=>c.typ==='ev_timer'||c.typ==='ev_interval'||c.typ==='player_betritt');
    if(hasTimerBed)return; // Timer/Betritt-Events werden anders ausgelöst
    const wortConds=(ev.bedingungen??[]).filter(c=>c.typ==='wort');
    if(!wortConds.length)return;
    ev._rohText=rohText; ev._typKey=typKey; // temp context für _okEv
    if(_okEv(ev,C,rohText,typKey)){
      // Ziel bestimmen
      const allChars=[Player,...(ChatRoomCharacter||[])];
      let targets=[];
      if(ev.ziel==='alle')targets=allChars;
      else if(ev.ziel==='liste')targets=allChars.filter(ch=>(ev.zielListe||[]).includes(ch.MemberNumber));
      else targets=[C]; // ausloeser = der der schrieb
      _log('💬 Chat-Event "'+ev.name+'" von '+C.Name+' → '+targets.length+' Ziel(e)');
      targets.forEach(ch=>{
        const vars={name:ch.Name,wort:rohText,typ:typLabel,x:ch.X??0,y:ch.Y??0,zone:'',C:ch};
        // FIX: Read cnt inside callback to avoid all targets writing the same stale value
        const cntNow=_evFiredCnt[ev.id]??0;
        if(ev.wiederholung==='einmalig'&&cntNow>=1)return;
        if(ev.wiederholung==='n_mal'&&cntNow>=(ev.maxMal??2))return;
        _runSeq(ev.aktionen??[],ch,vars,ev,
          ()=>{_evFiredCnt[ev.id]=(_evFiredCnt[ev.id]??0)+1;_pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});},
          ()=>{_pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});}
        );
      });
    }
    delete ev._rohText; delete ev._typKey;
  });
}

// ── Item-Trägt Polling (edge-triggered: feuert 1x wenn Item erscheint) ──
const _itState={}; // 'memberNum_trigId_typ' -> bool
// FIX: 500ms is sufficient for item-state changes, 100ms caused unnecessary CPU load
const _itPoll=setInterval(()=>{
  const chars=[Player,...(ChatRoomCharacter||[])];
  _trigs.forEach(trig=>{
    const itemConds=(trig.bedingungen??[]).filter(c=>c.typ==='item_traegt'||c.typ==='item_traegt_nicht');
    if(!itemConds.length)return;
    const hasWort=(trig.bedingungen??[]).some(c=>c.typ==='wort');
    if(hasWort)return;
    chars.forEach(C=>{
      // Check positive (traegt) and negative (traegt_nicht) conditions
      const condMet=itemConds.every(c=>{
        const worn=(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);
        return c.typ==='item_traegt_nicht'?!worn:worn;
      });
      const key=C.MemberNumber+'_'+trig.id;
      const was=_itState[key]??false;
      if(condMet&&!was){
        const pos={X:C.X??0,Y:C.Y??0};
        // Von-Filter
        const vonOk=(()=>{
          if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;
          if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));
          return true;
        })();
        const otherOk=vonOk&&(trig.bedingungen??[]).every(c=>{
          if(c.typ==='item_traegt'||c.typ==='item_traegt_nicht')return true;
          if(c.typ==='zone'){const p=c.puffer??1;return pos.X>=c.x-p&&pos.X<=c.x+p&&pos.Y>=c.y-p&&pos.Y<=c.y+p;}
          if(c.typ==='zone_rect'){return pos.X>=Math.min(c.x1,c.x2)&&pos.X<=Math.max(c.x1,c.x2)&&pos.Y>=Math.min(c.y1,c.y2)&&pos.Y<=Math.max(c.y1,c.y2);}
          if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const currentId=_rangState[C.MemberNumber]??null;
            if(op==='kein') return !currentId;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const targetDef=defs.find(r=>r.id===c.rang_id);
            const currentDef=defs.find(r=>r.id===currentId);
            if(!targetDef) return false;
            if(!currentDef) return false;
            const tl=targetDef.level, cl=currentDef.level;
            if(op==='=')   return cl===tl;
            if(op==='min') return cl>=tl;
            if(op==='max') return cl<=tl;
            return false;
          }
          return true;
        });
        if(otherOk)_run(trig,{name:C.Name,wort:'',typ:'Item',x:pos.X,y:pos.Y,zone:'',C});
      }
      _itState[key]=condMet;
    });
  });
},500);

// ── Spieler-Betritt Polling (feuert 1x beim Betreten) ──
const _roomPrev=new Set((ChatRoomCharacter||[]).map(c=>c.MemberNumber));
// _roomEver is now part of persisted state (declared above)
const _joinPoll=setInterval(()=>{
  const chars=ChatRoomCharacter||[];
  const cur=new Set(chars.map(c=>c.MemberNumber));

  // Spieler verlassen → nur loggen; _firedChar bleibt erhalten damit Rejoin-Vortrigger noch greifen
  for(const prevNum of _roomPrev){
    if(!cur.has(prevNum)){
      _log('\u{1F6AA} #'+prevNum+' verlassen');
      _rejoinWindow.delete(prevNum); // Fenster beim Verlassen schließen (Map)
      _pushLog({status:'leave', trigName:'Verlassen', trigId:'__system__',
        player:'#'+prevNum, memberNum:prevNum, x:0, y:0, msg:'Raum verlassen'}, {name:'#'+prevNum,x:0,y:0,C:{MemberNumber:prevNum}}, {name:'System',id:'__system__'});
      // _zoneState zurücksetzen (Spieler nicht mehr im Raum)
      for(const k of Object.keys(_zoneState)){
        if(k.startsWith(prevNum+'_'))delete _zoneState[k];
      }
      // _firedChar nur bei Triggern mit resetOnLeave=true zurücksetzen
      _trigs.forEach(trig=>{
        if(trig.charSpec&&trig.resetOnLeave){
          delete _firedChar[trig.id+'_'+prevNum];
          _log('\u{1F504} State von "'+trig.name+'" für #'+prevNum+' zurückgesetzt');
        }
      });
    }
  }

  for(const C of chars){
    if(!_roomPrev.has(C.MemberNumber)){
      const istNeu=!_roomEver.has(C.MemberNumber);
      const label=istNeu?'\u{1F195} Neu':'\u{1F504} Rejoin';
      _log(label+': '+C.Name+' #'+C.MemberNumber);
      _pushLog({status:istNeu?'join':'join_rejoin',trigName:'',msg:istNeu?'Erstes Mal':'Rejoin'},
        {name:C.Name+' #'+C.MemberNumber,x:C.X??0,y:C.Y??0,C},{id:'__system__',name:'System'});
      // Neuer Spieler → Money-Init (nur Erstes Mal, nicht bei Rejoin)
      if(istNeu){
        window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'MONEY_INIT_NEW',memberNum:C.MemberNumber,name:C.Name},'*');
      }
      // Rang-Init: Spieler registrieren (kein Rang) – bei Rejoin nur Name aktualisieren
      window.__BCK_popupRef?.postMessage({app:'BCKonfigurator',type:'RANG_INIT',memberNum:C.MemberNumber,name:C.Name},'*');
      _roomEver.add(C.MemberNumber);
      _syncRoomEver();
      // ── Rejoin-Fenster öffnen (nur bei echtem Rejoin) ──
      if(!istNeu) _rejoinWindow.set(C.MemberNumber, Date.now());
      // Auto-close window after grace period
      if(!istNeu) setTimeout(()=>{ _rejoinWindow.delete(C.MemberNumber); _log('\u{1F6AA} Rejoin-Fenster für #'+C.MemberNumber+' automatisch geschlossen (1s)'); },_REJOIN_GRACE);

      // ── Alle passenden Trigger sammeln (Rejoin separat) ──
      const pos={X:C.X??0,Y:C.Y??0};
      const rejoinBatch=[]; // Rejoin-Trigger: alle sammeln, dann zusammen feuern
      _trigs.forEach(trig=>{
        const bConds=(trig.bedingungen??[]).filter(c=>c.typ==='player_betritt');
        if(!bConds.length)return;
        const isRejoinTrig=bConds.some(c=>c.betritt_typ==='rejoin');
        const bOk=bConds.every(c=>{
          const bt=c.betritt_typ??'alle';
          if(bt==='neu')return istNeu;
          if(bt==='rejoin')return!istNeu;
          return true;
        });
        if(!bOk)return;
        const vonOk=(()=>{
          if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;
          if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));
          return true;
        })();
        const otherOk=vonOk&&(trig.bedingungen??[]).every(c=>{
          if(c.typ==='player_betritt')return true;
          if(c.typ==='zone'){const p=c.puffer??1;return pos.X>=c.x-p&&pos.X<=c.x+p&&pos.Y>=c.y-p&&pos.Y<=c.y+p;}
          if(c.typ==='zone_rect'){return pos.X>=Math.min(c.x1,c.x2)&&pos.X<=Math.max(c.x1,c.x2)&&pos.Y>=Math.min(c.y1,c.y2)&&pos.Y<=Math.max(c.y1,c.y2);}
          if(c.typ==='trigger_war'){
            // Rejoin-Trigger blockieren sich NICHT gegenseitig:
            // trigger_war auf anderen Rejoin-Trigger → immer true (feuern zusammen)
            if(isRejoinTrig){
              const refTrig=_trigMap[c.trigId];
              const refIsRejoin=(refTrig?.bedingungen??[]).some(bc=>bc.typ==='player_betritt'&&bc.betritt_typ==='rejoin');
              if(refIsRejoin)return true;
            }
            const ref=_trigMap[c.trigId];
            return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];
          }
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const currentId=_rangState[C.MemberNumber]??null;
            if(op==='kein') return !currentId;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const targetDef=defs.find(r=>r.id===c.rang_id);
            const currentDef=defs.find(r=>r.id===currentId);
            if(!targetDef) return false;
            if(!currentDef) return false;
            const tl=targetDef.level, cl=currentDef.level;
            if(op==='=')   return cl===tl;
            if(op==='min') return cl>=tl;
            if(op==='max') return cl<=tl;
            return false;
          }
          return true;
        });
        if(!otherOk)return;
        if(isRejoinTrig){
          rejoinBatch.push(trig); // Rejoin: gesammelt feuern
        } else {
          _run(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
        }
      });
      // ── Betritt-Events feuern (Events mit player_betritt Bedingung) ──
      _evts.forEach(ev=>{
        if(!ev.aktiv)return;
        const betrittConds=(ev.bedingungen??[]).filter(c=>c.typ==='player_betritt');
        if(!betrittConds.length)return;
        // betritt_typ Filter
        const bOk=betrittConds.every(c=>{
          const bt=c.betritt_typ??'alle';
          if(bt==='neu')return istNeu;
          if(bt==='rejoin')return!istNeu;
          return true;
        });
        if(!bOk)return;
        // Von-Filter: wer darf das Event auslösen (= wer muss der Beitretende sein)?
        const vonOk=(()=>{
          if(ev.von==='bot')return C.MemberNumber===Player.MemberNumber;
          if(ev.von==='nummer')return ev.vonNummer&&C.MemberNumber===+ev.vonNummer;
          return true; // 'alle' → jeder
        })();
        if(!vonOk)return;
        // Weitere Bedingungen prüfen (z.B. Rang) – player_betritt wurde bereits oben geprüft
        const evOtherOk=(ev.bedingungen??[]).every(c=>{
          if(c.typ==='player_betritt')return true;
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const currentId=_rangState[C.MemberNumber]??null;
            if(op==='kein') return !currentId;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const targetDef=defs.find(r=>r.id===c.rang_id);
            const currentDef=defs.find(r=>r.id===currentId);
            if(!targetDef) return false;
            if(!currentDef) return false;
            const tl=targetDef.level, cl=currentDef.level;
            if(op==='=')   return cl===tl;
            if(op==='min') return cl>=tl;
            if(op==='max') return cl<=tl;
            return false;
          }
          return true;
        });
        if(!evOtherOk)return;
        const evVars={name:C.Name,wort:'',typ:label,x:C.X??0,y:C.Y??0,zone:'',C};
        const allChars=[Player,...(ChatRoomCharacter||[])];
        let targets=[];
        if(ev.ziel==='alle')targets=allChars;
        else if(ev.ziel==='liste')targets=allChars.filter(ch=>(ev.zielListe||[]).includes(ch.MemberNumber));
        else targets=[C]; // ausloeser = der beitretende Spieler
        const cnt=_evFiredCnt[ev.id]??0;
        if(ev.wiederholung==='einmalig'&&cnt>=1)return;
        if(ev.wiederholung==='n_mal'&&cnt>=(ev.maxMal??2))return;
        targets.forEach(ch=>{
          const vars={name:ch.Name,wort:'',typ:label,x:ch.X??0,y:ch.Y??0,zone:'',C:ch};
          // FIX: Read cnt inside callback so each target increments independently
          _runSeq(ev.aktionen??[],ch,vars,ev,
            ()=>{_evFiredCnt[ev.id]=(_evFiredCnt[ev.id]??0)+1;_pushLog({status:'ok'},vars,{name:ev.name,id:ev.id});},
            ()=>{_pushLog({status:'ungueltig'},vars,{name:ev.name,id:ev.id});}
          );
        });
      });

      // Alle Rejoin-Trigger feuern (keine gegenseitige Blockade)
      // Trigger MIT Item-Bedingungen: verzögert – BC-Appearance ist beim Join noch nicht geladen
      // Trigger OHNE Item-Bedingungen: sofort
      const ITEM_SYNC_DELAY = 800; // ms warten bis BC Appearance synchronisiert hat
      rejoinBatch.forEach(trig=>{
        const hasItemCond=(trig.bedingungen??[]).some(c=>c.typ==='item_traegt'||c.typ==='item_traegt_nicht');
        if(hasItemCond){
          // Verzögert feuern + Bedingung nochmal prüfen mit frischen Daten
          setTimeout(()=>{
            if(!_rejoinWindow.has(C.MemberNumber)){
              _log('⏭ [Rejoin] "'+trig.name+'" – Fenster geschlossen vor Appearance-Sync');
              return;
            }
            // Frische Appearance-Daten aus ChatRoomCharacter holen
            const Cfresh=ChatRoomCharacter.find(x=>x.MemberNumber===C.MemberNumber)??C;
            // Item-Bedingungen nochmal prüfen
            const itemOk=(trig.bedingungen??[]).every(c=>{
              if(c.typ==='item_traegt')return(Cfresh.Appearance??[]).some(a=>a.Asset?.Name===c.item);
              if(c.typ==='item_traegt_nicht')return!(Cfresh.Appearance??[]).some(a=>a.Asset?.Name===c.item);
              return true;
            });
            if(!itemOk){
              _log('⏭ [Rejoin] "'+trig.name+'" – Item-Bedingung nach Sync nicht erfüllt (Appearance jetzt geladen)');
              return;
            }
            _run(trig,{name:Cfresh.Name,wort:'',typ:label,x:Cfresh.X??pos.X,y:Cfresh.Y??pos.Y,zone:'',C:Cfresh});
          }, ITEM_SYNC_DELAY);
        } else {
          _run(trig,{name:C.Name,wort:'',typ:label,x:pos.X,y:pos.Y,zone:'',C});
        }
      });
    }
  }
  _roomPrev.clear();
  for(const n of cur)_roomPrev.add(n);
},100);

// ── Zonen-Betreten Polling – direkt C.X/C.Y (wie ZoneMonitor-Pattern) ──
const _zoneState={}; // 'memberNum_trigId' -> bool (war zuletzt drin)
// FIX: 500ms is sufficient for zone detection, 100ms caused unnecessary CPU load
const _zonePoll=setInterval(()=>{
  const chars=[Player,...(ChatRoomCharacter||[])];
  _trigs.forEach(trig=>{
    const zoneConds=(trig.bedingungen??[]).filter(c=>c.typ==='zone'||c.typ==='zone_rect');
    if(!zoneConds.length)return;
    const hasWort=(trig.bedingungen??[]).some(c=>c.typ==='wort');
    const hasBetritt=(trig.bedingungen??[]).some(c=>c.typ==='player_betritt');
    if(hasWort||hasBetritt)return;
    chars.forEach(C=>{
      if(!C)return;
      // Direkt C.X / C.Y – kein _getPos Umweg nötig
      const cx=C.X??-999, cy=C.Y??-999;
      const inZone=zoneConds.every(c=>{
        if(c.typ==='zone_rect')return cx>=Math.min(c.x1,c.x2)&&cx<=Math.max(c.x1,c.x2)&&cy>=Math.min(c.y1,c.y2)&&cy<=Math.max(c.y1,c.y2);
        const p=c.puffer??1;
        return cx>=c.x-p&&cx<=c.x+p&&cy>=c.y-p&&cy<=c.y+p;
      });
      const key=C.MemberNumber+'_'+trig.id;
      const war=_zoneState[key]??false;
      if(inZone&&!war){
        // Prüfe andere Bedingungen (vortrigger, item_traegt)
        const vonOk=(()=>{
          if(trig.von==='bot')return C.MemberNumber===Player.MemberNumber;
          if(trig.von==='whitelist')return(trig.vonNummern||[]).map(Number).includes(Number(C.MemberNumber));
          return true;
        })();
        const otherOk=vonOk&&(trig.bedingungen??[]).every(c=>{
          if(c.typ==='zone'||c.typ==='zone_rect')return true;
          if(c.typ==='trigger_war'){const ref=_trigMap[c.trigId];return ref?.charSpec?!!_firedChar[c.trigId+'_'+C.MemberNumber]:!!_fired[c.trigId];}
          if(c.typ==='item_traegt')return(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);
          if(c.typ==='item_traegt_nicht')return!(C.Appearance??[]).some(a=>a.Asset?.Name===c.item);
          if(c.typ==='rang'){
            const op=c.rang_op??'=';
            const currentId=_rangState[C.MemberNumber]??null;
            if(op==='kein') return !currentId;
            if(!c.rang_id) return false;
            const defs=(_cfg.rankDefs??[]).sort((a,b)=>a.level-b.level);
            const targetDef=defs.find(r=>r.id===c.rang_id);
            const currentDef=defs.find(r=>r.id===currentId);
            if(!targetDef) return false;
            if(!currentDef) return false;
            const tl=targetDef.level, cl=currentDef.level;
            if(op==='=')   return cl===tl;
            if(op==='min') return cl>=tl;
            if(op==='max') return cl<=tl;
            return false;
          }
          return true;
        });
        if(otherOk){
          _log('\u{1F4CD} Zone: '+C.Name+' X='+cx+' Y='+cy+' \u2192 "'+trig.name+'"');
          _run(trig,{name:C.Name,wort:'',typ:'\u{1F4CD} Zone',x:cx,y:cy,zone:'',C});
        }
      }
      _zoneState[key]=inZone;
    });
  });
},500);

// Eigene Nachrichten via hookFunction – Mod bekommt unique Namen (Timestamp) um Kollisionen beim Live-Sync zu vermeiden
let _mod = null;
try {
  const _modName = 'BCBot_${safeId}_' + Date.now();
  _mod = bcModSdk.registerMod({name: _modName, fullName:'${safeName}', version:'1.0'});
  _mod.hookFunction('ChatRoomSendChat', 0, (args, next) => {
    // BC löscht InputChat.value vor dem Hook → args[0].Content ist zuverlässiger
    const msgData = args[0];
    const raw = (typeof msgData === 'object' ? msgData?.Content : null)
             ?? document.getElementById('InputChat')?.value?.trim()
             ?? '';
    if (raw) {
      const msgType = (typeof msgData === 'object' ? msgData?.Type : null) ?? '';
      const isE = msgType === 'Emote' || (!msgType && raw.startsWith('*') && raw.endsWith('*'));
      const isW = msgType === 'Whisper' || (!msgType && (raw.startsWith('/w ') || raw.startsWith('/whisper ')));
      const tk = isE ? 'emote' : isW ? 'whisper' : 'chat';
      const hearOk=(_cfg.hearChat && tk==='chat')||(_cfg.hearEmote && tk==='emote')||(_cfg.hearWhisper && tk==='whisper');
      if(hearOk)_proc(raw,tk,Player);
      else _procEvents(raw,tk,Player); // Events immer prüfen
    }
    return next(args);
  });
  _log('✅ hookFunction aktiv');
} catch(hookErr) {
  _log('⚠️ hookFunction nicht verfügbar (eigene Nachrichten via Socket):', hookErr.message);
  // Fallback: eigene Nachrichten via ServerSocket mitschneiden
  // BC sendet keine eigenen Nachrichten zurück, daher InputChat-Observer als Alternative
  const _origSend = window.ServerSend;
  if (typeof _origSend === 'function') {
    window.__BCBot_origSend_${safeId} = _origSend;
    window.ServerSend = function(channel, data, ...rest) {
      if (channel === 'ChatRoomChat' && data?.Content && ['Chat','Emote','Whisper'].includes(data?.Type ?? 'Chat')) {
        const tk = (data.Type||'Chat').toLowerCase();
        const ssHearOk=(_cfg.hearChat&&tk==='chat')||(_cfg.hearEmote&&tk==='emote')||(_cfg.hearWhisper&&tk==='whisper');
        // FIX: removed redundant double-check of ssHearOk inside the already-matching if-block
        setTimeout(() => { if(ssHearOk)_proc(data.Content,tk,Player); else _procEvents(data.Content,tk,Player); }, 0);
      }
      return _origSend.call(this, channel, data, ...rest);
    };
  }
}

// ── ServerSocket: alle Spieler im Raum (IMMER aktiv, unabhaengig von nurEigene) ──
// Eigene Nachrichten kommen NICHT via Socket zurueck – die kommen via hookFunction
// ── AntiStrip Listener ──────────────────────────────────────
_asH = function(data) {
  if (!data || data.Type !== 'Action') return;
  var txt = JSON.stringify(data);
  if (txt.indexOf('ItemRemove') === -1 && txt.indexOf('ActionRemove') === -1) return;
  // Sender: Bot selbst? → kein AntiStrip auslösen
  var sender = null;
  if (Array.isArray(data.Dictionary)) {
    for (var _di = 0; _di < data.Dictionary.length; _di++) {
      if (data.Dictionary[_di].SourceCharacter != null) {
        sender = data.Dictionary[_di].SourceCharacter; break;
      }
    }
  }
  if (sender === null) sender = data.Sender;
  if (sender === Player.MemberNumber) return; // Bot selbst → ignorieren
  // Alle Watcher prüfen
  var keys = Object.keys(_asWatchers);
  for (var _wi = 0; _wi < keys.length; _wi++) {
    (function(w) {
      var allChars = [Player].concat(ChatRoomCharacter || []);
      var C = null;
      for (var _ci = 0; _ci < allChars.length; _ci++) {
        if (allChars[_ci].MemberNumber === w.memberNum) { C = allChars[_ci]; break; }
      }
      if (!C) return;
      var item = (typeof InventoryGet === 'function') ? InventoryGet(C, w.gruppe) : null;
      if (item) return; // Slot noch besetzt → nichts tun
      _log('\u{1F6E1}\uFE0F AntiStrip: ' + w.gruppe + ' leer bei ' + C.Name + ' \u2192 lege wieder an...');
      setTimeout(function() {
        try {
          if (w.itemConfig) {
            var ic = w.itemConfig;
            var col = ic.colors || ['#ffffff'];
            if (typeof col === 'string' && col.indexOf(',') !== -1) col = col.split(',');
            InventoryWear(C, ic.asset, ic.group, col, 0, Player.MemberNumber, ic.craft || null);
            var itemNow = InventoryGet(C, ic.group);
            if (itemNow) {
              itemNow.Color = col;
              itemNow.Property = itemNow.Property || {};
              if (ic.tr && Object.keys(ic.tr).length) {
                itemNow.Property.TypeRecord = ic.tr;
                itemNow.Property.Type = ic.typeStr || '';
              }
              if (ic.props) Object.assign(itemNow.Property, ic.props);
            }
          } else if (w.curseEntry) {
            var col2 = w.curseEntry.Farbe;
            if (typeof col2 === 'string' && col2.indexOf(',') !== -1) col2 = col2.split(',');
            InventoryWear(C, w.curseEntry.ItemName, w.curseEntry.Gruppe,
              col2, 0, Player.MemberNumber, w.curseEntry.Craft || null);
          } else {
            // Gleiches Item oder Ersatz ohne Konfig
            var ersatz = w.ersatz || (w.itemConfig && w.itemConfig.asset);
            var gruppe  = w.gruppe;
            if (!ersatz) { _log('\u26A0 AntiStrip: kein Ersatz-Item konfiguriert'); return; }
            InventoryWear(C, ersatz, gruppe, w.farbe || '#ffffff', 0, Player.MemberNumber);
          }
          CharacterRefresh(C);
          ChatRoomCharacterUpdate(C);
          _log('\u2705 AntiStrip: ' + (w.ersatz || 'Item') + ' wieder angelegt auf ' + C.Name);
        } catch(ex) {
          _log('\u26A0 AntiStrip Fehler: ' + ex.message);
        }
      }, w.delay != null ? w.delay : 500);
    })(_asWatchers[keys[_wi]]);
  }
};
ServerSocket.on('ChatRoomMessage', _asH);
// ────────────────────────────────────────────────────────────

const _msgH=function(data){
  if(!['Chat','Emote','Whisper'].includes(data.Type))return;
  if(data.Sender===Player.MemberNumber)return; // eigene via hookFunction abgefangen
  const tk=data.Type.toLowerCase();
  const C=ChatRoomCharacter.find(c=>c.MemberNumber===data.Sender)
        ??(Player.MemberNumber===data.Sender?Player:null);
  if(!C)return;
  // Trigger: nur wenn hear* aktiv; Events: immer (eigene Einstellung via Von-Filter)
  const hearOk=(tk==='chat'&&_cfg.hearChat)||(tk==='emote'&&_cfg.hearEmote)||(tk==='whisper'&&_cfg.hearWhisper);
  if(hearOk)_proc(data.Content,tk,C);
  else _procEvents(data.Content,tk,C); // Events trotzdem prüfen
};
ServerSocket.on('ChatRoomMessage',_msgH);

window['_BCBot_'+_BID]={
  stop(){
    clearInterval(_itPoll);
    clearInterval(_joinPoll);
    clearInterval(_zonePoll);
    try{ if(_mod) _mod.removePatches(); } catch(e){}
    // Restore ServerSend if we patched it as fallback
    if(window.__BCBot_origSend_${safeId}) {
      window.ServerSend = window.__BCBot_origSend_${safeId};
      delete window.__BCBot_origSend_${safeId};
    }
    if(_asH)  ServerSocket.off('ChatRoomMessage',_asH);
    if(_msgH) ServerSocket.off('ChatRoomMessage',_msgH);
    // Events timer stoppen
    Object.values(_evTimers).forEach(h=>clearTimeout(h)); // clears both _t and _i timers
    delete window['_BCBot_'+_BID];
    // State im window-Objekt + localStorage sichern (überlebt Page-Reload)
    window[_stateKey].roomEver=[..._roomEver];
    try{
      const ls=JSON.parse(localStorage.getItem('__BCKBotStates')||'{}');
      ls['${safeId}']={
        fired:_fired, firedCnt:_firedCnt,
        firedChar:_firedChar, roomEver:[..._roomEver],
        evFiredCnt:_evFiredCnt,
        ts:Date.now()
      };
      localStorage.setItem('__BCKBotStates',JSON.stringify(ls));
    }catch(e){}
    console.log('\u23F9\uFE0F [Bot:${safeName}] gestoppt | States gesichert (Mem+LS)');
  },
  // Sofortiges Event feuern (ignoriert Timer/Wiederholung-Check)
  fireEventNow(eid){
    const ev=_evts.find(e=>e.id===eid);
    if(!ev){console.warn('[Bot] Event nicht gefunden:',eid);return;}
    _log('▶️ Sofort feuern: "'+ev.name+'"');
    // Temporär Wiederholung ignorieren
    const savedWdh=ev.wiederholung;
    ev.wiederholung='immer';
    _fireEv(ev);
    ev.wiederholung=savedWdh;
  },
  // Kompatibilität
  fireEvent(eid){this.fireEventNow(eid);},
  // Manuelles State-Reset (z.B. aus der Konsole: window['_BCBot_...'].clearState())
  clearState(){
    window[_stateKey]={fired:{},firedCnt:{},firedChar:{},roomEver:[],evFiredCnt:{}};
    try{const ls=JSON.parse(localStorage.getItem('__BCKBotStates')||'{}');delete ls['${safeId}'];localStorage.setItem('__BCKBotStates',JSON.stringify(ls));}catch(e){}
    Object.keys(_fired).forEach(k=>delete _fired[k]);
    Object.keys(_firedCnt).forEach(k=>delete _firedCnt[k]);
    Object.keys(_firedChar).forEach(k=>delete _firedChar[k]);
    Object.keys(_evFiredCnt).forEach(k=>delete _evFiredCnt[k]);
    _roomEver.clear();
    console.log('\u{1F9F9} [Bot:${safeName}] States zurückgesetzt (Mem+LS)');
  }
};
console.log('\u25B6\uFE0F [Bot:${safeName}] | Trigger:',_trigs.length,'| Modus:',_cfg.nurEigene?'Nur eigene':'Alle Spieler');
})();`;
}

function botDeployById(id) {
  const b = _bots.find(x=>x.id===id); if (!b) return;
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden','error'); return; }
  bcSend({ type:'EXEC', code: _buildBotCode(b) });
  b.laufend = true; _saveBots(); renderBotList();
  if (_selBotId === id) {
    const bar = document.getElementById('bot-status-bar');
    if (bar) { bar.className='bot-status running'; bar.textContent='▶️ Bot "'+b.name+'" läuft'; }
    // Re-render topbar button
    renderBotEditor();
  }
  showStatus('▶️ Bot "'+b.name+'" gestartet!','success');
}

function botStopById(id) {
  const b = _bots.find(x=>x.id===id); if (!b) return;
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden','error'); return; }
  const safeId = b.id.replace(/\W/g,'_');
  bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].stop();` });
  b.laufend = false; _saveBots(); renderBotList();
  if (_selBotId === id) renderBotEditor();
  showStatus('⏹ Bot "'+b.name+'" gestoppt','success');
}

function botDeploy() { const b=_selBot(); if(b) botDeployById(b.id); }
function botStop()   { const b=_selBot(); if(b) botStopById(b.id);   }

function botSync() {
  const b = _selBot();
  if (!b) return;
  if (!_connected) { showStatus('❌ Nicht mit BC verbunden', 'error'); return; }
  if (!b.laufend)  { showStatus('ℹ️ Bot läuft nicht – einfach Starten klicken', 'info'); return; }

  const btn = document.getElementById('syncBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Sync…'; }

  // Step 1: Stop
  const safeId = b.id.replace(/\W/g,'_');
  bcSend({ type:'EXEC', code:`if(window['_BCBot_${safeId}'])window['_BCBot_${safeId}'].stop();` });

  // Step 2: After stop delay, redeploy with latest saved config
  setTimeout(() => {
    const latest = _selBot();
    if (!latest) return;
    bcSend({ type:'EXEC', code: _buildBotCode(latest) });
    latest.laufend = true; _saveBots(); renderBotList(); renderBotEditor();
    showStatus('✅ Bot synchronisiert und neu gestartet', 'success');
  }, 700);
}

</script>
</body>