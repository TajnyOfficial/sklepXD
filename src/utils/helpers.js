import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export function formatCurrency(amount) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(amount);
}

export function formatDate(date) {
  if (!date) return '—';
  return format(new Date(date), 'dd.MM.yyyy', { locale: pl });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: pl });
}

export function formatTimeAgo(date) {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
}

export function formatTime(date) {
  if (!date) return '—';
  return format(new Date(date), 'HH:mm', { locale: pl });
}

export function generateDocNumber(prefix, sequence) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `${prefix}/${year}/${month}/${seq}`;
}

export function truncate(str, maxLength = 40) {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str;
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function calculateVAT(netAmount, vatRate) {
  return netAmount * (vatRate / 100);
}

export function calculateGrossFromNet(netAmount, vatRate) {
  return netAmount * (1 + vatRate / 100);
}

export function calculateNetFromGross(grossAmount, vatRate) {
  return grossAmount / (1 + vatRate / 100);
}

export function calculateMargin(sellPrice, purchasePrice) {
  if (!purchasePrice || purchasePrice === 0) return 0;
  return ((sellPrice - purchasePrice) / sellPrice) * 100;
}

export function calculateMarkup(sellPrice, purchasePrice) {
  if (!purchasePrice || purchasePrice === 0) return 0;
  return ((sellPrice - purchasePrice) / purchasePrice) * 100;
}
