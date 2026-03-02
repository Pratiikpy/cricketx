import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, Clock, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { matches } from "@/data/mockData";
import MatchCard from "@/components/MatchCard";
import CricketLogo from "@/components/CricketLogo";
import heroBg from "@/assets/hero-bg.png";

import { useCountUp } from "@/hooks/useCountUp";

const StatValue = ({ end, prefix = "", suffix = "" }: { end: number; prefix?: string; suffix?: string }) => {
  const val = useCountUp(end, 1500);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
};

const stats = [
  { label: "Markets Created", end: 127, prefix: "", suffix: "" },
  { label: "USDC Traded", end: 48230, prefix: "$", suffix: "" },
  { label: "Predictions Made", end: 3842, prefix: "", suffix: "" },
];

const features = [
  { icon: Shield, title: "Zero Platform Risk", desc: "Peer-to-peer matching. No house edge, no middleman taking your money." },
  { icon: Zap, title: "Penny Gas Fees", desc: "Built on Base L2. Transactions cost less than $0.001." },
  { icon: Clock, title: "Instant Settlement", desc: "Oracle fetches results and auto-settles. Get paid immediately." },
  { icon: KeyRound, title: "No Seed Phrase", desc: "Coinbase Smart Wallet. One-click connect, no extensions needed." },
];

const steps = [
  { num: "01", title: "Pick a Match", desc: "Browse live and upcoming IPL matches with real-time odds." },
  { num: "02", title: "Place Your Prediction", desc: "Choose YES or NO, set your price, and place your order." },
  { num: "03", title: "Win USDC", desc: "If you're right, winnings are settled instantly to your wallet." },
];

const Index = () => {
  const previewMatches = matches.filter((m) => m.status !== "settled").slice(0, 3);

  return (
    <motion.div className="min-h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Navbar for landing only */}
      <nav className="absolute top-0 left-0 right-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <CricketLogo className="text-primary-foreground" />
          <div className="flex items-center gap-3">
            <Link to="/markets" className="text-sm font-medium text-primary-foreground/70 hover:text-primary-foreground transition-colors hidden sm:block">
              Markets
            </Link>
            <Link to="/markets">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                Start Predicting
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden cricket-gradient min-h-[90vh] flex items-center">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-lighten"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/90" />
        <div className="container relative z-10 py-32">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground leading-tight animate-fade-in">
              Predict Cricket.
              <br />
              <span className="text-accent">Win USDC.</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-lg animate-fade-in" style={{ animationDelay: "0.1s" }}>
              The first peer-to-peer cricket prediction market on Base. No house. No middleman. Just you vs other fans.
            </p>
            <div className="flex flex-wrap gap-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Link to="/markets">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-base h-14 px-8">
                  Start Predicting <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Floating match card */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 w-[380px] animate-float">
            <div className="bg-card/95 backdrop-blur rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">🏏 RCB vs CSK — Match Winner</span>
                <span className="text-[10px] font-semibold text-cricket-success bg-cricket-success/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cricket-success animate-pulse" /> LIVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="py-3 rounded-lg bg-cricket-teal/10 text-cricket-teal font-semibold text-sm hover:bg-cricket-teal/20 transition-colors">
                  YES RCB $0.62
                </button>
                <button className="py-3 rounded-lg bg-cricket-coral/10 text-cricket-coral font-semibold text-sm hover:bg-cricket-coral/20 transition-colors">
                  NO CSK $0.38
                </button>
              </div>
              <div className="text-[11px] text-muted-foreground">Vol: $2,340 • 47 orders</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-primary py-4 border-t border-primary-foreground/10">
        <div className="container flex items-center justify-around">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-primary-foreground">
                <StatValue end={s.end} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="text-xs text-primary-foreground/60">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-background">
        <div className="container">
          <h2 className="text-3xl font-extrabold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center space-y-3 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-accent/10 text-accent font-extrabold text-lg">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <h2 className="text-3xl font-extrabold text-center mb-12">Why CricketX?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="cricket-card p-6 space-y-3 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <f.icon size={20} />
                </div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live preview */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-extrabold">Live & Upcoming</h2>
            <Link to="/markets" className="text-sm font-semibold text-accent hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {previewMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="cricket-gradient py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <CricketLogo className="text-primary-foreground mb-2" />
              <p className="text-xs text-primary-foreground/50">Decentralized cricket prediction markets on Base.</p>
            </div>
            <div className="flex items-center gap-6 text-sm text-primary-foreground/60">
              <a href="#" className="hover:text-primary-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-primary-foreground transition-colors">Farcaster</a>
              <a href="#" className="hover:text-primary-foreground transition-colors">Docs</a>
            </div>
            <div className="text-xs text-primary-foreground/40 flex items-center gap-2">
              <span className="px-2 py-1 rounded border border-primary-foreground/20 text-primary-foreground/50 text-[10px] font-medium">
                Built on Base
              </span>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
};

export default Index;
