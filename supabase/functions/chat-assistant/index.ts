/* eslint-disable */
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

serve(async (req: any) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_ANON_KEY ?? "", {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // --- RAG STEP 1: Create embedding using SDK ---
    console.log("[STEP 1] Creating embedding...");

    // ✅ ĐÃ SỬA THÀNH MODEL 3072 CHUẨN CỦA GOOGLE
    const embeddingModel = genAI.getGenerativeModel({
      model: "gemini-embedding-2",
    });

    const embeddingResult = await embeddingModel.embedContent(message);
    const queryEmbedding = embeddingResult.embedding.values;

    console.log(`[STEP 1 OK] Vector size: ${queryEmbedding.length}`);

    // --- RAG STEP 2: Vector search in Supabase ---
    console.log("[STEP 2] Searching products...");
    const { data: matchedProducts, error: rpcError } = await supabase.rpc(
      "match_products",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.2,
        match_count: 5,
      },
    );

    let productsContext = "Khong co san pham nao.";

    // Helper: fetch variants for a list of product IDs
    async function fetchVariantsForProducts(productIds: number[]) {
      const { data: variants } = await supabase
        .from("product_variants")
        .select("product_id, color, size, stock, price")
        .in("product_id", productIds)
        .gt("stock", 0)
        .order("product_id")
        .order("size");
      return variants || [];
    }

    // Helper: format product with variant info
    function formatProductWithVariants(p: any, variants: any[]) {
      const productVariants = variants.filter((v: any) => v.product_id === p.id);
      let variantInfo = "";
      if (productVariants.length > 0) {
        const sizes = [...new Set(productVariants.map((v: any) => v.size).filter(Boolean))];
        const colors = [...new Set(productVariants.map((v: any) => v.color).filter(Boolean))];
        const sizeStockDetails = productVariants
          .filter((v: any) => v.size)
          .map((v: any) => `${v.size}${v.color ? `(${v.color})` : ""}: con ${v.stock} sp`)
          .join(", ");
        
        if (sizes.length > 0) variantInfo += ` Size co san: ${sizes.join(", ")}.`;
        if (colors.length > 0) variantInfo += ` Mau sac: ${colors.join(", ")}.`;
        if (sizeStockDetails) variantInfo += ` Chi tiet ton kho: ${sizeStockDetails}.`;
      }
      return `- ${p.name} (ID: ${p.id}): Gia ${p.price} VND. Mo ta: ${p.description || "Khong co"}.${variantInfo}`;
    }

    if (!rpcError && matchedProducts && matchedProducts.length > 0) {
      // Fetch variants for all matched products
      const productIds = matchedProducts.map((p: any) => p.id);
      const allVariants = await fetchVariantsForProducts(productIds);
      
      productsContext = matchedProducts
        .map((p: any) => formatProductWithVariants(p, allVariants))
        .join("\n");
      console.log(
        `[STEP 2 OK] Found ${matchedProducts.length} matching products with ${allVariants.length} variants.`,
      );
    } else {
      console.log(
        "[STEP 2 WARNING] RPC error or no results, using fallback...",
      );
      const { data: fallbackProducts } = await supabase
        .from("products")
        .select("id, name, price, description")
        .eq("is_active", true)
        .limit(5);
      if (fallbackProducts && fallbackProducts.length > 0) {
        const fallbackIds = fallbackProducts.map((p: any) => p.id);
        const fallbackVariants = await fetchVariantsForProducts(fallbackIds);
        productsContext = fallbackProducts
          .map((p: any) => formatProductWithVariants(p, fallbackVariants))
          .join("\n");
      }
    }

    // --- RAG STEP 3: Gemini Chat response ---
    console.log("[STEP 3] Generating response...");
    const systemPrompt = `Ban la Stylist chuyen nghiep cua cua hang thoi trang E-Shop.
Hay tu van cho khach dua TREN NGU CANH SAU DAY:

DANH SACH SAN PHAM (bao gom size, mau sac, ton kho):
${productsContext}

BANG SIZE CHUAN (ap dung cho ao thun, ao polo, ao khoac nam/nu):
| Size | Chieu cao (cm) | Can nang (kg) | Rong nguc (cm) | Dai ao (cm) |
|------|---------------|--------------|----------------|-------------|
| S    | 155-162       | 45-55        | 86-90          | 65-67       |
| M    | 160-168       | 55-63        | 90-94          | 67-69       |
| L    | 165-173       | 63-72        | 94-98          | 69-71       |
| XL   | 170-178       | 72-82        | 98-102         | 71-73       |
| 2XL  | 175-183       | 82-90        | 102-106        | 73-75       |
| 3XL  | 178-188       | 90-100       | 106-112        | 75-78       |

BANG SIZE QUAN NAM:
| Size | Chieu cao (cm) | Can nang (kg) | Vong eo (cm) | Vong mong (cm) |
|------|---------------|--------------|-------------|---------------|
| S    | 155-162       | 45-55        | 68-72       | 86-90         |
| M    | 160-168       | 55-63        | 72-76       | 90-94         |
| L    | 165-173       | 63-72        | 76-82       | 94-98         |
| XL   | 170-178       | 72-82        | 82-88       | 98-102        |
| 2XL  | 175-183       | 82-90        | 88-94       | 102-106       |

QUY TAC:
1. CHI tu van nhung san pham co trong danh sach tren. TUYET DOI KHONG bia ra san pham.
2. Tra loi NGAN GON, SUC TICH, than thien, dung tieng Viet co dau.
3. Neu khong co san pham nao hop, hay xin loi va KHONG DUOC CHE THEM TEN SP.
4. Nho ghi chu 'VND' phia sau gia tien.
5. Khi khach hoi ve size, HAY DUNG BANG SIZE CHUAN o tren de tu van cu the. Ket hop chieu cao + can nang de goi y size phu hop nhat.
6. Neu san pham co nhieu size, hay kiem tra size nao CON HANG (stock > 0) truoc khi goi y.
7. Neu khach cho so do cu the (nguc, eo, mong), uu tien dung so do do de tu van chinh xac hon.`;

    let formattedHistory = history.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // 🚀 FIX LỖI GEMINI: Đảm bảo lịch sử luôn bắt đầu bằng 'user'
    // Nếu tin nhắn đầu tiên là của AI (model), ta sẽ xóa nó đi cho đến khi gặp tin nhắn của user
    while (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
      formattedHistory.shift();
    }

    const chatModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const chatSession = chatModel.startChat({
      history: formattedHistory,
      generationConfig: { temperature: 0.7 },
    });

    const result = await chatSession.sendMessage(message);
    const reply = result.response.text();

    console.log("[STEP 3 OK] Response generated successfully!");

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[UNCAUGHT ERROR]", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
