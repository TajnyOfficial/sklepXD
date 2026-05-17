/**
 * Narzędzia do obliczeń faktur VAT (zgodne z polskimi przepisami)
 */

export const calculateInvoiceData = (invoice) => {
  if (!invoice) return null;

  // Pobierz lub utwórz listę pozycji (niektóre stare dane mogą nie mieć .items)
  const sourceItems = invoice.items || [
    { 
      name: 'Towar/Usługa (zestawienie)', 
      qty: 1, 
      unitPriceNet: invoice.net || invoice.netto || 0, 
      vatRate: invoice.vat_rate || 23 
    }
  ];

  // 1. Oblicz wartości dla każdej pozycji
  const itemsWithTotals = sourceItems.map(item => {
    // Normalizacja nazw pól (obsługa różnych formatów z różnych stron)
    const qty = parseFloat(item.qty || item.quantity || 0);
    const unitPriceNet = parseFloat(item.unitPriceNet || item.price_net || item.price || 0);
    const vatRate = parseFloat(item.vatRate || item.vat_rate || 23);

    const net = qty * unitPriceNet;
    const vatValue = net * (vatRate / 100);
    const gross = net + vatValue;

    return {
      ...item,
      qty,
      unitPriceNet,
      vatRate,
      totalNet: net,
      vatValue: vatValue,
      totalGross: gross
    };
  });

  // 2. Grupowanie według stawek VAT (wymóg prawny w Polsce)
  const vatSummary = itemsWithTotals.reduce((acc, item) => {
    const rate = item.vatRate || 23;
    if (!acc[rate]) {
      acc[rate] = { rate, net: 0, vat: 0, gross: 0 };
    }
    acc[rate].net += item.totalNet;
    acc[rate].vat += item.vatValue;
    acc[rate].gross += item.totalGross;
    return acc;
  }, {});

  // 3. Sumy całkowite
  const totalNet = itemsWithTotals.reduce((sum, item) => sum + item.totalNet, 0);
  const totalVat = itemsWithTotals.reduce((sum, item) => sum + item.vatValue, 0);
  const totalGross = itemsWithTotals.reduce((sum, item) => sum + item.totalGross, 0);

  return {
    ...invoice,
    items: itemsWithTotals,
    vatSummary: Object.values(vatSummary).sort((a, b) => b.rate - a.rate),
    totalNet,
    totalVat,
    totalGross,
    totalGrossWords: "" // Można dodać funkcję kwoty słownie w przyszłości
  };
};

/**
 * Formatuje walutę dla PDF
 */
export const formatPDFCurrency = (val) => {
  return (val || 0).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' PLN';
};
