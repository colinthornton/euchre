import { createActor } from "xstate";
import { euchreClientMachine, PLAYER_COUNT, type ClientEvent } from "./euchre";
import { Card, Deck, Suit } from "./cards";

const PRELIMINARY_SIMULATIONS = 100;
const MAX_SIMULATIONS = 1000;
const NO_CONFIDENCE_RATIO = 0.45;
const CONFIDENCE_RATIO = 0.55;

export async function decideMove(
  events: ClientEvent[],
  bot: number
): Promise<
  | { type: "PASS" }
  | { type: "ORDER_UP" }
  | { type: "EXCHANGE"; card: Card }
  | { type: "PLAY"; card: Card }
  | undefined
> {
  const client = getClient(events, bot);
  const snapshot = client.getSnapshot();
  const { context } = snapshot;

  await new Promise((r) => setTimeout(r, 500));

  if (snapshot.matches("auction")) {
    const { hand, revealed } = context;
    if (!revealed) throw new Error();

    // pass unless you have some trumps cards
    if (!hand.some((card) => card.isTrump(revealed.suit))) {
      return { type: "PASS" };
    }

    let wins = 0;

    for (let i = 0; i < MAX_SIMULATIONS; i++) {
      const client = getClient(events, bot);
      const hands = dealHands(client, bot);
      client.send({ type: "ORDER_UP" });
      exchangeRandomly(client, bot, hands);
      wins += playRound(client, bot, hands);

      if (
        i === PRELIMINARY_SIMULATIONS &&
        wins < PRELIMINARY_SIMULATIONS * NO_CONFIDENCE_RATIO
      ) {
        return { type: "PASS" };
      }
    }

    if (wins >= MAX_SIMULATIONS * CONFIDENCE_RATIO) {
      console.log({ wins, hand });
      return { type: "ORDER_UP" };
    }

    return { type: "PASS" };
  }

  if (snapshot.matches("open")) {
    return { type: "PASS" };
  }

  // exchange first card
  if (snapshot.matches("exchanging")) {
    return {
      type: "EXCHANGE",
      card: context.hand[0],
    };
  }

  // play first playable card in hand
  if (snapshot.matches("playing")) {
    const playableCards = context.hand.filter((card) =>
      snapshot.can({ type: "PLAY", card })
    );
    if (playableCards.length === 1) {
      return { type: "PLAY", card: playableCards[0] };
    }

    const results = new Map<Card, number>();
    const maxSimulations = 1000 + (1000 % playableCards.length);
    for (let i = 0; i < maxSimulations; i++) {
      const client = getClient(events, bot);
      const hands = dealHands(client, bot);
      const card = playableCards[i % playableCards.length];
      const result = playRound(client, bot, hands, card);
      results.set(card, (results.get(card) ?? 0) + result);
    }
    console.log(results);
    const [card] = Array.from(results.entries()).reduce(
      ([bestCard, bestScore], [card, score]) =>
        score > bestScore ? [card, score] : [bestCard, bestScore]
    );
    return { type: "PLAY", card };
  }
}

/**
 * get the bot's client state by replaying events
 */
function getClient(events: ClientEvent[], bot: number) {
  const client = createActor(euchreClientMachine, {
    input: { player: bot },
  });
  client.start();
  for (const event of events) {
    if (client.getSnapshot().can(event)) {
      client.send(event);
    } else {
      console.log("can't send", event);
      console.log(client.getSnapshot().value);
      console.log(client.getSnapshot().context);
      throw new Error();
    }
  }
  return client;
}

/**
 * deal out cards randomly from those not seen yet seen
 */
function dealHands(client: ReturnType<typeof getClient>, bot: number) {
  const { context } = client.getSnapshot();

  const seenCards = [
    context.hand,
    context.revealed,
    context.trick,
    context.tricks,
  ]
    .flat(2)
    .filter((card) => card !== null);
  const deck = new Deck(seenCards).shuffle();

  const hands = new Map<number, Card[]>();
  for (let i = 1; i < PLAYER_COUNT; i++) {
    const player = (bot + i) % PLAYER_COUNT;
    const hasPlayed = context.trick[player] !== null;
    const isDealer = player === context.dealer;
    const hasExchanged = context.exchanged;

    const toDeal = hasPlayed ? context.hand.length - 1 : context.hand.length;

    let hand: Card[];
    if (isDealer && hasExchanged) {
      hand = deck.deal(toDeal - 1).concat(context.revealed!);
    } else {
      hand = deck.deal(toDeal);
    }
    hands.set(player, hand);
  }

  return hands;
}

function exchangeRandomly(
  client: ReturnType<typeof getClient>,
  bot: number,
  hands: ReturnType<typeof dealHands>
) {
  const { context } = client.getSnapshot();
  const { active, trump } = context;
  const hand = active === bot ? context.hand : hands.get(active);
  if (!hand) throw new Error();

  const sorted = hand.slice().sort((a, b) => b.compare(a, trump, null));
  const candidates = new Map<Suit, Card>();
  for (const card of sorted) {
    if (card.isTrump(trump)) continue;
    if (candidates.get(card.suit)) continue;
    candidates.set(card.suit, card);
  }

  // nothing but trumps for some reason, trade the lowest
  if (candidates.size === 0) {
    client.send({ type: "EXCHANGE", card: sorted[0] });
    return;
  }

  const cards = Array.from(candidates.values());
  const randomCard = cards[Math.floor(Math.random() * cards.length)];
  client.send({ type: "EXCHANGE", card: randomCard });
}

function playRound(
  client: ReturnType<typeof getClient>,
  bot: number,
  hands: ReturnType<typeof dealHands>,
  initialCard?: Card
): 0 | 1 {
  const before = client.getSnapshot().context;

  // play out the round
  while (client.getSnapshot().matches("playing")) {
    const snapshot = client.getSnapshot();
    const { active, led, trump } = snapshot.context;

    if (
      active === bot &&
      initialCard &&
      snapshot.can({ type: "PLAY", card: initialCard })
    ) {
      client.send({ type: "PLAY", card: initialCard });
      continue;
    }

    let hand = active === bot ? snapshot.context.hand : hands.get(active);
    if (!hand) throw new Error();

    // remove cards that don't follow suit
    if (led && hand.some((card) => card.sameSuit(led, trump))) {
      hand = hand.filter((card) => card.sameSuit(led, trump));
    }
    // pick a random card
    const randomCard = hand[Math.floor(Math.random()) * hand.length];
    // remove it from the hand
    if (active !== bot) {
      hands.set(
        active,
        hands.get(active)!.filter((card) => !card.equal(randomCard))
      );
    }
    client.send({
      type: "PLAY",
      card: randomCard,
    });
  }

  const after = client.getSnapshot().context;

  const team = bot % (PLAYER_COUNT / 2);
  const initialScore = before.score[team];
  const score = after.score[team];
  if (score > initialScore) return 1;

  return 0;
}
