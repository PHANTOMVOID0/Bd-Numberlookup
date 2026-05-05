/**
 * validators.js — Phone number validation helpers
 *
 * BD numbers:    11 digits starting with 01[3-9]
 * Intl numbers:  E.164 format  +[dialCode][number]
 *                or separate dialCode + localNumber
 */

/**
 * Normalise a Bangladeshi number to the canonical 11-digit 01XXXXXXXXX form.
 * Accepts:
 *   01XXXXXXXXX   (already correct)
 *   8801XXXXXXXXX (with country code, no +)
 *   +8801XXXXXXXXX
 *   1XXXXXXXXX    (missing leading 0)
 *
 * @param {string} raw
 * @returns {{ valid: boolean, normalized?: string, error?: string }}
 */
function validateBDNumber(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, error: 'Number is required.' };
  }

  // Strip whitespace, dashes, parentheses
  let n = raw.replace(/[\s\-().+]/g, '');

  // Remove country code prefix if present (880 or +880)
  if (n.startsWith('880')) n = n.slice(3);

  // Prepend 0 if someone passed 1XXXXXXXXX (10 digits starting with 1)
  if (n.length === 10 && n.startsWith('1')) n = '0' + n;

  // Validate final form: 11 digits, starts with 01[3-9]
  if (!/^01[3-9]\d{8}$/.test(n)) {
    return {
      valid: false,
      error: 'Invalid BD number. Must be 11 digits starting with 013–019.',
    };
  }

  return { valid: true, normalized: n };
}

/**
 * Validate international (non-BD) lookup parameters.
 * Two modes:
 *   1. e164 — full E.164 string like +14155552671
 *   2. dialCode + number — separate components
 *
 * @param {string} [e164]
 * @param {string} [dialCode]
 * @param {string} [number]
 * @returns {{ valid: boolean, mode?: 'e164'|'split', error?: string }}
 */
function validateIntlNumber({ e164, dialCode, number } = {}) {
  if (e164) {
    // E.164: starts with +, 7–15 digits total
    const cleaned = e164.replace(/[\s\-().]/g, '');
    if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
      return { valid: false, error: 'Invalid E.164 number. Expected format: +14155552671' };
    }
    return { valid: true, mode: 'e164', e164: cleaned };
  }

  if (dialCode && number) {
    const dc = String(dialCode).replace(/\D/g, '');
    const num = String(number).replace(/[\s\-().]/g, '');
    if (!/^\d{1,4}$/.test(dc)) {
      return { valid: false, error: 'Invalid dial code.' };
    }
    if (!/^\d{5,15}$/.test(num)) {
      return { valid: false, error: 'Invalid local number. Expected 5–15 digits.' };
    }
    return { valid: true, mode: 'split', dialCode: dc, number: num };
  }

  return { valid: false, error: 'Provide either e164 or dialCode + number.' };
}

module.exports = { validateBDNumber, validateIntlNumber };
