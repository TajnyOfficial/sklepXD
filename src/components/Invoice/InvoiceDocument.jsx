import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Rejestracja fontu z obsługą polskich znaków
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

// Funkcja zamieniająca liczby na słowa
const kwotaSlownie = (kwota) => {
  if (!kwota || isNaN(kwota)) return 'zero PLN';
  const jednosci = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"];
  const nastki = ["", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"];
  const dziesiatki = ["", "dziesięć", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"];
  const setki = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"];
  const rzedy = [ ["", "", ""], ["tysiąc", "tysiące", "tysięcy"], ["milion", "miliony", "milionów"] ];

  let calkowite = Math.floor(kwota);
  const grosze = Math.round((kwota - calkowite) * 100);
  
  if (calkowite === 0) return `zero i ${grosze.toString().padStart(2, '0')}/100 PLN`;

  let slowa = [];
  let rzad = 0;

  while (calkowite > 0) {
    let reszta = calkowite % 1000;
    calkowite = Math.floor(calkowite / 1000);

    if (reszta > 0) {
      let s = setki[Math.floor(reszta / 100)];
      let d = 0;
      let j = 0;
      let reszta100 = reszta % 100;

      if (reszta100 >= 11 && reszta100 <= 19) {
        d = nastki[reszta100 - 10];
      } else {
        d = dziesiatki[Math.floor(reszta100 / 10)];
        j = jednosci[reszta100 % 10];
      }

      let czesc = [s, d, j].filter(x => x).join(" ");
      let formaRzedu = rzedy[rzad][2];
      if (reszta === 1) formaRzedu = rzedy[rzad][0];
      else if ((reszta % 10 >= 2 && reszta % 10 <= 4) && (reszta % 100 < 10 || reszta % 100 > 20)) formaRzedu = rzedy[rzad][1];

      slowa.unshift(`${czesc} ${formaRzedu}`.trim());
    }
    rzad++;
  }
  return `${slowa.join(" ")} i ${grosze.toString().padStart(2, '0')}/100 PLN`.trim();
};

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Roboto', fontSize: 8.5, color: '#000', lineHeight: 1.4 },
  topDate: { marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  logoBox: { flex: 1 },
  logoText: { fontSize: 24, fontWeight: 700, color: '#3b82f6', letterSpacing: 1 },
  infoBox: { width: 220 },
  infoTitle: { fontSize: 12, fontWeight: 700, marginBottom: 5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  partyCol: { width: '45%' },
  partyTitle: { fontSize: 10, fontWeight: 700, marginBottom: 5 },
  partyName: { fontWeight: 700, marginBottom: 2 },
  correctionBox: { marginBottom: 20, padding: 10, backgroundColor: '#fffbe6', borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' },
  table: { width: '100%', marginBottom: 20 },
  trHead: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#000', backgroundColor: '#f8f9fa', paddingVertical: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#e5e7eb', paddingVertical: 4 },
  col1: { width: '5%', textAlign: 'center' },
  col2: { width: '35%', paddingLeft: 4 },
  col3: { width: '8%', textAlign: 'center' },
  col4: { width: '12%', textAlign: 'right' },
  col5: { width: '12%', textAlign: 'right' },
  col6: { width: '8%', textAlign: 'center' },
  col7: { width: '10%', textAlign: 'right' },
  col8: { width: '10%', textAlign: 'right', paddingRight: 4 },
  summaryTable: { flexDirection: 'column', width: '100%', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#ccc' },
  sumTrHead: { flexDirection: 'row', backgroundColor: '#eee', borderBottomWidth: 1, borderColor: '#ccc' },
  sumTr: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#ccc' },
  sumTotalRow: { flexDirection: 'row', backgroundColor: '#e5e7eb', paddingVertical: 4, fontWeight: 700, borderBottomWidth: 1, borderColor: '#ccc' },
  sumCol1: { width: '20%', textAlign: 'left', padding: 5 }, 
  sumCol2: { width: '20%', textAlign: 'right', padding: 5 },
  sumCol3: { width: '20%', textAlign: 'center', padding: 5 },
  sumCol4: { width: '20%', textAlign: 'right', padding: 5 },
  sumCol5: { width: '20%', textAlign: 'right', padding: 5 },
  detailsRow: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderColor: '#eee' },
  detailsLabel: { width: '35%', textAlign: 'right', fontWeight: 700, paddingRight: 8 },
  detailsValue: { width: '65%', textAlign: 'right' },
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, paddingHorizontal: 20 },
  signBox: { width: 200, textAlign: 'center' },
  signLine: { borderTopWidth: 0.5, borderColor: '#000', marginTop: 40, paddingTop: 4 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderColor: '#000', paddingTop: 4, fontSize: 7 }
});

export const InvoiceDocument = ({ data }) => {
  if (!data) return null;

  const isCorrection = data.documentType === 'correction' || data.type === 'correction';
  const docTitle = isCorrection ? 'Faktura Korygująca nr' : 'Faktura VAT nr';

  // W 100% BEZPIECZNE GENEROWANIE PODSUMOWANIA
  const summaryObj = (data.items || []).reduce((acc, item) => {
    const rate = item.vatRate !== undefined && item.vatRate !== null ? String(item.vatRate) : '0';
    const net = parseFloat(item.unitPriceNet || item.price || 0) || 0;
    const qty = parseInt(item.qty || 1) || 1;
    const totalNet = net * qty;
    
    // Zabezpieczenie przed tekstem: ZW, OO, NP = vat 0
    const vatMultiplier = isNaN(parseFloat(rate)) ? 0 : parseFloat(rate) / 100;
    const totalVat = totalNet * vatMultiplier;
    
    if (!acc[rate]) acc[rate] = { rate, net: 0, vat: 0, gross: 0 };
    
    acc[rate].net += totalNet;
    acc[rate].vat += totalVat;
    acc[rate].gross += (totalNet + totalVat);
    
    return acc;
  }, {});
  
  const generatedVatSummary = Object.values(summaryObj);
  const invoiceGross = parseFloat(data.gross_amount || data.totalGross || data.gross || 0) || 0;
  const invoiceNet = parseFloat(data.net_amount || data.net || 0) || 0;
  const invoiceVat = parseFloat(data.vat_amount || data.vat || 0) || 0;

  return (
    <Document title={`${isCorrection ? 'Korekta' : 'Faktura'}_${data.number}`}>
      <Page size="A4" style={styles.page}>
        
        <View style={styles.topDate}>
          <Text>Wystawiono dnia: {data.dateIssue}, {data.place || 'Katowice'}</Text>
        </View>

        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>[{data.seller?.name || 'SklepXD.pl'}]</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{docTitle} {data.number}</Text>
            <View style={styles.infoRow}><Text>Data sprzedaży:</Text><Text>{data.dateSale}</Text></View>
            <View style={styles.infoRow}><Text>Sposób zapłaty:</Text><Text>{data.paymentMethod}</Text></View>
            <View style={styles.infoRow}><Text>Termin płatności:</Text><Text>{data.dueDate}</Text></View>
          </View>
        </View>

        {isCorrection ? (
          <View style={styles.correctionBox}>
            <Text style={{ fontWeight: 700, color: '#b45309', marginBottom: 4 }}>Dotyczy dokumentu: {data.correctedDocNumber}</Text>
            <Text>Przyczyna korekty: {data.correctionReason}</Text>
          </View>
        ) : null}

        <View style={styles.partiesRow}>
          <View style={styles.partyCol}>
            <Text style={styles.partyTitle}>Sprzedawca:</Text>
            <Text style={styles.partyName}>{data.seller?.name || '—'}</Text>
            <Text>{data.seller?.address || '—'}</Text>
            <Text>NIP: {data.seller?.nip || '—'}</Text>
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.partyTitle}>Nabywca:</Text>
            <Text style={styles.partyName}>{data.buyer?.name || data.customer || '—'}</Text>
            <Text>{data.buyer?.address || '—'}</Text>
            <Text>NIP: {data.buyer?.nip || data.nip || '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>POZYCJE FAKTURY</Text>
        <View style={styles.table}>
          <View style={styles.trHead}>
            <Text style={styles.col1}>LP</Text>
            <Text style={styles.col2}>Nazwa towaru/usługi</Text>
            <Text style={styles.col3}>Ilość</Text>
            <Text style={styles.col4}>Cena netto</Text>
            <Text style={styles.col5}>Wartość netto</Text>
            <Text style={styles.col6}>VAT</Text>
            <Text style={styles.col7}>Wartość VAT</Text>
            <Text style={styles.col8}>Wartość brutto</Text>
          </View>

          {(data.items || []).map((item, index) => {
            const itemNet = parseFloat(item.unitPriceNet || item.price || 0) || 0;
            const qty = parseInt(item.qty || 1) || 1;
            const totalNet = itemNet * qty;
            const rateStr = String(item.vatRate || '0');
            const vatMultiplier = isNaN(parseFloat(rateStr)) ? 0 : parseFloat(rateStr) / 100;
            const totalVat = totalNet * vatMultiplier;
            const itemGross = totalNet + totalVat;
            const vatLabel = isNaN(parseFloat(rateStr)) ? rateStr : `${rateStr}%`;

            return (
              <View key={index} style={styles.tr}>
                <Text style={styles.col1}>{index + 1}</Text>
                <Text style={styles.col2}>{item.name}</Text>
                <Text style={styles.col3}>{qty} {item.unit || 'szt.'}</Text>
                <Text style={styles.col4}>{itemNet.toFixed(2)}</Text>
                <Text style={styles.col5}>{totalNet.toFixed(2)}</Text>
                <Text style={styles.col6}>{vatLabel}</Text>
                <Text style={styles.col7}>{totalVat.toFixed(2)}</Text>
                <Text style={styles.col8}>{itemGross.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>PODSUMOWANIE WEDŁUG STAWEK VAT</Text>
        <View style={styles.summaryWrapper}>
          <View style={styles.summaryTable}>
            <View style={styles.sumTrHead}>
              <Text style={styles.sumCol1}>Stawka VAT</Text>
              <Text style={styles.sumCol2}>Wartość netto</Text>
              <Text style={styles.sumCol3}>VAT</Text>
              <Text style={styles.sumCol4}>Kwota VAT</Text>
              <Text style={styles.sumCol5}>Wartość brutto</Text>
            </View>

            {generatedVatSummary.map((group, i) => {
              const vatLabel = isNaN(parseFloat(group.rate)) ? group.rate : `${group.rate}%`;
              return (
                <View key={i} style={styles.sumTr}>
                  <Text style={styles.sumCol1}>Stawka {vatLabel}</Text>
                  <Text style={styles.sumCol2}>{group.net.toFixed(2)}</Text>
                  <Text style={styles.sumCol3}>{vatLabel}</Text>
                  <Text style={styles.sumCol4}>{group.vat.toFixed(2)}</Text>
                  <Text style={styles.sumCol5}>{group.gross.toFixed(2)}</Text>
                </View>
              );
            })}

            <View style={styles.sumTotalRow}>
              <Text style={styles.sumCol1}>Razem:</Text>
              <Text style={styles.sumCol2}>{invoiceNet.toFixed(2)}</Text>
              <Text style={styles.sumCol3}></Text>
              <Text style={styles.sumCol4}>{invoiceVat.toFixed(2)}</Text>
              <Text style={styles.sumCol5}>{invoiceGross.toFixed(2)}</Text>
            </View>

            <View style={[styles.detailsRow, { backgroundColor: '#e5e7eb', marginTop: 4 }]}>
              <Text style={styles.detailsLabel}>Razem do zapłaty:</Text>
              <Text style={[styles.detailsValue, { fontWeight: 700 }]}>{invoiceGross.toFixed(2)} PLN</Text>
            </View>
            <View style={[styles.detailsRow, { backgroundColor: '#f9fafb' }]}>
              <Text style={styles.detailsLabel}>Słownie:</Text>
              <Text style={styles.detailsValue}>{kwotaSlownie(invoiceGross)}</Text>
            </View>
            <View style={[styles.detailsRow, { backgroundColor: '#f9fafb' }]}>
              <Text style={styles.detailsLabel}>Konto bankowe:</Text>
              <Text style={styles.detailsValue}>{data.seller?.bankAccount || 'Brak danych konta'}</Text>
            </View>
            <View style={[styles.detailsRow, { backgroundColor: '#f9fafb' }]}>
              <Text style={styles.detailsLabel}>Uwagi:</Text>
              <Text style={[styles.detailsValue, data.note?.includes('Mechanizm podzielonej płatności') ? { fontWeight: 700, color: '#b45309' } : {}]}>
                {data.note || 'Prosimy o terminową wpłatę.'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text>Osoba upoważniona do otrzymania faktury</Text>
            <Text style={styles.signLine}></Text>
          </View>
          <View style={styles.signBox}>
            <Text>Osoba upoważniona do wystawienia faktury</Text>
            <Text style={styles.signLine}>{data.seller?.name || 'Właściciel'}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Druk: System SklepXD</Text>
          <Text>Dziękujemy za zakupy!</Text>
          <Text render={({ pageNumber, totalPages }) => (`Strona: ${pageNumber} / ${totalPages}`)} />
        </View>
        
      </Page>
    </Document>
  );
};