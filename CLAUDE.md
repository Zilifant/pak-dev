# pak-dev

## Shared CSS: the offer-section library

`assets/offer-sections.css` may contain only `--offer-section-*` tokens and
`.offer-section__*` primitives — never a selector naming a component.

- Component CSS lives in that component's own `{% stylesheet %}` block and consumes the
  `--offer-section-*` tokens directly, rather than re-aliasing them into a
  `--<component>-*` namespace.
- A value only one component needs stays component-local. Promote it to a library token
  once a second component needs the same value.
- Members: `sections/purchase-offers.liquid`, `sections/ingredient-list.liquid`. Each
  links the library with `{{ 'offer-sections.css' | asset_url | stylesheet_tag }}` and
  carries `offer-section` alongside its own component class on its root.
- A block inside a member section is already covered by that section's link and inherits
  its tokens: style it in the block's own `{% stylesheet %}` and do not add a second
  `stylesheet_tag`. See `blocks/_purchase-offers-gifts.liquid`.

Check the first rule with:

```sh
grep -rE '\.(ingredient-list|purchase-offers)' assets/offer-sections.css   # must be empty
```

## Reusable components

Reach for something that already exists before adding a file. When adding one, put it in
the narrowest place that fits:

| Where         | For                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sections/`   | A merchant-placeable region of a page.                                                                                                                                                                 |
| `blocks/`     | Markup plus its own settings, nested in a section. Prefix `_` to keep it private, render it with `{% content_for 'block', id: '…', type: '…' %}`, and set `"tag": null` so it adds no wrapper element. |
| `snippets/`   | Markup with no settings of its own. Declare its inputs in a `{%- doc -%}` block and take CSS classes from the caller, so other sections can reuse it. See `snippets/action-button.liquid`.             |
| `assets/*.js` | Behaviour, as a `Component` subclass registered behind a `customElements.get(…)` guard. See `assets/scroll-to.js`.                                                                                     |

- Address elements with `ref="…"` and `data-*`, and bind events declaratively with
  `on:click="/methodName"`. Avoid document-level listeners.
- A class that exists only as a JS hook is named `js-*`. Prefer `ref`/`data-*` instead.
- Never borrow another component's class for styling. Its CSS may not be loaded on the
  page you are on — style it locally.

## Merchant-facing settings

- A schema is capped at 40 settings (headers and paragraphs don't count). Each block gets
  its own budget, so moving a group of settings into a block is how a large section splits.
- Label settings for a shopkeeper, not a developer, and hide what doesn't apply with
  `visible_if`. Never expose a selector, a function name, or raw JavaScript.
- Moving or renaming a setting does **not** migrate stored values — update the matching
  `templates/*.json` entries in the same change, or merchants silently drop to defaults.
- Screen-reader-only strings belong in `locales/*.json` behind `| t`. Adding a key there
  means adding it to **every** locale file, or `shopify theme check` fails.
  s

## Before finishing

Run `shopify theme check`. The theme is expected to sit at zero offenses.
