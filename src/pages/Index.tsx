import { useRef } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Chat from "@/components/Chat";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

const Index = () => {
  const chatRef = useRef<HTMLDivElement>(null);

  const scrollToChat = () => {
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Navbar onCta={scrollToChat} />
      <Hero onCta={scrollToChat} />
      <Chat ref={chatRef} />
      <Features />
      <Footer />
    </main>
  );
};

export default Index;
