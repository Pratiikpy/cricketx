import { Share2 } from "lucide-react";

interface Props {
  text: string;
  className?: string;
}

const ShareButton = ({ text, className = "" }: Props) => {
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=CricketX,IPL,Base`;

  return (
    <a
      href={tweetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors ${className}`}
    >
      <Share2 size={12} />
      Share
    </a>
  );
};

export default ShareButton;
