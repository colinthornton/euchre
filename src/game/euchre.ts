import { assign, setup } from "xstate";
import { Card, type Suit } from "./cards";
import Hand from "../components/Hand.vue";

export const PLAYER_COUNT = 4;
export const HAND_SIZE = 5;
export const WINNING_SCORE = 10;

export type ServerEvent =
  | { type: "CHOOSE_DEALER"; dealer: number }
  | { type: "DEAL"; players: Hand[]; revealed: Card }
  | { type: "PASS" }
  | { type: "ORDER_UP" }
  | { type: "CALL_SUIT"; suit: Suit }
  | { type: "EXCHANGE"; card: Card }
  | { type: "PLAY"; card: Card };

type Hand = Card[];
type Trick = (Card | null)[];

const initialServerContext = {
  events: [] as ServerEvent[],
  dealer: 0, // index of dealer
  players: [] as Hand[],
  revealed: null as Card | null,
  active: 0, // index of active player
  maker: null as number | null, // who called trump
  trump: null as Suit | null,
  led: null as Card | null,
  trick: new Array(PLAYER_COUNT).fill(null) as Trick, // current trick
  tricks: [] as Trick[], // finished tricks
  taken: new Array<number>(PLAYER_COUNT).fill(0), // tricks taken by each player in current round
  score: new Array<number>(PLAYER_COUNT / 2).fill(0),
};

export const euchreServerMachine = setup({
  types: {
    context: {} as typeof initialServerContext,
    events: {} as ServerEvent,
  },
  actions: {
    logEvent: assign({
      events: ({ context, event }) => context.events.concat(event),
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
      maker: ({ context }) => context.active,
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
      maker: ({ context }) => context.active,
    }),
    nextDealer: assign(({ context }) => {
      const dealer = (context.dealer + 1) % PLAYER_COUNT;
      return {
        dealer,
        active: dealer,
      };
    }),
    assignLead: assign({
      active: ({ context }) => (context.dealer + 1) % PLAYER_COUNT,
    }),
    playCard: assign(({ context, event }) => {
      if (event.type !== "PLAY") throw new Error();

      const { active, led } = context;

      // remove card from hand
      const players = context.players.map((hand, player) => {
        if (player !== active) return hand;
        return hand.filter((card) => !card.equal(event.card));
      });

      // add card to trick
      const trick = context.trick.map((card, i) =>
        i === active ? event.card : card
      );

      return {
        players,
        led: led ?? event.card,
        trick,
      };
    }),
    cleanupTrick: assign(({ context }) => {
      const { trick, trump, led } = context;
      if (trump === null) throw new Error();
      if (led === null) throw new Error();

      const winner = trick.reduce((winner, card, i) => {
        if (trick[winner]!.compare(card!, trump, led) > 0) return i;
        return winner;
      }, 0);

      const taken = context.taken.map((count, i) => {
        if (winner !== i) return count;
        return count + 1;
      });

      return {
        active: winner,
        led: null,
        trick: new Array(PLAYER_COUNT).fill(null),
        tricks: context.tricks.concat(trick),
        taken,
      };
    }),
    cleanupRound: assign(({ context }) => {
      const { taken, maker } = context;
      if (maker === null) throw new Error();

      const teamTaken = [taken[0] + taken[2], taken[1] + taken[3]];
      const winningTeam = teamTaken.findIndex((taken) => taken > HAND_SIZE / 2);

      const isSweep = teamTaken[winningTeam] === HAND_SIZE;
      const isSet = maker % (PLAYER_COUNT / 2) !== winningTeam;

      const score = context.score.map((points, i) => {
        if (i !== winningTeam) return points;
        return points + (isSweep || isSet ? 2 : 1);
      });

      return {
        revealed: null,
        trump: null,
        maker: null,
        taken: new Array<number>(PLAYER_COUNT).fill(0),
        tricks: [],
        score,
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

      const { players, active, led, trump } = context;
      if (trump === null) return false;

      // card must be in hand
      const hand = players[active];
      if (!hand.some((card) => card.equal(event.card))) return false;

      // can play anything if no lead yet
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
    gameOver: ({ context }) => {
      return context.score.some((points) => points >= WINNING_SCORE);
    },
  },
}).createMachine({
  context: initialServerContext,
  initial: "start",
  states: {
    start: {
      on: {
        CHOOSE_DEALER: {
          actions: ["logEvent", "chooseDealer"],
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
    cleanup: {
      entry: "cleanupRound",
      always: [
        {
          guard: "gameOver",
          target: "over",
        },
        {
          actions: "nextDealer",
          target: "dealing",
        },
      ],
    },
    over: {
      type: "final",
    },
  },
});

export type ClientEvent =
  | { type: "CHOOSE_DEALER"; dealer: number }
  | { type: "DEAL"; hand: Hand; revealed: Card }
  | { type: "PASS" }
  | { type: "ORDER_UP" }
  | { type: "CALL_SUIT"; suit: Suit }
  | { type: "EXCHANGE"; card?: Card }
  | { type: "PLAY"; card: Card };

const initialClientContext = {
  events: [] as ClientEvent[],
  dealer: 0,
  player: 0,
  hand: [] as Hand,
  revealed: null as Card | null,
  active: 0,
  maker: null as number | null,
  trump: null as Suit | null,
  exchanged: false,
  led: null as Card | null,
  trick: new Array(PLAYER_COUNT).fill(null) as Trick,
  tricks: [] as Trick[], // finished tricks
  taken: new Array<number>(PLAYER_COUNT).fill(0),
  score: new Array<number>(PLAYER_COUNT / 2).fill(0),
};

/**
 * State machine used to track the game state from a single
 * player's perspective. They do not have knowledge of hidden
 * information like cards in other players.
 */
export const euchreClientMachine = setup({
  types: {
    context: {} as typeof initialClientContext,
    events: {} as ClientEvent,
    input: {} as {
      player: number;
    },
  },
  actions: {
    logEvent: assign({
      events: ({ context, event }) => context.events.concat(event),
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
        hand: event.hand,
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
      maker: ({ context }) => context.active,
    }),
    exchangeCard: assign(({ context, event }) => {
      if (event.type !== "EXCHANGE") throw new Error();

      if (context.active !== context.player) {
        return {
          exchanged: true,
        };
      }

      if (!event.card) throw new Error();
      if (!context.revealed) throw new Error();
      return {
        hand: context.hand
          .filter((card) => !card.equal(event.card!))
          .concat(context.revealed),
        exchanged: true,
      };
    }),
    nextDealer: assign(({ context }) => {
      const dealer = (context.dealer + 1) % PLAYER_COUNT;
      return {
        dealer,
        active: dealer,
      };
    }),
    callSuit: assign({
      trump: ({ event }) => {
        if (event.type !== "CALL_SUIT") throw new Error();
        return event.suit;
      },
      maker: ({ context }) => context.active,
    }),
    assignLead: assign({
      active: ({ context }) => (context.dealer + 1) % PLAYER_COUNT,
    }),
    playCard: assign(({ context, event }) => {
      if (event.type !== "PLAY") throw new Error();

      const { active, player, hand, led } = context;

      const trick = context.trick.map((card, i) =>
        i === active ? event.card : card
      );

      if (active !== player) {
        return {
          led: led ?? event.card,
          trick,
        };
      }

      return {
        hand: hand.filter((card) => !card.equal(event.card)),
        led: led ?? event.card,
        trick,
      };
    }),
    cleanupTrick: assign(({ context }) => {
      const { trick, trump, led } = context;
      if (trump === null) throw new Error();
      if (led === null) throw new Error();

      const winner = trick.reduce((winner, card, i) => {
        if (trick[winner]!.compare(card!, trump, led) > 0) return i;
        return winner;
      }, 0);

      const taken = context.taken.map((count, i) => {
        if (winner !== i) return count;
        return count + 1;
      });

      return {
        active: winner,
        led: null,
        trick: new Array(PLAYER_COUNT).fill(null),
        tricks: context.tricks.concat(trick),
        taken,
      };
    }),
    cleanupRound: assign(({ context }) => {
      const { taken, maker } = context;
      if (maker === null) throw new Error();

      const teamTaken = [taken[0] + taken[2], taken[1] + taken[3]];
      const winningTeam = teamTaken.findIndex((taken) => taken > HAND_SIZE / 2);

      const isSweep = teamTaken[winningTeam] === HAND_SIZE;
      const isSet = maker % (PLAYER_COUNT / 2) !== winningTeam;

      const score = context.score.map((points, i) => {
        if (i !== winningTeam) return points;
        return points + (isSweep || isSet ? 2 : 1);
      });

      return {
        revealed: null,
        trump: null,
        maker: null,
        taken: new Array<number>(PLAYER_COUNT).fill(0),
        tricks: [],
        score,
      };
    }),
  },
  guards: {
    isDealer: ({ context }) => context.active === context.dealer,
    canExchange: ({ context, event }) => {
      if (event.type !== "EXCHANGE") return false;
      // other players can exchange freely
      if (context.active !== context.player) return true;
      if (!event.card) return false;
      // card must be in hand
      return context.hand.some((card) => card.equal(event.card!));
    },
    canCallSuit: ({ context, event }) => {
      if (event.type !== "CALL_SUIT") return false;
      if (!context.revealed) return false;
      // cannot call same suit as revelaed card
      return event.suit !== context.revealed.suit;
    },
    canPlay: ({ context, event }) => {
      if (event.type !== "PLAY") return false;

      const { hand, active, player, led, trump } = context;
      if (trump === null) return false;

      // other players can play any card you don't have
      if (active !== player) {
        return hand.every((card) => !card.equal(event.card));
      }

      // card must be in hand
      if (!hand.some((card) => card.equal(event.card))) return false;

      // can play anything if no lead yet
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
    gameOver: ({ context }) => {
      return context.score.some((points) => points >= WINNING_SCORE);
    },
  },
}).createMachine({
  context: ({ input }) => Object.assign(initialClientContext, input),
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
    cleanup: {
      entry: "cleanupRound",
      always: [
        {
          guard: "gameOver",
          target: "over",
        },
        {
          actions: "nextDealer",
          target: "dealing",
        },
      ],
    },
    over: {
      type: "final",
    },
  },
});
