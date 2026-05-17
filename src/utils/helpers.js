import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

/**
 * Formatuje podaną kwotę na format walutowy (polski złoty).
 * @param {number} amount - Kwota w postaci liczbowej
 * @returns {string} Sformatowana wartość np. "150,00 zł"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(amount);
}

/**
 * Formatuje pełną datę do podstawowego zapisu dzień-miesiąc-rok.
 * @param {string|Date} date - Obiekt daty lub ciąg znaków (ISO)
 * @returns {string} Data w formacie "DD.MM.YYYY"
 */
export function formatDate(date) {
  if (!date) return '—';
  return format(new Date(date), 'dd.MM.yyyy', { locale: pl });
}

/**
 * Formatuje datę ze wskazaniem na dokładny czas (godziny i minuty).
 * @param {string|Date} date - Obiekt daty lub ciąg znaków
 * @returns {string} Data i czas w formacie "DD.MM.YYYY HH:mm"
 */
export function formatDateTime(date) {
  if (!date) return '—';
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: pl });
}

/**
 * Zwraca czas względny od podanej daty (np. "3 minuty temu").
 * @param {string|Date} date - Obiekt daty
 * @returns {string} Zlokalizowany czas względny (pl)
 */
export function formatTimeAgo(date) {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
}

/**
 * Zwraca samą godzinę z podanej daty.
 * @param {string|Date} date - Obiekt daty
 * @returns {string} Czas w formacie "HH:mm"
 */
export function formatTime(date) {
  if (!date) return '—';
  return format(new Date(date), 'HH:mm', { locale: pl });
}

/**
 * Generuje sformatowany numer ewidencyjny dokumentu magazynowego/handlowego.
 * @param {string} prefix - Przedrostek dokumentu (np. "FV", "WZ", "PZ")
 * @param {number} sequence - Kolejny numer w systemie
 * @returns {string} Numer np. "FV/2026/05/0014"
 */
export function generateDocNumber(prefix, sequence) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `${prefix}/${year}/${month}/${seq}`;
}

/**
 * Przycina ciąg znaków do wskazanej długości, dodając wielokropek.
 * @param {string} str - Tekst do skrócenia
 * @param {number} [maxLength=40] - Maksymalna dozwolona długość
 * @returns {string} Przycięty tekst
 */
export function truncate(str, maxLength = 40) {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str;
}

/**
 * Dynamicznie łączy nazwy klas CSS w jeden ciąg znaków (filtrując pustę argumenty).
 * @param {...string} classes - Lista klas do złączenia
 * @returns {string} Ciąg znaków z klasami CSS
 */
export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Optymalizator wydajności - Debounce.
 * Opóźnia wykonanie funkcji aż upłynie podany czas od ostatniego jej wywołania.
 * Idealne pod suwaki cenowe i inputy wyszukiwarek tekstowych.
 * 
 * @param {Function} fn - Funkcja do opóźnienia
 * @param {number} [delay=300] - Czas w milisekundach
 * @returns {Function} Funkcja odkładająca wykonanie w czasie
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Generuje wielkoliterowe inicjały z pełnego imienia i nazwiska.
 * Wykorzystywane główne na awatarach użytkowników.
 * @param {string} name - Imię i nazwisko (lub nazwa)
 * @returns {string} Dwuliterowe inicjały (np. "JK")
 */
export function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Oblicza wartość kwotową podatku VAT z podanej kwoty netto.
 * @param {number} netAmount - Kwota netto
 * @param {number} vatRate - Stawka podatku VAT (w %)
 * @returns {number} Wartość podatku
 */
export function calculateVAT(netAmount, vatRate) {
  return netAmount * (vatRate / 100);
}

/**
 * Zwraca całkowitą kwotę brutto na podstawie kwoty netto.
 * @param {number} netAmount - Kwota netto
 * @param {number} vatRate - Stawka podatku VAT (w %)
 * @returns {number} Całkowita kwota brutto
 */
export function calculateGrossFromNet(netAmount, vatRate) {
  return netAmount * (1 + vatRate / 100);
}

/**
 * Odwraca proces i wylicza kwotę netto ze znanej kwoty brutto.
 * @param {number} grossAmount - Kwota brutto
 * @param {number} vatRate - Stawka podatku VAT (w %)
 * @returns {number} Podstawowa kwota netto
 */
export function calculateNetFromGross(grossAmount, vatRate) {
  return grossAmount / (1 + vatRate / 100);
}

/**
 * Oblicza wskaźnik rentowności w stosunku do ceny sprzedaży (marżę procentową).
 * (Cena sprzedaży - Koszt) / Cena Sprzedaży
 * @param {number} sellPrice - Ustalona cena sprzedaży produktu
 * @param {number} purchasePrice - Koszt zakupu/nabycia
 * @returns {number} Marża w ujęciu procentowym
 */
export function calculateMargin(sellPrice, purchasePrice) {
  if (!purchasePrice || purchasePrice === 0) return 0;
  return ((sellPrice - purchasePrice) / sellPrice) * 100;
}

/**
 * Oblicza narzut procentowy względem kosztów zakupu produktu.
 * (Cena sprzedaży - Koszt) / Koszt
 * @param {number} sellPrice - Ustalona cena sprzedaży produktu
 * @param {number} purchasePrice - Koszt zakupu/nabycia
 * @returns {number} Narzut wyrażony w procentach
 */
export function calculateMarkup(sellPrice, purchasePrice) {
  if (!purchasePrice || purchasePrice === 0) return 0;
  return ((sellPrice - purchasePrice) / purchasePrice) * 100;
}
