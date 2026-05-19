import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Bot, User, GraduationCap, Brain, Briefcase } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Msg = { role: "user" | "assistant"; content: string };
type Mode = "beginner" | "technical" | "interview";

const SUGGESTIONS: Record<Mode, string[]> = {
  beginner: [
    "Explain p-values like I'm 5",
    "What does 'reject the null hypothesis' really mean?",
    "Why is α = 0.05 the usual threshold?",
  ],
  technical: [
    "Why use Welch's t-test instead of Student's?",
    "Explain the assumptions of one-way ANOVA",
    "Difference between Pearson and Spearman?",
  ],
  interview: [
    "Generate 5 viva questions on hypothesis testing",
    "Common interview questions about Type I and II errors",
    "How would you explain a p-value to a non-technical PM?",
  ],
};

export function AITutor({
  context, initiallyOpen = false,
}: { context?: string; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [mode, setMode] = useState<Mode>("beginner");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next = [...messages, { role: "user", content: t } as Msg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/ai-tutor`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context, mode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${err.error ?? "Error"}` }]);
        return;
      }
      // SSE stream parsing.
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch { /* skip non-JSON keepalives */ }
        }
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-20 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-primary to-accent px-5 py-3 text-sm font-medium text-primary-foreground shadow-2xl shadow-primary/40"
      >
        <Sparkles className="h-4 w-4" /> AI Tutor
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col glass border-l border-border"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold leading-none">Lab — AI Tutor</div>
                  <div className="text-xs text-muted-foreground">Powered by Lovable AI</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="border-b border-border px-3 py-2">
              <TabsList className="w-full">
                <TabsTrigger value="beginner" className="flex-1 gap-1"><GraduationCap className="h-3 w-3" /> Beginner</TabsTrigger>
                <TabsTrigger value="technical" className="flex-1 gap-1"><Brain className="h-3 w-3" /> Technical</TabsTrigger>
                <TabsTrigger value="interview" className="flex-1 gap-1"><Briefcase className="h-3 w-3" /> Interview</TabsTrigger>
              </TabsList>
            </Tabs>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ask me anything about your analysis, p-values, or statistics concepts.
                  </p>
                  {SUGGESTIONS[mode].map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-xl border border-border bg-card/50 px-3 py-2 text-left text-sm transition hover:bg-card hover:border-primary/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                    {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card/70 border border-border"}`}>
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 animate-pulse" /> Thinking…
                </div>
              )}
            </div>

            <form
              className="border-t border-border p-3"
              onSubmit={(e) => { e.preventDefault(); send(input); }}
            >
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  rows={2}
                  placeholder="Ask the tutor…"
                  className="flex-1 resize-none rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
