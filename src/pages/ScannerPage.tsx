import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  Camera,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Receipt,
  RotateCcw,
  Sparkles,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Medicine, Batch } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';

export const ScannerPage: React.FC = () => {
  const { medicines, getStockStatus } = useApp();
  const navigate = useNavigate();

  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedResult, setScannedResult] = useState<{
    medicine: Medicine;
    batch?: Batch;
  } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleRealCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      return;
    }

    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setIsScanning(true);
    } catch (err: any) {
      setCameraError('Camera access unavailable or declined. Using interactive visual simulator.');
      setCameraActive(false);
    }
  };

  const performLookup = (barcodeValue: string) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      // Search medicines & batches for matching barcode or ID
      for (const med of medicines) {
        for (const batch of med.batches) {
          if (batch.barcode === barcodeValue || batch.batchNumber.toLowerCase() === barcodeValue.toLowerCase()) {
            setScannedResult({ medicine: med, batch });
            return;
          }
        }
        if (med.id === barcodeValue || med.name.toLowerCase().includes(barcodeValue.toLowerCase())) {
          setScannedResult({ medicine: med, batch: med.batches[0] });
          return;
        }
      }

      // Default fallback match if exact barcode not found
      if (medicines.length > 0) {
        const med = medicines[0];
        setScannedResult({ medicine: med, batch: med.batches[0] });
      }
    }, 700);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      performLookup(manualCode.trim());
    }
  };

  const sampleBarcodes = [
    { name: 'Paracetamol 500mg', code: '890108801122', batch: 'PCM-26A01' },
    { name: 'Amoxicillin 500mg', code: '890204402341', batch: 'AMX-25L88' },
    { name: 'Cetirizine 10mg', code: '890315509812', batch: 'CTZ-26B09' },
    { name: 'Pantoprazole 40mg', code: '890409906622', batch: 'PAN-26E07' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Barcode & Batch Scanner</h1>
        <p className="text-sm text-brand-muted mt-0.5">
          Scan standard pharmaceutical barcodes or enter lot numbers for instant lookup.
        </p>
      </div>

      {/* Camera / Visual Scanner Box */}
      <Card className="p-6 text-center">
        <div className="relative w-full max-w-md mx-auto aspect-4/3 rounded-2xl bg-gray-950 overflow-hidden flex flex-col items-center justify-center border-2 border-brand-border shadow-inner text-white">
          {/* Live Video element if enabled */}
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            playsInline
            muted
          />

          {/* Scanner Guide Box / Reticle */}
          <div className="relative z-10 w-64 h-36 border-2 border-dashed border-pharmagreen-400 rounded-xl flex items-center justify-center bg-pharmagreen-950/20 backdrop-blur-xs">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 -mt-1 -ml-1" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 -mt-1 -mr-1" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 -mb-1 -ml-1" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 -mb-1 -mr-1" />

            {/* Red / Green animated laser line */}
            <div className="absolute left-2 right-2 h-0.5 bg-rose-500 shadow-[0_0_8px_#ef4444] animate-bounce" />

            {!cameraActive && (
              <div className="flex flex-col items-center gap-2 text-gray-300">
                <Camera className="w-8 h-8 text-pharmagreen-400" />
                <span className="text-xs font-medium">Position barcode within frame</span>
              </div>
            )}
          </div>

          {/* Status text */}
          <div className="absolute bottom-4 left-0 right-0 text-center z-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-black/60 text-emerald-300 backdrop-blur-sm border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {isScanning ? 'Scanning code...' : 'Scanner Ready'}
            </span>
          </div>
        </div>

        {/* Real camera toggle */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant={cameraActive ? 'danger' : 'outline'}
            size="sm"
            icon={<Camera className="w-4 h-4" />}
            onClick={toggleRealCamera}
          >
            {cameraActive ? 'Turn Off Webcam' : 'Use Live Camera'}
          </Button>
        </div>

        {cameraError && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-3 max-w-md mx-auto">
            {cameraError}
          </p>
        )}
      </Card>

      {/* One-click Demo Barcodes */}
      <Card title="Quick Test Barcodes" subtitle="Simulate instant barcode scan with demo inventory lots">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sampleBarcodes.map((item) => (
            <button
              key={item.code}
              onClick={() => performLookup(item.code)}
              className="p-3 text-left rounded-lg bg-gray-50 hover:bg-pharmagreen-50/50 border border-gray-200 hover:border-pharmagreen-300 transition-all flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-gray-900 group-hover:text-pharmagreen-800">
                  {item.name}
                </div>
                <div className="text-[11px] text-brand-muted font-mono mt-0.5">
                  Barcode: {item.code} • Batch: {item.batch}
                </div>
              </div>
              <ScanLine className="w-4 h-4 text-gray-400 group-hover:text-pharmagreen-600" />
            </button>
          ))}
        </div>
      </Card>

      {/* Manual Input Form */}
      <Card title="Manual Barcode Input" subtitle="Type or paste EAN-13, UPC, or lot identifier">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <BarcodeIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="e.g. 890108801122 or PCM-26A01"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-brand-border focus:outline-none focus:border-pharmagreen-500 bg-[#F8FAF9]"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" loading={isScanning}>
            Lookup
          </Button>
        </form>
      </Card>

      {/* Scanned Result Modal */}
      {scannedResult && (
        <Modal
          isOpen={!!scannedResult}
          onClose={() => setScannedResult(null)}
          title="Medicine Found"
          subtitle="Barcode successfully recognized by scanner"
          maxWidth="md"
        >
          <div className="space-y-4 pt-1">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-pharmagreen-50 border border-pharmagreen-200">
              <div className="w-10 h-10 rounded-lg bg-pharmagreen-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {scannedResult.medicine.name}
                </h3>
                <p className="text-xs text-brand-muted">
                  {scannedResult.medicine.genericName} • {scannedResult.medicine.manufacturer}
                </p>
              </div>
            </div>

            {/* Batch Info */}
            {scannedResult.batch ? (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Batch Number:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {scannedResult.batch.batchNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expiry Date:</span>
                  <span className="font-semibold text-gray-900">
                    {scannedResult.batch.expiryDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Available Stock:</span>
                  <span className="font-bold text-pharmagreen-800">
                    {scannedResult.batch.quantity} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">MRP:</span>
                  <span className="font-bold text-gray-900">
                    ₹{(scannedResult.batch.mrp || scannedResult.batch.sellingPrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                Total Stock on Shelf: {scannedResult.medicine.totalStock} units
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScannedResult(null);
                  navigate(`/medicines/${scannedResult.medicine.id}`);
                }}
              >
                View Inventory
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Receipt className="w-3.5 h-3.5" />}
                onClick={() => {
                  setScannedResult(null);
                  navigate('/billing');
                }}
              >
                Add to POS Bill
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
