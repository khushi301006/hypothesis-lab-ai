// AI Statistics Tutor — proxies chat to Lovable AI Gateway.
// Streams text back. Front-end posts { messages: [{role, content}], context? }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are "Lab", the friendly, accurate AI statistics tutor inside the Hypothesis Lab web app.
Your job is to explain hypothesis testing, p-values, confidence intervals, and the user's current analysis in
plain, encouraging language. When a structured ANALYSIS CONTEXT is provided, ground your answer in those exact
numbers (do not invent values). Default to beginner-friendly explanations with a short technical note at the end.
Use short paragraphs and bullet lists. Avoid overlong derivations.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI key missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];
    const context: string | undefined = body.context;
    const mode: string = body.mode ?? "beginner"; // beginner | technical | interview

    const system = `${SYSTEM}\nMode: ${mode}.${
      context ? `\n\nANALYSIS CONTEXT:\n${context}` : ""
    }`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text();
      if (upstream.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (upstream.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted — add credits in Workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: txt }), {
        status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
