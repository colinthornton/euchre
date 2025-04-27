import { assign, enqueueActions, setup } from "xstate";
import { Deck } from "./cards";
import { Card, type Suit } from "./cards";

const PLAYER_COUNT = 4;
const HAND_SIZE = 5;

const initialContext = {
  deck: new Deck(),
  players: [] as Set<Card>[],
  dealer: 0,
  active: 0,
  revealed: null as Card | null,
  trump: null as Suit | null,
  trick: [] as Card[],
  winning: 0,
  tricks: [] as Card[][],
  tricksTaken: new Array<number>(PLAYER_COUNT).fill(0),
  score: new Array<number>(PLAYER_COUNT / 2).fill(0),
};

const nextPlayer = {
  active: ({ context }: { context: { active: number } }) =>
    (context.active + 1) % PLAYER_COUNT,
};

export const euchreMachine = setup({
  types: {
    context: {} as typeof initialContext,
    events: {} as
      | { type: "PASS" }
      | { type: "ORDER_UP" }
      | { type: "CALL_SUIT"; suit: Suit }
      | { type: "EXCHANGE"; card: Card }
      | { type: "PLAY"; card: Card },
  },
  actions: {
    chooseDealer: assign({
      dealer: () => Math.floor(Math.random() * PLAYER_COUNT),
    }),
    deal: enqueueActions(({ enqueue, context }) => {
      const { deck } = context;
      deck.reset();
      deck.shuffle();
      const players = new Array(PLAYER_COUNT)
        .fill(undefined)
        .map(() => deck.deal(HAND_SIZE));
      const revealed = deck.revealTop();
      enqueue.assign({
        players,
        active: (context.dealer + 1) % PLAYER_COUNT,
        revealed,
        trump: null,
      });
    }),
    nextPlayer: assign(nextPlayer),
    orderUp: assign({
      trump: ({ context }) => {
        if (!context.revealed) throw new Error();

        return context.revealed.suit;
      },
    }),
    exchangeCard: assign({
      players: ({ context, event }) => {
        if (event.type !== "EXCHANGE") throw new Error();
        if (!context.revealed) throw new Error();

        const { deck, players, dealer, revealed } = context;
        const cardRef = deck.getCardRef(event.card);
        if (!cardRef) throw new Error();

        return players.map((hand, player) => {
          if (player !== dealer) return hand;
          hand.delete(cardRef);
          hand.add(revealed);
          return hand;
        });
      },
    }),
    callSuit: assign({
      trump: ({ event }) => {
        if (event.type !== "CALL_SUIT") throw new Error();

        return event.suit;
      },
    }),
    nextDealer: assign({
      dealer: ({ context }) => (context.dealer + 1) % PLAYER_COUNT,
    }),
    assignActivePlayer: assign({
      active: ({ context }) => (context.dealer + 1) % PLAYER_COUNT,
    }),
    playCard: enqueueActions(({ enqueue, context, event }) => {
      if (event.type !== "PLAY") throw new Error();

      const { deck, trump, players, active, trick } = context;
      const cardRef = deck.getCardRef(event.card);
      if (!(cardRef && trump)) throw new Error();

      const winning = trick.every((card) => cardRef.compare(card, trump) === 1);
      if (winning) enqueue.assign({ winning: active });

      enqueue.assign({
        // remove card from hand
        players: players.map((hand, player) => {
          if (player !== active) return hand;
          hand.delete(cardRef);
          return hand;
        }),
        // add card to trick
        trick: [...trick, cardRef],
      });
    }),
    cleanupTrick: enqueueActions(({ enqueue, context }) => {
      const { trick, tricks, winning, tricksTaken } = context;
      enqueue.assign({
        active: winning,
        trick: [],
        tricks: [...tricks, trick],
        tricksTaken: tricksTaken.map((v, i) => (i === winning ? v + 1 : v)),
      });
    }),
  },
  guards: {
    isDealer: ({ context }) => context.active === context.dealer,
    canExchange: ({ context, event }) => {
      if (event.type !== "EXCHANGE") return false;

      const { deck, players, dealer } = context;

      // card must exist
      const cardRef = deck.getCardRef(event.card);
      if (!cardRef) return false;

      // card must be in hand
      return players[dealer].has(cardRef);
    },
    canCallSuit: ({ context, event }) => {
      if (event.type !== "CALL_SUIT") return false;
      if (!context.revealed) return false;

      // cannot call same suit as revelaed card
      return event.suit !== context.revealed.suit;
    },
    canPlay: ({ context, event }) => {
      if (event.type !== "PLAY") return false;

      const { deck, players, active, trick, trump } = context;
      if (!trump) return false;

      // card must exist
      const cardRef = deck.getCardRef(event.card);
      if (!cardRef) return false;

      // card must be in hand
      const hand = players[active];
      if (!hand.has(cardRef)) return false;

      // can play anything if leading
      const led = trick[0];
      if (!led) return true;

      // can play anything if unable to follow suit
      const cannotFollowSuit = Array.from(hand.values()).every(
        (card) => !card.sameSuit(led, trump)
      );
      if (cannotFollowSuit) return true;

      // must follow suit
      return event.card.sameSuit(led, trump);
    },
    roundOver: ({ context }) => {
      return context.tricks.length === HAND_SIZE;
    },
    trickOver: ({ context }) => {
      const teamTricksTaken = context.tricksTaken.reduce(
        (acc, tricks, i) => {
          acc[i % (PLAYER_COUNT % 2)] += tricks;
          return acc;
        },
        [0, 0]
      );
      if (teamTricksTaken[0] >= 3 && teamTricksTaken[1] >= 1) return true;
      if (teamTricksTaken[1] >= 3 && teamTricksTaken[0] >= 1) return true;
      return context.trick.length === PLAYER_COUNT;
    },
  },
}).createMachine({
  context: initialContext,
  initial: "start",
  states: {
    start: {
      always: {
        actions: "chooseDealer",
        target: "dealing",
      },
    },
    dealing: {
      always: {
        actions: "deal",
        target: "auction",
      },
    },
    auction: {
      tags: ["bidding"],
      on: {
        PASS: [
          {
            guard: "isDealer",
            actions: "nextPlayer",
            target: "open",
          },
          { actions: "nextPlayer", target: "auction" },
        ],
        ORDER_UP: {
          actions: "orderUp",
          target: "exchanging",
        },
      },
    },
    exchanging: {
      on: {
        EXCHANGE: {
          guard: "canExchange",
          actions: "exchangeCard",
          target: "playing",
        },
      },
    },
    open: {
      tags: ["bidding"],
      on: {
        PASS: [
          {
            guard: "isDealer",
            actions: "nextDealer",
            target: "dealing",
          },
          { actions: "nextPlayer", target: "open" },
        ],
        CALL_SUIT: {
          guard: "canCallSuit",
          actions: "callSuit",
          target: "playing",
        },
      },
    },
    playing: {
      entry: "assignActivePlayer",
      on: {
        PLAY: {
          guard: "canPlay",
          actions: ["playCard", "nextPlayer"],
          target: "playing",
        },
      },
      always: [
        {
          guard: "roundOver",
          target: "cleanup",
        },
        {
          guard: "trickOver",
          actions: "cleanupTrick",
          target: "playing",
        },
      ],
    },
    cleanup: {},
  },
});
