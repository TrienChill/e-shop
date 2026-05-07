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

    if (!rpcError && matchedProducts && matchedProducts.length > 0) {
      productsContext = matchedProducts
        .map(
          (p: any) =>
            `- ${p.name} (ID: ${p.id}): Gia ${p.price} VND. Mo ta: ${p.description || "Khong co"}.`,
        )
        .join("\n");
      console.log(
        `[STEP 2 OK] Found ${matchedProducts.length} matching products.`,
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
        productsContext = fallbackProducts
          .map(
            (p: any) =>
              `- ${p.name} (ID: ${p.id}): Gia ${p.price} VND. Mo ta: ${p.description || "Khong co"}.`,
          )
          .join("\n");
      }
    }

    // --- RAG STEP 3: Gemini Chat response ---
    console.log("[STEP 3] Generating response...");
    const systemPrompt = `Ban la Stylist ao cua cua hang thoi trang E-Shop.
Hay tu van cho khach dua TREN NGU CANH SAU DAY:

DANH SACH SAN PHAM:
${productsContext}

QUY TAC:
1. CHI tu van nhung san pham co trong danh sach tren. TUYET DOI KHONG bia ra san pham.
2. Tra loi NGAN GON, SUC TICH, than thien.
3. Neu khong co san pham nao hop, hay xin loi va KHONG DUOC CHE THEM TEN SP.
4. Nho ghi chu 'VND' phia sau gia tien.`;

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
