const Footer = () => {
  return (
    <footer id="horizon" className="px-6 md:px-10 py-20 border-t border-border/60 relative">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <div className="font-serif text-4xl md:text-5xl tracking-tighter italic">Novanexus</div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            Framing the Future of Human Intent
          </p>
        </div>
        <div className="flex flex-col gap-3 md:text-right text-sm">
          <a href="#" className="text-aura-blue/80 hover:text-aura-blue transition-colors">Privacy of the Void</a>
          <a href="#" className="text-aura-blue/80 hover:text-aura-blue transition-colors">Terms of Resonance</a>
          <span className="text-[10px] opacity-30 uppercase tracking-[0.3em] mt-6">
            © {new Date().getFullYear()} Novanexus AI
          </span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-aura-blue/40 to-transparent" />
    </footer>
  );
};

export default Footer;
