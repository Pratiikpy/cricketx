import { OrderBookEntry } from "@/data/mockData";

interface Props {
  yesOrders: OrderBookEntry[];
  noOrders: OrderBookEntry[];
}

const OrderBookView = ({ yesOrders, noOrders }: Props) => {
  const maxAmount = Math.max(
    ...yesOrders.map((o) => o.amount),
    ...noOrders.map((o) => o.amount)
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Order Book</h3>
      <div className="grid grid-cols-2 gap-3">
        {/* YES side */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium mb-2 px-1">
            <span>Price</span>
            <span>Amount</span>
          </div>
          {yesOrders.map((o, i) => (
            <div key={i} className="relative flex items-center justify-between py-1.5 px-2 rounded text-xs mb-1">
              <div
                className="absolute inset-0 rounded bg-cricket-teal/10"
                style={{ width: `${(o.amount / maxAmount) * 100}%` }}
              />
              <span className="relative font-semibold text-cricket-teal">${o.price.toFixed(2)}</span>
              <span className="relative text-muted-foreground">${o.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
        {/* NO side */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium mb-2 px-1">
            <span>Price</span>
            <span>Amount</span>
          </div>
          {noOrders.map((o, i) => (
            <div key={i} className="relative flex items-center justify-between py-1.5 px-2 rounded text-xs mb-1">
              <div
                className="absolute inset-0 rounded bg-cricket-coral/10 right-0"
                style={{ width: `${(o.amount / maxAmount) * 100}%`, marginLeft: "auto" }}
              />
              <span className="relative font-semibold text-cricket-coral">${o.price.toFixed(2)}</span>
              <span className="relative text-muted-foreground">${o.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground">
          Spread: ${(yesOrders[0]?.price + noOrders[0]?.price - 1).toFixed(2) || "—"}
        </span>
      </div>
    </div>
  );
};

export default OrderBookView;
