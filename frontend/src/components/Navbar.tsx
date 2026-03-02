import { Link, useLocation } from "react-router-dom";
import { Wallet, Menu, X, Globe, Droplets, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import CricketLogo from "./CricketLogo";
import ThemeToggle from "./ThemeToggle";
import { useWallet } from "@/context/WalletContext";
import { useFaucet } from "@/hooks/useFaucet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const navLinks = [
  { to: "/markets", label: "Markets" },
  { to: "/my-bets", label: "My Bets" },
  { to: "/leaderboard", label: "Leaderboard" },
];

const Navbar = () => {
  const { connected, address, balance, connect, disconnect, rawAddress } = useWallet();
  const { mintTestUSDC, isLoading: isMinting, isSuccess: mintSuccess, reset: resetMint } = useFaucet();
  const { toast } = useToast();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mintSuccess) {
      toast({ title: "Test USDC Minted!", description: "100 USDC added to your wallet." });
      resetMint();
    }
  }, [mintSuccess]);

  const handleMint = () => {
    if (rawAddress) mintTestUSDC(rawAddress, 100);
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <CricketLogo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {connected && (
            <button
              onClick={handleMint}
              disabled={isMinting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20"
            >
              {isMinting ? <Loader2 size={12} className="animate-spin" /> : <Droplets size={12} />}
              Get Test USDC
            </button>
          )}
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-cricket-success">${balance.toFixed(2)}</span>
              <button
                onClick={disconnect}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                <Wallet size={16} />
                {address}
              </button>
            </div>
          ) : (
            <Button onClick={connect} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Wallet size={16} className="mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 animate-fade-in">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-3 rounded-lg text-sm font-medium mb-1 ${
                location.pathname === l.to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            {connected ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-cricket-success">${balance.toFixed(2)} USDC</span>
                  <button onClick={disconnect} className="text-sm text-muted-foreground">
                    Disconnect
                  </button>
                </div>
                <button
                  onClick={handleMint}
                  disabled={isMinting}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-accent/10 text-accent"
                >
                  {isMinting ? <Loader2 size={12} className="animate-spin" /> : <Droplets size={12} />}
                  Get Test USDC
                </button>
              </>
            ) : (
              <Button onClick={connect} className="w-full bg-accent text-accent-foreground">
                <Wallet size={16} className="mr-2" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
