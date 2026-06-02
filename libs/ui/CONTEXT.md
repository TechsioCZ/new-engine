# Design System Composer

This context defines the language for AI-assisted design creation using the Figma design system as the source of truth.

## Language

**Design System Composer**:
A tool that creates or modifies Figma designs by assembling approved Figma design-system components and variables.
_Avoid_: Lovable clone, AI app builder, generic UI generator

**Figma Design System**:
The live design-system library in Figma, including components, variables, styles, modes, properties, and documented patterns.
_Avoid_: Code library, generated assets, local approximation

**Figma Design Output**:
The primary MVP artifact: a Figma screen, flow, or prototype built from the Figma Design System.
_Avoid_: Generated app, production code, arbitrary HTML

**Design System Guardrails**:
Rules that constrain generated designs to approved Figma components, variables, component properties, themes, and accessibility expectations.
_Avoid_: Prompt tips, suggestions, preferences

**Strict Composition Mode**:
The default operating mode where the agent assembles, configures, themes, and validates existing Figma design-system assets without inventing new visual primitives.
_Avoid_: Freeform generation, custom drawing, detached design

**Design System Gap**:
A missing Figma component, variable, pattern, or property that prevents a requested design from being built using existing Figma design-system assets.
_Avoid_: Blocker, limitation, missing feature

**Extension Request**:
An explicit proposal to fill a Design System Gap after checking that no existing Figma asset fits.
_Avoid_: Just make it, quick custom component, one-off design

**Provisional Extension**:
A temporary Figma design-system addition created to satisfy a Design System Gap. It must reuse existing Figma primitives, semantic variables, and patterns where available, and may introduce new component variables that inherit from semantic variables.
_Avoid_: Detached component, raw-styled component, final system component

**Component Variable**:
A component-specific Figma variable that inherits from a semantic variable or primitive variable and gives a component its own theming surface.
_Avoid_: Raw value, one-off style, local override

**Figma Stress Test**:
An exercise that validates whether the Figma Design System can support real screen and prototype generation through composition, theming, accessibility checks, screenshot review, and iteration.
_Avoid_: Code audit, implementation review, production readiness check

**Working Web App Export**:
A later-stage artifact that turns a validated Figma design into a functioning web application.
_Avoid_: MVP output, required hackathon deliverable
