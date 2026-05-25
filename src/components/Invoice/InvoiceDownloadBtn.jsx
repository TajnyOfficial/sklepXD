import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { FiDownload, FiLoader } from 'react-icons/fi';
import { InvoiceDocument } from './InvoiceDocument';
import { calculateInvoiceData } from '../../utils/invoiceUtils';
import { useStore } from '../../contexts/StoreContext';
import toast from 'react-hot-toast';

/* Komponent przycisku inicjujący asynchroniczne generowanie pliku PDF i wywołujący pobieranie u klienta w oparciu o bibliotekę file-saver */
export const InvoiceDownloadBtn = ({ invoiceData, fileName, className = "btn btn-primary" }) => {
  /* Dostęp do globalnego stanu pobierający ustawienia sklepu z bazowymi informacjami o sprzedawcy (NIP, adres itp.) */
  const { shopSettings } = useStore();
  
  /* Flaga stanu wskazująca czy aktualnie trwa renderowanie pliku (blokuje podwójne kliknięcie w przycisk pobierania) */
  const [isGenerating, setIsGenerating] = useState(false);

  /* Asynchroniczna funkcja przygotowująca obiekty z danymi, walidująca oraz renderująca dokument PDF do bloku BLOB */
  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!invoiceData) {
      toast.error("Brak danych do wygenerowania faktury");
      return;
    }

    // Walidacja podstawowa
    if (!invoiceData.buyer?.name || !invoiceData.items?.length) {
      toast.error("Dane faktury są niepełne (brak nabywcy lub pozycji)");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Przygotowywanie dokumentu PDF...");

    try {
      // Przygotowanie danych do obliczeń
      const rawData = {
        ...invoiceData,
        seller: {
          name: shopSettings.name,
          address: shopSettings.address,
          nip: shopSettings.nip,
          bankAccount: shopSettings.bankAccount
        },
        dateIssue: new Date().toISOString().split('T')[0], // zawsze dziś
        dateSale: invoiceData.dateSale || invoiceData.date || invoiceData.date_sale || new Date().toISOString().split('T')[0],
        dueDate: invoiceData.dateSale || invoiceData.date || invoiceData.date_sale || new Date().toISOString().split('T')[0], // termin = data sprzedaży
        paymentMethod: invoiceData.paymentMethod || invoiceData.payment_method || invoiceData.note || 'Przelew',
      };

      // 1. Przetwórz dane (obliczenia VAT)
      const finalData = calculateInvoiceData(rawData);
      if (!finalData) throw new Error("Błąd przetwarzania danych faktury");
      
      // Gwarancja numeru (niektóre moduły używają id zamiast number)
      finalData.number = finalData.number || finalData.id || "B/N";

      // 2. Generuj Blob (Leniwe renderowanie - tylko po kliknięciu)
      const blob = await pdf(<InvoiceDocument data={finalData} />).toBlob();

      // 3. Pobierz plik
      const safeNumber = String(finalData.number).replace(/[\/\\?%*:|"<>]/g, '_');
      const name = fileName || `Faktura_${safeNumber}.pdf`;
      saveAs(blob, name);

      toast.success("Faktura pobrana pomyślnie", { id: toastId });
    } catch (error) {
      console.error("PDF Gen Error:", error);
      toast.error("Błąd podczas generowania pliku PDF", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button 
      onClick={handleDownload} 
      disabled={isGenerating}
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      {isGenerating ? (
        <>
          <FiLoader className="animate-spin" />
          <span>Generowanie...</span>
        </>
      ) : (
        <>
          <FiDownload />
          <span>Pobierz PDF</span>
        </>
      )}
    </button>
  );
};
export default InvoiceDownloadBtn;
