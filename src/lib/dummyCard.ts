// Whitelist of well-known VISA TEST/DUMMY card numbers (no real PANs).
// These are publicly published test cards from payment gateways (Stripe, Adyen,
// Visa test suites). They will never authorize on a real network.
export const DUMMY_VISA_CARDS: string[] = [
  "4111111111111111", // Classic dummy VISA
  "4242424242424242", // Stripe test
  "4012888888881881", // Visa test
  "4222222222222",    // 13-digit Visa test
  "4000056655665556", // Stripe debit
  "4000002500003155", // Stripe 3DS
  "4000000000009995", // Stripe insufficient_funds
  "4000000000000002", // Stripe generic decline (still recognized as dummy)
  "4000000000000069", // Stripe expired
  "4000000000000119", // Stripe processing error
  "4000000000000127", // Stripe incorrect CVC
];

export const sanitizeCardNumber = (value: string) =>
  value.replace(/\D/g, "");

export const formatCardNumber = (value: string) => {
  const digits = sanitizeCardNumber(value).slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

// Luhn algorithm
const luhnValid = (num: string) => {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num.charAt(i), 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0 && num.length > 0;
};

export type CardValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export const validateDummyVisa = (
  rawNumber: string,
  expiry: string,
  cvv: string,
  name: string
): CardValidationResult => {
  const number = sanitizeCardNumber(rawNumber);

  if (!name.trim()) return { valid: false, reason: "Cardholder name is required." };
  if (!number) return { valid: false, reason: "Card number is required." };
  if (!number.startsWith("4")) {
    return { valid: false, reason: "Only VISA cards are accepted (must start with 4)." };
  }
  if (![13, 16, 19].includes(number.length)) {
    return { valid: false, reason: "Invalid VISA card number length." };
  }
  if (!luhnValid(number)) {
    return { valid: false, reason: "Card number failed validation (Luhn check)." };
  }
  if (!DUMMY_VISA_CARDS.includes(number)) {
    return {
      valid: false,
      reason:
        "This is a demo app — real cards are NOT accepted. Please use a dummy VISA test card (e.g. 4111 1111 1111 1111).",
    };
  }

  // Expiry: MM/YY
  const expMatch = expiry.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!expMatch) {
    return { valid: false, reason: "Expiry must be in MM/YY format." };
  }
  const month = parseInt(expMatch[1], 10);
  const year = 2000 + parseInt(expMatch[2], 10);
  if (month < 1 || month > 12) {
    return { valid: false, reason: "Invalid expiry month." };
  }
  const now = new Date();
  const expDate = new Date(year, month, 0, 23, 59, 59);
  if (expDate < now) {
    return { valid: false, reason: "Card has expired." };
  }

  if (!/^\d{3}$/.test(cvv)) {
    return { valid: false, reason: "CVV must be 3 digits." };
  }

  return { valid: true };
};

export const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};
