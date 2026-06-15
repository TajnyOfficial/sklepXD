// Szablon faktury VAT dla biblioteki @react-pdf/renderer
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { calculateLineItem, groupVatRates, calculateInvoiceTotals, formatPLN } from '../../utils/invoiceUtils';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Bold.ttf', fontWeight: 700 },
  ]
});

const PAYMENT_LABELS = {
  cash: 'Gotówka', card: 'Karta płatnicza', transfer: 'Przelew bankowy', credit: 'Kredyt',
};

const C = {
  dark: '#1e293b', accent: '#6366f1', muted: '#64748b',
  border: '#e2e8f0', bg: '#f8fafc', white: '#ffffff',
};

const s = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 9, color: C.dark, padding: '30 40 40 40', backgroundColor: C.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  logoBox: { width: 44, height: 44, backgroundColor: C.accent, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: C.white, fontSize: 20, fontWeight: 700 },
  invoiceTitle: { fontSize: 22, fontWeight: 700, color: C.dark, textAlign: 'right' },
  invoiceNumber: { fontSize: 10, color: C.muted, textAlign: 'right', marginTop: 4 },
  accentLine: { height: 3, backgroundColor: C.accent, marginBottom: 14, borderRadius: 2 },
  line: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  partiesRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  partyBox: { flex: 1, backgroundColor: C.bg, padding: '12 14', borderRadius: 6 },
  partyLabel: { fontSize: 7, color: C.accent, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  partyName: { fontSize: 10, fontWeight: 700, color: C.dark, marginBottom: 4 },
  partyText: { fontSize: 8, color: C.muted, marginBottom: 2 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metaBox: { flex: 1, padding: '8 10', backgroundColor: C.bg, borderRadius: 6 },
  metaLabel: { fontSize: 7, color: C.muted, marginBottom: 3 },
  metaValue: { fontSize: 9, fontWeight: 700 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.dark, padding: '6 8', borderRadius: 4 },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' },
  tableRowAlt: { backgroundColor: C.bg },
  thText: { color: C.white, fontSize: 7, fontWeight: 700 },
  tdText: { fontSize: 8, color: C.dark },
  tdMuted: { fontSize: 8, color: C.muted },
  totalBox: { backgroundColor: C.dark, padding: '14 16', borderRadius: 8, marginTop: 16, width: 200 },
  totalLabel: { fontSize: 8, color: '#94a3b8' },
  totalValue: { fontSize: 18, fontWeight: 700, color: C.white },
  totalSub: { fontSize: 8, color: '#94a3b8', marginTop: 4 },
  footer: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
  footerBox: { flex: 1, padding: '10 12', borderTopWidth: 2, borderTopColor: C.border, borderTopStyle: 'solid' },
  footerLabel: { fontSize: 7, color: C.muted, marginBottom: 4 },
  footerValue: { fontSize: 8, fontWeight: 700 },
  signBox: { flex: 1, padding: '10 12', borderTopWidth: 2, borderTopColor: C.border, borderTopStyle: 'solid', alignItems: 'center' },
  signLine: { marginTop: 20, height: 1, width: '100%', backgroundColor: C.border },
  signLabel: { fontSize: 7, color: C.muted, marginTop: 4 },
});

export default function InvoiceTemplate({ invoice }) {
  const items = invoice?.items || [];
  const lineItems = items.map(calculateLineItem);
  const vatGroups = groupVatRates(items);
  const totals = calculateInvoiceTotals(items);

  // Kolumny tabeli z szerokościami i justowaniem.
  const cols = [
    { w: '4%', hdr: 'Lp.', align: 'left' },
    { w: '30%', hdr: 'Nazwa', align: 'left' },
    { w: '8%', hdr: 'Ilość', align: 'right' },
    { w: '6%', hdr: 'Jed.', align: 'center' },
    { w: '14%', hdr: 'Cena netto', align: 'right' },
    { w: '7%', hdr: 'VAT', align: 'center' },
    { w: '14%', hdr: 'Wart. netto', align: 'right' },
    { w: '14%', hdr: 'Wart. brutto', align: 'right' },
  ];

  return (
    <Document title={`Faktura ${invoice?.id}`} author={invoice?.seller?.name} subject="Faktura VAT">
      <Page size="A4" style={s.page}>

        <View style={s.header}>
          <View style={s.logoBox}><Text style={s.logoText}>S</Text></View>
          <View>
            <Text style={s.invoiceTitle}>FAKTURA VAT</Text>
            <Text style={s.invoiceNumber}>{invoice?.id || 'Szkic'}</Text>
          </View>
        </View>
        <View style={s.accentLine} />

        <View style={s.partiesRow}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Sprzedawca</Text>
            <Text style={s.partyName}>{invoice?.seller?.name}</Text>
            <Text style={s.partyText}>{invoice?.seller?.address}</Text>
            <Text style={s.partyText}>NIP: {invoice?.seller?.nip}</Text>
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Nabywca</Text>
            <Text style={s.partyName}>{invoice?.buyer?.name}</Text>
            <Text style={s.partyText}>{invoice?.buyer?.address}</Text>
            {invoice?.buyer?.nip ? <Text style={s.partyText}>NIP: {invoice.buyer.nip}</Text> : null}
          </View>
        </View>

        <View style={s.metaRow}>
          {[
            ['Data wystawienia', invoice?.date_issue || invoice?.date],
            ['Data sprzedaży', invoice?.date_sale],
            ['Termin płatności', invoice?.date_due],
            ['Forma płatności', PAYMENT_LABELS[invoice?.payment_method] || invoice?.payment_method],
          ].map(([label, val]) => val ? (
            <View key={label} style={s.metaBox}>
              <Text style={s.metaLabel}>{label}</Text>
              <Text style={s.metaValue}>{val}</Text>
            </View>
          ) : null)}
        </View>

        <View style={s.tableHeader}>
          {cols.map(c => (
            <Text key={c.hdr} style={[s.thText, { width: c.w, textAlign: c.align }]}>{c.hdr}</Text>
          ))}
        </View>
        {lineItems.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tdMuted, { width: '4%' }]}>{i + 1}</Text>
            <Text style={[s.tdText, { width: '30%' }]}>{item.name}</Text>
            <Text style={[s.tdText, { width: '8%', textAlign: 'right' }]}>{item.qty}</Text>
            <Text style={[s.tdMuted, { width: '6%', textAlign: 'center' }]}>{item.unit}</Text>
            <Text style={[s.tdText, { width: '14%', textAlign: 'right' }]}>{formatPLN(parseFloat(item.price_net) || 0)}</Text>
            <Text style={[s.tdText, { width: '7%', textAlign: 'center' }]}>{item.vat_rate === 'zw' ? 'zw.' : `${item.vat_rate}%`}</Text>
            <Text style={[s.tdText, { width: '14%', textAlign: 'right' }]}>{formatPLN(item.totalNet)}</Text>
            <Text style={[s.tdText, { width: '14%', textAlign: 'right', fontWeight: 700 }]}>{formatPLN(item.totalGross)}</Text>
          </View>
        ))}

        <View style={s.line} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
              Podsumowanie stawek VAT
            </Text>
            <View style={[s.tableHeader, { padding: '5 8' }]}>
              {['Stawka', 'Netto', 'VAT', 'Brutto'].map(h => (
                <Text key={h} style={[s.thText, { flex: 1, textAlign: 'right' }]}>{h}</Text>
              ))}
            </View>
            {vatGroups.map((g, i) => (
              <View key={i} style={{ flexDirection: 'row', padding: '4 8', borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' }}>
                <Text style={{ flex: 1, fontSize: 8, fontWeight: 700 }}>{g.rate}</Text>
                <Text style={{ flex: 1, fontSize: 8, textAlign: 'right' }}>{formatPLN(g.net)}</Text>
                <Text style={{ flex: 1, fontSize: 8, textAlign: 'right' }}>{formatPLN(g.vat)}</Text>
                <Text style={{ flex: 1, fontSize: 8, textAlign: 'right', fontWeight: 700 }}>{formatPLN(g.gross)}</Text>
              </View>
            ))}
          </View>

          <View style={s.totalBox}>
            <Text style={s.totalLabel}>Do zapłaty</Text>
            <Text style={s.totalValue}>{formatPLN(totals.gross)}</Text>
            <Text style={s.totalSub}>w tym netto: {formatPLN(totals.net)}</Text>
            <Text style={s.totalSub}>w tym VAT:  {formatPLN(totals.vat)}</Text>
          </View>
        </View>

        {invoice?.seller?.bank && (
          <View style={{ marginTop: 14, padding: '10 12', backgroundColor: C.bg, borderRadius: 6 }}>
            <Text style={[s.partyLabel, { marginBottom: 4 }]}>Dane do przelewu</Text>
            <Text style={{ fontSize: 8, color: C.muted }}>{invoice.seller.bank}</Text>
            <Text style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>{invoice.seller.account}</Text>
          </View>
        )}

        <View style={s.footer}>
          <View style={s.footerBox}>
            <Text style={s.footerLabel}>Wystawił(a)</Text>
            <Text style={s.footerValue}>{invoice?.seller?.name}</Text>
          </View>
          <View style={s.signBox}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>Podpis osoby uprawnionej do wystawienia</Text>
          </View>
          <View style={s.signBox}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>Podpis osoby uprawnionej do odbioru</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
