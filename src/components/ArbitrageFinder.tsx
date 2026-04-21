import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface SampleProduct {
  name: string;
  source: string;
  destination: string;
  cost: number;
  sell: number;
}

const SAMPLES: SampleProduct[] = [
  { name: "Wireless Earbuds", source: "Alibaba", destination: "Amazon", cost: 12.5, sell: 39.99 },
  { name: "LED Desk Lamp", source: "AliExpress", destination: "eBay", cost: 8.0, sell: 24.5 },
  { name: "Yoga Mat", source: "Walmart", destination: "Etsy", cost: 15.0, sell: 32.0 },
  { name: "Bluetooth Speaker", source: "Costco", destination: "Amazon", cost: 22.0, sell: 54.99 },
  { name: "Phone Stand", source: "DHgate", destination: "Shopify", cost: 3.2, sell: 14.99 },
  { name: "Smart Plug 4-pack", source: "Aliexpress", destination: "Amazon", cost: 18.0, sell: 39.0 },
];

const ArbitrageFinder = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Arbitrage Finder</CardTitle>
        <CardDescription>Sample products with profit potential</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAMPLES.map((p) => {
            const profit = p.sell - p.cost;
            const margin = (profit / p.sell) * 100;
            return (
              <li key={p.name} className="rounded-lg border p-3 space-y-2">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {p.source} <ArrowRight className="h-3 w-3" /> {p.destination}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    Cost <span className="text-foreground">${p.cost.toFixed(2)}</span> · Sell{" "}
                    <span className="text-foreground">${p.sell.toFixed(2)}</span>
                  </div>
                  <Badge variant={profit >= 0 ? "default" : "destructive"}>
                    +${profit.toFixed(2)} ({margin.toFixed(0)}%)
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ArbitrageFinder;
