import { assign, setup } from "xstate";
import { Card, type Suit } from "./cards";

export const PLAYER_COUNT = 4;
export const HAND_SIZE = 5;

type Event =
  | { type: "CHOOSE_DEALER"; dealer: number }
  | { type: "DEAL"; players: Hand[]; revealed: Card }
  | { type: "PASS" }
  | { type: "ORDER_UP" }
  | { type: "CALL_SUIT"; suit: Suit }
  | { type: "EXCHANGE"; card: Card }
  | { type: "PLAY"; card: Card };

type Hand = Card[];
type Trick = (Card | null)[];

const initialContext = {
  events: [] as (Event & { actor: number })[],
  dealer: 0, // index of dealer
  players: [] as Hand[],
  revealed: null as Card | null,
  active: 0, // index of active player
  trump: null as Suit | null,
  leader: 0, // index of who led the trick
  trick: new Array(PLAYER_COUNT).fill(null) as Trick, // current trick
  tricks: [] as Trick[], // finished tricks
  taken: new Array<number>(PLAYER_COUNT).fill(0), // tricks taken by each player in current round
  score: new Array<number>(PLAYER_COUNT / 2).fill(0),
};

export const euchreMachine = setup({
  types: {
    context: {} as typeof initialContext,
    events: {} as Event,
  },
  actions: {
    logEvent: assign({
      events: ({ context, event }) =>
        context.events.concat({ ...event, actor: context.active }),
    }),
    chooseDealer: assign(({ event }) => {
      if (event.type !== "CHOOSE_DEALER") throw new Error();
      return {
        dealer: event.dealer,
        active: event.dealer,
      };
    }),
    deal: assign(({ event }) => {
      if (event.type !== "DEAL") throw new Error();
      return {
        players: event.players,
        revealed: event.revealed,
      };
    }),
    nextPlayer: assign({
      active: ({ context }) => (context.active + 1) % PLAYER_COUNT,
    }),
    orderUp: assign({
      active: ({ context }) => context.dealer,
      trump: ({ context }) => {
        if (!context.revealed) throw new Error();

        return context.revealed.suit;
      },
    }),
    exchangeCard: assign({
      players: ({ context, event }) => {
        if (event.type !== "EXCHANGE") throw new Error();
        if (!context.revealed) throw new Error();

        const { players, dealer, revealed } = context;

        return players.map((hand, player) => {
          if (player !== dealer) return hand;
          const newHand = hand.filter((card) => !card.equal(event.card));
          newHand.push(revealed);
          return newHand;
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
    assignLead: assign(({ context }) => {
      const leader = (context.dealer + 1) % PLAYER_COUNT;
      return {
        active: leader,
        leader,
      };
    }),
    playCard: assign(({ context, event }) => {
      if (event.type !== "PLAY") throw new Error();

      const { trump, active } = context;
      if (trump === null) throw new Error();

      // remove card from hand
      const players = context.players.map((hand, player) => {
        if (player !== active) return hand;
        return hand.filter((card) => !card.equal(event.card));
      });

      // add card to trick
      const trick = [...context.trick];
      trick[active] = event.card;

      return { players, trick };
    }),
    cleanupTrick: assign(({ context }) => {
      const { trick, trump } = context;
      if (trump === null) throw new Error();

      let winner = 0;
      for (let i = 1; i < trick.length; i++) {
        const card = trick[i];
        const winningCard = trick[winner];
        if (!(card && winningCard)) throw new Error();
        if (card.compare(winningCard, trump) === 1) {
          winner = i;
        }
      }

      const taken = context.taken.map((count, i) => {
        if (winner !== i) return count;
        return count + 1;
      });

      return {
        active: winner,
        leader: winner,
        trick: new Array(PLAYER_COUNT).fill(null),
        tricks: context.tricks.concat(trick),
        taken,
      };
    }),
  },
  guards: {
    isDealer: ({ context }) => context.active === context.dealer,
    canExchange: ({ context, event }) => {
      if (event.type !== "EXCHANGE") return false;

      const { players, dealer } = context;

      // card must be in hand
      return players[dealer].some((card) => card.equal(event.card));
    },
    canCallSuit: ({ context, event }) => {
      if (event.type !== "CALL_SUIT") return false;
      if (!context.revealed) return false;

      // cannot call same suit as revelaed card
      return event.suit !== context.revealed.suit;
    },
    canPlay: ({ context, event }) => {
      if (event.type !== "PLAY") return false;

      const { players, active, trick, leader, trump } = context;
      if (trump === null) return false;

      // card must be in hand
      const hand = players[active];
      if (!hand.some((card) => card.equal(event.card))) return false;

      // can play anything if no lead yet
      const led = trick[leader];
      if (!led) return true;

      // can play anything if unable to follow suit
      const isVoid = !hand.some((card) => card.sameSuit(led, trump));
      if (isVoid) return true;

      // must follow suit
      return event.card.sameSuit(led, trump);
    },
    roundOver: ({ context }) => {
      return context.taken.reduce((a, b) => a + b) === HAND_SIZE;
    },
    trickOver: ({ context }) => {
      return context.trick.every((card) => card !== null);
    },
  },
}).createMachine({
  context: initialContext,
  initial: "start",
  states: {
    start: {
      on: {
        CHOOSE_DEALER: {
          actions: "chooseDealer",
          target: "dealing",
        },
      },
    },
    dealing: {
      on: {
        DEAL: {
          actions: ["logEvent", "deal", "nextPlayer"],
          target: "auction",
        },
      },
    },
    auction: {
      tags: ["bidding"],
      on: {
        PASS: [
          {
            guard: "isDealer",
            actions: ["logEvent", "nextPlayer"],
            target: "open",
          },
          { actions: ["logEvent", "nextPlayer"], target: "auction" },
        ],
        ORDER_UP: {
          actions: ["logEvent", "orderUp"],
          target: "exchanging",
        },
      },
    },
    exchanging: {
      on: {
        EXCHANGE: {
          guard: "canExchange",
          actions: ["logEvent", "exchangeCard"],
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
            actions: ["logEvent", "nextDealer"],
            target: "dealing",
          },
          { actions: ["logEvent", "nextPlayer"], target: "open" },
        ],
        CALL_SUIT: {
          guard: "canCallSuit",
          actions: ["logEvent", "callSuit"],
          target: "playing",
        },
      },
    },
    playing: {
      entry: "assignLead",
      on: {
        PLAY: {
          guard: "canPlay",
          actions: ["logEvent", "playCard", "nextPlayer"],
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
