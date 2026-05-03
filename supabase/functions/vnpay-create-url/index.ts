/* eslint-disable */
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

async function hmacSha512(keyString: string, dataString: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  const data = encoder.encode(dataString);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    data
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatVnTime(date: Date) {
  // Convert to GMT+7
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 3600000 * 7);

  const yyyy = vnTime.getFullYear().toString();
  const MM = (vnTime.getMonth() + 1).toString().padStart(2, '0');
  const dd = vnTime.getDate().toString().padStart(2, '0');
  const HH = vnTime.getHours().toString().padStart(2, '0');
  const mm = vnTime.getMinutes().toString().padStart(2, '0');
  const ss = vnTime.getSeconds().toString().padStart(2, '0');
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

function sortObject(obj: Record<string, string | number>) {
  const sorted: Record<string, string> = {};
  const str = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (let i = 0; i < str.length; i++) {
    const key = str[i];
    const originalKey = decodeURIComponent(key);
    const val = obj[originalKey];
    sorted[key] = encodeURIComponent(String(val)).replace(/%20/g, "+");
  }
  return sorted;
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, amount, returnUrl } = await req.json();

    if (!orderId || !amount || !returnUrl) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: orderId, amount, returnUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tmnCode = Deno.env.get('VNP_TMN_CODE');
    const secretKey = Deno.env.get('VNP_HASH_SECRET');
    const vnpUrl = Deno.env.get('VNP_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    if (!tmnCode || !secretKey) {
      console.error('Missing VNPay environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get IP address from request or use default
    const ipAddr = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    
    // Ensure amount is integer and multiplied by 100
    const vnpAmount = Math.round(Number(amount) * 100);

    const rawParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(orderId),
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: vnpAmount,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: formatVnTime(new Date()),
    };

    const sortedParams = sortObject(rawParams);

    const signData = Object.entries(sortedParams)
      .map(([key, val]) => `${key}=${val}`)
      .join('&');

    const signed = await hmacSha512(secretKey, signData);

    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

    return new Response(JSON.stringify({ paymentUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error creating VNPay URL:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
