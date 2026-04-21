import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
    if (!symbol || !/^[A-Z.\-]{1,10}$/.test(symbol)) {
      return new Response(JSON.stringify({ error: "Invalid symbol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    if (!apiKey) throw new Error("ALPHA_VANTAGE_API_KEY not configured");

    const r = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
    );
    const data = await r.json();
    const q = data["Global Quote"];

    if (!q || !q["01. symbol"]) {
      const note = data?.Note || data?.Information || "Symbol not found";
      return new Response(JSON.stringify({ error: note }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        symbol: q["01. symbol"],
        price: parseFloat(q["05. price"]),
        change: parseFloat(q["09. change"]),
        changePercent: q["10. change percent"],
        open: parseFloat(q["02. open"]),
        high: parseFloat(q["03. high"]),
        low: parseFloat(q["04. low"]),
        volume: parseInt(q["06. volume"]),
        latestDay: q["07. latest trading day"],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("stock-quote error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
