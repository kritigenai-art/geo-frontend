// Derive currency symbol from DB currency string e.g. "Indian Rupee (INR)" → "₹"
export const getCurrencySymbol = (currencyStr) => {
  if (!currencyStr) return '₹';
  const map = {
    INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', AED: 'د.إ',
    SGD: 'S$', AUD: 'A$', CAD: 'C$', CHF: 'Fr', THB: '฿', MYR: 'RM', IDR: 'Rp',
    KRW: '₩', BRL: 'R$', MXN: '$', ZAR: 'R', TRY: '₺', SAR: '﷼', PKR: '₨',
    BDT: '৳', NPR: '₨', LKR: '₨', MMK: 'K', VND: '₫', PHP: '₱', HKD: 'HK$',
    NZD: 'NZ$', SEK: 'kr', NOK: 'kr', DKK: 'kr', RUB: '₽', PLN: 'zł',
  };
  const code = currencyStr.match(/\(([A-Z]{3})\)/)?.[1];
  return map[code] || code || '₹';
};

// Format minutes → "2h 30m" or "45m"
export const fmtTime = (mins) => {
  if (!mins || isNaN(mins)) return '--';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

export const getKM = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// Map star rating number to a price estimate
export const starToPrice = (star, priceRange) => {
  const match = priceRange?.match(/[\d,]+/);
  if (match) return parseInt(match[0].replace(/,/g, ""));
  const base = { 5: 8000, 4: 4500, 3: 2500, 2: 1500, 1: 950 };
  return base[star] || 1500;
};

export const starToTag = (star) => {
  if (star >= 5) return "Luxury";
  if (star >= 4) return "Premium";
  if (star >= 3) return "Value Stay";
  return "Budget";
};
