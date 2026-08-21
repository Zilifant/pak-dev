import { Component } from '@theme/component';

/**
 * Pricing for a single offer / selling-plan combination. All money values are
 * pre-formatted by Liquid so this component never does currency math.
 *
 * @typedef {object} OfferPlanPricing
 * @property {number} cents - Order total in minor units, for gift threshold comparisons.
 * @property {string} total - Formatted order total.
 * @property {string} [compareAt] - Formatted compare-at total, when there is one.
 * @property {string} perUnit - Formatted price per unit (per tub).
 * @property {string} perDay - Formatted price per day.
 * @property {number} save - Whole-percent saving versus the reference price.
 *
 * @typedef {object} Offer
 * @property {number} id - 1-based position of the offer.
 * @property {number} variantId - The variant added to cart for this offer.
 * @property {number} quantity - The quantity added to cart for this offer.
 * @property {boolean} available - Whether the offer can be purchased.
 * @property {Record<string, OfferPlanPricing>} plans - Pricing keyed by `onetime` or selling plan id.
 *
 * @typedef {object} PurchaseOffersRefs
 * @property {HTMLScriptElement} offerData - JSON payload of every offer / plan combination.
 * @property {HTMLInputElement[]} [offerInputs] - The offer radios.
 * @property {HTMLInputElement[]} [planInputs] - The subscribe / one-time radios.
 * @property {HTMLElement[]} [cardSavings] - Per-card savings badges, in offer order.
 * @property {HTMLSelectElement} [frequency] - Delivery frequency select.
 * @property {HTMLElement} [frequencyField] - Wrapper toggled with the subscribe plan.
 * @property {HTMLElement} [summarySavings] - Headline savings line.
 * @property {HTMLElement} [summaryPerUnit] - Price per unit.
 * @property {HTMLElement} [summaryPerDay] - Price per day.
 * @property {HTMLElement} [summaryTotal] - Order total.
 * @property {HTMLElement} [summaryCompareAt] - Struck-through compare-at total.
 * @property {HTMLElement} [giftsNote] - Free gift heading, swapped per purchase type.
 * @property {HTMLElement[]} [gifts] - Free gift items, in threshold order.
 * @property {HTMLElement[]} [giftStatuses] - Visually hidden unlocked/locked text per gift.
 *
 * @extends {Component<PurchaseOffersRefs>}
 */
class PurchaseOffersComponent extends Component {
  requiredRefs = ['offerData'];

  /** @type {Offer[]} */
  #offers = [];

  connectedCallback() {
    super.connectedCallback();

    try {
      this.#offers = JSON.parse(this.refs.offerData.textContent || '[]');
    } catch (error) {
      console.warn('[purchase-offers] Could not parse offer pricing', error);
    }

    this.#update();
  }

  /** Handles a change to the offer (tub count) selection. */
  handleOfferChange() {
    this.#update();
  }

  /** Handles a change to the subscribe / one-time selection. */
  handlePlanChange() {
    this.#update();
  }

  /** @returns {Offer | undefined} The currently selected offer. */
  get #offer() {
    const checked = this.refs.offerInputs?.find((input) => input.checked);
    const id = Number(checked?.value);

    return this.#offers.find((offer) => offer.id === id) ?? this.#offers[0];
  }

  /**
   * The selected plan key: `onetime`, or a selling plan id. The frequency select
   * only narrows the key while a subscription plan is selected.
   *
   * @returns {string}
   */
  get #planKey() {
    // Subscription-only products render no purchase-type radios, so the server's
    // default plan — not `onetime` — is the fallback.
    const checked = this.refs.planInputs?.find((input) => input.checked);
    const plan = checked?.value ?? this.dataset.defaultPlan ?? 'onetime';

    if (plan === 'onetime') return plan;

    return this.refs.frequency?.value || plan;
  }

  /**
   * Money strings come from Liquid's `money` filters, which may contain currency
   * entities, so they are assigned as HTML like the theme's other price elements.
   *
   * @param {HTMLElement | undefined} element
   * @param {string | undefined} value
   */
  #setMoney(element, value) {
    if (!element) return;

    element.innerHTML = value ?? '';
    element.hidden = !value;
  }

  /**
   * Renders a `[savings]` template, hiding the element when there is nothing to save.
   *
   * @param {HTMLElement | undefined} element
   * @param {number} save
   */
  #setSavings(element, save) {
    if (!element) return;

    element.hidden = !save;
    if (!save) return;

    element.textContent = (element.dataset.template ?? '[savings]').replace('[savings]', String(save));
  }

  /** Syncs the cart inputs, the summary and every card with the current selection. */
  #update() {
    const offer = this.#offer;
    if (!offer) return;

    const planKey = this.#planKey;
    const isSubscription = planKey !== 'onetime';
    const pricing = offer.plans[planKey] ?? offer.plans.onetime;

    const variantInput = /** @type {HTMLInputElement | null} */ (this.querySelector('input[name="id"]'));
    const quantityInput = /** @type {HTMLInputElement | null} */ (this.querySelector('input[name="quantity"]'));
    const sellingPlanInput = /** @type {HTMLInputElement | null} */ (this.querySelector('input[name="selling_plan"]'));

    if (variantInput) variantInput.value = String(offer.variantId);
    if (quantityInput) quantityInput.value = String(offer.quantity);

    if (sellingPlanInput) {
      // A disabled input is omitted from FormData, which is how a one-time
      // purchase avoids sending an empty `selling_plan` to /cart/add.
      sellingPlanInput.value = isSubscription ? planKey : '';
      sellingPlanInput.disabled = !isSubscription;
    }

    const { frequencyField } = this.refs;
    if (frequencyField) frequencyField.hidden = !isSubscription;

    if (pricing) {
      this.#setMoney(this.refs.summaryTotal, pricing.total);
      this.#setMoney(this.refs.summaryPerUnit, pricing.perUnit);
      this.#setMoney(this.refs.summaryPerDay, pricing.perDay);
      this.#setMoney(this.refs.summaryCompareAt, pricing.compareAt);
      this.#setSavings(this.refs.summarySavings, pricing.save);
    }

    this.#updateGifts(pricing?.cents ?? 0, isSubscription);

    this.refs.cardSavings?.forEach((element) => {
      const cardOffer = this.#offers.find((item) => item.id === Number(element.dataset.offerId));
      const cardPricing = cardOffer && (cardOffer.plans[planKey] ?? cardOffer.plans.onetime);

      this.#setSavings(element, cardPricing?.save ?? 0);
    });

    this.#updateAddToCart(offer.available);
  }

  /**
   * Unlocks the free gifts the current selection qualifies for. Gifts are cumulative, so
   * every gift at or below the order total unlocks; a subscription-only gift additionally
   * requires a subscription.
   *
   * @param {number} cents - Order total in minor units.
   * @param {boolean} isSubscription
   */
  #updateGifts(cents, isSubscription) {
    const { giftsNote, gifts, giftStatuses } = this.refs;

    if (giftsNote) {
      const next = isSubscription ? giftsNote.dataset.subscriptionNote : giftsNote.dataset.oneTimeNote;
      if (next != null) giftsNote.textContent = next;
    }

    gifts?.forEach((gift, index) => {
      if (!(gift instanceof HTMLElement)) return;

      const threshold = Number(gift.dataset.threshold) || 0;
      const subscriptionOnly = gift.dataset.subscriptionOnly === 'true';
      const unlocked = cents >= threshold && (!subscriptionOnly || isSubscription);

      gift.dataset.unlocked = String(unlocked);

      const status = giftStatuses?.[index];
      if (status) {
        status.textContent = unlocked
          ? this.dataset.giftUnlockedLabel ?? ''
          : this.dataset.giftLockedLabel ?? '';
      }
    });
  }

  /**
   * Reflects the selected offer's availability on the submit button. The button is
   * updated directly rather than through `add-to-cart-component` so this works
   * before that element has been upgraded.
   *
   * @param {boolean} available
   */
  #updateAddToCart(available) {
    const button = /** @type {HTMLButtonElement | null} */ (this.querySelector('button[name="add"]'));
    const label = button?.querySelector('[data-cta-label]');
    if (!button || !label) return;

    button.disabled = !available;
    label.textContent = available
      ? this.dataset.addToCartText ?? label.textContent
      : this.dataset.soldOutText ?? label.textContent;
  }
}

if (!customElements.get('purchase-offers-component')) {
  customElements.define('purchase-offers-component', PurchaseOffersComponent);
}
