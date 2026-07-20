<h1 align="center">
  <br>
  <img src="src/app/icon.svg" alt="Palette Check" width="40">
  <br>
  Palette Check
  <br>
</h1>

<h4 align="center">Accessible design tokens where the model proposes and the math guarantees.</h4>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/WCAG_2.1_%2B_APCA-2e7d32?style=for-the-badge&logoColor=white" alt="WCAG 2.1 + APCA" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-measuring-the-model">Measuring the Model</a> •
  <a href="#-the-vocabulary">Vocabulary</a> •
  <a href="#ℹ%EF%B8%8F-how-to-run-the-application">How To Run</a> •
  <a href="#-try-these">Try These</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  Describe a product and get a full set of accessible light <em>and</em> dark design tokens — the hue and chroma proposed by a language model, the contrast verified against WCAG and repaired by moving <em>only lightness</em>. Not a theme picker: it guarantees the contrast mathematically, and when a colour genuinely can't be made accessible without overriding the model's intent, it reports it as <code>infeasible</code> instead of faking a pass.
</p>

<p align="center">
  <strong>LLM proposes. Math guarantees.</strong>
</p>

<br/>

## 🎨 Features

|                                       |                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🔒 Luminance-only repair**          | The model owns hue and chroma; the engine repairs failing contrast by moving **only lightness**. Because `h` and `c` never change, harmony is preserved _by construction_ — the repair can't drift the brand. The Repair Trace proves it: every marker slides along a luminance axis into the feasible band, with `H` and `C` shown locked.                            |
| **📊 The model, measured**            | The deterministic engine _cages_ the model — and a separate **eval / variance harness** (`npm run eval`) also _measures_ it. It scores only what the engine leaves to the LLM: JSON & schema reliability, pre-sanitize range adherence, harmony and status-hue conventions, distinctiveness vs. the generic "AI purple," repair load, and output variance across repeated runs — over a **versioned golden prompt set** so results stay comparable across models. The cage jails the LLM; the harness proves how well it behaves inside it.        |
| **🤝 Honest `infeasible` reporting**  | Some colours simply can't clear a contrast rule by lightness alone — a saturated on-colour on a mid-tone brand, say. Instead of quietly faking a pass, the engine reports the token as `infeasible`, shows its best-effort value, and says why. Accessibility as a guarantee means admitting the guarantee's edges.                                                    |
| **🚦 WCAG 2.1 + APCA, side by side**  | The audit scores all 19 contrast rules under **WCAG 2.1** (ratios) _and_ **APCA** (the WCAG 3 candidate — perceptual, polarity-aware `Lc`). A toggle reveals how the same palette scores under both — and they don't always agree. The engine repairs to WCAG; APCA is a second lens, shown honestly, never over-claimed.                                             |
| **🖥️ A living design system**         | The preview isn't a static mock — it's a board of real components (buttons in every state, inputs, menus, tables, alerts, badges, dialogs, toasts, tabs) repainted by the tokens in real time. Generate a new palette and watch an entire design system be applied at once.                                                                                           |
| **🕹️ Live token tuner**              | Edit any token and the whole pipeline re-runs live. Anchors take full `L C H`; foregrounds let you pick hue and chroma while **the engine owns lightness** — the thesis, made interactive. Drag the brand hue and the whole brand family follows.                                                                                                                     |
| **👁️ Colour-vision simulation**       | View the preview through protanopia, deuteranopia, tritanopia, or grayscale (SVG `feColorMatrix`) to check nothing relies on colour alone — under grayscale the status dots collapse to identical greys, and you see it instantly.                                                                                                                                    |
| **🧭 Luminance-map tokens**           | The 18 semantic tokens for light and dark are plotted on a luminance map — a tonal fingerprint of the theme — each annotated with its full OKLCH `L C H` coordinates, not a bare hex string.                                                                                                                                                                          |
| **📦 Real exports**                   | CSS custom properties, JSON, a Tailwind config, and W3C Design Tokens (DTCG) — copy to clipboard or download the file.                                                                                                                                                                                                                                               |
| **🔗 Zero-backend sharing**           | The entire palette encodes into the URL — deterministically restorable from the link alone. Curated presets and the tuner run the **real engine client-side**, so the whole thing works offline with no API key.                                                                                                                                                     |

<br/>

## 🛠️ Tech Stack

<p>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
</p>

| Category         | Technologies                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**    | Next.js 16 (App Router), React 19                                                                                                                                                                 |
| **Language**     | TypeScript 5 (strict)                                                                                                                                                                             |
| **Styling**      | Tailwind CSS v4                                                                                                                                                                                   |
| **Engine**       | Pure TypeScript — own OKLCH ↔ sRGB maths, WCAG 2.1 contrast, APCA-W3 0.1.9, gamut clamping, and a binary-search repair. **Zero runtime dependencies**, zero React, framework-free                 |
| **Colour model** | OKLCH throughout — repair moves lightness while hue and chroma stay fixed, which is why harmony survives                                                                                          |
| **Contrast**     | WCAG 2.1 (ratios) **and** APCA (perceptual `Lc`) as a second lens — the engine repairs to the former and reports the latter                                                                       |
| **AI**           | Groq (`groq-sdk`) for the palette _proposal_ only, with a **Zod** contract (numeric ranges enforced at the boundary), a configurable temperature, and one bounded retry on a bad draw; verification, repair, and export are always local. Falls back to an offline sample when no key is set |
| **UI**           | Framer Motion, lucide-react, and a small "instrument" component kit (luminance axis, coordinate readouts, colour-vision filters)                                                                  |
| **Testing**      | **Vitest** + **fast-check** — unit tests plus property tests over the engine, fully offline                                                                                                       |
| **Evaluation**   | A standalone **eval / variance harness** (`tsx`) that scores the LLM's contribution against a versioned golden prompt set — deterministic against the offline mock, gated on `GROQ_API_KEY` for the real model, and kept out of `npm test`                                                    |
| **API**          | A dependency-free, per-IP **token-bucket rate limiter** guarding the paid generation route (429 + `Retry-After`), tested with a synthetic clock                                                    |

<br/>

## 📝 Project Description

Palette Check answers a question most colour tools dodge: **can this palette's accessibility be _guaranteed_, or only hoped for?**

You describe a product; a language model proposes a core palette — the creative part: hue, chroma, brand personality. From there, nothing is left to chance. A pure, deterministic engine materializes the full 18-token set, clamps it to the sRGB gamut, and checks it against 19 contrast rules. Where a token fails, the engine **repairs it by moving only its lightness** onto the nearest value that passes — never touching the hue or chroma the model chose. Because only lightness moves, the palette stays in harmony automatically, and the fix is the _minimum_ change that clears the rule.

The division of labour is the whole idea:

> **Creativity is a model's job. Accessibility is math's job.** Where they disagree, the math wins — and says so out loud.

When a colour can't be rescued by lightness alone, the engine doesn't paper over it: it reports the token as `infeasible`, surfaces a best-effort value, and explains the constraint. And because the repair is deterministic, every result is reproducible — you never have to _trust_ that the contrast is real; you can read exactly how it was guaranteed.

The result is a **living design system**: a preview board of real components repainted by the tokens in real time, a luminance map of every token with its OKLCH coordinates, an inspection-style audit you can flip between WCAG 2.1 and APCA, and the Repair Trace — the star — showing each failing colour slide into the feasible band with hue and chroma provably untouched.

**Additional features:**

- **A tuner that turns the showcase into a tool.** Pick any token and edit it live; the whole pipeline re-runs on every drag. Anchors accept full `L C H`; foreground tokens let you choose hue and chroma while the repair engine owns lightness — so you _feel_ the thesis. Gradient sliders show each dimension's own OKLCH sweep, and dragging the brand hue carries the brand family with it.
- **Two contrast methods, one honest answer.** The audit scores every rule under WCAG 2.1 and APCA. A WCAG-repaired palette routinely misses APCA's stricter body-text targets, and the app shows that gap plainly rather than hiding it — the engine guarantees WCAG 2.1 and presents APCA as a second lens, never as a promise it didn't make.
- **The LLM is measured, not just trusted.** Because the engine deliberately fences the model off from accessibility, a separate eval harness scores what's left to it — reliability, brief adherence, distinctiveness, and run-to-run variance — over a fixed golden prompt set. See [Measuring the Model](#-measuring-the-model).
- **Colour-vision simulation over the preview.** Protanopia, deuteranopia, tritanopia, and grayscale filters applied to the live board, so you can check the design doesn't lean on hue to carry meaning.
- **Deterministic, shareable, offline-first.** Curated presets and the tuner run the real engine in the browser — no key, no network. A palette encodes into the URL and restores from the link alone. Only the optional prompt bar ever calls a model.
- **Exports designers actually use.** CSS variables, JSON, Tailwind config, and W3C Design Tokens — copyable and downloadable.

<br/>

## 🔬 How it works

The pipeline is deterministic from materialize onward — there is exactly one creative step (the model's proposal) and no probabilistic component after it. Every later stage is a pure function of the palette:

```
prompt → propose (LLM)     — hue, chroma, brand personality                       [creative]
       → materialize       — derive the full 18-token set, clamp to the sRGB gamut [deterministic]
       → verify            — score all 19 contrast rules (WCAG 2.1)                [deterministic]
       → repair            — move ONLY lightness onto the nearest passing value    [deterministic]
       → verify + harmony  — re-check contrast; confirm hues match the scheme      [deterministic]
       → case file (preview · tokens · audit [WCAG + APCA] · repair trace · export)
```

**Propose ([`src/features/llm/prompt.ts`](src/features/llm/prompt.ts), [`client.ts`](src/features/llm/client.ts)).** The model returns only a _core_ set of tokens for light and dark, validated by a **Zod** contract; loose numerics are clamped, never thrown on. With no API key the same shape is served from an offline mock, so the pipeline is identical online or off.

**Materialize ([`src/features/llm/materialize.ts`](src/features/llm/materialize.ts)).** The core is expanded into the full 18-token set — deriving hover/active states, disabled text, and borders — and every colour is clamped into the sRGB gamut. This is the one place chroma changes; it is deliberately **not** contrast-aware, so the Repair Trace has a real story to tell.

**Verify ([`src/lib/color/verify.ts`](src/lib/color/verify.ts), [`rules.ts`](src/lib/color/rules.ts)).** 19 hardcoded contrast rules (text on four backgrounds, on-colour legibility, status colours, non-text UI) are scored against WCAG 2.1 thresholds. The rules are fixed and never come from the model.

**Repair ([`src/lib/color/repair.ts`](src/lib/color/repair.ts)).** For each failing foreground, each rule defines a feasible half-interval of lightness (found by binary search over `luminanceAtL`). The engine intersects a token's intervals and projects the proposed `L` onto the nearest passing value — hue and chroma untouched. An empty intersection is reported as `infeasible`, with a best-effort maximin lightness. Anchors (backgrounds, surfaces, brand, selection) are never repaired; foregrounds are repaired against them, and the two sets are disjoint by construction so no ordering is needed.

**Audit — two lenses ([`src/lib/color/contrast.ts`](src/lib/color/contrast.ts), [`apca.ts`](src/lib/color/apca.ts)).** WCAG 2.1 uses the piecewise-linearized relative luminance and a `(L+0.05)` ratio; APCA-W3 0.1.9 uses its own screen-luminance curve and a signed, polarity-aware `Lc`. Both are computed from the same tokens so the audit can switch methods without re-deriving the palette.

**Harmony ([`src/lib/color/harmony.ts`](src/lib/color/harmony.ts)).** The repaired hues are checked against the chosen scheme (analogous / complementary / triadic / monochromatic) within a per-scheme tolerance; drift is surfaced as `off-scheme`, not silently corrected.

**Assemble ([`src/features/llm/generate.ts`](src/features/llm/generate.ts)).** `assembleResult` runs the whole pipeline and returns the UI contract; `assembleFromMaterialized` re-runs everything from a materialized palette, which is what the live tuner and the shareable-link decoder call.

<br/>

## 🧬 The vocabulary

Palette Check doesn't grade a colour "good" or "bad". It classifies each token's relationship to the contrast rules — a read on _how_ its accessibility was reached:

| Term                 | What it means                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **anchor**           | Fixed by the model and never repaired — backgrounds, surfaces, the brand colours, selection. Everything else is measured against these.  |
| **foreground**       | Repaired against its anchors by moving lightness only — text, borders, focus ring, status colours.                                       |
| **repaired**         | The model's lightness missed a rule, so the engine slid it to the nearest passing value. Hue and chroma are exactly as proposed.         |
| **infeasible**       | No lightness clears every rule at this hue and chroma. Reported honestly with a best-effort value — never dressed up as a pass.          |
| **off-scheme**       | A hue drifted outside the chosen harmony's tolerance. Surfaced for you to see, not silently "fixed".                                      |

> The engine guarantees **WCAG 2.1**. **APCA** `Lc` is computed and displayed as a second lens, but the repair does not target it — so a token can read `pass` under WCAG and fall short of an APCA target, and the audit says exactly that rather than pretending the two agree.

<br/>

## 📌 Design notes

The central claim is that an accessibility answer is worthless unless it's _guaranteed_, not merely plausible — so the pipeline is built to be reproducible and honest at its edges.

- **LLM proposes, math guarantees.** Exactly one step is creative (the proposal). Everything after it is a pure function of the palette, so any result can be re-derived and checked — you never have to trust the contrast is real.
- **Only lightness moves.** Repair changes `L` and nothing else, which is why harmony survives repair by construction and why the fix is the minimum change that clears the rule.
- **`infeasible` is a first-class result.** "This can't be made accessible without changing your hue or chroma" is a correct, useful answer — not an error to hide behind a fake pass.
- **Two lenses, one honest answer.** WCAG 2.1 is the guarantee; APCA is shown alongside it, and the app admits where they diverge instead of picking whichever looks better.
- **Accessibility ≠ aesthetics.** The engine guarantees contrast, not beauty. Beauty stays the model's job — and the app never conflates the two.
- **Cage _and_ measure.** Constraining the model is only half the story; the eval harness measures the half the cage leaves open, so the model's real contribution is a number, not a vibe.
- **Hardened at the edges.** The `/api/generate` route is rate-limited per IP (a dependency-free token bucket) so a paid model can't be run up by abuse; the proposal contract enforces its numeric ranges at the Zod boundary; and a bad model draw gets one bounded retry before failing with a friendly message.

<br/>

## ⚠️ Limitations

A tool that stakes its value on honesty should be just as honest about its own edges:

- **The guarantee is WCAG 2.1, not APCA.** Repair targets WCAG ratios; APCA is a display-only second lens. A repaired palette often misses APCA's stricter body-text targets — shown plainly, but not fixed.
- **Beauty is not guaranteed.** The engine ensures contrast, never that the model's palette is _good_. A garish but accessible palette is a valid output.
- **Materialize is intentionally not contrast-aware.** Derived tokens (hover/active, disabled, borders) can start out failing on purpose, so the Repair Trace has something to show. `border` and `borderStrong` can converge to the same value when both start far below the 3:1 bar — accessible, but a known nuance.
- **Live AI generation depends on a Groq key and your plan's rate limits.** Without one, the curated presets and the tuner still run the full engine offline; the prompt bar is the only feature that needs the model.
- **Token _descriptions_ are static.** The human-readable role text is authored, not model-generated — only the colours come from the LLM.
- **Harmony tolerances are heuristic.** Each scheme has a fixed hue tolerance; "off-scheme" is descriptive, and some drift is perfectly reasonable design.
- **Real eval numbers need a key.** The harness's offline mock run is deterministic (and a test baseline), but scoring an actual model spends Groq API calls — so `npm run eval` against the real model is opt-in and deliberately kept out of `npm test`.

<br/>

## 📊 Measuring the model

The engine _guarantees_ accessibility, which means the LLM is deliberately fenced off from it. That leaves the real question for any LLM feature: **how good is the part the engine leaves to the model?** A standalone **eval / variance harness** ([`eval/`](eval)) answers it — measuring only the model's actual contribution, never re-testing what the engine already proves.

It runs a **versioned golden prompt set** (a fixed `productType × vibe × scheme` matrix, so runs stay comparable across models and revisions) and reports three families of metric:

- **A · Boundary reliability** — the two things the production client discards after parsing: valid-JSON rate, schema adherence, and **pre-sanitize range adherence** (how often `l/c/h` arrive within the prompt's limits _without_ `materialize` having to clamp them). The model's raw obedience to the output contract.
- **B · Creative-brief adherence** — the hue identity the engine never touches: does the palette honour the requested **harmony scheme** (measured with the engine's own `checkHarmony`), do the **status colours** land in their conventional families (red / amber / green / blue), does it **avoid the generic "AI purple,"** and how **diverse** are the brand hues across the whole set?
- **C · Engine coupling** — how good a _seed_ the model handed the solver: the **repair load** (the `ΔL` the engine had to apply) and the **infeasible rate**. A better creative proposal needs less rescuing.

A **variance** pass repeats a subset of prompts at `temperature > 0` and reports the dispersion — circular σ of the brand hue, stability of harmony and conventions — the _reliability_ of the creative output, not just its average.

Crucially, the harness **reuses the real engine** (`assembleResult`, `checkHarmony`) rather than re-implementing it, and only instruments the pre-parse seam the product hides. It runs against the **offline mock** by default — deterministic, no key, a perfect baseline the test suite asserts — and against the **real model** when `GROQ_API_KEY` is set. It is kept **out of `npm test`** (it costs API calls and is non-deterministic); its pure machinery, however, _is_ covered by the suite.

```bash
npm run eval                 # offline mock — deterministic, no key
GROQ_API_KEY=… npm run eval  # against the real model
```

Each run prints a terminal scorecard and writes a JSON report — aggregates per prompt, per scheme, and overall — so a model swap or a prompt change can be tracked over time.

> The engine is the **cage**; the harness is the **measurement**. Together they turn _"I constrained the LLM"_ into _"I constrain **and** measure the LLM."_

<br/>

## 🧪 Testing

The engine is a set of pure, deterministic functions, so it's tested the same way — **no network, no live model**. Property tests fuzz the colour maths; unit tests pin every verdict path.

- **107 tests across 13 files**, run with **Vitest** (property tests via **fast-check**).
- **Colour maths** — OKLCH ↔ sRGB round-trips, gamut clamping, WCAG reference values (black vs white is exactly `21`), and the canonical APCA anchors (black-on-white ≈ `+106`, white-on-black ≈ `−108`).
- **Repair** — feasible-window solving, the **luminance-only invariant** (hue and chroma never move), multi-rule intersection, and honest `infeasible` reporting with a best-effort value.
- **Properties** — contrast symmetry and `[1, 21]` bounds, and the monotonicity of `luminanceAtL` in lightness _within the gamut the engine actually operates in_ (out-of-gamut clamping legitimately breaks it, so the property is asserted where repair relies on it).
- **Harmony & export** — scheme tolerance checks and the CSS / JSON / Tailwind / DTCG serializers.
- **Harness & rate limiter** — the eval metrics (parsing, range, harmony, status, circular variance stats) are unit-tested against fixtures _and_ a full mock sweep that asserts the deterministic baseline; the token-bucket rate limiter is driven entirely by a synthetic clock. Both fully offline — the real-model eval lives in `npm run eval`, never here.

```bash
npm test
```

<br/>

## ℹ️ How to run the application?

> No API keys, database, or accounts are required — the engine, presets, and tuner all run locally. A Groq key only unlocks live AI generation from the prompt bar.

> Clone the repository:

```bash
git clone https://github.com/maricastroc/pallete-check
```

> Install the dependencies:

```bash
npm install
```

> Start the dev server:

```bash
npm run dev
```

> ⏩ Access [http://localhost:3000](http://localhost:3000) to view the web application.

> **Optional — live AI generation.** To let the prompt bar propose palettes with a model, add a [Groq](https://groq.com) key to `.env.local`:

```bash
GROQ_API_KEY=your_key_here
# optional — defaults to llama-3.3-70b-versatile
GROQ_MODEL=openai/gpt-oss-120b
# optional — sampling temperature (higher = more varied)
GROQ_TEMPERATURE=0.7
# optional — per-IP rate limit on /api/generate (burst / refill-per-minute)
RATE_LIMIT_BURST=8
RATE_LIMIT_PER_MINUTE=8
```

> With no key set, generation falls back to a built-in offline sample; everything else runs unchanged.

> Run the test suite (Vitest, fully offline):

```bash
npm test
```

> Score the model with the eval harness — offline mock by default (deterministic, no key); add a Groq key for the real model:

```bash
npm run eval
```

<br/>

## 🔎 Try these

Five built-in presets — each runs the full engine client-side, and one is a deliberate honest failure:

| Preset               | Vibe                    | What you'll see                                                                                                                          |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Fintech dashboard**| deep, trustworthy blue  | A clean analogous palette that clears every WCAG rule — the calm, "just works" case.                                                     |
| **Meditation app**   | one restful green       | Monochromatic: a single hue held quiet across the whole system.                                                                          |
| **Kids store**       | vivid magenta           | A triadic, playful set — the strongest demo of the whole board morphing at once.                                                         |
| **Bold commerce**    | hot cinnabar red        | The honest edge: a same-hue label colour the math **can't** rescue — `onPrimary` is reported `infeasible`, best effort ≈ Lc short of target. |

Then open the **tuner**, drag the brand hue, and watch the audit and repair trace re-solve live.

<br/>

## 📄 License

Released under the MIT License. You're free to use, study, fork and build on this code — **as long as the original copyright and license notice are kept**. Reuse it and learn from it; don't strip the attribution and present it as your own.

© 2026 Mariana Castro

<br/>

<div align="center">

⭐ If you like this project, give it a star on GitHub!

</div>
