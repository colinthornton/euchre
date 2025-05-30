import { createActor } from "xstate";
import { euchreClientMachine, PLAYER_COUNT, type ClientEvent } from "./euchre";
import { Card, Deck } from "./cards";

export async function decideMove(
  events: ClientEvent[],
  player: number
): Promise<
  | { type: "PASS" }
  | { type: "EXCHANGE"; card: Card }
  | { type: "PLAY"; card: Card }
  | undefined
> {
  const client = getClient(events, player);
  const snapshot = client.getSnapshot();
  const { context } = snapshot;

  await new Promise((r) => setTimeout(r, 500));

  if (snapshot.matches("auction")) {
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
      const client = getClient(events, player);
      const hands = dealHands(client);
      const card = playableCards[i % playableCards.length];
      const result = playRound(client, player, hands, card);
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
function getClient(events: ClientEvent[], player: number) {
  const client = createActor(euchreClientMachine, {
    input: { player },
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
function dealHands(client: ReturnType<typeof getClient>) {
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
    const player = (context.active + i) % PLAYER_COUNT;
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

function playRound(
  client: ReturnType<typeof getClient>,
  player: number,
  hands: Map<number, Card[]>,
  initialCard?: Card
): 0 | 1 {
  const before = client.getSnapshot().context;

  // play out the round
  while (client.getSnapshot().matches("playing")) {
    const snapshot = client.getSnapshot();
    const { active, led, trump } = snapshot.context;

    if (
      active === player &&
      initialCard &&
      snapshot.can({ type: "PLAY", card: initialCard })
    ) {
      client.send({ type: "PLAY", card: initialCard });
      continue;
    }

    let hand = active === player ? snapshot.context.hand : hands.get(active);
    if (!hand) throw new Error();

    // remove cards that don't follow suit
    if (led && hand.some((card) => card.sameSuit(led, trump))) {
      hand = hand.filter((card) => card.sameSuit(led, trump));
    }
    // pick a random card
    const randomCard = hand[Math.floor(Math.random()) * hand.length];
    // remove it from the hand
    if (active !== player) {
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

  const team = player % (PLAYER_COUNT / 2);
  const initialScore = before.score[team];
  const score = after.score[team];
  if (score > initialScore) return 1;

  return 0;
}
