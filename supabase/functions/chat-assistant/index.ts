/* eslint-disable */
// @ts-nocheck

// Bỏ qua cảnh báo module unresolved của Node.js vì đây là Deno
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

// Retry logic for API calls
async function fetchWithRetry(url: string, options: any, maxRetries = 3, delayMs = 2000): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If rate limited (429) or server error (500-503), retry
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        const data = await response.json();
        const errorMessage = data.error?.message || `HTTP ${response.status}`;

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 2s, 4s, 8s
          const waitTime = delayMs * Math.pow(2, attempt);
          console.log(`API overloaded (${errorMessage}). Retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        throw new Error(`AI đang quá tải. Vui lòng thử lại sau vài giây.`);
      }

      return response;
    } catch (e) {
      lastError = e as Error;

      // If it's a network error, also retry
      if (attempt < maxRetries - 1) {
        const waitTime = delayMs * Math.pow(2, attempt);
        console.log(`Network error. Retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

serve(async (req: any) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history = [] } = await req.json()

    if (!message) {
      throw new Error('Message is required')
    }

    if (!GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY environment variable')
    }

    // 1. Fetch products context from Supabase (fallback context)
    const supabase = createClient(
      SUPABASE_URL ?? '',
      SUPABASE_ANON_KEY ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // --- RAG Step 1: Create Embedding for the user's question ---
    const embeddingResponse = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: {
            parts: [{ text: message }]
          }
        })
      }
    )

    const embeddingData = await embeddingResponse.json()

    if (!embeddingResponse.ok) {
      console.error('Embedding API Error:', embeddingData)
      throw new Error(embeddingData.error?.message || 'Failed to create embedding')
    }

    const queryEmbedding: number[] = embeddingData.embedding?.values || []

    if (queryEmbedding.length === 0) {
      throw new Error('Embedding vector is empty')
    }

    // --- RAG Step 2: Vector Search using pgvector via RPC ---
    const { data: matchedProducts, error: rpcError } = await supabase.rpc('match_products', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2,
      match_count: 5
    })

    if (rpcError) {
      console.error('RPC Error:', rpcError)
      // Fallback: fetch products normally if RPC fails
      const { data: fallbackProducts } = await supabase
        .from('products')
        .select('id, name, price, description')
        .limit(20)

      if (fallbackProducts) {
        const context = fallbackProducts.map((p: any) =>
          `- ${p.name} (ID: ${p.id}): Giá ${p.price} VNĐ. Mô tả: ${p.description || 'Không có'}.`
        ).join('\n')
        await generateAndRespond(supabase, message, history, context, GEMINI_API_KEY)
        return
      }
      throw new Error('Không thể tìm kiếm sản phẩm')
    }

    // --- RAG Step 3: Prepare Context from matched products ---
    let productsContext: string

    if (matchedProducts && matchedProducts.length > 0) {
      productsContext = matchedProducts.map((p: any) =>
        `- ${p.name} (ID: ${p.id}): Giá ${p.price} VNĐ. Mô tả: ${p.description || 'Không có'}.`
      ).join('\n')
    } else {
      // No products matched, fallback to all products
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, name, price, description')
        .limit(20)

      productsContext = allProducts && allProducts.length > 0
        ? allProducts.map((p: any) =>
          `- ${p.name} (ID: ${p.id}): Giá ${p.price} VNĐ. Mô tả: ${p.description || 'Không có'}.`
        ).join('\n')
        : 'Không có sản phẩm nào.'
    }

    // --- RAG Step 4 & 5: Generate response using Gemini Chat API ---
    const reply = await generateAndRespond(supabase, message, history, productsContext, GEMINI_API_KEY)

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Helper function to generate chat response via Gemini
async function generateAndRespond(
  supabase: any,
  message: string,
  history: any[],
  productsContext: string,
  apiKey: string
): Promise<string> {
  const systemPrompt = `Bạn là trợ lý ảo thân thiện và chuyên nghiệp của cửa hàng thời trang TrienChill E-Shop.
Hãy tư vấn dựa TRÊN NGỮ CẢNH SAU ĐÂY:

DANH SÁCH SẢN PHẨM:
${productsContext}

QUY TẮC QUAN TRỌNG:
1. CHỈ tư vấn những sản phẩm có trong danh sách trên. TUYỆT ĐỐI KHÔNG bịa ra sản phẩm không có.
2. Trả lời RẤT NGẮN GỌN, SÚC TÍCH (tối đa 3-4 câu).
3. Nếu khách hỏi sản phẩm không có, hãy xin lỗi và CHỈ GỢI Ý TỐI ĐA 2 sản phẩm khác tương tự có trong danh sách. KHÔNG liệt kê dài dòng.
4. Cung cấp thông tin giá cả rõ ràng (thêm 'VNĐ' vào sau giá).
5. Nếu danh sách sản phẩm trống, hãy thông báo cho khách hàng biết cửa hàng hiện chưa có sản phẩm nào.`

  // Convert history to Gemini format
  const geminiHistory = history.map((msg: any) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))

  const contents = [
    ...geminiHistory,
    { role: 'user', parts: [{ text: message }] }
  ]

  // Call Gemini Chat API
  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        }
      })
    }
  )

  const data = await response.json()

  if (!response.ok) {
    console.error('Gemini API Error:', data)
    throw new Error(data.error?.message || 'Failed to call Gemini API')
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.'
}
