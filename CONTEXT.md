# Design System Composer

This context defines the language for AI-assisted design creation using the product design system as the source of truth.

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

**Working Web App Export**:
A later-stage artifact that turns a validated Figma design into a functioning web application.
_Avoid_: MVP output, required hackathon deliverable
