# @ngbracket/a11y-eslint-plugin

ESLint rules that check Angular templates for missing accessible names, including
on your own components. Tell the linter that `<app-button>` behaves like a native
`<button>`, and it checks `<app-button>` the way it would check a button.
`@angular-eslint`'s `elements-content` rule checks that native buttons, links and
headings have content, but it doesn't know that `<app-button>` is a button. Use
this plugin alongside the angular-eslint rules.

Part of the `@ngbracket` Angular accessibility tooling, alongside
[`@ngbracket/a11y-devtools`](https://github.com/ngbracket/a11y-devtools).

## Status

MVP. Two rules shipped: `accessible-name` and `overlay-accessible-name`.

## Install

```bash
npm i -D @ngbracket/a11y-eslint-plugin
```

Peer deps: `eslint >=9` and `@angular-eslint/template-parser >=18` (you already
have the latter if you use `angular-eslint`).

## Usage (flat config)

```js
// eslint.config.js
import templateParser from '@angular-eslint/template-parser';
import a11y from '@ngbracket/a11y-eslint-plugin';

export default [
  {
    files: ['**/*.html'],
    languageOptions: { parser: templateParser },
    plugins: { '@ngbracket/a11y': a11y },
    // Map your custom components to the native element they behave like.
    // Key by the template tag or selector (kebab-case), not the class name.
    settings: {
      '@ngbracket/a11y': {
        components: {
          'app-button': 'button',
          'app-link': 'a',
        },
      },
    },
    rules: {
      '@ngbracket/a11y/accessible-name': 'error',
    },
  },
];
```

The component map can also be passed per-rule
(`'@ngbracket/a11y/accessible-name': ['error', { components: { ... } }]`); the
per-rule option wins over the shared `settings` map.

To turn on both rules as errors, spread the `recommended` preset into the same
block in place of `plugins` and `rules`: `...a11y.configs.recommended`. You still
set `files`, the parser and the component map yourself.

## Rules

### `accessible-name`

Flags a mapped custom component whose native element requires an accessible name
(`button`, `a`) when none is present. These count as a name: `aria-label`,
`aria-labelledby` or `title` on the element (static or bound), and text or
interpolation inside it at any depth. Inside it, a child's `aria-label` or
`aria-labelledby` and an `<img>` with `alt` count too. Content with
`aria-hidden="true"` or `hidden` doesn't, and neither does `<mat-icon>` text
unless the icon has `aria-hidden="false"`, because Angular Material hides icons
from assistive technology by default.

```html
<!-- error: maps to <button>, no accessible name -->
<app-button></app-button>
<app-button><mat-icon>delete</mat-icon></app-button>

<!-- ok -->
<app-button>Save</app-button>
<app-button><span>Save</span></app-button>
<app-button aria-label="Save"></app-button>
```

Full documentation for each rule is at
[ngbracket.com/tools/a11y-eslint-plugin](https://ngbracket.com/tools/a11y-eslint-plugin/docs/introduction).

### `overlay-accessible-name`

Flags a dialog/overlay with no accessible name. Applies to elements with
`role="dialog"`/`role="alertdialog"`, the native `<dialog>` element, and custom
components mapped to `dialog`. Unlike `accessible-name`, text content doesn't
count: a dialog takes its name from `aria-label` or `aria-labelledby` (static or
bound).

```html
<!-- error: dialog with no label -->
<div role="dialog"></div>
<app-modal></app-modal>  <!-- when mapped: { 'app-modal': 'dialog' } -->

<!-- ok -->
<div role="dialog" aria-labelledby="title"><h2 id="title">Settings</h2></div>
```

## Develop

```bash
npm install
npm test        # vitest + ESLint RuleTester
npm run build   # tsc -> dist/
```

## Roadmap

- An opt-in `strict` set, once its false-positive rate is low enough: roving
  tabindex misuse, and `@if`/`@switch` content swaps with no `aria-live` region.
- Checks that depend on `host` or `hostDirectives` stay out of this plugin. They
  need the component's TypeScript metadata, which a template rule can't see.
  `@ngbracket/a11y-devtools` checks the rendered result at runtime instead.
