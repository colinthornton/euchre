import { createTimeline, utils } from "animejs";

export const revealTop = () =>
  createTimeline()
    .add("#revealed .front", { rotateY: "-180deg", duration: 0 })
    .add("#revealed .back", { rotateY: "0deg", duration: 0 })
    .add("#deck", {
      y: { from: "50dvh", ease: "out" },
      opacity: { to: "1", ease: "outQuad" },
      duration: 400,
    })
    .add("#revealed", {
      z: [0, ($target) => utils.get($target, "--card-width"), 0],
      ease: "in",
      duration: 400,
    })
    .add(
      "#revealed .front",
      { rotateY: "0deg", ease: "in", duration: 400 },
      "<<"
    )
    .add(
      "#revealed .back",
      { rotateY: "180deg", ease: "in", duration: 400 },
      "<<"
    );
