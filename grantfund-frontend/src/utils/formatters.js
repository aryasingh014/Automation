export const getCurrencySymbol = (currencyCode) => {
  const map = { USD: '$', INR: '$', EUR: '€', GBP: '£' };
  return map[currencyCode?.toUpperCase()] || '$';
};

export const formatGrantAmount = (input) => {
  try {
    if (input === null || input === undefined || input === '') {
      return { value: 0, currency: 'USD', symbol: '$', formatted: '$0.00', locale: 'en-US' };
    }

    let rawAmount = input.amount !== undefined ? input.amount : input;
    let currencyStr = input.currency?.toUpperCase() || 'USD';
    
    // Strict regex fallback to prevent Intl.NumberFormat from crashing the runtime
    let currency = /^[A-Z]{3}$/.test(currencyStr) ? currencyStr : 'USD';

    if (typeof rawAmount === 'string') {
      if (rawAmount.includes('$')) currency = 'INR';
      else if (rawAmount.includes('€')) currency = 'EUR';
      else if (rawAmount.includes('£')) currency = 'GBP';
      rawAmount = Number(rawAmount.replace(/[^0-9.-]+/g, ""));
    }

    const value = Number(rawAmount) || 0;
    const symbol = getCurrencySymbol(currency);
    const locale = currency === 'INR' ? 'en-IN' : (currency === 'EUR' ? 'de-DE' : 'en-US');

    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

    return { value, currency, symbol, formatted, locale };
  } catch (err) {
    console.error("Currency format error:", err);
    return { value: 0, currency: 'USD', symbol: '$', formatted: 'TBD', locale: 'en-US' };
  }
};
