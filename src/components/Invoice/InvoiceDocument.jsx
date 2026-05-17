import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { formatPDFCurrency } from '../../utils/invoiceUtils';

// Rejestracja fontu z obsługą polskich znaków (Roboto)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Roboto',
    fontSize: 9,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottom: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#000',
    marginBottom: 4,
  },
  section: {
    marginBottom: 20,
    flexDirection: 'row',
    gap: 40,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: 6,
    borderBottom: 1,
    borderBottomColor: '#eee',
    paddingBottom: 2,
  },
  partyBox: {
    flex: 1,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottom: 1,
    borderBottomColor: '#dee2e6',
    fontWeight: 700,
    padding: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 0.5,
    borderBottomColor: '#eee',
    padding: 6,
    alignItems: 'center',
  },
  summarySection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  summaryBox: {
    width: 200,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: 2,
    borderTopColor: '#000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 700,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTop: 0.5,
    borderTopColor: '#eee',
    paddingTop: 10,
  }
});

export const InvoiceDocument = ({ data }) => {
  if (!data) return null;

  return (
    <Document title={`Faktura_${data.number}`}>
      <Page size="A4" style={styles.page}>
        {/* NAGŁÓWEK */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Faktura VAT</Text>
            <Text>Nr: {data.number}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text>Data wystawienia: {data.dateIssue}</Text>
            <Text>Data sprzedaży: {data.dateSale}</Text>
            <Text>Miejsce wystawienia: {data.place || 'Warszawa'}</Text>
          </View>
        </View>

        {/* STRONY TRANSAKCJI */}
        <View style={styles.section}>
          <View style={styles.partyBox}>
            <Text style={styles.sectionTitle}>Sprzedawca</Text>
            <Text style={{ fontWeight: 700 }}>{data.seller?.name || '—'}</Text>
            <Text>{data.seller?.address || '—'}</Text>
            <Text>NIP: {data.seller?.nip || '—'}</Text>
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.sectionTitle}>Nabywca</Text>
            <Text style={{ fontWeight: 700 }}>{data.buyer?.name || data.customer || '—'}</Text>
            <Text>{data.buyer?.address || '—'}</Text>
            <Text>NIP: {data.buyer?.nip || data.nip || '—'}</Text>
          </View>
        </View>

        {/* TABELA POZYCJI */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ flex: 0.5 }}>Lp.</Text>
            <Text style={{ flex: 3 }}>Nazwa towaru / usługi</Text>
            <Text style={{ flex: 0.8, textAlign: 'center' }}>Ilość</Text>
            <Text style={{ flex: 1.2, textAlign: 'right' }}>Cena netto</Text>
            <Text style={{ flex: 0.8, textAlign: 'center' }}>VAT</Text>
            <Text style={{ flex: 1.5, textAlign: 'right' }}>Wartość brutto</Text>
          </View>

          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={{ flex: 0.5 }}>{index + 1}</Text>
              <Text style={{ flex: 3 }}>{item.name}</Text>
              <Text style={{ flex: 0.8, textAlign: 'center' }}>{item.qty} {item.unit || 'szt.'}</Text>
              <Text style={{ flex: 1.2, textAlign: 'right' }}>{formatPDFCurrency(item.unitPriceNet)}</Text>
              <Text style={{ flex: 0.8, textAlign: 'center' }}>{item.vatRate}%</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>{formatPDFCurrency(item.totalGross)}</Text>
            </View>
          ))}
        </View>

        {/* PODSUMOWANIE VAT (Tabela podatkowa) */}
        <View style={{ marginTop: 25, width: 250, alignSelf: 'flex-end' }}>
          <View style={[styles.tableHeader, { backgroundColor: '#f1f3f5' }]}>
            <Text style={{ flex: 1 }}>Stawka</Text>
            <Text style={{ flex: 1.5, textAlign: 'right' }}>Netto</Text>
            <Text style={{ flex: 1.5, textAlign: 'right' }}>VAT</Text>
            <Text style={{ flex: 1.5, textAlign: 'right' }}>Brutto</Text>
          </View>
          {data.vatSummary.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={{ flex: 1 }}>{row.rate}%</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>{formatPDFCurrency(row.net)}</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>{formatPDFCurrency(row.vat)}</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>{formatPDFCurrency(row.gross)}</Text>
            </View>
          ))}
        </View>

        {/* PODSUMOWANIE KOŃCOWE */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text>Razem netto:</Text>
              <Text>{formatPDFCurrency(data.totalNet)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Kwota VAT:</Text>
              <Text>{formatPDFCurrency(data.totalVat)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>DO ZAPŁATY:</Text>
              <Text>{formatPDFCurrency(data.totalGross)}</Text>
            </View>
            
            <View style={{ marginTop: 15, fontSize: 8 }}>
              <Text style={{ fontWeight: 700 }}>Metoda płatności: {data.paymentMethod}</Text>
              <Text>Termin płatności: {data.dueDate || data.dateIssue}</Text>
              {data.bankAccount && <Text>Konto: {data.bankAccount}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Wygenerowano automatycznie w systemie SklepXD</Text>
        </View>
      </Page>
    </Document>
  );
};
