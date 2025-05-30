import { createActor } from "xstate";
import { euchreClientMachine, type ClientEvent } from "./euchre";
import { type Card } from "./cards";

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

  await new Promise((r) => setTimeout(r, 1000));

  if (snapshot.hasTag("bidding")) {
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
    const playable = context.hand.find((card) =>
      snapshot.can({ type: "PLAY", card })
    );
    if (!playable) throw new Error();
    return { type: "PLAY", card: playable };
  }
}

function getClient(events: ClientEvent[], player: number) {
  const client = createActor(euchreClientMachine, {
    input: { player },
  }).start();
  for (const event of events) {
    client.send(event);
  }
  return client;
}
