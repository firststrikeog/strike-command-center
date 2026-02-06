"use client";
import { useState, useEffect, useRef } from 'react';
import { Radar } from 'lucide-react';

export default function CommandCenter() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("SYSTEM READY");
  const [ticker, setTicker] = useState("CONNECTING TO BINANCE...");
  const [logs, setLogs] = useState<{addr: string, balance: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- 1. LOAD GLOBAL LIST FROM GOOGLE SHEETS ---
  useEffect(() => {
    const fetchGlobalLogs = async () => {
      try {
        const url = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
        if (!url) return;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        }
      } catch (e) {
        console.error("Global Sync Error:", e);
      }
    };
    fetchGlobalLogs();
    const interval = setInterval(fetchGlobalLogs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // --- 2. BINANCE TICKER (USDC PAIRS) ---
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbols=[%22BTCUSDC%22,%22SOLUSDC%22,%22ETHUSDC%22]");
        const data = await res.json();
        const tickerText = data.map((d: any) => `${d.symbol}: $${parseFloat(d.price).toLocaleString()}`).join(' | ');
        setTicker(`${tickerText} | ${tickerText} | ${tickerText}`);
      } catch (e) {}
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerGlitch = () => {
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), 500);
  };

  // --- 3. THE STRIKE LOGIC ---
  const runStrike = async () => {
    if (!address) return;
    
    // Prevent duplicate entries in current session
    if (logs.some(l => l.addr.toLowerCase() === address.toLowerCase())) {
      setStatus("SIGNAL ALREADY LOGGED");
      return;
    }
    
    setLoading(true);
    setStatus("PENETRATING BLOCKCHAIN...");
    
    try {
      // Step A: Check Balance via Helius (Your API Route)
      const res = await fetch('/api/check-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();

      if (data.balance >= 100000) {
        setStatus("STRIKE VERIFIED");
        triggerGlitch();
        if (audioRef.current) audioRef.current.play().catch(() => {});

        // Step B: Send to Google Sheets (Bypassing CORS with text/plain)
        const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;
        if (sheetUrl) {
          await fetch(sheetUrl, {
            method: 'POST',
            mode: 'no-cors', // Critical for Google Scripts
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ wallet: address, balance: data.balance }),
          });
        }

        // Add to the local UI immediately so the user sees it
        setLogs(prev => [{ addr: address, balance: data.balance }, ...prev]);
        setAddress("");
      } else {
        setStatus(`DENIED: ONLY ${Math.floor(data.balance).toLocaleString()} UNITS`);
      }
    } catch (e) {
      setStatus("ENCRYPTION ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-black text-[#00ffcc] font-mono min-h-screen flex flex-col overflow-hidden ${isGlitching ? 'glitch-bg' : ''}`}>
      <audio ref={audioRef} src="/ping.mp3" />
      
      {/* BINANCE TICKER */}
      <div className="w-full bg-[#050505] border-b border-[#1a1a1a] h-[35px] flex items-center fixed top-0 left-0 z-50 overflow-hidden">
        <div className="whitespace-nowrap animate-marquee px-4 text-[11px] uppercase tracking-tighter">
          {ticker}
        </div>
      </div>

      <div className="flex flex-1 mt-[35px] h-[calc(100vh-35px)]">
        {/* LEFT: RADAR COMMAND */}
        <div className="flex-[7] flex flex-col border-r-2 border-[#1a1a1a] bg-[radial-gradient(circle,_#001a14_0%,_#000_80%)] relative">
          <div className="absolute top-4 left-4 text-[10px] opacity-40">NODE_STATUS: ONLINE</div>
          
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="w-[280px] h-[280px] border border-[#00ffcc]/30 rounded-full relative mb-10 flex items-center justify-center">
               <div className="absolute inset-0 border-2 border-[#00ffcc] rounded-full opacity-10 scale-90"></div>
               <div className="absolute w-full h-[1px] bg-[#00ffcc]/40 top-1/2"></div>
               <div className="absolute h-full w-[1px] bg-[#00ffcc]/40 left-1/2"></div>
               <div className="absolute w-1/2 h-[2px] bg-gradient-to-r from-transparent to-[#00ffcc] top-1/2 left-1/2 origin-left animate-spin-slow"></div>
               <Radar size={48} className={`${loading ? 'animate-pulse' : ''} opacity-80`} />
            </div>
            
            <h2 className={`text-3xl font-black mb-2 tracking-[0.3em] uppercase ${isGlitching ? 'glitch-text' : ''}`}>
              Strike Radar
            </h2>
            <div className={`mb-10 text-[12px] px-6 py-1 border border-[#00ffcc] ${loading ? 'animate-pulse bg-[#00ffcc] text-black' : ''}`}>
              {status}
            </div>

            <div className="flex flex-col gap-4 items-center">
              <input 
                type="text" 
                placeholder="ENTER WALLET ADDRESS"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="bg-transparent border-b-2 border-[#00ffcc] text-white p-2 w-[400px] text-center outline-none focus:bg-[#00ffcc]/10 transition-all text-sm uppercase"
              />
              <button 
                onClick={runStrike}
                disabled={loading}
                className="group relative px-12 py-4 bg-transparent border-2 border-[#00ffcc] text-[#00ffcc] font-black overflow-hidden hover:text-black transition-colors"
              >
                <span className="relative z-10">INITIALIZE STRIKE</span>
                <div className="absolute inset-0 bg-[#00ffcc] translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: GLOBAL HIERARCHY */}
        <div className="w-[400px] bg-[#050505] p-6 flex flex-col">
          <div className="flex justify-between items-end border-b border-[#00ffcc] pb-2 mb-6">
            <h3 className="text-xl font-bold tracking-tighter uppercase">Hierarchy</h3>
            <span className="text-[10px] text-black bg-[#00ffcc] px-2 mb-1">{logs.length} DETECTED</span>
          </div>
          
          <div className="flex-grow overflow-y-auto space-y-1 custom-scrollbar">
            {logs.map((log, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-[#111] border-l-2 border-[#00ffcc] hover:bg-[#1a1a1a]">
                <div>
                  <div className="text-[10px] text-[#00ffcc] font-bold">VERIFIED_HOLDER</div>
                  <div className="text-[13px] text-white font-mono">{log.addr.slice(0,6)}...{log.addr.slice(-4)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-black">{Math.floor(log.balance / 1000)}K</div>
                  <div className="text-[9px] opacity-40 uppercase">Units</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 20s linear infinite; }
        .animate-spin-slow { animation: rotate 4s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .glitch-bg { animation: flash 0.1s steps(2); }
        @keyframes flash { 0% { background: #00ffcc22; } 50% { background: #000; } }
        .glitch-text { animation: glitch 0.2s infinite; }
        @keyframes glitch { 0% { transform: translate(1px); text-shadow: 1px 0 red; } 50% { transform: translate(-1px); text-shadow: -1px 0 blue; } }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #00ffcc; }
      `}</style>
    </div>
  );
}