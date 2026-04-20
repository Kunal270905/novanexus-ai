import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Plus, MessageSquare, Sparkles, PanelLeft, Send, Lightbulb, Code2, BookOpen, Wand2, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Msg[] };

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (!text || isLoading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    const baseMessages = [...active.messages, userMsg];

    updateActive((c) => ({
      ...c,
      title: c.messages.length === 0 ? text.slice(0, 40) : c.title,
      messages: baseMessages,
    }));
    setIsLoading(true);

    let assistantSoFar = "";
    let assistantStarted = false;

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      updateActive((c) => {
        const msgs = [...c.messages];
        if (assistantStarted && msgs[msgs.length - 1]?.role === "assistant") {
          msgs[msgs.length - 1] = { role: "assistant", content: assistantSoFar };
        } else {
          msgs.push({ role: "assistant", content: assistantSoFar });
          assistantStarted = true;
        }
        return { ...c, messages: msgs };
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: baseMessages }),
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

  const isEmpty = active.messages.length === 0;

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

        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 mt-4">
          <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent
          </div>
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <ConversationItem
                  conversation={c}
                  isActive={c.id === activeId}
                  onSelect={() => setActiveId(c.id)}
                  onRename={(title) => renameConversation(c.id, title)}
                  onDelete={() => deleteConversation(c.id)}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="size-8 rounded-full bg-gradient-brand grid place-items-center text-white text-xs font-semibold">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">Guest</div>
              <div className="text-[11px] text-muted-foreground truncate">Free plan</div>
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
          <button
            onClick={createNew}
            className="md:hidden p-2 rounded-md hover:bg-secondary"
            aria-label="New chat"
          >
            <Plus className="size-4" />
          </button>
        </header>

        {/* Conversation area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          {isEmpty ? (
            <WelcomeScreen onPick={(p) => send(p)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
              {active.messages.map((m, i) => (
                <MessageBubble key={i} msg={m} />
              ))}
              {isLoading && active.messages[active.messages.length - 1]?.role === "user" && (
                <div className="flex gap-4">
                  <div className="size-8 rounded-full bg-gradient-brand shrink-0 grid place-items-center">
                    <Sparkles className="size-4 text-white" />
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
                className="w-full resize-none bg-transparent outline-none px-5 py-4 pr-14 text-[15px] placeholder:text-muted-foreground max-h-48 scrollbar-thin"
                style={{ minHeight: 56 }}
              />
              <button
                onClick={() => send()}
                disabled={isLoading || !input.trim()}
                className={cn(
                  "absolute right-2 bottom-2 size-10 rounded-2xl grid place-items-center transition-all",
                  input.trim() && !isLoading
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
            : "bg-gradient-brand text-white"
        )}
      >
        {isUser ? "U" : <Sparkles className="size-4" />}
      </div>
      <div className={cn("flex-1 min-w-0", isUser && "flex justify-end")}>
        {isUser ? (
          <div className="inline-block px-4 py-2.5 rounded-2xl bg-secondary text-foreground text-[15px] leading-relaxed max-w-full">
            {msg.content}
          </div>
        ) : (
          <div className="prose prose-sm md:prose-base max-w-none text-foreground prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-normal prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-code:text-foreground prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground prose-a:text-foreground prose-a:underline-offset-4">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

const WelcomeScreen = ({ onPick }: { onPick: (prompt: string) => void }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-10">
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
