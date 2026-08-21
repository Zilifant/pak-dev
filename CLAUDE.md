# pak-dev

## The offer-section component library

`assets/offer-sections.css` is the shared offer-section library: it may contain only
`--offer-section-*` tokens and `.offer-section__*` primitives, never a selector naming a
component — all component CSS belongs in that section's own `{% stylesheet %}` block and
must consume the `--offer-section-*` tokens directly rather than re-aliasing them into a
`--<component>-*` namespace. Add a new library token or primitive only once a second
section actually needs it; until then keep the value component-local.

Current members: `sections/purchase-offers.liquid`, `sections/ingredient-list.liquid`.
Each links the library with `{{ 'offer-sections.css' | asset_url | stylesheet_tag }}` and
carries `offer-section` alongside its own component class on the section root.

A block rendered inside a member section is covered by that section's link and inherits
its tokens, so it consumes `--offer-section-*` and `.offer-section__*` in its own
`{% stylesheet %}` without linking the library again — `blocks/_purchase-offers-gifts.liquid`
is the current example. Adding a `stylesheet_tag` there would duplicate the library.

Check the first half of the rule with:

```sh
grep -rE '\.(ingredient-list|purchase-offers)' assets/offer-sections.css   # must be empty
```
