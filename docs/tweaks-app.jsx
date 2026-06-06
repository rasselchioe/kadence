// Kadence — Tweaks app
// Mounts a small Tweaks panel that adjusts CSS variables and body classes on the
// already-rendered static page. React is used only for the panel; the page itself
// stays static HTML so the design spec remains directly editable.

const KADENCE_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "buttonShape": "rounded",
  "accent": "#C13525",
  "theme": "light",
  "ticker": true,
  "displayScale": 1.0
}/*EDITMODE-END*/;

// Pre-computed crimson-ink (deeper hover shade) per accent
const ACCENT_INKS = {
  "#C13525": "#8A1F12",  // crimson
  "#2748B5": "#1A327F",  // cobalt
  "#455F2C": "#2E4019",  // field
  "#9C5527": "#6E3915",  // terracotta
  "#7A2E5C": "#52203E"   // plum
};

const SHAPE_VALUES = {
  pill:    "999px",
  rounded: "8px",
  square:  "0px"
};

function applyTweaks(t) {
  const root = document.documentElement;
  root.style.setProperty("--r-btn",   SHAPE_VALUES[t.buttonShape] || "8px");
  root.style.setProperty("--r-input", SHAPE_VALUES[t.buttonShape] || "8px");
  root.style.setProperty("--crimson",     t.accent);
  root.style.setProperty("--crimson-ink", ACCENT_INKS[t.accent] || "#8A1F12");
  document.body.classList.toggle("night", t.theme === "night");
  document.body.classList.toggle("no-ticker", !t.ticker);
  // display scale — nudges the hero only, so the editorial moment can be turned up or down
  root.style.setProperty("--display-scale", String(t.displayScale));
}

function KadenceTweaks() {
  const [t, setTweak] = useTweaks(KADENCE_TWEAK_DEFAULTS);

  // apply on mount + whenever tweaks change
  React.useEffect(() => { applyTweaks(t); }, [t]);

  // Curated accent swatches (matches the data-viz quartet + a couple of extras)
  const ACCENTS = ["#C13525", "#2748B5", "#455F2C", "#9C5527", "#7A2E5C"];

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Shape" />
      <TweakRadio
        label="Button shape"
        value={t.buttonShape}
        options={["pill", "rounded", "square"]}
        onChange={(v) => setTweak("buttonShape", v)}
      />

      <TweakSection label="Color" />
      <TweakColor
        label="Accent"
        value={t.accent}
        options={ACCENTS}
        onChange={(v) => setTweak("accent", v)}
      />
      <TweakRadio
        label="Theme"
        value={t.theme}
        options={["light", "night"]}
        onChange={(v) => setTweak("theme", v)}
      />

      <TweakSection label="Editorial" />
      <TweakToggle
        label="Ticker"
        value={t.ticker}
        onChange={(v) => setTweak("ticker", v)}
      />
      <TweakSlider
        label="Hero scale"
        value={t.displayScale}
        min={0.7}
        max={1.3}
        step={0.05}
        unit="×"
        onChange={(v) => setTweak("displayScale", v)}
      />
    </TweaksPanel>
  );
}

// Mount
(function mountKadenceTweaks() {
  const tryMount = () => {
    if (typeof window.TweaksPanel !== "function" || typeof window.useTweaks !== "function") {
      // tweaks-panel.jsx hasn't transpiled yet; retry next frame
      requestAnimationFrame(tryMount);
      return;
    }
    const el = document.getElementById("tweaks-mount");
    if (!el) return;
    ReactDOM.createRoot(el).render(<KadenceTweaks />);
  };
  tryMount();
})();
