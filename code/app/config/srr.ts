// Operational limits and endpoints. Nothing here is hardcoded in JSX (DEC-08).
export const SRR_CONFIG = {
  /**
   * Bulk scope = ORDER (one selection = one whole order, every failed unit inside it is retried together).
   * Cap of 20 orders/run is a UI guard; DD-P2-004 TBD-01 (batch size limit) is still open.
   */
  BULK_ISSUE_LIMIT: 20,
  /** DEC-02 - default purchase-date window offered by the 購入日 filter. */
  DEFAULT_RANGE_DAYS: 30,
  /** Fixed 50 orders per page. One row = one order, so this is also 50 rows per page. */
  ORDERS_PER_PAGE: 50,
  /** DEC-03 */
  SEARCH_MIN_CHARS: 2,
  SEARCH_DEBOUNCE_MS: 300,
  /** DEC-05a - app-level fixed URL from config; empty string disables the button. */
  STARTRAIL_PORT_URL: process.env.STARTRAIL_PORT_URL ?? 'https://port.startrail.io/',
} as const;

export const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
