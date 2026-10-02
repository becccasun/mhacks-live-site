// MHacks Live — static replica of https://www.mhacks.org/live.
// Behaviour mirrors the live site's LiveEvents component: tabs, floating tab bar,
// countdown, search, day picker, category chips, past-event toggle, event drawer.
(function () {
  "use strict";

  const settings = window.LIVE_SETTINGS;
  const events = window.LIVE_EVENTS;
  const tz = settings.timezone;
  const HANDBOOK_URL = "https://safe-banon-80d.notion.site/2026-Hacker-Handbook-3ca24ca0c81b80fb8adee2e26c8508af";
  const DUDERSTADT_MAP = "https://www.dc.umich.edu/about-the-dc/maps-floor-plans-hours/";
  const NO_MAP = new Set(["", "devpost", "not provided", "tba", "tbd"]);
  const KNOWN_PLACES = {
    bbb: "Bob and Betty Beyster Building, Ann Arbor, MI",
    cccb: "Central Campus Classroom Building, Ann Arbor, MI",
    "pierpont commons": "Pierpont Commons, Ann Arbor, MI",
    "pierpont connector hall": "Pierpont Commons, Ann Arbor, MI",
    "the grove": "The Grove, Ann Arbor, MI",
  };
  const STICKERS = [1, 2, 3, 4, 5, 6].map((n) => `stickers/bouquet-${n}.png`);

  // ---------- icons (lucide) ----------
  const ICONS = {
    calendarDays: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    calendarPlus: '<path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M3 10h18"/><path d="M16 19h6"/><path d="M19 16v6"/>',
    bookOpen: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    trophy: '<path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/><path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/><path d="M18 9h1.5a1 1 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>',
    house: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    arrowUpRight: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    externalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    mapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    flower: '<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  };
  const icon = (name, cls) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${ICONS[name]}</svg>`;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // ---------- time helpers ----------
  const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  const dayLabelFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz });
  const dayKeyFmt = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: tz });
  const fmtTime = (iso) => timeFmt.format(new Date(iso));
  const timeRange = (e) => (e.endsAt ? `${fmtTime(e.startsAt)} – ${fmtTime(e.endsAt)}` : fmtTime(e.startsAt));
  const dayKey = (iso) => {
    const parts = dayKeyFmt.formatToParts(new Date(iso));
    const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  };
  const status = (e, now) => {
    const start = new Date(e.startsAt).getTime();
    const end = e.endsAt ? new Date(e.endsAt).getTime() : start;
    if (now >= start && now <= end) return "Live";
    return now < start ? "Upcoming" : "Past";
  };
  const groupByDay = (list) =>
    list.reduce((days, e) => {
      const key = dayKey(e.startsAt);
      const day = days.find((d) => d.key === key);
      if (day) day.events.push(e);
      else days.push({ key, label: dayLabelFmt.format(new Date(e.startsAt)), events: [e] });
      return days;
    }, []);
  const pad = (n) => String(n).padStart(2, "0");

  // ---------- state ----------
  const allDays = groupByDay(events);
  const dayNumberByKey = new Map(allDays.map((d, i) => [d.key, i + 1]));
  // Fixed chip order; any other tag found in the data is appended after these.
  const TAG_ORDER = ["Event", "Sponsor", "Workshop", "Recreational"];
  const usedTags = new Set(events.flatMap((e) => e.eventTypes));
  const categories = ["All", ...TAG_ORDER.filter((t) => usedTags.has(t)), ...[...usedTags].filter((t) => !TAG_ORDER.includes(t))];
  const bySlug = new Map(events.map((e) => [e.slug, e]));
  const state = {
    tab: "timeline",
    category: "All",
    showPast: false,
    query: "",
    activeDay: null,
    openSlug: null,
    now: Date.now(),
  };

  const visibleEvents = () => (state.showPast ? events : events.filter((e) => status(e, state.now) !== "Past"));
  const matchesCategory = (e) => state.category === "All" || e.eventTypes.includes(state.category);
  // Colour per event type: [background, text]. Mid-tone fills with a dark shade of the
  // same hue; every pair is ≥ 4.5:1 for the 12px label. Unlisted types keep the sage pill.
  const TAG_COLORS = {
    Event: ["#86BCEE", "#17466F"], // blue
    Sponsor: ["#F0CF4A", "#5E4700"], // yellow
    Workshop: ["#BDA6EA", "#3F2A78"], // lavender
    Recreational: ["#F3A2C2", "#7A1F45"], // pink
    Food: ["#F2A55E", "#6E3408"], // orange
  };
  const tagBadges = (e) =>
    e.eventTypes
      .map((t) => {
        const c = TAG_COLORS[t];
        return c
          ? `<span class="rounded-full px-2.5 py-0.5 text-[12px] font-medium" style="background:${c[0]};color:${c[1]}">${esc(t)}</span>`
          : `<span class="rounded-full bg-sage/30 px-2.5 py-0.5 text-[12px] font-medium text-olive">${esc(t)}</span>`;
      })
      .join("");

  // ---------- static header bits ----------
  document.getElementById("hero-title").textContent = settings.heroTitle;
  document.getElementById("hero-description").textContent = settings.heroDescription;
  const first = events[0];
  const last = events[events.length - 1];
  const rangeText = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: tz, year: "numeric" })
    .formatRange(new Date(first.startsAt), new Date(last.startsAt))
    .replace(/\s*–\s*/u, " – ");
  document.getElementById("date-range").innerHTML = icon("calendarDays", "size-4 opacity-70") + esc(rangeText);
  const addFlower = document.getElementById("add-flower");
  addFlower.innerHTML = icon("flower", "size-4") + "Add your own flower";
  // TODO: point at the flower submission flow once it exists
  addFlower.addEventListener("click", () => toast("Flower submissions are coming soon"));

  // ---------- sticker carousel ----------
  // Names shown on the "Made by" tags, already in "First L." form. They're shuffled onto
  // the stickers on every page load.
  const STICKER_MAKERS = [
    "Rebecca S.",
    "Anish C.",
    "Amy L.",
    "Anonymous",
    "Hang Y.",
    "Alex H.",
    "Felicia C.",
    "Soyeon K.",
    "Jeffery W.",
    "Mei Y.",
  ];
  const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  /** A name per loop slot: every name once, then refills that never sit next to a repeat. */
  const assignMakers = (slots) => {
    const out = shuffle(STICKER_MAKERS).slice(0, slots);
    while (out.length < slots) {
      const recent = out.slice(-4);
      const isLast = out.length === slots - 1;
      out.push(shuffle(STICKER_MAKERS).find((n) => !recent.includes(n) && !(isLast && n === out[0])));
    }
    return out;
  };

  (function buildCarousel() {
    const hero = document.querySelector(".sticker-hero");
    const track = document.getElementById("sticker-track");
    const tilts = [-4, 3, -2, 5, -5, 2];
    const lifts = ["-3%", "4%", "-1%", "3%", "-4%", "1%"];
    const tagTilts = [3, -4, 2, -3, 4, -2];
    // Two copies of the set (each set repeated twice so wide screens never show a gap);
    // the track loops after half its width.
    const set = [...STICKERS, ...STICKERS];
    // one name per sticker in the loop; the second copy of the loop repeats them so it stays seamless
    const makers = assignMakers(set.length);
    track.innerHTML = [...set, ...set]
      .map((src, i) => {
        const k = i % STICKERS.length;
        const name = makers[i % set.length];
        const hidden = i >= STICKERS.length ? ' aria-hidden="true"' : "";
        const alt = i >= STICKERS.length ? "" : `MHacks wildflower bouquet sticker, made by ${esc(name)}`;
        return `<div class="sticker" style="--tilt:${tilts[k]}deg;--lift:${lifts[k]};--tag-tilt:${tagTilts[k]}deg"${hidden}>
          <img src="${src}" alt="${alt}" draggable="false" />
          <span class="sticker-tag" aria-hidden="true"><span class="sticker-tag-label">Made by</span><span class="sticker-tag-name">${esc(name)}</span></span>
        </div>`;
      })
      .join("");
    track.style.animation = "none"; // the CSS loop is the no-JS fallback; motion is driven below

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DRIFT_SECONDS = 70; // one loop at rest, matching the old CSS animation
    // Flywheel physics: the strip behaves like a heavy wheel with a clicker.
    const INPUT_GAIN = 0.55; // speed (px/s) per unit of shaped wheel input
    const INPUT_CURVE = 1.3; // >1: gentle scrolls count for little, firm ones for more
    const INPUT_EASE = 0.18; // seconds for a push to transfer into the wheel (mass)
    const DRAG = 1.4; // velocity-proportional resistance (1/s), the long ease-out
    const FRICTION = 90; // constant resistance (px/s²), brings it to a gentle full stop
    const MAX_BOOST = 2200;
    const DETENT_PX = 34; // travel between clicks
    const DETENT_LOSS = 0.012; // share of speed each click eats, like a ratchet catch

    let loopW = 0;
    let x = 0; // drifting base position (px)
    let boost = 0; // flywheel velocity (px/s, + = rightwards)
    let pending = 0; // push not yet transferred into the flywheel (px/s)
    let detentTravel = 0; // distance since the last click
    let driftScale = reduceMotion ? 0 : 1;
    let hovering = false;
    let pointer = null;
    let active = null;
    let lastSway = "";

    // Loop length = distance from the first sticker to its repeat (the track box itself
    // doesn't size to its percentage-height children, so its width can't be trusted).
    const measure = () => {
      const items = track.children;
      loopW = items[set.length].offsetLeft - items[0].offsetLeft;
    };
    measure();
    window.addEventListener("resize", measure);
    track.querySelectorAll("img").forEach((img) => img.complete || img.addEventListener("load", measure));

    // ---- tick sound (only once the page has an unlocked AudioContext) ----
    let audio = null;
    const unlockAudio = () => {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
      } catch {}
    };
    ["pointerdown", "keydown", "touchstart"].forEach((t) => window.addEventListener(t, unlockAudio, { passive: true }));
    let lastTick = 0;
    const tick = (speed) => {
      if (!audio || audio.state !== "running") return;
      const now = audio.currentTime;
      if (now - lastTick < 0.035) return; // a real wheel can't click faster than this
      lastTick = now;
      const len = Math.floor(audio.sampleRate * 0.012);
      const buf = audio.createBuffer(1, len, audio.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
      const src = audio.createBufferSource();
      src.buffer = buf;
      const band = audio.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 2600 + Math.min(1, speed / MAX_BOOST) * 1400;
      band.Q.value = 6;
      const gain = audio.createGain();
      gain.gain.value = 0.35;
      src.connect(band).connect(gain).connect(audio.destination);
      src.start(now);
    };

    // ---- wheel → push on the flywheel. Scroll up spins right, scroll down spins left. ----
    hero.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // leave horizontal swipes alone
        e.preventDefault();
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? hero.clientHeight : 1);
        const push = -Math.sign(dy) * INPUT_GAIN * Math.abs(dy) ** INPUT_CURVE;
        if (reduceMotion) x += push * 0.12; // no momentum: just nudge
        else pending += push;
      },
      { passive: false },
    );

    // ---- hover: ease the drift to a stop and show the maker tag ----
    hero.addEventListener("pointermove", (e) => {
      pointer = [e.clientX, e.clientY];
    });
    hero.addEventListener("pointerenter", (e) => {
      hovering = true;
      pointer = [e.clientX, e.clientY];
    });
    hero.addEventListener("pointerleave", () => {
      hovering = false;
      pointer = null;
    });
    const setActive = (el) => {
      if (el === active) return;
      active?.classList.remove("is-active");
      active = el;
      active?.classList.add("is-active");
    };

    let prev = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      // feed the pending push in over INPUT_EASE, so the wheel spins up instead of jumping
      if (pending) {
        const take = pending * Math.min(1, dt / INPUT_EASE);
        pending -= take;
        if (Math.abs(pending) < 0.5) pending = 0;
        boost = Math.max(-MAX_BOOST, Math.min(MAX_BOOST, boost + take));
      }
      // resistance: drag eases it out, friction settles it to a full stop
      const slowed = boost * Math.exp(-DRAG * dt);
      const stop = FRICTION * dt;
      boost = Math.abs(slowed) <= stop ? 0 : slowed - Math.sign(slowed) * stop;

      // clicker: tick every DETENT_PX of travel; each catch takes a little speed
      detentTravel += Math.abs(boost) * dt;
      if (detentTravel >= DETENT_PX) {
        detentTravel %= DETENT_PX;
        boost *= 1 - DETENT_LOSS;
        tick(Math.abs(boost));
      }
      if (!boost && !pending) detentTravel = 0;

      driftScale += ((hovering || reduceMotion ? 0 : 1) - driftScale) * Math.min(1, dt * 4);
      const drift = loopW ? -(loopW / DRIFT_SECONDS) * driftScale : 0;
      x += (drift + boost) * dt;

      if (loopW) x = ((x % loopW) - loopW) % loopW;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      // stickers lean against the motion, like they have weight
      const sway = (reduceMotion ? 0 : Math.max(-7, Math.min(7, -boost / 140))).toFixed(1);
      if (sway !== lastSway) {
        // only touch the variable when it changes; every write restyles all 24 stickers
        lastSway = sway;
        track.style.setProperty("--sway", `${sway}deg`);
      }

      // hover is tracked here (not :hover) so it follows stickers that move under a still cursor
      const hit = pointer && document.elementFromPoint(pointer[0], pointer[1]);
      setActive(hit && hero.contains(hit) ? hit.closest(".sticker") : null);

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  })();

  // ---------- quick links ----------
  const quickLinkCls =
    "liquid-glass-card font-red-hat group inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-ink transition-transform duration-200 hover:-translate-y-0.5 sm:text-base";
  const arrow = icon("arrowUpRight", "size-3.5 text-olive/60 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5");
  document.getElementById("quick-links").innerHTML =
    `<a class="${quickLinkCls}" href="https://www.mhacks.org/">${icon("house", "size-4 text-olive")}<span>MHacks home</span>${arrow}</a>` +
    (settings.devpostUrl
      ? `<a class="${quickLinkCls}" href="${esc(settings.devpostUrl)}" target="_blank" rel="noreferrer">${icon("externalLink", "size-4 text-olive")}<span>Devpost</span>${arrow}</a>`
      : `<span class="liquid-glass-card font-red-hat inline-flex cursor-not-allowed items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-ink/65 sm:text-base">${icon("externalLink", "size-4 text-olive/65")}<span>Devpost</span><span class="text-xs font-medium uppercase text-ink/45">Coming soon</span></span>`);

  // ---------- tabs ----------
  const TABS = [
    { id: "timeline", label: "Timeline", short: "Timeline", icon: "calendarDays" },
    { id: "guide", label: "Hacker Guide", short: "Guide", icon: "bookOpen" },
    { id: "prizes", label: "Prizes", short: "Prizes", icon: "trophy" },
  ];
  function renderTabs() {
    document.querySelectorAll("[data-tabs]").forEach((bar) => {
      const floating = bar.dataset.tabs === "floating";
      const size = floating
        ? "h-11 text-[11px] tracking-[0.06em] sm:h-12 sm:text-sm sm:tracking-[0.14em]"
        : "h-12 text-[11px] tracking-[0.06em] sm:h-14 sm:text-base sm:tracking-[0.14em]";
      bar.innerHTML = TABS.map((t) => {
        const active = state.tab === t.id;
        return `<button id="${t.id}-${floating ? "floating-" : ""}tab" type="button" role="tab" data-tab="${t.id}" aria-label="${t.label}" aria-controls="${t.id}-panel" aria-selected="${active}" class="font-red-hat relative inline-flex min-w-0 items-center gap-1.5 px-1 font-semibold whitespace-nowrap uppercase transition-colors sm:gap-2 ${size} ${active ? "text-olive" : "text-ink/70 hover:text-ink"}">${icon(t.icon, "size-3.5 sm:size-4")}<span class="sm:hidden">${t.short}</span><span class="hidden sm:inline">${t.label}</span>${active ? '<span class="absolute inset-x-0 -bottom-px h-0.5 bg-olive"></span>' : ""}</button>`;
      }).join("");
    });
  }
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-tab]");
    if (!btn) return;
    state.tab = btn.dataset.tab;
    renderTabs();
    renderPanel(true);
  });

  // Floating tab bar: shown once inline tabs scroll off-screen and the user scrolls up.
  (function floatingNav() {
    const nav = document.getElementById("floating-nav");
    const anchor = document.getElementById("inline-tabs-anchor");
    let pastTabs = false;
    let scrollingUp = true;
    let lastY = window.scrollY;
    const update = () => {
      const visible = pastTabs && scrollingUp;
      nav.classList.toggle("is-visible", visible);
      nav.setAttribute("aria-hidden", String(!visible));
      nav.querySelectorAll("button").forEach((b) => (b.tabIndex = visible ? 0 : -1));
    };
    new IntersectionObserver(([entry]) => {
      pastTabs = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    }).observe(anchor);
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y < 80) scrollingUp = true;
        else if (delta !== 0) scrollingUp = delta < 0;
        lastY = y;
        update();
      },
      { passive: true }
    );
  })();

  // ---------- countdown ----------
  function tickCountdown() {
    const now = Date.now();
    const box = document.getElementById("countdown");
    const next = events.find((e) => new Date(e.startsAt).getTime() > now);
    if (!next) {
      box.hidden = true;
      return;
    }
    const diff = Math.max(0, new Date(next.startsAt).getTime() - now);
    const days = Math.floor(diff / 864e5);
    const hours = Math.floor((diff % 864e5) / 36e5);
    const mins = Math.floor((diff % 36e5) / 6e4);
    const secs = Math.floor((diff % 6e4) / 1e3);
    document.getElementById("countdown-label").textContent = `until ${next.name}`;
    document.getElementById("countdown-value").textContent = `${days > 0 ? `${days}d ` : ""}${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    box.hidden = false;
  }

  // ---------- timeline pieces ----------
  const statusBadge = (s) =>
    s === "Live"
      ? '<span class="font-red-hat inline-flex items-center rounded-full bg-sage/45 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-olive">Live</span>'
      : s === "Past"
        ? '<span class="font-red-hat text-[11px] font-medium uppercase tracking-wider text-ink/60">Past</span>'
        : "";

  function eventRow(e) {
    const s = status(e, state.now);
    return `<button id="event-${esc(e.slug)}" data-event="${esc(e.slug)}" type="button" class="liquid-glass-card group relative w-full scroll-mt-28 cursor-pointer overflow-hidden rounded-md text-left hover:-translate-y-0.5 sm:grid sm:grid-cols-[11rem_1fr_auto] sm:items-center sm:gap-6${s === "Past" ? " opacity-55" : ""}">
      <div class="relative z-10 flex items-baseline gap-2 p-5 sm:flex-col sm:items-start sm:gap-1 sm:p-6 sm:pr-0">
        <p class="font-red-hat text-2xl leading-none text-olive sm:text-3xl">${fmtTime(e.startsAt)}</p>
        ${e.endsAt ? `<p class="font-red-hat text-xs text-ink/70">until ${fmtTime(e.endsAt)}</p>` : ""}
      </div>
      <div class="relative z-10 min-w-0 px-5 pb-5 sm:px-0 sm:py-6">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-red-hat break-words text-lg font-semibold text-ink sm:text-xl">${esc(e.name)}</h3>${statusBadge(s)}
        </div>
        <div class="font-red-hat mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/75">
          ${tagBadges(e)}
          <span class="inline-flex items-center gap-1.5">${icon("mapPin", "size-3.5 opacity-60")}${esc(e.location)}</span>
        </div>
      </div>
      <div class="relative z-10 hidden pr-6 sm:block">
        <span class="font-red-hat inline-flex h-10 w-10 items-center justify-center rounded-md border border-olive/15 bg-white/40 text-olive transition-all duration-300 group-hover:border-olive/30 group-hover:bg-white/70">${icon("chevronRight", "size-4")}</span>
      </div>
    </button>`;
  }

  function dayPicker(days, activeKey) {
    return `<div class="justify-self-center sm:justify-self-end">
      <div id="day-picker" aria-label="Schedule day" role="group" class="day-picker-glass bg-white/55 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_24px_-12px_rgba(31,42,22,0.18)] backdrop-blur-[16px] backdrop-saturate-[160%] relative inline-flex rounded-full p-1">
        <span id="day-pill" aria-hidden="true" class="pointer-events-none absolute top-1 bottom-1 left-0 z-0 rounded-full bg-olive shadow-[0_1px_0_rgba(255,255,255,0.30)_inset,0_6px_16px_-4px_rgba(31,42,22,0.50)] transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"></span>
        ${days
          .map(
            (d, i) =>
              `<button type="button" data-day="${d.key}" aria-pressed="${d.key === activeKey}" class="font-red-hat relative z-10 inline-flex h-9 items-center justify-center rounded-full px-5 text-base transition-colors duration-300 select-none sm:h-10 sm:px-6 sm:text-lg ${d.key === activeKey ? "text-cream" : "text-olive"}">Day ${dayNumberByKey.get(d.key) ?? i + 1}</button>`
          )
          .join("")}
      </div>
    </div>`;
  }

  function positionDayPill() {
    const picker = document.getElementById("day-picker");
    const pill = document.getElementById("day-pill");
    if (!picker || !pill) return;
    const active = picker.querySelector('[aria-pressed="true"]');
    if (!active) return;
    const p = picker.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    pill.style.transform = `translateX(${a.left - p.left}px)`;
    pill.style.width = `${a.width}px`;
  }
  window.addEventListener("resize", positionDayPill);

  function scheduleResults() {
    const q = state.query.trim().toLowerCase();
    if (q) {
      const results = events.filter(
        (e) => matchesCategory(e) && `${e.name} ${e.location} ${e.eventTypes.join(" ")} ${e.description}`.toLowerCase().includes(q)
      );
      return `<div class="space-y-4">
        <div class="flex items-end justify-between gap-3">
          <h3 class="font-red-hat text-2xl font-bold tracking-tight text-ink sm:text-3xl">Search results</h3>
          <p class="font-red-hat text-base text-ink/70">${results.length} ${results.length === 1 ? "match" : "matches"}</p>
        </div>
        ${
          results.length
            ? `<div class="space-y-3 fade-up">${results.map(eventRow).join("")}</div>`
            : `<p class="font-red-hat py-8 text-center text-ink/75">No events match “${esc(state.query)}”.</p>`
        }
      </div>`;
    }

    const days = groupByDay(visibleEvents());
    const day = days.find((d) => d.key === state.activeDay) ?? days[0];
    const hiddenPast = events.length - visibleEvents().length;
    if (!day) {
      return `<div class="space-y-4 py-8 text-center">
        <p class="font-red-hat text-ink/75">No upcoming events left.</p>
        ${allDays.length ? '<button type="button" data-action="show-past" class="font-red-hat text-sm font-medium uppercase tracking-[0.16em] text-olive transition-colors hover:text-moss">Show past events</button>' : ""}
      </div>`;
    }
    const list = day.events.filter(matchesCategory);
    return `<div class="space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h3 class="font-red-hat text-2xl font-bold tracking-tight text-ink sm:text-3xl">${esc(day.label)}</h3>
        <div class="flex items-center gap-4">
          ${
            hiddenPast > 0 || state.showPast
              ? `<button type="button" data-action="toggle-past" class="font-red-hat text-xs font-medium uppercase tracking-[0.16em] text-olive transition-colors hover:text-moss">${state.showPast ? "Hide past events" : "Show past events"}</button>`
              : ""
          }
          <p class="font-red-hat text-base text-ink/70 sm:text-lg">${list.length} ${list.length === 1 ? "event" : "events"}</p>
        </div>
      </div>
      ${
        list.length
          ? `<div class="space-y-3 fade-up">${list.map(eventRow).join("")}</div>`
          : `<div class="space-y-3 py-8 text-center">
              <p class="font-red-hat text-ink/75">No ${esc(state.category.toLowerCase())} events on this day.</p>
              <button type="button" data-action="all-categories" class="font-red-hat text-sm font-semibold text-olive hover:text-moss">Show all categories</button>
            </div>`
      }
    </div>`;
  }

  function renderTimelineControls() {
    const searching = state.query.trim().length > 0;
    const days = groupByDay(visibleEvents());
    const activeKey = (days.find((d) => d.key === state.activeDay) ?? days[0])?.key ?? "";
    document.getElementById("day-slot").innerHTML = !searching && days.length > 1 ? dayPicker(days, activeKey) : "";
    positionDayPill();
    document.getElementById("category-chips").innerHTML = categories
      .map((c) => {
        const active = c === state.category;
        return `<button type="button" data-category="${esc(c)}" aria-pressed="${active}" class="font-red-hat shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "border-olive bg-olive text-cream" : "border-olive/20 bg-white/55 text-olive hover:border-olive/40 hover:bg-white"}">${esc(c)}</button>`;
      })
      .join("");
    const count = document.getElementById("search-count");
    const clear = document.getElementById("search-clear");
    clear.hidden = !state.query;
    if (searching) {
      const q = state.query.trim().toLowerCase();
      const n = events.filter(
        (e) => matchesCategory(e) && `${e.name} ${e.location} ${e.eventTypes.join(" ")} ${e.description}`.toLowerCase().includes(q)
      ).length;
      count.textContent = `${n} ${n === 1 ? "result" : "results"}`;
      count.hidden = false;
    } else {
      count.hidden = true;
    }
    document.getElementById("schedule-results").innerHTML = scheduleResults();
  }

  function timelinePanel() {
    return `<div id="timeline-panel" role="tabpanel" aria-labelledby="timeline-tab" class="space-y-9 sm:space-y-11 fade-up">
      <section aria-labelledby="schedule-heading" class="space-y-4">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="schedule-heading" class="font-red-hat text-3xl font-bold tracking-tight text-ink sm:text-4xl">Schedule</h2>
            <p class="font-red-hat text-xs text-ink/70">Times shown in ${esc(tz)}. Schedule subject to change.</p>
          </div>
          <p class="font-red-hat text-base text-ink/70 sm:text-lg">${events.length} events</p>
        </div>
        <div class="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
          <div class="w-full max-w-md">
            <div class="relative">
              ${icon("search", "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-olive/50")}
              <input id="search" type="search" data-slot="input" placeholder="Search events, locations, types…" value="${esc(state.query)}" class="w-full min-w-0 border px-2.5 py-1 transition-colors outline-none placeholder:font-red-hat focus-visible:border-ring focus-visible:ring-3 md:text-sm liquid-glass-edge liquid-glass-surface bg-[rgba(251,250,244,0.85)] shadow-e-2 font-red-hat h-11 appearance-none rounded-lg border-transparent pl-10 pr-10 text-sm text-ink placeholder:text-ink/65 focus-visible:ring-olive/30 [&amp;::-webkit-search-cancel-button]:appearance-none" />
              <button id="search-clear" type="button" aria-label="Clear search" hidden class="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-olive transition-colors hover:bg-olive/10">${icon("x", "size-3.5")}</button>
            </div>
            <p id="search-count" hidden class="font-red-hat ml-1 mt-2 text-[11px] uppercase tracking-wider text-ink/70"></p>
          </div>
          <div id="day-slot" class="contents"></div>
        </div>
        <div id="category-chips" aria-label="Event categories" role="group" tabindex="0" class="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&amp;::-webkit-scrollbar]:hidden"></div>
        <div id="schedule-results"></div>
      </section>
    </div>`;
  }

  function guidePanel() {
    const embed = HANDBOOK_URL.replace(/\/[^/]*?([0-9a-f]{32})$/i, "/ebd/$1");
    return `<div id="guide-panel" role="tabpanel" aria-labelledby="guide-tab" class="fade-up">
      <section aria-labelledby="guide-heading" class="space-y-4">
        <h2 id="guide-heading" class="font-red-hat text-3xl font-bold text-ink sm:text-4xl">Hacker guide</h2>
        <a href="${HANDBOOK_URL}" target="_blank" rel="noreferrer" class="font-red-hat inline-flex items-center gap-1.5 text-sm font-semibold text-olive hover:text-moss">Open in Notion${icon("externalLink", "size-3.5")}</a>
        <iframe title="Hacker handbook" src="${embed}" class="h-[min(80vh,960px)] w-full rounded-md border border-olive/15 bg-white"></iframe>
      </section>
    </div>`;
  }

  function prizesPanel() {
    return `<div id="prizes-panel" role="tabpanel" aria-labelledby="prizes-tab" class="fade-up">
      <section aria-labelledby="prizes-coming-soon" class="liquid-glass-edge bg-[#fbfaf4] shadow-e-3 flex min-h-72 flex-col items-center justify-center rounded-md px-6 py-14 text-center">
        <div class="flex size-12 items-center justify-center rounded-md border border-olive/15 bg-white/55 text-olive">${icon("trophy", "size-5")}</div>
        <p class="font-red-hat mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-olive">Prizes</p>
        <h2 id="prizes-coming-soon" class="font-red-hat mt-2 text-2xl font-bold text-ink sm:text-3xl">${esc(settings.prizesEmptyTitle)}</h2>
        <p class="font-red-hat mt-3 max-w-xl text-sm leading-6 text-ink/75 sm:text-base">${esc(settings.prizesEmptyDescription)}</p>
      </section>
    </div>`;
  }

  function renderPanel() {
    const panel = document.getElementById("panel");
    if (state.tab === "timeline") {
      panel.innerHTML = timelinePanel();
      renderTimelineControls();
    } else if (state.tab === "guide") {
      panel.innerHTML = guidePanel();
    } else {
      panel.innerHTML = prizesPanel();
    }
  }

  // Timeline interactions (delegated so re-renders keep working)
  document.getElementById("panel").addEventListener("input", (ev) => {
    if (ev.target.id !== "search") return;
    state.query = ev.target.value;
    renderTimelineControls();
  });
  document.getElementById("panel").addEventListener("click", (ev) => {
    const t = ev.target;
    const day = t.closest("[data-day]");
    const cat = t.closest("[data-category]");
    const action = t.closest("[data-action]");
    const row = t.closest("[data-event]");
    if (t.closest("#search-clear")) {
      state.query = "";
      document.getElementById("search").value = "";
      renderTimelineControls();
    } else if (day) {
      state.activeDay = day.dataset.day;
      renderTimelineControls();
    } else if (cat) {
      state.category = cat.dataset.category;
      renderTimelineControls();
    } else if (action) {
      const a = action.dataset.action;
      if (a === "toggle-past") state.showPast = !state.showPast;
      if (a === "show-past") state.showPast = true;
      if (a === "all-categories") state.category = "All";
      renderTimelineControls();
    } else if (row) {
      openEvent(row.dataset.event, true);
    }
  });

  // ---------- event drawer ----------
  function locationLink(e) {
    const direct = (e.mapUrl || "").trim();
    const isUrl = (u) => /^https?:\/\//i.test(u);
    if (direct && isUrl(direct)) return direct;
    const loc = e.location.trim();
    if (isUrl(loc)) return loc;
    const key = loc.toLowerCase();
    if (NO_MAP.has(key)) return null;
    const place = KNOWN_PLACES[key];
    return place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : DUDERSTADT_MAP;
  }

  function calendarLink(e) {
    const start = new Date(e.startsAt);
    const end = e.endsAt ? new Date(e.endsAt) : new Date(start.getTime() + 36e5);
    const stamp = (d) => d.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/u, "Z");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: e.name,
      dates: `${stamp(start)}/${stamp(end)}`,
      details: e.description,
      location: e.location,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  const actionBtn = "font-red-hat inline-flex shrink-0 items-center h-auto justify-between gap-1.5 rounded-md border border-olive/20 bg-white/55 px-3 py-2.5 text-sm font-medium whitespace-nowrap text-olive transition-all hover:bg-white/85";

  function drawerHTML(e) {
    const s = status(e, state.now);
    const map = locationLink(e);
    const detail = (label, value, extra = "") =>
      `<div class="bg-white/50 p-4"><div class="text-[11px] font-medium uppercase tracking-wider text-ink/70">${label}</div><div class="font-red-hat mt-1 font-medium text-ink">${esc(value)}</div>${extra}</div>`;
    return `<div class="drawer-overlay" data-close></div>
    <div role="dialog" aria-modal="true" aria-labelledby="drawer-title" data-vaul-drawer-direction="bottom" class="drawer-panel liquid-glass-edge bg-[#fbfaf4] shadow-e-3 group/drawer-content !fixed z-50 flex h-auto flex-col overflow-y-auto text-sm inset-x-0 bottom-0 mt-24 max-h-[80vh] rounded-t-2xl border-t border-olive/10 text-ink">
      <div class="mx-auto mt-4 h-1 w-[100px] shrink-0 rounded-full bg-muted"></div>
      <button type="button" data-close aria-label="Close event details" class="font-red-hat inline-flex size-7 items-center justify-center rounded-md absolute top-4 right-4 z-10 text-ink/65 transition-all hover:bg-sage/30 hover:text-ink">${icon("x", "size-4")}</button>
      <div class="mx-auto w-full max-w-2xl">
        <div class="flex flex-col gap-0.5 p-4 text-left">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            ${tagBadges(e).replaceAll('class="rounded-full', 'class="font-red-hat rounded-full')}${statusBadge(s)}
          </div>
          <h2 id="drawer-title" class="font-red-hat text-3xl font-semibold text-ink">${esc(e.name)}</h2>
          <p class="font-red-hat text-sm text-ink/75">${esc(timeRange(e))} · ${esc(e.location)}</p>
        </div>
        <div class="font-red-hat space-y-4 px-4 pb-2 text-sm text-ink/75">
          ${e.summary ? `<p class="text-base font-medium leading-6 text-ink">${esc(e.summary)}</p>` : ""}
          <p class="whitespace-pre-line leading-6">${esc(e.description)}</p>
          <div class="grid gap-px overflow-hidden rounded-md border border-olive/10 bg-olive/5 sm:grid-cols-2">
            ${detail("Time", timeRange(e))}
            ${detail("Location", e.location, e.locationDetails ? `<div class="mt-1 text-xs leading-5 text-ink/65">${esc(e.locationDetails)}</div>` : "")}
            ${e.hostName ? detail("Host", e.hostName) : ""}
            ${e.audience || e.capacity ? detail("Attendees", [e.audience, e.capacity ? `${e.capacity} spots` : null].filter(Boolean).join(" · ")) : ""}
          </div>
          <section aria-labelledby="event-actions-heading" class="rounded-md border border-olive/12 bg-white/45 p-4">
            <h3 id="event-actions-heading" class="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Event actions</h3>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <a class="${actionBtn}" href="${esc(calendarLink(e))}" target="_blank" rel="noreferrer"><span class="inline-flex items-center gap-2">${icon("calendarPlus", "size-4")}Add to calendar</span>${icon("externalLink", "size-3.5 opacity-60")}</a>
              ${map ? `<a class="${actionBtn}" href="${esc(map)}" target="_blank" rel="noreferrer"><span class="inline-flex items-center gap-2">${icon("mapPin", "size-4")}${map === DUDERSTADT_MAP ? "Duderstadt map" : "Open location"}</span>${icon("externalLink", "size-3.5 opacity-60")}</a>` : ""}
              ${(e.resources || [])
                .map((r) =>
                  r.href
                    ? `<a class="${actionBtn}" href="${esc(r.href)}" target="_blank" rel="noreferrer"><span>${esc(r.label)}</span>${icon("externalLink", "size-3.5 opacity-60")}</a>`
                    : `<button type="button" disabled class="${actionBtn} border-olive/15 bg-white/35 text-ink/55 opacity-50"><span>${esc(r.label)}</span><span class="text-[10px] font-semibold uppercase tracking-wider">Coming soon</span></button>`
                )
                .join("")}
              <button type="button" data-share class="${actionBtn} justify-start">${icon("share", "size-4")}Share event</button>
            </div>
          </section>
        </div>
        <div class="mt-auto flex flex-col gap-2 p-4 sm:flex-row sm:justify-end">
          <button type="button" data-close class="font-red-hat inline-flex h-8 items-center justify-center rounded-md bg-olive px-2.5 text-sm font-medium text-cream transition-all hover:bg-moss">Close</button>
        </div>
      </div>
    </div>`;
  }

  let lastFocus = null;
  function openEvent(slug, updateHash) {
    const e = bySlug.get(slug);
    if (!e) return;
    state.openSlug = slug;
    lastFocus = document.activeElement;
    const root = document.getElementById("drawer-root");
    root.innerHTML = drawerHTML(e);
    document.body.style.overflow = "hidden";
    root.querySelector("[data-close][aria-label]").focus();
    if (updateHash) history.replaceState(null, "", `#event-${slug}`);
  }

  function closeEvent() {
    if (!state.openSlug) return;
    state.openSlug = null;
    const root = document.getElementById("drawer-root");
    root.querySelectorAll(".drawer-overlay, .drawer-panel").forEach((el) => el.classList.add("is-closing"));
    setTimeout(() => {
      if (!state.openSlug) root.innerHTML = "";
    }, 280);
    document.body.style.overflow = "";
    if (location.hash.startsWith("#event-")) history.replaceState(null, "", location.pathname + location.search);
    lastFocus?.focus?.({ preventScroll: true });
  }

  async function shareEvent() {
    const e = bySlug.get(state.openSlug);
    if (!e) return;
    const url = new URL(window.location.href);
    url.hash = `event-${e.slug}`;
    const data = { title: `${e.name} | MHacks Live`, text: `${e.name} at ${timeRange(e)}`, url: url.toString() };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(data.url);
      toast("Event link copied");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast("Could not share this event");
    }
  }

  document.getElementById("drawer-root").addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]")) closeEvent();
    else if (ev.target.closest("[data-share]")) shareEvent();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeEvent();
  });

  // Deep links: #event-<slug> opens that event on its day with past events shown.
  function syncHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id.startsWith("event-")) {
      closeEvent();
      return;
    }
    const e = bySlug.get(id.slice(6));
    if (!e) return;
    state.tab = "timeline";
    state.activeDay = dayKey(e.startsAt);
    state.showPast = true;
    renderTabs();
    renderPanel();
    openEvent(e.slug, false);
  }
  window.addEventListener("hashchange", syncHash);

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2400);
  }

  // ---------- boot ----------
  renderTabs();
  renderPanel();
  tickCountdown();
  setInterval(tickCountdown, 1000);
  // Live/Past statuses refresh every 30s, like the live site.
  setInterval(() => {
    state.now = Date.now();
    if (state.tab === "timeline") renderTimelineControls();
  }, 30000);
  if (location.hash.startsWith("#event-")) syncHash();
})();
