<script setup lang="ts">
import { createBrowserInspector } from "@statelyai/inspect";
import { useMachine } from "@xstate/vue";
import { computed } from "vue";
import { euchreMachine } from "./game/euchre";
import { displaySuit, suitIterator } from "./game/cards";
import type { Card } from "./game/cards";
import CardComponent from "./components/Card.vue";
import Hand from "./components/Hand.vue";
import PlayerInfo from "./components/PlayerInfo.vue";

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
</script>

<template>
  <div class="layout">
    <Hand :cards="snapshot.context.players[0]" @select-card="selectCard" />
    <section class="play-area">
      <PlayerInfo
        :is-dealer="snapshot.context.dealer === 2"
        :tricks-taken="0"
        :style="`--rotation: 180deg;`"
      />
      <CardComponent
        v-if="acrossCard"
        :card="acrossCard"
        class="across"
        disabled
      />
      <div v-else></div>
      <PlayerInfo
        :is-dealer="snapshot.context.dealer === 3"
        :tricks-taken="0"
        :style="`--rotation: -90deg;`"
      />
      <CardComponent v-if="leftCard" :card="leftCard" class="left" disabled />
      <div v-else></div>
      <CardComponent
        v-if="
          (snapshot.matches('auction') || snapshot.matches('exchanging')) &&
          snapshot.context.revealed
        "
        :card="snapshot.context.revealed"
        disabled
      />
      <div v-else-if="snapshot.context.trump">
        {{ displaySuit(snapshot.context.trump) }}
      </div>
      <div v-else></div>
      <CardComponent
        v-if="rightCard"
        :card="rightCard"
        class="right"
        disabled
      />
      <div v-else></div>
      <PlayerInfo
        :is-dealer="snapshot.context.dealer === 1"
        :tricks-taken="0"
        :style="`--rotation: 90deg;`"
      />
      <div
        class="auction"
        v-if="snapshot.matches('auction') && snapshot.context.active === 0"
      >
        <button @click="send({ type: 'PASS' })">Pass</button>
        <button @click="send({ type: 'ORDER_UP' })">Order Up</button>
      </div>
      <div
        class="open"
        v-else-if="snapshot.matches('open') && snapshot.context.active === 0"
      >
        <button @click="send({ type: 'PASS' })">Pass</button>
        <div>
          <button
            v-for="suit in openSuits"
            @click="send({ type: 'CALL_SUIT', suit })"
          >
            {{ displaySuit(suit) }}
          </button>
        </div>
      </div>
      <PlayerInfo
        :is-dealer="snapshot.context.dealer === 0"
        :tricks-taken="0"
      />
    </section>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100dvh;
  min-height: 100vh;
  display: grid;
  grid-template:
    "play-area" 1fr
    "hand" var(--card-height) / 1fr;
  justify-items: center;
  background: linear-gradient(180deg, black 10%, rgba(0, 0, 0, 30%)),
    var(--noise-5), rgb(0, 128, 0);
  overflow: hidden;
  perspective: 150dvh;
  perspective-origin: top;

  --card-width: var(--size-11);
  --card-height: var(--size-12);
}

.play-area {
  transform: rotateX(45deg);
  grid-area: play-area;
  display: grid;
  align-self: center;
  place-items: center;
  grid-template-rows: var(--card-height) var(--card-height) var(--card-height);
  grid-template-columns: var(--card-height) var(--card-width) var(--card-height);
  gap: var(--size-2);
}

.auction {
  display: grid;
  place-content: center;
  gap: var(--size-4);
}

.card.left {
  transform: rotate(90deg);
}
.card.across {
  transform: rotate(180deg);
}
.card.right {
  transform: rotate(-90deg);
}

.hand {
  grid-area: hand;
}
</style>
