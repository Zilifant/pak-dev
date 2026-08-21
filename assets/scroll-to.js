import { Component } from '@theme/component';
import { scrollIntoView } from '@theme/scrolling';

/**
 * Moves the page to another element rather than navigating away, for a call to action
 * that sends the customer further down the same page.
 *
 * The destination is the id in `data-scroll-target`, written by whichever section
 * rendered the button, so a merchant chooses a destination by name and never sees a
 * selector or a function.
 *
 * @extends {Component}
 */
class ScrollToComponent extends Component {
  /** Scrolls to the configured target, if it is on the page. */
  scrollToTarget() {
    const targetId = this.dataset.scrollTarget;
    if (!targetId) return;

    // The destination section can be removed from a template without the button that
    // points at it being updated, so a missing target leaves the page where it is
    // rather than throwing.
    const target = document.getElementById(targetId);
    if (!target) return;

    // `scrollIntoView` walks the scrolling ancestors, which matters here: above 990px
    // base.css makes `.page-wrapper` the scroll container rather than the document.
    scrollIntoView(target);
  }
}

if (!customElements.get('scroll-to-component')) {
  customElements.define('scroll-to-component', ScrollToComponent);
}
