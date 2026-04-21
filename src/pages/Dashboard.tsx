import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Search, Star, Trash2, Sparkles, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";
import ReactMarkdown from "react-markdown";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  open: number;
  high: number;
  low: number;
  volume: number;
  latestDay: string;
}

interface WatchItem {
  id: string;
  symbol: string;
  company_name: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [search, setSearch] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [searching, setSearching] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [insight, setInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate("/auth", { replace: true });
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth", { replace: true });
      else setUser(session.user);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
    loadWatchlist();
  }, [user]);

  const loadWatchlist = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("watchlist")
      .select("id, symbol, company_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setWatchlist(data ?? []);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const symbol = search.trim().toUpperCase();
    if (!symbol) return;
    setSearching(true);
    setQuote(null);
    setInsight("");
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-quote?symbol=${encodeURIComponent(symbol)}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Lookup failed");
      setQuote(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const addToWatchlist = async () => {
    if (!user || !quote) return;
    const { error } = await supabase
      .from("watchlist")
      .insert({ user_id: user.id, symbol: quote.symbol });
    if (error) {
      if (error.code === "23505") toast.info("Already in watchlist");
      else toast.error(error.message);
    } else {
      toast.success(`${quote.symbol} added`);
      loadWatchlist();
    }
  };

  const removeFromWatchlist = async (id: string) => {
    const { error } = await supabase.from("watchlist").delete().eq("id", id);
    if (error) toast.error(error.message);
    else loadWatchlist();
  };

  const fetchInsight = async () => {
    if (!quote) return;
    setInsightLoading(true);
    setInsight("");
    try {
      const { data, error } = await supabase.functions.invoke("stock-insights", {
        body: { symbol: quote.symbol, context: { price: quote.price, changePercent: quote.changePercent } },
      });
      if (error) throw error;
      setInsight(data.content);
    } catch (err: any) {
      toast.error(err.message ?? "AI insight failed");
    } finally {
      setInsightLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isUp = quote && quote.change >= 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-7 w-7" />
            <span className="font-semibold">Novanexus AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {profile?.display_name ?? user?.email}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock search</CardTitle>
            <CardDescription>Look up a ticker (e.g. AAPL, MSFT, TSLA)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Ticker symbol"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="uppercase"
              />
              <Button type="submit" disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>

            {quote && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-2xl font-semibold">{quote.symbol}</div>
                    <div className="text-3xl font-bold mt-1">${quote.price.toFixed(2)}</div>
                    <Badge variant={isUp ? "default" : "destructive"} className="mt-2">
                      {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {quote.change.toFixed(2)} ({quote.changePercent})
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addToWatchlist}>
                      <Star className="h-4 w-4 mr-2" /> Save
                    </Button>
                    <Button size="sm" onClick={fetchInsight} disabled={insightLoading}>
                      {insightLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      AI insights
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-muted-foreground">
                  <div>Open: <span className="text-foreground">${quote.open.toFixed(2)}</span></div>
                  <div>High: <span className="text-foreground">${quote.high.toFixed(2)}</span></div>
                  <div>Low: <span className="text-foreground">${quote.low.toFixed(2)}</span></div>
                  <div>Volume: <span className="text-foreground">{quote.volume.toLocaleString()}</span></div>
                </div>
                {insight && (
                  <div className="rounded-md bg-muted/50 p-4 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{insight}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your watchlist</CardTitle>
            <CardDescription>{watchlist.length} saved {watchlist.length === 1 ? "stock" : "stocks"}</CardDescription>
          </CardHeader>
          <CardContent>
            {watchlist.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved stocks yet. Search and save one above.</p>
            ) : (
              <ul className="divide-y">
                {watchlist.map((w) => (
                  <li key={w.id} className="flex items-center justify-between py-3">
                    <button
                      className="font-medium hover:underline"
                      onClick={() => {
                        setSearch(w.symbol);
                        setTimeout(() => handleSearch(), 0);
                      }}
                    >
                      {w.symbol}
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => removeFromWatchlist(w.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
