const CricketLogo = ({ className = "" }: { className?: string }) => (
  <span className={`font-extrabold text-xl tracking-tight ${className}`}>
    Cricket<span className="text-accent">X</span>
  </span>
);

export default CricketLogo;
