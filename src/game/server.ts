import { createActor, type ContextFrom } from "xstate";
import {
  euchreServerMachine,
  PLAYER_COUNT,
  HAND_SIZE,
  type ClientEvent,
  type ServerEvent,
} from "../game/euchre";
import { Deck } from "../game/cards";
import { decideMove } from "./bot";

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

      const active = snapshot.context.active;
      if (active === this.player) return;

      // Bot AI
      const clientEvents = snapshot.context.events.map((event) =>
        this.clientEventFrom(event, snapshot.context, active)
      );
      console.log(clientEvents);
      const botMove = await decideMove(clientEvents, active);
      console.log("botMove", botMove);
      if (botMove && snapshot.can(botMove)) {
        this.server.send(botMove);
      }
    });

    this.server.start();
  }

  listen(callback: (event: ClientEvent) => void) {
    this.server.subscribe((snapshot) => {
      const { context } = snapshot;
      const { events } = context;

      if (events.length === 0) return;
      const serverEvent = events[events.length - 1];
      const clientEvent = this.clientEventFrom(serverEvent, context);
      callback(clientEvent);
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

  private clientEventFrom(
    event: ServerEvent,
    context: ContextFrom<typeof euchreServerMachine>,
    player = this.player
  ): ClientEvent {
    if (event.type === "DEAL") {
      const hand = event.players[player];
      return { type: "DEAL", hand, revealed: event.revealed };
    }

    if (
      player === this.player &&
      event.type === "EXCHANGE" &&
      (context.active - 1) % PLAYER_COUNT !== player
    ) {
      return { type: "EXCHANGE" };
    }

    return event;
  }
}
