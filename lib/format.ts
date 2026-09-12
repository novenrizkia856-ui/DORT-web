/**
 * Display formatting shared across the site.
 *
 * Addresses get shortened in more than one place. Keeping the rule here stops two parts of the
 * same page from disagreeing about how many characters to keep.
 */

/** `0x638a…e1f1`. Returns the input untouched if it is too short to be worth shortening. */
export const shortenAddress = (a: string): string =>
  a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
