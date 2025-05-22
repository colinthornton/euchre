import { createActor } from "xstate";
import {
  euchreServerMachine,
  PLAYER_COUNT,
  HAND_SIZE,
  type ClientEvent,
} from "../game/euchre";
import { Deck } from "../game/cards";

export class EuchreServer {
  private server: ReturnType<typeof createActor<typeof euchreServerMachine>>;

  constructor(readonly player: number) {
    this.server = createActor(euchreServerMachine);
  }

  start() {
    this.server.subscribe(async (snapshot) => {
      // dealing and stuff
      if (snapshot.matches("start")) {
        return this.server.send({
          type: "CHOOSE_DEALER",
          dealer: Math.floor(Math.random() * PLAYER_COUNT),
        });
      }

      if (snapshot.matches("dealing")) {
        const deck = new Deck();
        deck.shuffle();
        const players = new Array(PLAYER_COUNT)
          .fill(undefined)
          .map(() => deck.deal(HAND_SIZE));
        const revealed = deck.revealTop();
        return this.server.send({ type: "DEAL", players, revealed });
      }

      // Bot AI
      const {
        context: { players, active },
      } = snapshot;
      if (active === 0) return;

      const wait = Math.floor(Math.random() * 1000) + 1000;
      await new Promise((r) => setTimeout(r, wait));

      if (snapshot.hasTag("bidding")) {
        return this.server.send({ type: "ORDER_UP" });
      }

      // exchange first card
      if (snapshot.matches("exchanging")) {
        return this.server.send({
          type: "EXCHANGE",
          card: players[active][0],
        });
      }

      // play first playable card in hand
      if (snapshot.matches("playing")) {
        const hand = players[active];
        const playable = hand.find((card) =>
          snapshot.can({ type: "PLAY", card })
        );
        if (!playable) throw new Error();
        this.server.send({ type: "PLAY", card: playable });
      }
    });

    this.server.start();
  }

  listen(callback: (event: ClientEvent) => void) {
    this.server.subscribe((snapshot) => {
      const { context } = snapshot;
      const { events } = context;

      if (events.length === 0) return;
      const event = events[events.length - 1];

      if (event.type === "DEAL") {
        const hand = event.players[this.player];
        return callback({ type: "DEAL", hand, revealed: event.revealed });
      }

      if (event.type === "EXCHANGE" && context.active !== this.player) {
        return callback({ type: "EXCHANGE" });
      }

      callback(event);
    });
  }

  send(event: ClientEvent) {
    if (event.type === "CHOOSE_DEALER") return;
    if (event.type === "DEAL") return;
    if (this.server.getSnapshot().context.active !== this.player) return;

    if (event.type === "EXCHANGE") {
      if (!event.card) return;
      return this.server.send({ type: "EXCHANGE", card: event.card });
    }

    this.server.send(event);
  }
}
