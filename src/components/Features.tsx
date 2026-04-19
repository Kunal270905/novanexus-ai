const features = [
  {
    accent: "bg-aura-pink/60",
    title: "Neural Resonance",
    body: "Unlike linear processing, Novanexus mirrors the fluid, associative nature of human thought patterns for deeper contextual understanding.",
  },
  {
    accent: "bg-aura-blue/60",
    title: "Ethereal Privacy",
    body: "Privacy isn't a feature; it is the fundamental membrane of our architecture. Your conversations exist only in the moment of synthesis.",
  },
  {
    accent: "bg-foreground/30",
    title: "Infinite Context",
    body: "Holding the weight of entire libraries, Novanexus maintains coherence across long dialogues without losing the thread of thought.",
  },
];

const Features = () => {
  return (
    <section id="features" className="px-6 md:px-10 pb-32 md:pb-48">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-24">
        {features.map((f) => (
          <div key={f.title} className="space-y-6 group">
            <div className={`h-px w-12 ${f.accent} group-hover:w-full transition-all duration-1000`} />
            <h3 className="font-serif text-3xl">{f.title}</h3>
            <p className="text-muted-foreground font-light leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
