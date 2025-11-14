import { useState, useCallback } from 'react';
import {
  FilePlus,
  FileText,
  Download,
  Trash2,
} from 'lucide-react';
import ScannerView from './ScannerView';
import EditView from './EditView';
import { jsPDF } from 'jspdf';

export interface ScannedPage {
  id: string;
  originalUri: string;
  processedUri: string;
  filterId: string;
}

const ScannerPage = () => {
  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [mode, setMode] = useState<'gallery' | 'scanning' | 'editing'>('gallery');
  const [pageToEdit, setPageToEdit] = useState<ScannedPage | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleScanComplete = useCallback((imageUri: string) => {
    const newPage: ScannedPage = {
      id: `page_${Date.now()}`,
      originalUri: imageUri,
      processedUri: imageUri, // Initialement, l'image traitée est la même
      filterId: 'magic', // Filtre par défaut
    };
    setPageToEdit(newPage);
    setMode('editing');
  }, []);

  const handleEditComplete = useCallback(
    (editedPage: ScannedPage) => {
      setScannedPages((prevPages) => {
        const existing = prevPages.find((p) => p.id === editedPage.id);
        if (existing) {
          return prevPages.map((p) => (p.id === editedPage.id ? editedPage : p));
        }
        return [...prevPages, editedPage];
      });
      setMode('gallery');
      setPageToEdit(null);
    },
    []
  );

  const handleCancel = useCallback(() => {
    setMode('gallery');
    setPageToEdit(null);
  }, []);

  const handleRemovePage = (id: string) => {
    setScannedPages((pages) => pages.filter((p) => p.id !== id));
  };

  const handleExportPDF = async () => {
    if (scannedPages.length === 0) {
      alert('Aucune page à exporter.');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      for (let i = 0; i < scannedPages.length; i++) {
        const page = scannedPages[i];
        const image = new Image();
        image.src = page.processedUri;
        // eslint-disable-next-line no-loop-func
        await new Promise((resolve) => {
          image.onload = () => {
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const imageRatio = image.width / image.height;
            const pageRatio = pageWidth / pageHeight;
            let imgWidth, imgHeight;

            if (imageRatio > pageRatio) {
              imgWidth = pageWidth;
              imgHeight = pageWidth / imageRatio;
            } else {
              imgHeight = pageHeight;
              imgWidth = pageHeight * imageRatio;
            }

            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            if (i > 0) {
              doc.addPage();
            }
            doc.addImage(image, 'JPEG', x, y, imgWidth, imgHeight);
            resolve(true);
          };
        });
      }
      doc.save(`Finality-Scan-${new Date().toLocaleDateString()}.pdf`);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Une erreur est survenue lors de la création du PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderGallery = () => (
    <div className="flex flex-col h-full bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-teal-600 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <FileText size={28} />
          <div>
            <h1 className="text-xl font-bold">Scanner Web Pro</h1>
            <p className="text-sm opacity-90">
              {scannedPages.length > 0
                ? `${scannedPages.length} page(s) prête(s)`
                : 'Aucun document scanné'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportPDF}
            disabled={isGeneratingPdf || scannedPages.length === 0}
            className="p-2 rounded-full bg-teal-700 hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Exporter en PDF"
          >
            {isGeneratingPdf ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Download size={20} />
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow p-4 overflow-y-auto">
        {scannedPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText size={80} className="text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600">Commencez à scanner</h2>
            <p className="text-gray-400 mt-2 max-w-xs">
              Cliquez sur le bouton ci-dessous pour numériser votre premier document.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {scannedPages.map((page, index) => (
              <div
                key={page.id}
                className="relative group bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200"
              >
                <img
                  src={page.processedUri}
                  alt={`Page ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                  <button
                    onClick={() => handleRemovePage(page.id)}
                    className="p-3 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all"
                    aria-label="Supprimer la page"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 bg-white px-2 py-1 text-xs font-semibold rounded-tr-lg">
                  Page {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={() => setMode('scanning')}
          className="w-full flex items-center justify-center space-x-3 bg-teal-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-teal-700 transition-transform transform hover:scale-105"
        >
          <FilePlus size={24} />
          <span>Nouveau Scan</span>
        </button>
      </footer>
    </div>
  );

  return (
    <div className="w-full h-screen font-sans">
      {mode === 'gallery' && renderGallery()}
      {mode === 'scanning' && (
        <ScannerView onScanComplete={handleScanComplete} onCancel={handleCancel} />
      )}
      {mode === 'editing' && pageToEdit && (
        <EditView page={pageToEdit} onComplete={handleEditComplete} onCancel={handleCancel} />
      )}
    </div>
  );
};

export default ScannerPage;