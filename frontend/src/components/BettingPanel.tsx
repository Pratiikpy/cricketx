import { useState, useEffect } from "react";
import { Market } from "@/data/mockData";
import { useWallet } from "@/context/WalletContext";
import { usePlaceOrder } from "@/hooks/usePlaceOrder";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wallet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  market: Market;
  marketAddress?: `0x${string}`;
}

const BettingPanel = ({ market, marketAddress }: Props) => {
  const { connected, connect, balance } = useWallet();
  const { toast } = useToast();
  const { placeOrder, isLoading, isSuccess, error, reset } = usePlaceOrder();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [price, setPrice] = useState(side === "yes" ? market.yesPrice : market.noPrice);
  const [amount, setAmount] = useState(5);
  const [showConfirm, setShowConfirm] = useState(false);

  const fee = amount * 0.02;
  const priceDecimal = price > 1 ? price / 100 : price;
  const potentialWin = (amount / priceDecimal) * (1 - 0.02);
  const potentialLoss = amount;

  // Handle successful tx
  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Order Placed!",
        description: `${side.toUpperCase()} ${side === "yes" ? market.yesLabel : market.noLabel} at $${priceDecimal.toFixed(2)} for $${amount.toFixed(2)}`,
      });
      setShowConfirm(false);
      reset();
    }
  }, [isSuccess]);

  // Handle error
  useEffect(() => {
    if (error) {
      toast({
        title: "Transaction Failed",
        description: error.message.slice(0, 100),
        variant: "destructive",
      });
      reset();
    }
  }, [error]);

  const handleSideChange = (s: "yes" | "no") => {
    setSide(s);
    setPrice(s === "yes" ? market.yesPrice : market.noPrice);
  };

  const handleSubmit = () => {
    if (!connected) {
      connect();
      return;
    }
    setShowConfirm(true);
  };

  const confirmOrder = () => {
    if (marketAddress) {
      // Real on-chain order
      const sideNum = side === "yes" ? 1 : 2;
      const priceInt = Math.round(priceDecimal * 100); // Convert 0.60 → 60
      placeOrder(marketAddress, sideNum, priceInt, amount);
    } else {
      // Mock fallback
      setShowConfirm(false);
      toast({
        title: "Order Placed! (Mock)",
        description: `${side.toUpperCase()} ${side === "yes" ? market.yesLabel : market.noLabel} at $${priceDecimal.toFixed(2)} for $${amount.toFixed(2)}`,
      });
    }
  };

  return (
    <div className="cricket-card p-5 space-y-4">
      <h3 className="font-bold text-sm">Place Your Prediction</h3>

      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSideChange("yes")}
          className={`py-3 rounded-lg text-sm font-semibold transition-all ${
            side === "yes"
              ? "bg-cricket-teal text-primary-foreground shadow-md"
              : "bg-cricket-teal/10 text-cricket-teal"
          }`}
        >
          YES ({market.yesLabel})
        </button>
        <button
          onClick={() => handleSideChange("no")}
          className={`py-3 rounded-lg text-sm font-semibold transition-all ${
            side === "no"
              ? "bg-cricket-coral text-primary-foreground shadow-md"
              : "bg-cricket-coral/10 text-cricket-coral"
          }`}
        >
          NO ({market.noLabel})
        </button>
      </div>

      {/* Price */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Price ($0.01 - $0.99)</label>
        <input
          type="range"
          min={1}
          max={99}
          value={Math.round(priceDecimal * 100)}
          onChange={(e) => setPrice(parseInt(e.target.value) / 100)}
          className="w-full accent-accent"
        />
        <div className="text-right text-sm font-semibold">${priceDecimal.toFixed(2)}</div>
      </div>

      {/* Amount */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (USDC)</label>
        <div className="flex gap-2">
          {[1, 2, 5, 10].map((a) => (
            <button
              key={a}
              onClick={() => setAmount(a)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                amount === a ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              ${a}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-2 bg-secondary/50 rounded-lg p-3 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Potential win</span>
          <span className="font-semibold text-cricket-success">${potentialWin.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">If wrong</span>
          <span className="font-semibold text-cricket-coral">-${potentialLoss.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fee (2%)</span>
          <span>${fee.toFixed(2)}</span>
        </div>
        {connected && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Balance</span>
            <span>${balance.toFixed(2)} USDC</span>
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading || (connected && amount > balance)}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 font-semibold"
      >
        {isLoading ? (
          <><Loader2 size={16} className="mr-2 animate-spin" /> Processing...</>
        ) : !connected ? (
          <><Wallet size={16} className="mr-2" /> Connect Wallet</>
        ) : amount > balance ? (
          "Insufficient USDC"
        ) : (
          "Place Order"
        )}
      </Button>

      <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
        <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
        Order executes only when matched by another user
      </p>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in space-y-4">
            <h3 className="font-bold text-lg">Confirm Order</h3>
            <div className="text-sm space-y-2">
              <p>{side.toUpperCase()} <strong>{side === "yes" ? market.yesLabel : market.noLabel}</strong></p>
              <p>Price: ${priceDecimal.toFixed(2)} | Amount: ${amount.toFixed(2)}</p>
              <p className="text-cricket-success font-semibold">Potential win: ${potentialWin.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button className="flex-1 bg-accent text-accent-foreground" onClick={confirmOrder} disabled={isLoading}>
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BettingPanel;
