import { useMachine } from "@xstate/vue";
import { computed } from "vue";
import { euchreMachine, PLAYER_COUNT, HAND_SIZE } from "../game/euchre";
import { Deck } from "../game/cards";

export function useServerEuchre() {
  const { snapshot, send, actorRef } = useMachine(euchreMachine);

  actorRef.subscribe(async (snapshot) => {
    // dealing and stuff
    if (snapshot.matches("start")) {
      return send({
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
      return send({ type: "DEAL", players, revealed });
    }

    // Bot AI
    const {
      context: { players, active },
    } = snapshot;
    if (active === 0) return;

    const wait = Math.floor(Math.random() * 1000) + 1000;
    await new Promise((r) => setTimeout(r, wait));

    if (snapshot.hasTag("bidding")) {
      return send({ type: "ORDER_UP" });
    }

    // exchange first card
    if (snapshot.matches("exchanging")) {
      return send({
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
      send({ type: "PLAY", card: playable });
    }
  });

  // anonymize context
  const context = computed(() => {
    const { context, value: state } = snapshot.value;

    const hand = context.players[0] ?? [];
    const events = context.events.map((event) => {
      if (event.type === "EXCHANGE") {
        // remove hidden exchanged card
        return { type: event.type, actor: event.actor };
      }
      return event;
    });

    return {
      state,
      events,
      dealer: context.dealer,
      hand,
      revealed: context.revealed,
      active: context.active,
      trump: context.trump,
      leader: context.leader,
      trick: context.trick,
      tricks: context.tricks,
      taken: context.taken,
      score: context.score,
    };
  });

  return { context, send };
}
