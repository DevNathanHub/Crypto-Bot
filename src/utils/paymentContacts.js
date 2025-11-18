import { MOBILE_NUMBERS, DEFAULT_PAYMENT_COUNTRY } from '../config.js';

export function getMobileContact(countryCode = '') {
  const cc = (countryCode || DEFAULT_PAYMENT_COUNTRY || '').toUpperCase();
  switch (cc) {
    case 'KE':
    case 'KENYA':
      return { provider: 'mpesa', label: 'M-Pesa (Kenya)', number: MOBILE_NUMBERS.mpesa_ke };
    case 'UG':
    case 'UGANDA':
      return { provider: 'airtel', label: 'Airtel Money (Uganda)', number: MOBILE_NUMBERS.airtel_ug };
    case 'MW':
    case 'MALAWI':
      return { provider: 'airtel', label: 'Airtel Money (Malawi)', number: MOBILE_NUMBERS.airtel_mw };
    default:
      return getMobileContact(DEFAULT_PAYMENT_COUNTRY);
  }
}

export default { getMobileContact };
