import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { PromptInput } from "@/components/ui/prompt-input";
import { ExamplePrompts } from "@/components/ExamplePrompts";
import { Button } from "@/components/ui/button";
import { GenerationProgress } from "@/components/GenerationProgress";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { Zap, ArrowRight } from "lucide-react";

type AppState = "landing" | "generating" | "results";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    setSubmittedPrompt(prompt);
    setAppState("generating");
  };

  const handleGenerationComplete = useCallback(() => {
    setAppState("results");
  }, []);

  const handleBackToLanding = () => {
    setAppState("landing");
    setPrompt("");
    setSubmittedPrompt("");
  };

  // Show header for logged-in states
  const showHeader = appState !== "landing";

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      {showHeader && <Header credits={85} isLoggedIn />}

      <AnimatePresence mode="wait">
        {appState === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex flex-col"
          >
            {/* Top bar */}
            <div className="container mx-auto px-4 py-6 flex items-center justify-between">
              <Logo size="md" />
              <div className="flex items-center gap-4">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Sign In
                </Button>
                <Button variant="hero" size="sm">
                  Get Started
                </Button>
              </div>
            </div>

            {/* Hero section */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
              {/* Tagline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-10"
              >
                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                  <span className="text-white">all the data.</span>
                  <br />
                  <span className="text-gradient">on demand.</span>
                </h1>
                <p className="text-white/60 text-lg sm:text-xl max-w-xl mx-auto font-light">
                  describe what you need. get structured, AI-enriched datasets in seconds.
                </p>
              </motion.div>

              {/* Prompt input */}
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                onSubmit={handleSubmit}
                placeholder="what data do you need?"
                className="mb-6 px-4 w-full"
              />

              {/* Example prompts */}
              <ExamplePrompts onSelect={setPrompt} />

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="mt-12 flex flex-col items-center gap-3"
              >
                <Button variant="hero" size="lg" className="group lowercase">
                  <Zap className="w-5 h-5" />
                  get 100 free credits
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-xs text-white/40 lowercase">
                  no credit card required • start generating instantly
                </p>
              </motion.div>
            </main>

            {/* Footer accent */}
            <div className="h-px bg-gradient-to-r from-transparent via-electric/30 to-transparent" />
          </motion.div>
        )}

        {appState === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center px-4 pt-16"
          >
            <GenerationProgress
              prompt={submittedPrompt}
              onComplete={handleGenerationComplete}
            />
          </motion.div>
        )}

        {appState === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResultsDashboard
              title="Austin Series A Startups 2024"
              prompt={submittedPrompt}
              creditsUsed={15}
              onBack={handleBackToLanding}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
