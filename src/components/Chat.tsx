import { forwardRef, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const Chat = forwardRef<HTMLDivElement>((_props, ref) => {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Welcome to Novanexus. I am here to think alongside you — ask me anything, and we will resonate together.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last !== messages[messages.length - 1]) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted. Please add credits to your workspace.");
        } else {
          toast.error("Something went wrong. Please try again.");
        }
        setIsLoading(false);
        setMessages(next);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection lost. Please try again.");
      setMessages(next);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="chat" ref={ref} className="px-4 md:px-10 pb-32 md:pb-48 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <div className="ethereal-blur rounded-[2rem] overflow-hidden shadow-[var(--shadow-elegant)] flex flex-col h-[70vh] min-h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-aura-blue animate-pulse-glow" />
              <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Novanexus Core · Live
              </span>
            </div>
            <span className="font-serif italic text-sm text-muted-foreground hidden md:block">
              Synthesizing thought
            </span>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-4 md:gap-6 max-w-3xl ${
                  m.role === "user" ? "ml-auto flex-row-reverse text-right" : ""
                }`}
              >
                <div
                  className={`size-8 rounded-full shrink-0 mt-1 flex items-center justify-center text-xs font-serif italic ${
                    m.role === "user"
                      ? "border border-border bg-secondary text-muted-foreground"
                      : "bg-aura-blue/20 border border-aura-blue/30 text-aura-pink"
                  }`}
                >
                  {m.role === "user" ? "you" : "N"}
                </div>
                <div
                  className={`space-y-2 ${
                    m.role === "user" ? "text-foreground" : "text-foreground/90"
                  }`}
                >
                  <div className="prose prose-invert prose-sm md:prose-base max-w-none font-light leading-relaxed prose-p:my-2 prose-headings:font-serif prose-headings:font-normal prose-code:text-aura-blue prose-strong:text-foreground">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-4 max-w-3xl">
                <div className="size-8 rounded-full bg-aura-blue/20 border border-aura-blue/30 mt-1 animate-pulse-glow" />
                <div className="text-muted-foreground italic font-light text-sm pt-2">
                  Resonating…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 md:p-6 border-t border-border/40">
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Whisper into the void…"
                disabled={isLoading}
                className="w-full bg-secondary/40 border border-border rounded-2xl py-5 pl-6 pr-32 outline-none focus:border-aura-blue/40 focus:bg-secondary/60 transition-all duration-500 placeholder:text-muted-foreground/60 text-foreground font-light disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-aura-blue transition-colors disabled:opacity-40 disabled:hover:bg-foreground"
              >
                Send →
              </button>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mt-3 text-center">
              Powered by ChatGPT-class intelligence via Lovable AI
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});

Chat.displayName = "Chat";

export default Chat;
