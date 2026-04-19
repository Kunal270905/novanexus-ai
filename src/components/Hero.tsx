interface HeroProps {
  onCta: () => void;
}

const Hero = ({ onCta }: HeroProps) => {
  return (
    <header id="top" className="relative pt-40 md:pt-52 pb-32 px-6 flex flex-col items-center overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] max-w-[140vw] h-[600px] horizon-glow blur-3xl rounded-full -z-10 animate-pulse-glow" />

      <div className="max-w-5xl text-center space-y-10 animate-fade-in-up">
        <h1 className="font-serif text-6xl md:text-8xl lg:text-[9rem] leading-[0.88] tracking-tight glow-text">
          Transcend the <span className="italic font-light">Ordinary</span>.
        </h1>

        <p className="max-w-[55ch] mx-auto text-lg md:text-xl font-light text-muted-foreground leading-relaxed">
          Novanexus AI is a cognitive resonance chamber — a portal to the collective potential
          of human synthesis and machine clarity, powered by ChatGPT-class intelligence.
        </p>

        <div className="flex justify-center gap-6 pt-4">
          <button
            onClick={onCta}
            className="group relative px-10 py-5 bg-foreground text-background rounded-full font-medium overflow-hidden transition-all duration-700 hover:shadow-[0_0_60px_hsl(var(--aura-blue)/0.5)]"
          >
            <span className="relative z-10">Commence Dialogue</span>
            <div className="absolute inset-0 bg-aura-blue translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Hero;
