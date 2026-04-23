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

    // 1. Fetch products context from Supabase
    const supabase = createClient(
      SUPABASE_URL ?? '',
      SUPABASE_ANON_KEY ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Lấy 50 sản phẩm để làm ngữ cảnh (có thể dùng pg_search sau này nếu kho lớn)
    const { data: products, error: dbError } = await supabase
      .from('products')
      .select('id, name, price, description, images')
      .limit(50)

    if (dbError) throw dbError

    // Format products list into a string
    const productsContext = products?.map((p: any) =>
      `- ${p.name} (ID: ${p.id}): Giá ${p.price} VNĐ. Mô tả: ${p.description || 'Không có'}.`
    ).join('\n') || 'Không có sản phẩm nào.'

    // 2. Build Prompt for Gemini
    const systemPrompt = `Bạn là trợ lý ảo thân thiện và chuyên nghiệp của cửa hàng thời trang TrienChill E-Shop.
Nhiệm vụ của bạn là tư vấn sản phẩm cho khách hàng dựa TRÊN DANH SÁCH SẢN PHẨM HIỆN CÓ CỦA CỬA HÀNG dưới đây:

DANH SÁCH SẢN PHẨM:
${productsContext}

QUY TẮC QUAN TRỌNG:
1. CHỈ tư vấn những sản phẩm có trong danh sách trên. TUYỆT ĐỐI KHÔNG bịa ra sản phẩm không có.
2. Trả lời RẤT NGẮN GỌN, SÚC TÍCH (tối đa 3-4 câu).
3. Nếu khách hỏi sản phẩm không có, hãy xin lỗi và CHỈ GỢI Ý TỐI ĐA 2 sản phẩm khác tương tự có trong danh sách. KHÔNG liệt kê dài dòng.
4. Cung cấp thông tin giá cả rõ ràng (thêm 'VNĐ' vào sau giá).`

    // Convert generic history to Gemini format
    const geminiHistory = history.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    const contents = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: message }] }
    ]

    // 3. Call Google Gemini API với retry (Sử dụng model gemini-1.5-flash)
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.'

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
