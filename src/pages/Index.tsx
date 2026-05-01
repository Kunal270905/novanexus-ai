import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Plus, MessageSquare, Sparkles, PanelLeft, Send, Lightbulb, Code2, BookOpen, Wand2, MoreHorizontal, Pencil, Trash2, Check, X, Search, LineChart, ShoppingBag, PiggyBank, Paperclip, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Attachment = { name: string; type: string; size: number; dataUrl: string; isImage: boolean };
type Msg = { role: "user" | "assistant"; content: string; attachments?: Attachment[] };
type Conversation = { id: string; title: string; messages: Msg[] };

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ATTACHMENTS = 4;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const PROMPT_SUGGESTIONS = [
  { icon: Lightbulb, label: "Brainstorm names", prompt: "Brainstorm 10 creative names for a productivity app focused on deep work." },
  { icon: Code2, label: "Explain code", prompt: "Explain how React's useEffect hook works with a clear example." },
  { icon: BookOpen, label: "Summarize", prompt: "Summarize the key ideas of stoic philosophy in 5 bullet points." },
  { icon: Wand2, label: "Write a story", prompt: "Write a short story about an astronaut who discovers a hidden garden on Mars." },
];

const newConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: "New chat",
  messages: [],
});

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const raw = localStorage.getItem("nx_conversations");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as Conversation[];
      }
    } catch {}
    return [];
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("nx_active_conv") || null;
    } catch {
      return null;
    }
  });

  // Persist conversations
  useEffect(() => {
    try {
      localStorage.setItem("nx_conversations", JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  useEffect(() => {
    try {
      if (activeId) localStorage.setItem("nx_active_conv", activeId);
      else localStorage.removeItem("nx_active_conv");
    } catch {}
  }, [activeId]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slots = MAX_ATTACHMENTS - attachments.length;
    if (slots <= 0) {
      toast.error(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    const picked = Array.from(files).slice(0, slots);
    const next: Attachment[] = [];
    for (const f of picked) {
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is larger than 5MB.`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(f);
        next.push({
          name: f.name,
          type: f.type || "application/octet-stream",
          size: f.size,
          dataUrl,
          isImage: f.type.startsWith("image/"),
        });
      } catch {
        toast.error(`Could not read ${f.name}`);
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  };

  const filteredConversations = search.trim()
    ? conversations.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q))
        );
      })
    : conversations;

  const active = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages]);

  // Auto-collapse on mobile
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const updateActive = (updater: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === activeId ? updater(c) : c)));
  };

  const createNew = () => {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setInput("");
  };

  const ensureActive = (): Conversation => {
    if (active) return active;
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    return c;
  };

  const renameConversation = (id: string, title: string) => {
    const trimmed = title.trim();
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed || "Untitled chat" } : c))
    );
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
    toast.success("Chat deleted");
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    const atts = textOverride ? [] : attachments;
    if ((!text && atts.length === 0) || isLoading) return;
    setInput("");
    if (!textOverride) setAttachments([]);

    const conv = ensureActive();
    const userMsg: Msg = { role: "user", content: text, attachments: atts.length ? atts : undefined };
    const baseMessages = [...conv.messages, userMsg];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? { ...c, title: c.messages.length === 0 ? (text || atts[0]?.name || "New chat").slice(0, 40) : c.title, messages: baseMessages }
          : c
      )
    );
    setIsLoading(true);

    // Build payload for AI: convert attachments to multimodal parts
    const payloadMessages = baseMessages.map((m) => {
      if (!m.attachments || m.attachments.length === 0) {
        return { role: m.role, content: m.content };
      }
      const parts: any[] = [];
      const nonImage = m.attachments.filter((a) => !a.isImage);
      const noteParts = nonImage.length
        ? `\n\n[Attached files: ${nonImage.map((a) => a.name).join(", ")}]`
        : "";
      parts.push({ type: "text", text: (m.content || "(see attached)") + noteParts });
      for (const a of m.attachments) {
        if (a.isImage) parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
      }
      return { role: m.role, content: parts };
    });

    let assistantSoFar = "";
    let assistantStarted = false;

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conv.id) return c;
          const msgs = [...c.messages];
          if (assistantStarted && msgs[msgs.length - 1]?.role === "assistant") {
            msgs[msgs.length - 1] = { role: "assistant", content: assistantSoFar };
          } else {
            msgs.push({ role: "assistant", content: assistantSoFar });
            assistantStarted = true;
          }
          return { ...c, messages: msgs };
        })
      );
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to chat.");
        return;
      }
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Too many requests. Please wait a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits to your workspace.");
        else toast.error("Something went wrong. Please try again.");
        setIsLoading(false);
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
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection lost. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isEmpty = !active || active.messages.length === 0;

  return (
    <div className="flex h-dvh w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-72" : "w-0"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={26} />
            <span className="font-semibold text-base tracking-tight">Novanexus</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
            aria-label="Close sidebar"
          >
            <PanelLeft className="size-4" />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={createNew}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-sidebar-border bg-card hover:shadow-soft transition-all text-sm font-medium"
          >
            <Plus className="size-4" />
            New chat
          </button>
        </div>

        <div className="px-3 mt-3">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="w-full pl-8 pr-7 py-2 text-sm rounded-lg bg-card border border-sidebar-border outline-none focus:border-foreground/20 placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-sidebar-accent"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 mt-4">
          <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {search.trim() ? "Results" : "Recent"}
          </div>
          <ul className="space-y-0.5">
            {filteredConversations.length === 0 ? (
              <li className="px-3 py-6 text-xs text-muted-foreground text-center">
                {search.trim() ? "No matches" : "No chats yet"}
              </li>
            ) : (
              filteredConversations.map((c) => (
                <li key={c.id}>
                  <ConversationItem
                    conversation={c}
                    isActive={c.id === activeId}
                    onSelect={() => setActiveId(c.id)}
                    onRename={(title) => renameConversation(c.id, title)}
                    onDelete={() => deleteConversation(c.id)}
                  />
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="size-8 rounded-full bg-gradient-brand-soft grid place-items-center shrink-0">
              <BrandLogo size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">Explorer</div>
              <div className="text-[11px] text-muted-foreground truncate">Unlimited curiosity</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 px-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md hover:bg-secondary transition-colors"
                aria-label="Open sidebar"
              >
                <PanelLeft className="size-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Novanexus AI</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gradient-brand-soft text-foreground/70 font-medium">
                <Sparkles className="size-3 inline -mt-0.5 mr-1" />
                Pro
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveId(null)}
              className="text-xs px-3 py-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              Home
            </button>
            <a
              href="/dashboard"
              className="text-xs px-3 py-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              Dashboard
            </a>
            <ThemeToggle />
            <button
              onClick={createNew}
              className="md:hidden p-2 rounded-md hover:bg-secondary"
              aria-label="New chat"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </header>

        {/* Conversation area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          {isEmpty ? (
            <WelcomeScreen onPick={(p) => send(p)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
              {active!.messages.map((m, i) => (
                <MessageBubble key={i} msg={m} />
              ))}
              {isLoading && active!.messages[active!.messages.length - 1]?.role === "user" && (
                <div className="flex gap-4">
                  <div className="size-8 rounded-full bg-gradient-brand-soft shrink-0 grid place-items-center">
                    <BrandLogo size={18} />
                  </div>
                  <div className="flex items-center gap-1.5 pt-2.5">
                    <span className="size-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:0ms]" />
                    <span className="size-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="px-4 md:px-6 pb-6 pt-2 bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="relative rounded-3xl border border-border bg-card shadow-soft focus-within:border-foreground/20 focus-within:shadow-glow transition-all">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 pb-0">
                  {attachments.map((a, i) => (
                    <div
                      key={i}
                      className="group relative flex items-center gap-2 pl-1.5 pr-7 py-1.5 rounded-xl border border-border bg-secondary/50 max-w-[220px]"
                    >
                      {a.isImage ? (
                        <img
                          src={a.dataUrl}
                          alt={a.name}
                          className="size-9 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-9 rounded-md bg-background grid place-items-center shrink-0">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{a.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {(a.size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove attachment"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Message Novanexus…"
                rows={1}
                disabled={isLoading}
                className="w-full resize-none bg-transparent outline-none pl-14 pr-14 py-4 text-[15px] placeholder:text-muted-foreground max-h-48 scrollbar-thin"
                style={{ minHeight: 56 }}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || attachments.length >= MAX_ATTACHMENTS}
                className="absolute left-2 bottom-2 size-10 rounded-2xl grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Attach files"
                title="Attach images or files"
              >
                <Paperclip className="size-4" />
              </button>
              <button
                onClick={() => send()}
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className={cn(
                  "absolute right-2 bottom-2 size-10 rounded-2xl grid place-items-center transition-all",
                  (input.trim() || attachments.length > 0) && !isLoading
                    ? "bg-gradient-brand text-white hover:scale-105 shadow-soft"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </div>
            <p className="text-[11px] text-center text-muted-foreground mt-3">
              Novanexus combines the best of leading AI models. Verify important info.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

const MessageBubble = ({ msg }: { msg: Msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-4", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "size-8 rounded-full shrink-0 grid place-items-center text-xs font-semibold",
          isUser
            ? "bg-secondary text-foreground border border-border"
            : "bg-gradient-brand-soft"
        )}
      >
        {isUser ? "U" : <BrandLogo size={18} />}
      </div>
      <div className={cn("flex-1 min-w-0 space-y-2", isUser && "flex flex-col items-end")}>
        {msg.attachments && msg.attachments.length > 0 && (
          <div className={cn("flex flex-wrap gap-2", isUser && "justify-end")}>
            {msg.attachments.map((a, i) =>
              a.isImage ? (
                <a
                  key={i}
                  href={a.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl overflow-hidden border border-border max-w-[260px]"
                >
                  <img src={a.dataUrl} alt={a.name} className="block max-h-60 object-cover" />
                </a>
              ) : (
                <a
                  key={i}
                  href={a.dataUrl}
                  download={a.name}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-sm max-w-[260px]"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{a.name}</span>
                </a>
              )
            )}
          </div>
        )}
        {msg.content && (isUser ? (
          <div className="inline-block px-4 py-2.5 rounded-2xl bg-secondary text-foreground text-[15px] leading-relaxed max-w-full">
            {msg.content}
          </div>
        ) : (
          <div className="prose prose-sm md:prose-base max-w-none text-foreground prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-normal prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-code:text-foreground prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground prose-a:text-foreground prose-a:underline-offset-4">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
      </div>
    </div>
  );
};

const FEATURE_CARDS = [
  {
    icon: LineChart,
    title: "Stock Analyzer",
    desc: "Look up live quotes and save tickers to your watchlist.",
    href: "/dashboard",
  },
  {
    icon: ShoppingBag,
    title: "Arbitrage Finder",
    desc: "Spot profitable products with cost vs sell price margins.",
    href: "/dashboard",
  },
  {
    icon: PiggyBank,
    title: "ROI Tracker",
    desc: "Log investments and returns to see your ROI %.",
    href: "/dashboard",
  },
];

const WelcomeScreen = ({ onPick }: { onPick: (prompt: string) => void }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-3xl w-full text-center space-y-10">
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-center">
            <BrandLogo size={56} />
          </div>
          <h1 className="font-serif text-5xl md:text-6xl tracking-tight leading-[1.05]">
            Hello, I'm <span className="text-gradient-brand italic">Novanexus</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg font-light">
            How can I help you think today?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {FEATURE_CARDS.map((f) => (
            <a
              key={f.title}
              href={f.href}
              className="group p-4 rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-soft transition-all"
            >
              <div className="size-10 rounded-xl bg-gradient-brand-soft grid place-items-center mb-3 group-hover:scale-105 transition-transform">
                <f.icon className="size-5 text-foreground/70" />
              </div>
              <div className="text-sm font-semibold mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onPick(s.prompt)}
              className="group p-4 rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-soft transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-xl bg-gradient-brand-soft grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
                  <s.icon className="size-4 text-foreground/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1">{s.label}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{s.prompt}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ConversationItem = ({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(conversation.title);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing, conversation.title]);

  const commit = () => {
    onRename(draft);
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(conversation.title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-lg",
          isActive ? "bg-sidebar-accent" : "bg-sidebar-accent/40"
        )}
      >
        <MessageSquare className="size-4 shrink-0 opacity-60 ml-1" />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          onBlur={commit}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm border-b border-foreground/20 focus:border-foreground/60 py-0.5"
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            commit();
          }}
          className="p-1 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground"
          aria-label="Save"
        >
          <Check className="size-3.5" />
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            cancel();
          }}
          className="p-1 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/60 text-muted-foreground"
      )}
    >
      <button
        onClick={onSelect}
        onDoubleClick={() => setIsEditing(true)}
        className={cn(
          "flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 text-sm text-left truncate",
          isActive && "font-medium"
        )}
      >
        <MessageSquare className="size-4 shrink-0 opacity-60" />
        <span className="truncate">{conversation.title}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "p-1.5 rounded-md opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 hover:bg-background/60 transition-opacity",
              isActive && "opacity-100"
            )}
            aria-label="Chat options"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="size-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Index;
