"use client";
import { useState, useEffect, useRef } from 'react';
import { Radar } from 'lucide-react';

export default function CommandCenter() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("SYSTEM READY");
  const [ticker, setTicker] = useState("LOADING BINANCE DATA...");
  const [logs, setLogs] = useState<{addr: string, balance: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- 1. GLOBAL LOAD (From Google Sheets) ---
  useEffect(() => {
    const fetchGlobalLogs = async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL!);
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        }
      } catch (e) {
        console.error("Failed to fetch global logs:", e);
      }
    };
    fetchGlobalLogs();
    // Refresh the global list every 30 seconds
    const interval = setInterval(fetchGlobalLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- 2. BINANCE TICKER (USDC PAIRS ONLY) ---
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbols=[%22BTCUSDC%22,%22SOLUSDC%22]");
        const data = await res.json();
        const tickerText = data.map((d: any) => `${d.symbol}: $${parseFloat(d.price).toLocaleString()}`).join(' | ');
        setTicker(`${tickerText} | ${tickerText} | ${tickerText}`);
      } catch (e) {}
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- 3. SELLER REMOVAL (Logic to prune the sheet) ---
  useEffect(() => {
    const verifyHolders = async () => {
      if (logs.length === 0) return;
      for (const log of logs) {
        try {
          const res = await fetch('/api/check-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: log.addr }),
          });
          const data = await res.json();
          
          // Inside runStrike...
if (data.balance >= 100000) {
  setStatus("STRIKE VERIFIED");
  
  // SEND TO GOOGLE SHEETS
  await fetch(process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL!, {
    method: 'POST',
    mode: 'no-cors', // <--- ADD THIS LINE
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ wallet: address, balance: data.balance }),
  });

  // This adds it to the UI immediately
  setLogs(prev => [{ addr: address, balance: data.balance }, ...prev]);
  setAddress("");
}
        } catch (e) {}
      }
    };
    const interval = setInterval(verifyHolders, 120000); // Check sellers every 2 mins
    return () => clearInterval(interval);
  }, [logs]);

  const triggerGlitch = () => {
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), 500);
  };

  const runStrike = async () => {
    if (!address) return;
    if (logs.some(l => l.addr.toLowerCase() === address.toLowerCase())) {
      setStatus("ALREADY LOGGED");
      return;
    }
    
    setLoading(true);
    setStatus("SCANNING BLOCKCHAIN...");
    
    try {
      // Step A: Check Balance via Helius
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

        // Step B: Send to Google Sheets (Global Save)
        await fetch(process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL!, {
          method: 'POST',
          body: JSON.stringify({ wallet: address, balance: data.balance }),
        });

        setLogs(prev => [{ addr: address, balance: data.balance }, ...prev]);
        setAddress("");
      } else {
        setStatus(`ACCESS DENIED: ${Math.floor(data.balance).toLocaleString()} TOKENS`);
      }
    } catch (e) {
      setStatus("CONNECTION ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-black text-[#00ffcc] font-mono min-h-screen flex flex-col overflow-hidden ${isGlitching ? 'glitch-bg' : ''}`}>
      <audio ref={audioRef} src="/ping.mp3" />
      
      {/* GLOBAL TICKER */}
      <div className="w-full bg-[#050505] border-b border-[#1a1a1a] h-[35px] flex items-center fixed top-0 left-0 z-50 overflow-hidden">
        <div className="whitespace-nowrap animate-marquee px-4 text-[11px] uppercase tracking-tighter">
          {ticker}
        </div>
      </div>

      <div className="flex flex-1 mt-[35px] h-[calc(100vh-35px)]">
        {/* LEFT: RADAR SECTION */}
        <div className="flex-[7] flex flex-col border-r-2 border-[#1a1a1a] bg-[radial-gradient(circle,_#001a14_0%,_#000_80%)] relative">
          <div className="absolute top-4 left-4 text-[10px] opacity-40">STRIKE_CMD_V1.0.4</div>
          
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className={`w-[280px] h-[280px] border border-[#00ffcc]/30 rounded-full relative mb-10 flex items-center justify-center`}>
               {/* Radar Sweep */}
               <div className="absolute inset-0 border-2 border-[#00ffcc] rounded-full opacity-10 scale-90"></div>
               <div className="absolute w-full h-[1px] bg-[#00ffcc]/40 top-1/2"></div>
               <div className="absolute h-full w-[1px] bg-[#00ffcc]/40 left-1/2"></div>
               <div className="absolute w-1/2 h-[2px] bg-gradient-to-r from-transparent to-[#00ffcc] top-1/2 left-1/2 origin-left animate-spin-slow"></div>
               <Radar size={48} className={`${loading ? 'animate-pulse' : ''} opacity-80`} />
            </div>
            
            <h2 className={`text-3xl font-black mb-2 tracking-[0.3em] uppercase ${isGlitching ? 'glitch-text' : ''}`}>
              Network Radar
            </h2>
            <div className={`mb-10 text-[12px] px-4 py-1 border border-[#00ffcc] ${loading ? 'animate-pulse bg-[#00ffcc] text-black' : ''}`}>
              {status}
            </div>

            <div className="flex flex-col gap-4 items-center">
              <input 
                type="text" 
                placeholder="INPUT AUTHENTICATION WALLET"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="bg-transparent border-b-2 border-[#00ffcc] text-white p-2 w-[400px] text-center outline-none focus:bg-[#00ffcc]/5 transition-all text-sm uppercase"
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

        {/* RIGHT: HIERARCHY LOG */}
        <div className="w-[400px] bg-[#050505] p-6 flex flex-col shadow-[inset_10px_0px_20px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-end border-b border-[#00ffcc] pb-2 mb-6">
            <h3 className="text-xl font-bold tracking-tighter">HIERARCHY</h3>
            <span className="text-[10px] text-black bg-[#00ffcc] px-2 mb-1">{logs.length} ACTIVE</span>
          </div>
          
          <div className="flex-grow overflow-y-auto space-y-1 custom-scrollbar">
            {logs.map((log, i) => (
              <div key={i} className="group flex justify-between items-center p-3 bg-[#111] border-l-2 border-[#ffcc00] hover:bg-[#1a1a1a] transition-all">
                <div>
                  <div className="text-[10px] text-[#ffcc00] font-bold">VERIFIED_HOLDER</div>
                  <div className="text-[13px] text-white font-mono">{log.addr.slice(0,8)}...{log.addr.slice(-6)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-black">{(log.balance/1000).toFixed(1)}K</div>
                  <div className="text-[9px] opacity-40">STRIKE_UNITS</div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="h-full flex items-center justify-center opacity-20 text-[10px] italic">
                WAITING FOR INBOUND SIGNALS...
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 25s linear infinite; }
        .animate-spin-slow { animation: rotate 3s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .glitch-bg { animation: flash 0.15s steps(2); }
        @keyframes flash { 0% { background: #00ffcc; } 50% { background: #ff003c; } 100% { background: #000; } }

        .glitch-text { animation: glitch 0.2s infinite; }
        @keyframes glitch {
          0% { transform: translate(2px, -2px); text-shadow: 2px 0 #ff003c; }
          50% { transform: translate(-2px, 2px); text-shadow: -2px 0 #00ffcc; }
          100% { transform: translate(0); }
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #050505; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; }
      `}</style>
    </div>
  );
}