import { createTimeline } from "animejs";

export const revealHand = () =>
  createTimeline().add("#hand", {
    y: {
      from: ($target) => {
        const { height } = $target.getBoundingClientRect();
        return height;
      },
      to: ($target) => {
        const { height } = $target.getBoundingClientRect();
        return height * 0.2;
      },
      ease: "out(5)",
    },
  });
