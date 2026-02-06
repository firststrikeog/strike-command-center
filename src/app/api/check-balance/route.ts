import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { walletAddress } = await req.json();
    
    // This tells the code to look into your .env.local file
    const rpcUrl = process.env.HELIUS_RPC_URL;
    const mintAddress = process.env.NEXT_PUBLIC_TOKEN_MINT;

    if (!rpcUrl) {
      return NextResponse.json({ error: "RPC URL not found in environment" }, { status: 500 });
    }

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'token-check',
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { mint: mintAddress },
          { encoding: 'jsonParsed' }
        ],
      }),
    });

    const data = await response.json();
    const accounts = data.result?.value || [];
    const balance = accounts.length > 0 
      ? accounts[0].account.data.parsed.info.tokenAmount.uiAmount 
      : 0;

    return NextResponse.json({ balance });

  } catch (error) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}