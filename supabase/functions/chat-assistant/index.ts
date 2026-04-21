// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

serve(async (req) => {
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
    const productsContext = products?.map(p => 
      `- ${p.name} (ID: ${p.id}): Giá ${p.price} VNĐ. Mô tả: ${p.description || 'Không có'}.`
    ).join('\n') || 'Không có sản phẩm nào.'

    // 2. Build Prompt for Gemini
    const systemPrompt = `Bạn là trợ lý ảo thân thiện và chuyên nghiệp của cửa hàng thời trang TrienChill E-Shop.
Nhiệm vụ của bạn là tư vấn sản phẩm cho khách hàng dựa TRÊN DANH SÁCH SẢN PHẨM HIỆN CÓ CỦA CỬA HÀNG dưới đây:

DANH SÁCH SẢN PHẨM:
${productsContext}

QUY TẮC QUAN TRỌNG:
1. CHỈ tư vấn những sản phẩm có trong danh sách trên. TUYỆT ĐỐI KHÔNG bịa ra sản phẩm không có.
2. Trả lời ngắn gọn, thân thiện, và tự nhiên. 
3. Nếu khách hỏi sản phẩm không có, hãy xin lỗi và gợi ý một sản phẩm khác tương tự có trong danh sách.
4. Cung cấp thông tin giá cả rõ ràng (thêm 'VNĐ' vào sau giá).`

    // Construct Gemini messages payload
    // Gemini 1.5 expects contents array: { role: 'user' | 'model', parts: [{ text }] }
    
    // Convert generic history to Gemini format if provided. 
    // Format expected in history: [{ role: 'user' | 'assistant', content: string }]
    const geminiHistory = history.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    const contents = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: message }] }
    ]

    // 3. Call Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
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
          maxOutputTokens: 500,
        }
      })
    })

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
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
