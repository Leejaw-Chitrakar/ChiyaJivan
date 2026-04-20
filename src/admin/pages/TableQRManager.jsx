import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  Download,
  Printer,
  Plus,
  Minus,
  Eye,
  X,
  Coffee,
} from "lucide-react";
import {
  getShopSettings,
  saveShopSettings,
  subscribeToShopSettings,
} from "../../lib/firestoreService";
import "../styles/TableQRManager.css";

const SITE_URL = "https://chiyajivan.web.app";

export default function TableQRManager() {
  const [tableCount, setTableCount] = useState(10);
  const [tableNames, setTableNames] = useState({});
  const [previewTable, setPreviewTable] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    async function loadSettings() {
      const settings = await getShopSettings();
      if (settings) {
        if (settings.tableCount) setTableCount(settings.tableCount);
        if (settings.tableNames) setTableNames(settings.tableNames);
      }
    }
    loadSettings();

    // Listen for real-time updates
    const unsubscribe = subscribeToShopSettings((settings) => {
      if (settings) {
        if (settings.tableCount) setTableCount(settings.tableCount);
        if (settings.tableNames) setTableNames(settings.tableNames);
      }
    });
    return () => unsubscribe();
  }, []);

  const updateTableCount = async (newCount) => {
    if (newCount < 1 || newCount > 100) return;
    setTableCount(newCount);
    setIsSyncing(true);
    try {
      await saveShopSettings({ tableCount: newCount });
    } catch (error) {
      console.error("Failed to sync table count:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateTableName = async (tableNum, newName) => {
    const updatedNames = { ...tableNames, [tableNum]: newName };
    setTableNames(updatedNames);
    setIsSyncing(true);
    try {
      await saveShopSettings({ tableNames: updatedNames });
    } catch (error) {
      console.error("Failed to sync table name:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  const getOrderUrl = (tableNum) => `${SITE_URL}/order?table=${tableNum}`;

  const handleDownloadSVG = (tableNum) => {
    const svg = document.getElementById(`qr-svg-${tableNum}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chiyajivan-table-${tableNum}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintAll = () => {
    const printWin = window.open("", "_blank");
    printWin.document.write(`
      <html>
        <head>
          <title>Chiya Jivan - Table QR Codes</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', system-ui, sans-serif; }
            .page { 
              page-break-after: always; 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              padding: 40px;
            }
            .page:last-child { page-break-after: avoid; }
            .card {
              border: 3px solid #3d2b1f;
              border-radius: 24px;
              padding: 48px 40px;
              text-align: center;
              max-width: 400px;
            }
            .brand { font-size: 14px; letter-spacing: 0.2em; text-transform: uppercase; color: #AD4928; font-weight: 700; margin-bottom: 8px; }
            .title { font-size: 36px; font-weight: 800; color: #3d2b1f; margin-bottom: 4px; }
            .subtitle { font-size: 14px; color: #9ca3af; margin-bottom: 32px; }
            .qr-wrap { display: inline-block; padding: 16px; border: 2px dashed #e5e7eb; border-radius: 16px; margin-bottom: 24px; }
            .instruction { font-size: 16px; color: #3d2b1f; font-weight: 600; }
            .url { font-size: 11px; color: #9ca3af; margin-top: 8px; word-break: break-all; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
    `);
    tables.forEach((t) => {
      const svgEl = document.getElementById(`qr-svg-${t}`);
      const svgMarkup = svgEl
        ? new XMLSerializer().serializeToString(svgEl)
        : "";
      const tableName = tableNames[t] || `Table ${t}`;
      printWin.document.write(`
        <div class="page">
          <div class="card">
            <p class="brand">☕ Chiya Jivan</p>
            <p class="title">${tableName}</p>
            <p class="subtitle">Scan to order from your phone</p>
            <div class="qr-wrap">${svgMarkup}</div>
            <p class="instruction">📱 Scan the QR code to view our menu and place your order</p>
            <p class="url">${getOrderUrl(t)}</p>
          </div>
        </div>
      `);
    });
    printWin.document.write("</body></html>");
    printWin.document.close();
    setTimeout(() => printWin.print(), 500);
  };

  return (
    <div className="qr-manager-container">
      {/* Header */}
      <div className="qr-header">
        <div>
          <h1 className="qr-title">Table QR Codes</h1>
        </div>
        <button onClick={handlePrintAll} className="qr-print-btn">
          <Printer size={18} />
          Print All QRs
        </button>
      </div>

      {/* Table Count Control */}
      <div className="qr-control-card">
        <div className="qr-control-header">
          <div className="qr-control-icon">
            <QrCode size={20} />
          </div>
          <div>
            <h2 className="qr-control-title">Number of Tables</h2>
            <p className="qr-control-desc">
              Set how many table QR codes to generate
            </p>
          </div>
        </div>
        <div className="qr-counter">
          <button
            onClick={() => updateTableCount(tableCount - 1)}
            className="qr-counter-btn"
            disabled={isSyncing || tableCount <= 1}
          >
            <Minus size={18} />
          </button>
          <span className="qr-counter-val">{tableCount}</span>
          <button
            onClick={() => updateTableCount(tableCount + 1)}
            className="qr-counter-btn"
            disabled={isSyncing || tableCount >= 100}
          >
            <Plus size={18} />
          </button>
          {isSyncing && <span className="qr-sync-indicator">Syncing...</span>}
        </div>
      </div>

      {/* QR Code Grid */}
      <div className="qr-grid" ref={printRef}>
        {tables.map((tableNum) => (
          <div key={tableNum} className="qr-table-card">
            {/* Header */}
            <p className="qr-table-brand">Chiya Jivan</p>
            <input
              type="text"
              value={tableNames[tableNum] || `Table ${tableNum}`}
              onChange={(e) => updateTableName(tableNum, e.target.value)}
              className="qr-table-input"
              placeholder={`Table ${tableNum}`}
            />

            {/* QR Code */}
            <div className="qr-svg-wrap">
              <QRCodeSVG
                id={`qr-svg-${tableNum}`}
                value={getOrderUrl(tableNum)}
                size={120}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#3d2b1f"
              />
            </div>

            {/* Actions */}
            <div className="qr-table-actions">
              <button
                onClick={() => setPreviewTable(tableNum)}
                className="qr-action-btn"
              >
                <Eye size={14} />
                Preview
              </button>
              <button
                onClick={() => handleDownloadSVG(tableNum)}
                className="qr-action-btn"
              >
                <Download size={14} />
                Save
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewTable && (
        <div className="qr-modal-overlay" onClick={() => setPreviewTable(null)}>
          <div
            className="qr-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewTable(null)}
              className="qr-modal-close"
            >
              <X size={18} />
            </button>

            <div className="qr-modal-logo">
              <Coffee size={18} className="text-[#AD4928]" />
              <p className="qr-modal-brand">Chiya Jivan</p>
            </div>
            <h3 className="qr-modal-title">
              {tableNames[previewTable] || `Table ${previewTable}`}
            </h3>
            <p className="qr-modal-desc">Scan to order from your phone</p>

            <div className="qr-modal-svg-wrap">
              <QRCodeSVG
                value={getOrderUrl(previewTable)}
                size={200}
                level="H"
                bgColor="#ffffff"
                fgColor="#3d2b1f"
              />
            </div>

            <p className="qr-modal-instruction">
              📱 Scan to view menu & place your order
            </p>
            <p className="qr-modal-url">{getOrderUrl(previewTable)}</p>

            <button
              onClick={() => handleDownloadSVG(previewTable)}
              className="qr-modal-btn"
            >
              <Download size={16} />
              Download QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
