import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Download, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    scanner: any;
  }
}

export default function WebScannerPage() {
  const navigate = useNavigate();
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Charger le CSS du scanner
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/scanner/scanner.css';
    document.head.appendChild(link);

    // Charger le JS du scanner
    const script = document.createElement('script');
    script.src = '/scanner/scanner.js';
    script.async = true;
    script.onload = () => {
      console.log('Scanner.js chargé avec succès');
      initializeScanner();
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  const initializeScanner = () => {
    if (window.scanner) {
      window.scanner.initialize();
    }
  };

  const handleScan = () => {
    setIsScanning(true);
    
    if (window.scanner) {
      window.scanner.scan(
        displayImagesOnPage,
        {
          output_settings: [
            {
              type: 'return-base64',
              format: 'jpg'
            }
          ]
        }
      );
    }
  };

  const displayImagesOnPage = (successful: boolean, mesg: string, response: any) => {
    setIsScanning(false);
    
    if (!successful) {
      console.error('Erreur de scan:', mesg);
      alert('Erreur: ' + mesg);
      return;
    }

    if (response && response.scannedImages && response.scannedImages.length > 0) {
      const images = response.scannedImages.map((img: any) => 
        'data:image/jpeg;base64,' + img.base64
      );
      setScannedImages(prev => [...prev, ...images]);
    }
  };

  const handleDownload = (imageData: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `scan_${index + 1}.jpg`;
    link.click();
  };

  const handleDelete = (index: number) => {
    setScannedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadAll = () => {
    scannedImages.forEach((img, i) => handleDownload(img, i));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Retour</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Scanner Professionnel</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              <Printer size={24} />
              {isScanning ? 'Scan en cours...' : 'Démarrer le scan'}
            </button>
            
            {scannedImages.length > 0 && (
              <button
                onClick={handleDownloadAll}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <Download size={20} />
                Tout télécharger
              </button>
            )}
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Instructions:</strong> Assurez-vous que votre scanner est connecté et allumé. 
              Cliquez sur "Démarrer le scan" pour numériser vos documents.
            </p>
          </div>
        </div>

        {/* Scanned Images Grid */}
        {scannedImages.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Documents scannés ({scannedImages.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scannedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-md border-2 border-gray-200 bg-gray-50">
                    <img
                      src={img}
                      alt={`Scan ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(img, index)}
                      className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                      title="Télécharger"
                    >
                      <Download size={18} className="text-green-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>

                  <div className="mt-2 text-center">
                    <span className="text-sm font-medium text-gray-600">
                      Document {index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {scannedImages.length === 0 && !isScanning && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Printer size={48} className="text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Aucun document scanné
              </h3>
              <p className="text-gray-600 mb-6">
                Connectez votre scanner et cliquez sur "Démarrer le scan" pour commencer.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
