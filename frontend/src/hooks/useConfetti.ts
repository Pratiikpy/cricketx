import confetti from "canvas-confetti";

export const fireConfetti = () => {
  const duration = 2000;
  const end = Date.now() + duration;

  const colors = ["#FF6B35", "#4ECDC4", "#FFDC00", "#FF6B6B"];

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });

    if (Date.now() < end) requestAnimationFrame(frame);
  };

  frame();
};
