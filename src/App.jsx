import React, { useState, useRef, useEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';
import QrScanner from 'qr-scanner';
import { generateQRThemeWithAI } from './aiColorHelper'; 
import jsQR from 'jsqr'; 
import { doc, setDoc, onSnapshot } from "firebase/firestore"; // ✨ ดึงคำสั่งฐานข้อมูลมาใช้
import { db } from './firebase'; // ✨ นำเข้าฐานข้อมูลที่เราสร้างไว้

const qrCodeInstance = new QRCodeStyling({
  width: 280,
  height: 280,
  type: 'canvas',
  data: 'https://example.com',
  dotsOptions: { color: '#000000', type: 'rounded' },
  backgroundOptions: { color: '#ffffff' },
  cornersSquareOptions: { type: 'extra-rounded', color: '#000000' },
  cornersDotOptions: { type: 'dot', color: '#000000' }
});

export default function QrCodeGenerator() {
  const [activeTab, setActiveTab] = useState('generate');

  // ... (State เดิมของหน้า Generate) ...
  const [qrType, setQrType] = useState('url');
  const [qrValue, setQrValue] = useState('https://example.com');
  const [text, setText] = useState('https://example.com');
  const [phone, setPhone] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiEncryption, setWifiEncryption] = useState('WPA');
  const [vcardName, setVcardName] = useState('');
  const [vcardOrg, setVcardOrg] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');

  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [dotType, setDotType] = useState('rounded');
  const [cornerType, setCornerType] = useState('extra-rounded');
  const [cornerDotType, setCornerDotType] = useState('dot');
  const [isRainbow, setIsRainbow] = useState(false);
  const [qrSize, setQrSize] = useState(1024); // ✨ เพิ่ม state จัดการขนาดความละเอียด
  
  const [originalLogo, setOriginalLogo] = useState(null);
  const [logo, setLogo] = useState(null);
  const [logoShape, setLogoShape] = useState('square');
  const [hideBgDots, setHideBgDots] = useState(true);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // ✨ State สำหรับระบบเชื่อมต่อมือถือ (Sync Mode)
  const [syncRoomId, setSyncRoomId] = useState(null);
  const [isMobileSender, setIsMobileSender] = useState(false);
  const [desktopSyncQr, setDesktopSyncQr] = useState('');

  const qrRef = useRef(null);
  const syncQrRef = useRef(null); // สำหรับวาด QR ให้มือถือสแกน

  // ตรวจสอบ URL ว่ามีรหัสห้องส่งมาหรือไม่ (ถ้าเปิดจากมือถือ)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setSyncRoomId(room);
      setIsMobileSender(true);
      setActiveTab('scan'); // บังคับเข้าหน้าสแกนทันที
    }
  }, []);

  useEffect(() => {
    if (qrRef.current && activeTab === 'generate') {
      qrRef.current.innerHTML = '';
      qrCodeInstance.append(qrRef.current);
    }
  }, [activeTab]);

  useEffect(() => {
    if (qrType === 'url') setQrValue(text || ' ');
    else if (qrType === 'phone') setQrValue(`tel:${phone}`);
    else if (qrType === 'wifi') setQrValue(`WIFI:T:${wifiEncryption};S:${wifiSsid};P:${wifiPassword};;`);
    else if (qrType === 'vcard') setQrValue(`BEGIN:VCARD\nVERSION:3.0\nFN:${vcardName}\nORG:${vcardOrg}\nTEL:${vcardPhone}\nEND:VCARD`);
  }, [qrType, text, phone, wifiSsid, wifiPassword, wifiEncryption, vcardName, vcardOrg, vcardPhone]);

  useEffect(() => {
    if (logoShape === 'circle' || logoShape === 'rounded') setHideBgDots(false); 
    else setHideBgDots(true);
  }, [logoShape]);

  useEffect(() => {
    if (!originalLogo) { setLogo(null); return; }
    if (logoShape === 'square') { setLogo(originalLogo); return; }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const sx = (img.width - size) / 2; const sy = (img.height - size) / 2;

      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      
      if (logoShape === 'circle') {
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      } else if (logoShape === 'rounded') {
        const radius = size * 0.2;
        ctx.moveTo(radius, 0); ctx.lineTo(size - radius, 0); ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius); ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size); ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius); ctx.quadraticCurveTo(0, 0, radius, 0);
      }
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.clip();
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      setLogo(canvas.toDataURL('image/png'));
    };
    img.src = originalLogo;
  }, [originalLogo, logoShape]);

  useEffect(() => {
    qrCodeInstance.update({
      width: qrSize,   // ✨ เพิ่มการตั้งค่าความกว้างตามแถบเลื่อน
      height: qrSize,  // ✨ เพิ่มการตั้งค่าความสูงตามแถบเลื่อน
      data: qrValue,
      dotsOptions: isRainbow ? {
        type: dotType,
        gradient: {
          type: 'linear',
          rotation: 45,
          colorStops: [
            { offset: 0, color: '#ff0000' },
            { offset: 0.2, color: '#ff7f00' },
            { offset: 0.4, color: '#ffff00' },
            { offset: 0.6, color: '#00ff00' },
            { offset: 0.8, color: '#0000ff' },
            { offset: 1, color: '#8b00ff' }
          ]
        }
      }:{
        color: fgColor,
        type: dotType
      },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: { type: cornerType, color: fgColor },
      cornersDotOptions: { type: cornerDotType, color: fgColor },
      image: logo,
      imageOptions: { crossOrigin: 'anonymous', margin: hideBgDots ? 8 : 0, imageSize: 0.35, hideBackgroundDots: hideBgDots }
    });
}, [qrValue, fgColor, bgColor, dotType, cornerType, cornerDotType, logo, hideBgDots, isRainbow, qrSize]); // ✨ เพิ่ม qrSize เข้ามาในอาเรย์นี้
  const handleAIThemeClick = async () => {
    if (!aiPrompt) { alert('กรุณากรอกสไตล์ที่ต้องการก่อนครับ'); return; }
    setAiLoading(true);
    const theme = await generateQRThemeWithAI(aiPrompt);
    if (theme) {
      if (theme.fgColor) setFgColor(theme.fgColor);
      if (theme.bgColor) setBgColor(theme.bgColor);
      alert('✨ AI ออกแบบชุดสีให้เรียบร้อยแล้ว!');
    }
    setAiLoading(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { setOriginalLogo(event.target.result); setLogoShape('circle'); };
      reader.readAsDataURL(file);
    }
  };

  // ✨ อัปเกรดฟังก์ชันสำหรับ iPad และอุปกรณ์มือถือ
  const handleDownload = async (format) => {
    try {
      const blob = await qrCodeInstance.getRawData(format);
      const file = new File([blob], `qrcode-${qrType}.${format}`, { type: `image/${format}` });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'QR Code',
        });
      } else {
        qrCodeInstance.download({ name: `qrcode-${qrType}`, extension: format });
      }
    } catch (error) {
      console.warn("ไม่สามารถใช้เมนูแชร์ได้ จะสลับไปโหลดแบบปกติ:", error);
      qrCodeInstance.download({ name: `qrcode-${qrType}`, extension: format });
    }
  };

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('qrHistory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('qrHistory', JSON.stringify(history)); }, [history]);

  const addToHistory = () => {
    const newItem = { id: Date.now(), type: qrType, data: qrValue, date: new Date().toLocaleString('th-TH') };
    setHistory([newItem, ...history]);
    alert('บันทึกข้อมูลลงประวัติเรียบร้อยแล้ว!');
  };

  const deleteHistory = (id) => { if (window.confirm('ต้องการลบประวัตินี้ใช่หรือไม่?')) setHistory(history.filter(item => item.id !== id)); };

  // ==========================================
  // ส่วนสแกน QR Code (อัปเกรดระบบเชื่อมต่อข้ามจอ)
  // ==========================================
  const [scanResult, setScanResult] = useState('');
  const [scanError, setScanError] = useState('');
  const [isDragging, setIsDragging] = useState(false); 
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  // เริ่มระบบดักฟังข้อมูลจาก Firebase สำหรับฝั่งคอมพิวเตอร์
  const startDesktopSync = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8); // สุ่มรหัส 6 หลัก
    const syncUrl = `${window.location.origin}${window.location.pathname}?room=${newRoomId}`;
    
    setSyncRoomId(newRoomId);
    setDesktopSyncQr(syncUrl);
    setScanResult('');

    // วาด QR Code เชื่อมต่อให้มือถือสแกน
    setTimeout(() => {
      if (syncQrRef.current) {
        syncQrRef.current.innerHTML = '';
        new QRCodeStyling({
          width: 200, height: 200, data: syncUrl, dotsOptions: { color: '#2563eb', type: 'rounded' }
        }).append(syncQrRef.current);
      }
    }, 100);

    // 🔴 ดักฟังฐานข้อมูลห้องนี้ตลอดเวลา
    onSnapshot(doc(db, "qr_scans", newRoomId), (docSnapshot) => {
      if (docSnapshot.exists() && docSnapshot.data().result) {
        setScanResult(docSnapshot.data().result); // เอาข้อมูลที่ดึงมาโชว์บนหน้าจอคอม
        setDesktopSyncQr(''); // ปิด QR Code เชื่อมต่อ
      }
    });
  };

  // ฟังก์ชันสแกนสำเร็จ
  const handleScanSuccess = async (resultData) => {
    setScanResult(resultData);
    setScanError('');
    if (scannerRef.current) scannerRef.current.stop();

    // 🟢 ถ้าเป็นมือถือที่อยู่ในห้องเชื่อมต่อ ให้ส่งข้อมูลเข้า Firebase ด้วย
    if (isMobileSender && syncRoomId) {
      try {
        await setDoc(doc(db, "qr_scans", syncRoomId), { result: resultData, timestamp: Date.now() });
        alert('ส่งข้อมูลเข้าคอมพิวเตอร์สำเร็จ! ✅');
      } catch (err) {
        console.error("Firebase Error: ", err);
      }
    }
  };

  useEffect(() => {
    // ถ้าหน้าสแกนเปิดอยู่, ไม่ได้โชว์ผลลัพธ์, และไม่ได้กำลังรอคนสแกนเข้าห้อง
    if (activeTab === 'scan' && !scanResult && !desktopSyncQr) {
      const timer = setTimeout(() => {
        if (videoRef.current) {
          scannerRef.current = new QrScanner(
            videoRef.current,
            (result) => handleScanSuccess(result.data),
            { highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true }
          );
          scannerRef.current.start().catch((err) => console.warn('ไม่สามารถเข้าถึงกล้องได้:', err));
        }
      }, 200);
      return () => clearTimeout(timer);
    }
    return () => { if (scannerRef.current) { scannerRef.current.stop(); scannerRef.current.destroy(); } };
  }, [activeTab, scanResult, desktopSyncQr]);

  const processImageFile = async (file) => {
    if (!file) return;
    setScanError('🔍 กำลังวิเคราะห์และปรับแต่งรูปภาพขั้นสูง...');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = img.width; canvas.height = img.height;
        
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        let code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });

        if (!code) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.filter = 'grayscale(100%) contrast(300%) brightness(110%)';
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
        }

        if (code) {
          handleScanSuccess(code.data); // เรียกใช้ฟังก์ชันจัดการข้อมูล
        } else {
          setScanError('❌ ภาพอาจเบลอเกินไป ลองครอป (Crop) ตัดขอบให้เห็นแค่คิวอาร์โค้ดแล้วลากมาวางใหม่นะครับ');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const scanImageFile = (e) => processImageFile(e.target.files[0]);
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processImageFile(e.dataTransfer.files[0]); };
  const copyToClipboard = () => { navigator.clipboard.writeText(scanResult); alert('คัดลอกข้อความแล้ว!'); };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center py-10 px-6 font-sans">
      <div className="max-w-5xl w-full mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-6">QR Code Studio</h1>
        
        {/* ถ้าอยู่ในโหมดมือถือเป็นรีโมท จะซ่อนปุ่มเปลี่ยนแท็บ */}
        {!isMobileSender && (
          <div className="inline-flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button onClick={() => setActiveTab('generate')} className={`px-8 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'generate' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              สร้าง QR Code
            </button>
            <button onClick={() => { setActiveTab('scan'); setScanResult(''); setScanError(''); setDesktopSyncQr(''); }} className={`px-8 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'scan' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              สแกน QR Code
            </button>
          </div>
        )}
        {isMobileSender && (
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg animate-pulse inline-block">
            📱 โหมดสแกนเนอร์ส่งเข้าคอมพิวเตอร์
          </div>
        )}
      </div>
        {activeTab === 'generate' && (
          <div className="max-w-md mx-auto w-full mb-6">
            
            {/* ✨ เพิ่มแถบเลื่อนปรับขนาด QR Code ตรงนี้ */}
            <div className="mb-4 bg-slate-800 p-4 rounded-xl border border-slate-700 w-full text-left shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">ความละเอียดไฟล์ (Resolution)</label>
                <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded-md border border-blue-800">
                  {qrSize} x {qrSize} px
                </span>
              </div>
              <input
                type="range"
                min="300"
                max="2048"
                step="64"
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-2">
                *เลื่อนขวาเพื่อเพิ่มความคมชัดก่อนกดโหลดไฟล์ PNG
              </p>
            </div>

            <button
              onClick={() => setIsRainbow(!isRainbow)}
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all shadow-lg ${
                isRainbow 
                  ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 hover:opacity-90' 
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {isRainbow ? '🌈 ปิดโหมดสีรุ้ง (กลับไปใช้สีปกติ)' : '✨ เปิดโหมดสีรุ้งสุดเท่!'}
            </button>
          </div>
        )}
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-700 min-h-[500px]">
        
        {/* ... (เนื้อหาส่วนแท็บ Generate ซ่อนไว้ในโค้ดเดิมด้านบน ไม่มีการเปลี่ยนแปลง) ... */}
        {activeTab === 'generate' && !isMobileSender && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
             {/* ... โค้ดส่วน UI ของแท็บ Generate เหมือนเดิมทุกประการ ... */}
             <div className="space-y-6">
              
              <div className="flex flex-wrap gap-2 mb-4">
                {[ { id: 'url', label: 'ลิงก์ / ข้อความ' }, { id: 'phone', label: 'เบอร์โทร' }, { id: 'wifi', label: 'WiFi' }, { id: 'vcard', label: 'นามบัตร' } ].map((type) => (
                  <button key={type.id} onClick={() => setQrType(type.id)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${qrType === type.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="bg-slate-750 p-4 rounded-xl border border-slate-600 space-y-4">
                {qrType === 'url' && <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg outline-none" placeholder="https://..." />}
                {qrType === 'phone' && <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg outline-none" placeholder="เบอร์โทรศัพท์" />}
                {qrType === 'wifi' && (
                  <div className="space-y-4">
                    <input type="text" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg outline-none" placeholder="ชื่อ WiFi" />
                    <input type="password" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg outline-none" placeholder="รหัสผ่าน" />
                  </div>
                )}
                {qrType === 'vcard' && (
                  <div className="space-y-4">
                    <input type="text" value={vcardName} onChange={(e) => setVcardName(e.target.value)} className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg outline-none" placeholder="ชื่อ-นามสกุล" />
                    <input type="text" value={vcardOrg} onChange={(e) => setVcardOrg(e.target.value)} className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg outline-none" placeholder="องค์กร" />
                    <input type="tel" value={vcardPhone} onChange={(e) => setVcardPhone(e.target.value)} className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg outline-none" placeholder="เบอร์โทรศัพท์" />
                  </div>
                )}
              </div>

              {/* === ส่วนเพิ่มใหม่: AI ช่วยออกแบบธีมสี === */}
              <div className="bg-slate-700/40 p-4 rounded-xl border border-slate-600 space-y-3">
                <label className="block text-sm font-semibold text-white">
                  ✨ AI ช่วยออกแบบธีมสี QR Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="เช่น โทนสีมินิมอล ญี่ปุ่นๆ สำหรับร้านกาแฟ"
                    className="w-full px-3 py-2 bg-slate-700 text-white text-sm rounded-lg outline-none border border-slate-600"
                  />
                  <button
                    onClick={handleAIThemeClick}
                    disabled={aiLoading}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    {aiLoading ? 'กำลังคิด...' : 'ให้ AI จัดสีให้'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">สีคิวอาร์โค้ด</label>
                  <div className="flex gap-2">
                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="h-11 w-16 rounded cursor-pointer bg-slate-700 border-0 p-1" />
                    <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg outline-none border border-slate-600 uppercase" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">สีพื้นหลัง</label>
                  <div className="flex gap-2">
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-11 w-16 rounded cursor-pointer bg-slate-700 border-0 p-1" />
                    <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg outline-none border border-slate-600 uppercase" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-750 p-4 rounded-xl border border-slate-600 space-y-4">
                <h4 className="text-sm font-semibold text-white">🎨 ปรับแต่งลวดลาย QR Code</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">ลวดลายจุด</label>
                    <select value={dotType} onChange={(e) => setDotType(e.target.value)} className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 outline-none">
                      <option value="rounded">โค้งมน (Rounded)</option>
                      <option value="dots">จุดกลม (Dots)</option>
                      <option value="classy">คลาสสิก (Classy)</option>
                      <option value="square">สี่เหลี่ยม</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">กรอบมุมเล็ง</label>
                    <select value={cornerType} onChange={(e) => setCornerType(e.target.value)} className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 outline-none">
                      <option value="extra-rounded">มุมมนพิเศษ</option>
                      <option value="dot">มุมทรงกลม</option>
                      <option value="square">มุมสี่เหลี่ยม</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">จุดกึ่งกลางมุม</label>
                    <select value={cornerDotType} onChange={(e) => setCornerDotType(e.target.value)} className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 outline-none">
                      <option value="dot">จุดกลม</option>
                      <option value="square">จุดสี่เหลี่ยม</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* === เครื่องมือจัดการโลโก้ === */}
              <div className="bg-slate-750 p-4 rounded-xl border border-slate-600">
                <h4 className="text-sm font-semibold text-white mb-3">🖼️ อัปโหลดและตั้งค่าโลโก้</h4>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:bg-blue-600 file:text-white file:border-0 hover:file:bg-blue-500 cursor-pointer" />
                
                {originalLogo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-600">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">รูปทรงโลโก้</label>
                      <select value={logoShape} onChange={(e) => setLogoShape(e.target.value)} className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 outline-none focus:border-blue-500">
                        <option value="circle">วงกลม (Circle)</option>
                        <option value="rounded">ขอบมน (Rounded)</option>
                        <option value="square">สี่เหลี่ยม (Original)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">การจัดวางหลังโลโก้</label>
                      <label className="flex items-center space-x-2 mt-2 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input type="checkbox" checked={hideBgDots} onChange={(e) => setHideBgDots(e.target.checked)} className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-500 bg-slate-700 checked:border-blue-500 checked:bg-blue-600 transition-all" />
                          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                          </div>
                        </div>
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">เจาะช่องว่าง (ซ่อนลาย QR)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-slate-900 rounded-xl p-8 border border-slate-700 overflow-hidden">
              <div className="p-4 rounded-xl shadow-lg mb-8" style={{ backgroundColor: bgColor }}>
                {/* ✨ เพิ่มคลาส [&>canvas]:!max-w-full และ [&>canvas]:!h-auto ตรงนี้เพื่อไม่ให้ภาพทะลุจอ */}
                <div ref={qrRef} className="flex items-center justify-center [&>canvas]:!max-w-full [&>canvas]:!h-auto"></div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full mb-3">
                <button onClick={() => handleDownload('png')} className="py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors">🖼️ โหลด PNG</button>
                <button onClick={() => handleDownload('svg')} className="py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition-colors">✨ โหลด SVG</button>
              </div>
              <button onClick={addToHistory} className="py-3 bg-slate-750 text-slate-300 font-bold rounded-lg hover:bg-slate-700 hover:text-white w-full border border-slate-600 transition-colors">💾 บันทึกประวัติ</button>
            </div>
          </div>
        )}

        {/* UI ส่วนสแกนเนอร์ */}
        {activeTab === 'scan' && (
          <div className="flex flex-col items-center justify-center space-y-6">
            
            {/* โหมดแสดง QR Code ให้มือถือสแกนเข้าห้อง */}
            {desktopSyncQr && !scanResult && (
              <div className="flex flex-col items-center justify-center space-y-6 bg-slate-900 p-10 rounded-2xl border-2 border-blue-500 shadow-xl shadow-blue-900/20 w-full max-w-md text-center">
                <h3 className="text-xl font-bold text-white">📱 สแกนเพื่อเชื่อมต่อมือถือ</h3>
                <p className="text-slate-400 text-sm mb-4">หยิบโทรศัพท์ของคุณมาสแกน QR Code นี้<br/>เพื่อใช้กล้องมือถือสแกนบาร์โค้ดเข้าคอมพิวเตอร์</p>
                <div className="p-4 bg-white rounded-xl shadow-lg">
                  <div ref={syncQrRef}></div>
                </div>
                <div className="animate-pulse text-blue-400 font-semibold mt-4">⏳ กำลังรอรับข้อมูล...</div>
                <button onClick={() => setDesktopSyncQr('')} className="mt-4 px-6 py-2 text-slate-400 hover:text-white transition-colors underline">
                  ยกเลิก
                </button>
              </div>
            )}

            {/* โหมดสแกนปกติ หรือ โหมดมือถือ */}
            {!scanResult && !desktopSyncQr && (
              <div className="w-full max-w-lg space-y-6">
                {!isMobileSender && (
                  <button onClick={startDesktopSync} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    สแกนผ่านกล้องมือถือ (ไร้สาย)
                  </button>
                )}

                <div className="bg-black rounded-xl overflow-hidden shadow-lg border-2 border-slate-600 relative h-[350px] w-full flex items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted></video>
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center"><div className="w-56 h-56 border-2 border-blue-500 rounded-lg bg-black/10"></div></div>
                </div>
                
                <div 
                  className={`p-8 rounded-xl border-2 border-dashed transition-all text-center ${
                    isDragging ? 'border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20' : 'bg-slate-750 border-slate-600 hover:border-slate-500'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <p className="text-slate-200 mb-2 font-bold text-lg">📸 ลากรูปภาพมาวางที่นี่เพื่อสแกน</p>
                  <p className="text-slate-400 mb-6 text-sm">หรือกดปุ่มด้านล่างเพื่อเลือกไฟล์</p>
                  <label className="cursor-pointer inline-block">
                    <span className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg">เปิดเลือกไฟล์รูปภาพ</span>
                    <input type="file" accept="image/*" onChange={scanImageFile} className="hidden" />
                  </label>
                  {scanError && <div className="mt-6 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-400 text-sm font-medium">{scanError}</div>}
                </div>
              </div>
            )}

            {/* โหมดแสดงผลลัพธ์ */}
            {scanResult && (
              <div className="w-full max-w-2xl bg-slate-900 border border-green-500 p-8 rounded-xl text-center space-y-6 shadow-xl shadow-green-900/20">
                <h3 className="text-2xl font-bold text-white">✅ สแกนสำเร็จ!</h3>
                <div className="bg-slate-800 p-4 rounded-lg break-all text-slate-300 font-mono text-lg text-left shadow-inner">{scanResult}</div>
                <div className="flex flex-wrap gap-4 justify-center">
                  {(scanResult.startsWith('http://') || scanResult.startsWith('https://')) && (
                    <button onClick={() => window.open(scanResult, '_blank')} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors shadow-lg shadow-green-900/50">
                      🌐 เปิดลิงก์ทันที
                    </button>
                  )}
                  <button onClick={copyToClipboard} className="px-6 py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors">คัดลอกข้อความ</button>
                  <button onClick={() => { setScanResult(''); setScanError(''); }} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors">สแกนรูปอื่น</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}