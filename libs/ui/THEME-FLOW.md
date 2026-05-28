# Theme token flow (Figma → browser)

End-to-end path of a design token from the Figma source file to a rendered pixel in any of the three theme contexts (`light`, `dark`, `reverse`).

## Full pipeline

```mermaid
flowchart TD
    F["🎨 <b>Figma</b><br/>43 collections × 2 modes<br/>(Light + Dark)"]

    F -->|Figma plugin export| VL["📄 <code>tokens/figma/light/<br/>variables.css</code><br/><code>--color-badge-bg-primary:<br/>oklch(0.807 0.101 250.446);</code>"]
    F -->|Figma plugin export| VD["📄 <code>tokens/figma/dark/<br/>variables.css</code><br/><code>--color-badge-bg-primary:<br/>oklch(0.827 0.109 229.198);</code>"]

    VL --> S["🛠️ <code>apply-light-dark.mjs &lt;comp&gt;</code><br/>rewrites <code>_&lt;comp&gt;.css</code>"]
    VD --> S

    S --> CC["📄 <code>tokens/components/atoms/<br/>_badge.css</code><br/><code>@theme static {<br/>&nbsp;&nbsp;--color-badge-bg-primary:<br/>&nbsp;&nbsp;&nbsp;&nbsp;light-dark(L, D);<br/>}</code>"]

    CC --> TW["⚙️ <b>Tailwind v4</b><br/>generates utility:<br/><code>.bg-badge-bg-primary {<br/>&nbsp;&nbsp;background: var(--color-badge-bg-primary);<br/>}</code>"]

    TW --> LC["⚙️ <b>Lightning CSS</b><br/>polyfills <code>light-dark()</code>:<br/><code>--color-badge-bg-primary:<br/>&nbsp;&nbsp;var(--lightningcss-light, L)<br/>&nbsp;&nbsp;var(--lightningcss-dark, D);</code>"]

    LC --> SW["🎚️ <b>Switchboard</b><br/><code>_tokens-base.css</code> + Lightning CSS toggles<br/>set <code>color-scheme</code> +<br/><code>--lightningcss-{light,dark}</code> per theme class"]

    SW --> SCOPE{"🖥️ Browser<br/>resolves<br/>per element"}

    SCOPE -->|"<code>.light</code> /<br/><code>.always-light</code>"| L1["✅ <b>L</b>"]
    SCOPE -->|"<code>.dark</code> /<br/><code>.always-dark</code>"| D1["✅ <b>D</b>"]
    SCOPE -->|"no class + system light"| L2["✅ <b>L</b>"]
    SCOPE -->|"no class + system dark"| D2["✅ <b>D</b>"]
    SCOPE -->|"<code>.light .reverse</code>"| D3["✅ <b>D</b><br/>(flipped)"]
    SCOPE -->|"<code>.dark .reverse</code>"| L3["✅ <b>L</b><br/>(flipped)"]
    SCOPE -->|"system light + <code>.reverse</code>"| D4["✅ <b>D</b><br/>(flipped)"]
    SCOPE -->|"system dark + <code>.reverse</code>"| L4["✅ <b>L</b><br/>(flipped)"]

    classDef figma fill:#1abcfe,stroke:#0d8ed8,color:#fff
    classDef file fill:#fff4d6,stroke:#d9a900,color:#000
    classDef script fill:#e6e6fa,stroke:#7c3aed,color:#000
    classDef build fill:#d1fae5,stroke:#059669,color:#000
    classDef switch fill:#fde68a,stroke:#d97706,color:#000
    classDef scope fill:#f3f4f6,stroke:#374151,color:#000
    classDef light fill:#dbeafe,stroke:#2563eb,color:#000
    classDef dark fill:#312e81,stroke:#1e1b4b,color:#fff

    class F figma
    class VL,VD,CC file
    class S script
    class TW,LC build
    class SW switch
    class SCOPE scope
    class L1,L2,L3,L4 light
    class D1,D2,D3,D4 dark
```

## Why this works for `.reverse`

The `.reverse` class doesn't carry any color values itself — it just flips `color-scheme` on the element. Lightning CSS's `light-dark()` polyfill follows the nearest `color-scheme`, so every migrated token automatically flips with no per-component CSS.

```mermaid
flowchart LR
    subgraph DOM
        H["&lt;html class='light'&gt;"]
        R["&lt;div class='reverse'&gt;"]
        B["&lt;Badge/&gt;"]
        H --> R --> B
    end

    H -.->|"color-scheme: light"| CS1["L wins"]
    R -.->|"color-scheme: dark<br/>(via <code>.light .reverse</code>)"| CS2["D wins"]
    B -.->|"inherits color-scheme<br/>from nearest ancestor"| CS2

    classDef dom fill:#f3f4f6,stroke:#374151,color:#000
    classDef anno fill:#fef3c7,stroke:#d97706,color:#000
    class H,R,B dom
    class CS1,CS2 anno
```

## When Figma changes

Three commands. The first is manual, the rest are scripted.

```mermaid
flowchart LR
    A["1. 🎨 Update values<br/>in Figma"] --> B["2. 📤 Export plugin<br/>→ overwrites<br/><code>variables.css</code> (L + D)"]
    B --> C["3. 🛠️ Run<br/><code>apply-light-dark.mjs &lt;...atoms&gt;</code><br/>→ updates each<br/><code>_&lt;comp&gt;.css</code>"]
    C --> D["4. ✅ <code>pnpm dev</code><br/>picks it up via HMR"]

    classDef manual fill:#fee2e2,stroke:#dc2626,color:#000
    classDef auto fill:#d1fae5,stroke:#059669,color:#000
    class A,B manual
    class C,D auto
```

## File reference

| Layer | Path |
|---|---|
| Raw Figma export | `libs/ui/src/tokens/figma/{light,dark}/variables.css` |
| Per-component token files | `libs/ui/src/tokens/components/atoms/_<comp>.css` |
| Color-scheme switchboard | `libs/ui/src/tokens/_tokens-base.css` |
| Splitter (one-off inspection) | `.agents/skills/figma-token-binding/scripts/split-figma-tokens.mjs` |
| **Rebinder (canonical, run after each Figma export)** | `.agents/skills/figma-token-binding/scripts/apply-light-dark.mjs` |
| Skill doc | `.agents/skills/figma-token-binding/SKILL.md` |
