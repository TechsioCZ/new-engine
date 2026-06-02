# Design System Composer

This context defines the language for AI-assisted design creation using the UI design system as the source of truth.

## Language

**Design System Composer**:
A tool that creates or modifies Figma designs by assembling approved design-system components and variables.
_Avoid_: Lovable clone, AI app builder, generic UI generator

**Figma Design Output**:
The primary MVP artifact: a Figma screen, flow, or prototype built from existing design-system components.
_Avoid_: Generated app, production code, arbitrary HTML

**Design System Guardrails**:
Rules that constrain generated designs to approved components, variables, component properties, themes, and accessibility expectations.
_Avoid_: Prompt tips, suggestions, preferences

**Strict Composition Mode**:
The default operating mode where the agent assembles, configures, themes, and validates existing design-system assets without inventing new visual primitives.
_Avoid_: Freeform generation, custom drawing, detached design

**Design System Gap**:
A missing component, variable, pattern, or property that prevents a requested design from being built using existing design-system assets.
_Avoid_: Blocker, limitation, missing feature

**Extension Request**:
An explicit proposal to fill a Design System Gap after checking that no existing asset fits.
_Avoid_: Just make it, quick custom component, one-off design

**Provisional Extension**:
A temporary design-system addition created to satisfy a Design System Gap. It must reuse existing primitives, semantic tokens, and patterns where available, and may introduce new component tokens that inherit from semantic tokens.
_Avoid_: Detached component, raw-styled component, final system component

**Component Token**:
A component-specific design token that inherits from a semantic token or primitive token and gives a component its own theming surface.
_Avoid_: Raw value, one-off style, local override

**Working Web App Export**:
A later-stage artifact that turns a validated Figma design into a functioning web application.
_Avoid_: MVP output, required hackathon deliverable
