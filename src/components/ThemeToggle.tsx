import { Sun, Moon, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

const ThemeToggle = () => {
  const { theme, setTheme, resolved } = useTheme();
  const Icon = theme === "auto" ? Monitor : resolved === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 rounded-md hover:bg-secondary transition-colors"
          aria-label="Toggle theme"
        >
          <Icon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {([
          { v: "light", label: "Light", I: Sun },
          { v: "dark", label: "Dark", I: Moon },
          { v: "auto", label: "Auto", I: Monitor },
        ] as const).map(({ v, label, I }) => (
          <DropdownMenuItem
            key={v}
            onClick={() => setTheme(v)}
            className={cn(theme === v && "bg-accent")}
          >
            <I className="size-4 mr-2" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
