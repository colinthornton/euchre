<script setup lang="ts">
import { useMachine } from "@xstate/vue";
import { createTimeline } from "animejs";
import { computed, onMounted } from "vue";
import { euchreMachine } from "./game/euchre";
import { suitIterator, Card, Suit, displaySuit } from "./game/cards";
import CardComponent from "./components/Card.vue";
import Hand from "./components/Hand.vue";
import Deck from "./components/Deck.vue";
import { revealTop, revealHand } from "./animations";

const { snapshot, send, actorRef } = useMachine(euchreMachine);

actorRef.subscribe(async (snapshot) => {
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

const showDeck = computed(() => {
  const { value: state } = snapshot.value;
  return ["auction", "open", "exchanging"].includes(state);
});

onMounted(() => {
  createTimeline().sync(revealTop()).sync(revealHand(), "+=200");
});
</script>

<template>
  <div class="layout">
    <Hand
      :cards="snapshot.context.players[0]"
      :trump="snapshot.context.trump"
      :led="snapshot.context.trick[snapshot.context.leader]"
      :active="
        (snapshot.matches('playing') || snapshot.matches('exchanging')) &&
        snapshot.context.active === 0
      "
      @select-card="selectCard"
    />
    <section class="play-area">
      <div class="cardzone">
        <Deck
          v-if="
            showDeck &&
            snapshot.context.revealed &&
            snapshot.context.dealer === 0
          "
          :revealed="snapshot.context.revealed"
        />
        <CardComponent
          v-if="snapshot.context.trick[0]"
          :card="snapshot.context.trick[0]"
          disabled
        />
        <div class="call"></div>
      </div>
      <div class="cardzone left">
        <Deck
          v-if="
            showDeck &&
            snapshot.context.revealed &&
            snapshot.context.dealer === 1
          "
          :revealed="snapshot.context.revealed"
        />
        <CardComponent
          v-if="snapshot.context.trick[1]"
          :card="snapshot.context.trick[1]"
          disabled
        />
      </div>
      <div class="cardzone across">
        <Deck
          v-if="
            showDeck &&
            snapshot.context.revealed &&
            snapshot.context.dealer === 2
          "
          :revealed="snapshot.context.revealed"
        />
        <CardComponent
          v-if="snapshot.context.trick[2]"
          :card="snapshot.context.trick[2]"
          disabled
        />
      </div>
      <div class="cardzone right">
        <Deck
          v-if="
            showDeck &&
            snapshot.context.revealed &&
            snapshot.context.dealer === 3
          "
          :revealed="snapshot.context.revealed"
        />
        <CardComponent
          v-if="snapshot.context.trick[3]"
          :card="snapshot.context.trick[3]"
          disabled
        />
      </div>
      <div
        v-if="snapshot.context.trump"
        :class="['trump', snapshot.context.trump]"
      >
        {{ displaySuit(snapshot.context.trump) }}
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

.hand {
  grid-area: hand;
}

.play-area {
  transform: rotateX(45deg);
  grid-area: play-area;
  display: grid;
  align-self: center;
  place-items: center;
  grid-template:
    ". across ." var(--card-height)
    "left trump right" var(--card-width)
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

.trump {
  grid-area: trump;
  font-size: var(--font-size-8);
}

.trump.hearts,
.trump.diamonds {
  color: var(--red-7);
}
</style>
