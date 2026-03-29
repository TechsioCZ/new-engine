## Shrnutí k review připomínkám

V `badge.tsx` jde o rozdíl mezi CSS zápisem a React `style` objektem.

V `.css` souboru se píše:

```css
background-color: red;
border-color: black;
```

Ale v React `style={{ ... }}` objektu se musí použít JavaScript/DOM názvy:

```tsx
{
  backgroundColor: bgColor,
  color: fgColor,
  borderColor: borderColor,
}
```

### Co bylo špatně

Pokud tam bylo jen:

```tsx
{
  "background-color": bgColor,
  "border-color": borderColor,
}
```

tak to bylo věcně špatně, protože to je CSS zápis, ne správný React zápis.

### Co už je teď správně

Aktuální stav:

```tsx
{
  "backgroundColor": bgColor,
  color: fgColor,
  "borderColor": borderColor,
}
```

je funkčně správně.

### Co je už jen kosmetika

U `backgroundColor` a `borderColor` jsou uvozovky zbytečné. Není to chyba, jen méně čistý zápis.

Čistší varianta:

```tsx
const dynamicStyles = isDynamic
  ? {
      ...style,
      backgroundColor: bgColor,
      color: fgColor,
      borderColor,
    }
  : style
```

### Verdikt

- `background-color` / `border-color` by byly chyba.
- `backgroundColor` / `borderColor` jsou správně.
- Uvozovky kolem `backgroundColor` a `borderColor` nejsou bug, jen stylistický detail.

### Poznámka ke stories

V `badge.stories.tsx` je připomínka ke `'` vs `"` jen kosmetická konzistence JSX zápisu, ne funkční problém.
