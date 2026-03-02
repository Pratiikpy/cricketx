import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/context/WalletContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { wagmiConfig } from "@/config/wagmi";
import Index from "./pages/Index";
import Markets from "./pages/Markets";
import MarketDetail from "./pages/MarketDetail";
import MyBets from "./pages/MyBets";
import Leaderboard from "./pages/Leaderboard";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <WalletProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/market/:id" element={<MarketDetail />} />
                <Route path="/my-bets" element={<MyBets />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/user/:address" element={<UserProfile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </WalletProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
