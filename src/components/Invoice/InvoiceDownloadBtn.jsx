import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { FiDownload, FiLoader } from 'react-icons/fi';
import { InvoiceDocument } from './InvoiceDocument';
import { useStore } from '../../contexts/StoreContext';
import toast from 'react-hot-toast';

export const InvoiceDownloadBtn = ({ invoiceData, fileName, className = "btn btn-primary" }) => {
  const { shopSettings } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!invoiceData) {
      toast.error("Brak danych do wygenerowania faktury");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Przygotowywanie dokumentu PDF...");

   try {
      // Pobieramy nienaruszone dane prosto z InvoicesPage
      const finalData = {
        ...invoiceData,
        note: invoiceData.note, // JAWNE I SZTYWNE PRZEKAZANIE POLA UWAG
        seller: {
          name: shopSettings.name,
          address: shopSettings.address,
          nip: shopSettings.nip,
          bankAccount: shopSettings.bankAccount
        },
        dateIssue: invoiceData.dateIssue || new Date().toISOString().split('T')[0],
        dateSale: invoiceData.dateSale || invoiceData.date || invoiceData.date_sale || new Date().toISOString().split('T')[0],
        dueDate: invoiceData.dueDate || invoiceData.date || invoiceData.date_sale || new Date().toISOString().split('T')[0],
        paymentMethod: invoiceData.paymentMethod || invoiceData.payment_method || 'Przelew',
      };

      finalData.number = finalData.number || finalData.id || "B/N";

      // Renderowanie PDF bez zewnętrznych, psujących wszystko funkcji
      const blob = await pdf(<InvoiceDocument data={finalData} />).toBlob();

      const safeNumber = String(finalData.number).replace(/[\/\\?%*:|"<>]/g, '_');
      const isCorrection = finalData.documentType === 'correction' || finalData.type === 'correction';
      const filePrefix = isCorrection ? 'Korekta' : 'Faktura';
      const name = fileName || `${filePrefix}_${safeNumber}.pdf`;
      
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