<script setup lang="ts">
import { createBrowserInspector } from "@statelyai/inspect";
import { useMachine } from "@xstate/vue";
import { animate, createTimeline, utils } from "animejs";
import { computed, onMounted, useTemplateRef } from "vue";
import { euchreMachine } from "./game/euchre";
import { Suit, suitIterator, Card, Rank } from "./game/cards";
import CardComponent from "./components/Card.vue";
import Hand from "./components/Hand.vue";
import Deck from "./components/Deck.vue";

const { inspect } = createBrowserInspector();

const { snapshot, send, actorRef } = useMachine(euchreMachine, { inspect });

actorRef.subscribe(async (snapshot) => {
  const {
    context: { players, active },
  } = snapshot;
  if (active === 0) return;

  const wait = Math.floor(Math.random() * 1000) + 500;
  await new Promise((r) => setTimeout(r, wait));

  if (snapshot.hasTag("bidding")) {
    return send({ type: "PASS" });
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
    const playable = hand.find((card) => snapshot.can({ type: "PLAY", card }));
    if (!playable) throw new Error();
    send({ type: "PLAY", card: playable });
  }
});

// suits that can be selected for trump
const openSuits = computed(() => {
  const unavailable = snapshot.value.context.revealed?.suit;
  return suitIterator().filter((suit) => suit !== unavailable);
});

function selectCard(card: Card) {
  switch (snapshot.value.value) {
    case "exchanging":
      return send({ type: "EXCHANGE", card });
    case "playing":
      return send({ type: "PLAY", card });
  }
}

const leftCard = computed(() => snapshot.value.context.trick[1]);
const acrossCard = computed(() => snapshot.value.context.trick[2]);
const rightCard = computed(() => snapshot.value.context.trick[3]);

onMounted(async () => {
  // reveal auction card animation
  createTimeline()
    .add("#revealed .front", { rotateY: "-180deg", duration: 0 })
    .add("#revealed .back", { rotateY: "0deg", duration: 0 })
    .add("#deck", { y: { from: "50dvh" }, duration: 400, ease: "out" })
    .add("#revealed", {
      z: [0, ($target) => utils.get($target, "--card-width"), 0],
      ease: "in",
      duration: 400,
    })
    .add(
      "#revealed .front",
      { rotateY: "0deg", ease: "in", duration: 400 },
      "<<"
    )
    .add(
      "#revealed .back",
      { rotateY: "180deg", ease: "in", duration: 400 },
      "<<"
    );
});
</script>

<template>
  <div class="layout">
    <!-- <Hand :cards="snapshot.context.players[0]" @select-card="selectCard" /> -->
    <section class="play-area">
      <div class="cardzone">
        <Deck
          v-if="snapshot.context.revealed && snapshot.context.dealer === 0"
          :revealed="snapshot.context.revealed"
        />
      </div>
      <div class="cardzone left">
        <Deck
          v-if="snapshot.context.revealed && snapshot.context.dealer === 1"
          :revealed="snapshot.context.revealed"
        />
      </div>
      <div class="cardzone across">
        <Deck
          v-if="snapshot.context.revealed && snapshot.context.dealer === 2"
          :revealed="snapshot.context.revealed"
        />
      </div>
      <div class="cardzone right">
        <Deck
          v-if="snapshot.context.revealed && snapshot.context.dealer === 3"
          :revealed="snapshot.context.revealed"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100dvh;
  display: grid;
  grid-template:
    "play-area" 1fr
    "hand" var(--card-height) / 1fr;
  justify-items: center;
  background: linear-gradient(180deg, black 10%, rgba(0, 0, 0, 30%)),
    var(--noise-5), rgb(0, 128, 0);
  overflow: hidden;
  perspective: var(--perspective);
  perspective-origin: var(--perspective-origin);
  transform-style: preserve-3d;

  --perspective: 150dvh;
  --perspective-origin: top;
  --card-width: var(--size-fluid-6);
  --card-height: var(--size-fluid-7);
}

.play-area {
  transform: rotateX(45deg);
  grid-area: play-area;
  display: grid;
  align-self: center;
  place-items: center;
  grid-template:
    ". across ." var(--card-height)
    "left . right" var(--card-width)
    ". self ." var(--card-height) / var(--card-height) var(--card-width) var(--card-height);
  gap: var(--size-2);
  transform-style: preserve-3d;
}

.cardzone {
  grid-area: self;
  width: var(--card-width);
  height: var(--card-height);
  transform-style: preserve-3d;
}

.cardzone.left {
  grid-area: left;
  transform: rotate(90deg);
}
.cardzone.across {
  grid-area: across;
  transform: rotate(180deg);
}
.cardzone.right {
  grid-area: right;
  transform: rotate(-90deg);
}
</style>
