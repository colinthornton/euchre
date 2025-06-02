import { createActor } from "xstate";
import { euchreClientMachine, PLAYER_COUNT, type ClientEvent } from "./euchre";
import { Card, Deck, Rank, Suit, suits } from "./cards";

const PRELIMINARY_SIMULATIONS = 30;
const CHECK_EVERY = 10;
const MAX_SIMULATIONS = 1000;
const PASS_STATS = statistics([]);

export async function decideMove(
  events: ClientEvent[],
  bot: number
): Promise<
  | { type: "PASS" }
  | { type: "ORDER_UP" }
  | { type: "EXCHANGE"; card: Card }
  | { type: "CALL_SUIT"; suit: Suit }
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

    // pass unless you have at least one trump
    if (!hand.some((card) => card.isTrump(revealed.suit))) {
      console.log("PASS: no trump");
      return { type: "PASS" };
    }

    const evs = [];
    let stats = statistics([]);

    for (let i = 0; i < MAX_SIMULATIONS; i++) {
      const client = getClient(events, bot);
      const hands = dealHands(client, bot);
      client.send({ type: "ORDER_UP" });
      exchangeRandomly(client, bot, hands);
      evs.push(playRound(client, bot, hands));

      if (i < PRELIMINARY_SIMULATIONS) continue;
      if (i % CHECK_EVERY !== 0) continue;

      stats = statistics(evs);
      if (stats.mean < 0 && isSignificantlyBetter(PASS_STATS, stats)) {
        console.log("PASS:", { stats, hand });
        return { type: "PASS" };
      } else if (isSignificantlyBetter(stats, PASS_STATS)) {
        console.log("ORDER_UP:", { stats, hand });
        return { type: "ORDER_UP" };
      }
    }

    console.log("PASS:", { stats, hand });
    return { type: "PASS" };
  }

  if (snapshot.matches("open")) {
    const { hand, revealed } = context;
    if (!revealed) throw new Error();

    const candidates = suits().filter((suit) => {
      if (revealed.suit === suit) return false;
      if (hand.some((card) => card.isTrump(suit))) return true;
      return false;
    });

    const stats = new Map<Suit, ReturnType<typeof statistics>>();
    for (const suit of candidates) {
      stats.set(suit, statistics([]));
    }

    let i = 0;
    let simulations = 0;
    const ignore = new Set<Suit>();
    while ((i++, simulations < MAX_SIMULATIONS)) {
      const suit = candidates[i % candidates.length];
      if (ignore.has(suit)) continue;

      // simulate round
      const client = getClient(events, bot);
      const hands = dealHands(client, bot);
      client.send({ type: "CALL_SUIT", suit });
      const ev = playRound(client, bot, hands);
      simulations++;

      // update stats
      const { evs } = stats.get(suit)!;
      evs.push(ev);
      stats.set(suit, statistics(evs));

      // get a baseline of EVs for all options
      if (i < PRELIMINARY_SIMULATIONS * candidates.length) continue;

      // periodically compare moves to remove bad ones
      if (i % (CHECK_EVERY * candidates.length) !== 0) continue;

      const sorted = Array.from(stats.entries()).sort(
        (a, b) => b[1].mean - a[1].mean
      );
      const [, bestStats] = sorted[0];
      if (isSignificantlyBetter(PASS_STATS, bestStats)) {
        console.log("PASS:", { stats, hand });
        return { type: "PASS" };
      }
      for (let i = 1; i < sorted.length; i++) {
        const [suit, stats] = sorted[i];
        if (ignore.has(suit)) continue;
        if (
          isSignificantlyBetter(bestStats, stats) ||
          isSignificantlyBetter(PASS_STATS, stats)
        ) {
          ignore.add(suit);
        }
      }

      // only one candidate remains
      if (ignore.size === candidates.length - 1) break;
    }

    const sorted = Array.from(stats.entries()).sort(
      (a, b) => b[1].mean - a[1].mean
    );
    const [suit, stat] = sorted[0];
    if (isSignificantlyBetter(stat, PASS_STATS)) {
      console.log("CALL_SUIT:", { stats, hand });
      return { type: "CALL_SUIT", suit };
    }

    console.log("PASS:", { stats, hand });
    return { type: "PASS" };
  }

  if (snapshot.matches("exchanging")) {
    const candidates = exchangeCandidates(context.hand, context.trump);
    if (candidates.length === 1) {
      return { type: "EXCHANGE", card: candidates[0] };
    }

    const results = new Map<Card, number>();
    for (let i = 0; i < MAX_SIMULATIONS; i++) {
      const client = getClient(events, bot);
      const hands = dealHands(client, bot);
      const card = candidates[i % candidates.length];
      client.send({ type: "EXCHANGE", card });
      results.set(
        card,
        (results.get(card) ?? 0) + playRound(client, bot, hands)
      );
    }
    console.log(results);
    const [card] = Array.from(results.entries()).reduce(
      ([bestCard, bestScore], [card, score]) =>
        score > bestScore ? [card, score] : [bestCard, bestScore]
    );
    return { type: "EXCHANGE", card };
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

  const candidates = exchangeCandidates(hand, trump);
  const randomCard = candidates[Math.floor(Math.random() * candidates.length)];
  client.send({ type: "EXCHANGE", card: randomCard });
}

/**
 * extract candidates for exchanging from hand
 */
function exchangeCandidates(hand: Card[], trump: Suit | null): Card[] {
  const sorted = hand.slice().sort((a, b) => b.compare(a, trump, null));
  const candidates = new Map<Suit, Card>();
  for (const card of sorted) {
    // don't throw away trumps
    if (card.isTrump(trump)) continue;
    // don't throw away aces
    if (card.rank === Rank.Ace) continue;
    // don't throw away higher ranked cards
    if (candidates.get(card.suit)) continue;
    candidates.set(card.suit, card);
  }
  // nothing but trumps for some reason, send the lowest
  if (candidates.size === 0) {
    return [sorted[0]];
  }
  return Array.from(candidates.values());
}

function playRound(
  client: ReturnType<typeof getClient>,
  bot: number,
  hands: ReturnType<typeof dealHands>,
  initialCard?: Card
) {
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
  const opponents = (bot + 1) % (PLAYER_COUNT / 2);
  return (
    after.score[team] -
    before.score[team] -
    (after.score[opponents] - before.score[opponents])
  );
}

function statistics(evs: number[]) {
  if (evs.length < 1) {
    return {
      evs,
      n: 0,
      mean: 0,
      variance: 0,
      standardError: 0,
    };
  }

  const n = evs.length;
  const mean = evs.reduce((sum, x) => sum + x, 0) / n;
  const variance = evs.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1);
  const standardError = Math.sqrt(variance) / Math.sqrt(n);
  return {
    evs,
    n,
    mean,
    variance,
    standardError,
  };
}

function isSignificantlyBetter(
  a: { mean: number; standardError: number },
  b: { mean: number; standardError: number },
  confidenceZ: number = 1.96 // 95%
): boolean {
  const diff = a.mean - b.mean;
  const seDiff = Math.sqrt(a.standardError ** 2 + b.standardError ** 2);

  return diff > confidenceZ * seDiff;
}
