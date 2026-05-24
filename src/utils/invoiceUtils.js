/**
 * Moduł narzędziowy do kalkulacji faktur VAT (zgodnie z polskimi przepisami prawnymi).
 * 
 * Zastosowanie:
 * Zawiera logikę matematyczną i finansową niezbędną do przeliczania wartości netto/brutto
 * i grupowania ich na poprawne, wymagane w Polsce "podsumowania VAT" per stawka.
 */

/**
 * Przelicza pozycje faktury, dodaje wartości cząstkowe dla poszczególnych wierszy
 * i tworzy globalne podsumowanie wartości podzielone na poszczególne stawki VAT.
 * 
 * @param {Object} invoice - Zarys obiektu faktury z danymi nagłówkowymi
 * @param {Array} invoice.items - Lista surowych pozycji faktury (np. { qty, unitPriceNet, vatRate })
 * @returns {Object|null} Wzbogacony obiekt faktury zawierający `vatSummary` i globalne `total`
 */
export const calculateInvoiceData = (invoice) => {
  if (!invoice) return null;

  // Pobierz lub utwórz listę pozycji w przypadku pustego dokumentu (fallback awaryjny)
  const sourceItems = invoice.items || [
    { 
      name: 'Towar/Usługa (zestawienie)', 
      qty: 1, 
      unitPriceNet: invoice.net || invoice.netto || 0, 
      vatRate: invoice.vat_rate || 23 
    }
  ];

  // 1. Oblicz poszczególne wartości (netto, VAT, brutto) dla każdej pojedynczej pozycji na liście
  const itemsWithTotals = sourceItems.map(item => {
    // Normalizacja nazw pól ze względu na elastyczne nazewnictwo z różnych części backendu
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

  // 2. Grupowanie wartości według stawek VAT (obligatoryjny wymóg Ministerstwa Finansów w Polsce)
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

  // 3. Ostateczne sumy całkowite dla całego dokumentu
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
    totalGrossWords: "" // Pole rezerwowane na moduł parsowania kwot na ciąg słowny "tysiąc złotych zero groszy"
  };
};

/**
 * Formatuje liczbę do postaci walutowej przystosowanej pod widok do wydruku (PDF).
 * Wymusza wyświetlanie dwóch miejsc po przecinku bez względu na wartość zerową groszy.
 * 
 * @param {number} val - Wartość kwotowa
 * @returns {string} Sformatowany ciąg znaków, np. "1 500,00 PLN"
 */
export const formatPDFCurrency = (val) => {
  return (val || 0).toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' PLN';
};
