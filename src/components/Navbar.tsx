import { Button } from "@/components/ui/button";

interface NavbarProps {
  onCta: () => void;
}

const Navbar = ({ onCta }: NavbarProps) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-5 flex justify-between items-center backdrop-blur-md bg-background/40 border-b border-border/50">
      <a href="#top" className="font-serif text-2xl tracking-tight italic text-foreground">
        Novanexus
      </a>
      <div className="hidden md:flex gap-10 text-sm tracking-widest uppercase text-muted-foreground">
        <a href="#features" className="hover:text-foreground transition-colors">Synthesis</a>
        <a href="#chat" className="hover:text-foreground transition-colors">Dialogue</a>
        <a href="#horizon" className="hover:text-foreground transition-colors">Horizon</a>
      </div>
      <Button
        onClick={onCta}
        variant="outline"
        className="rounded-full border-border/60 bg-transparent hover:bg-foreground hover:text-background transition-all duration-500"
      >
        Begin Journey
      </Button>
    </nav>
  );
};

export default Navbar;
