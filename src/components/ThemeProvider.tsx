import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "auto";
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark" };

const ThemeContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "novanexus-theme";

const getSystem = (): "light" | "dark" =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const apply = (t: Theme) => {
  const resolved = t === "auto" ? getSystem() : t;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) || "dark"
  );
  const [resolved, setResolved] = useState<"light" | "dark">(() => apply(theme));

  useEffect(() => {
    setResolved(apply(theme));
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(apply("auto"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
