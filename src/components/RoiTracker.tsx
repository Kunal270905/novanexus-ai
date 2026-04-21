import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, TrendingUp } from "lucide-react";

interface RoiEntry {
  id: string;
  label: string;
  investment: number;
  return_amount: number;
  created_at: string;
}

const RoiTracker = ({ userId }: { userId: string }) => {
  const [entries, setEntries] = useState<RoiEntry[]>([]);
  const [label, setLabel] = useState("");
  const [investment, setInvestment] = useState("");
  const [ret, setRet] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("roi_entries")
      .select("id, label, investment, return_amount, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setEntries((data ?? []) as RoiEntry[]);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inv = parseFloat(investment);
    const r = parseFloat(ret);
    if (!label.trim() || isNaN(inv) || isNaN(r) || inv < 0 || r < 0) {
      toast.error("Enter a label and valid amounts");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("roi_entries").insert({
      user_id: userId,
      label: label.trim(),
      investment: inv,
      return_amount: r,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("ROI entry saved");
      setLabel("");
      setInvestment("");
      setRet("");
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("roi_entries").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const roiPct = (inv: number, r: number) => (inv === 0 ? 0 : ((r - inv) / inv) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ROI Tracker</CardTitle>
        <CardDescription>Track your investments and returns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Investment"
            value={investment}
            onChange={(e) => setInvestment(e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Return"
            value={ret}
            onChange={(e) => setRet(e.target.value)}
          />
          <Button type="submit" disabled={saving}>Add</Button>
        </form>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <ul className="divide-y">
            {entries.map((e) => {
              const pct = roiPct(Number(e.investment), Number(e.return_amount));
              const positive = pct >= 0;
              return (
                <li key={e.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{e.label}</div>
                    <div className="text-xs text-muted-foreground">
                      Invested ${Number(e.investment).toFixed(2)} · Return ${Number(e.return_amount).toFixed(2)}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold flex items-center gap-1 ${positive ? "text-primary" : "text-destructive"}`}>
                    <TrendingUp className="h-3 w-3" />
                    {pct.toFixed(2)}%
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default RoiTracker;
