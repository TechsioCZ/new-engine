
## Pravidlo práce s tokeny
Do _herbatica-<component>.css dáváme jen ty tokeny, které jsou opravdu odlišné od defaultní tokenové logiky libs/ui.

Jinými slovy:
- Když libs/ui token už vede na správnou hodnotu přes chain (např. --color-button-fg-outlined-secondary -> --color-button-fg-outlined -> --color-fg-primary), tak to v herbatica komponentě znovu nereferencujeme.
- Když je výsledek správný už po nastavení _herbatica-semantic.css / _herbatica-typography.css / _herbatica-spacing.css, komponentový override je zbytečný.
- Komponentový override použijeme jen tehdy, když potřebujeme změnit samotnou referenci nebo hodnotu specificky pro danou komponentu, protože obecná vrstva nestačí.


## Pravidlo: Token-first, className-last

Při používání libs/ui komponent v aplikacích:

1. **Primárně nepoužívej inline className pro vzhled komponenty**
   - barvy, border, bg, spacing, radius, typografie, stavy patří do tokenů komponenty.

2. *Když vzhled nesedí s designem, neopravuj to v JSX třídou*
   - uprav mapování tokenů v aplikaci (_aplikace-semantic.css, _aplikace-typography.css, _aplikace-spacing.css, případně _aplikace-<component>.css).

3. **Inline className použij jen když je to nezbytná kompozice/layout**
   - např. relative, absolute, flex, justify-*, items-* pro konkrétní umístění prvků,
   - a jen pokud to komponenta nemá v componentVariants = tv({ ... }) nebo API.

4. **Pokud token chain z libs/ui už dává správný výsledek, nic nepřemapovávej**
   - žádné redundantní override.

5. *Když to tokeny neumí vyjádřit, je to API gap*
   - dočasně může být inline className,
   - dlouhodobě doplnit variantu/token do libs/ui a className odstranit.

### Hypotetický příklad
libs/ui:
- --color-button-fg: var(--color-fg-primary);

Aplikace chce jiný výsledek:
- v _aplikace-semantic.css přemapuješ zdrojový token (např. --color-fg-primary) nebo
- v _aplikace-button.css cíleně přemapuješ --color-button-fg na požadovanou hodnotu.

Neřeš to v usage stylem typu:
- className="text-warning ..."

Cíl: *vzhled komponenty řídit tokeny na jednom místě, ne opakovanými className v každém použití.*