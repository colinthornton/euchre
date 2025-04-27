<script setup lang="ts">
import { createBrowserInspector } from "@statelyai/inspect";
import { useMachine } from "@xstate/vue";
import { computed } from "vue";
import { euchreMachine } from "./euchre";
import { suitIterator } from "./cards";
import type { Card } from "./cards";
import CardComponent from "./components/Card.vue";
import PlayerInfo from "./components/PlayerInfo.vue";

const { inspect } = createBrowserInspector();

const { snapshot, send, actorRef } = useMachine(euchreMachine, { inspect });

for (let i = 1; i < 4; i++) {
  actorRef.subscribe((snapshot) => {
    const { context } = snapshot;
    if (context.active !== i) return;

    if (snapshot.hasTag("bidding")) {
      return send({ type: "PASS" });
    }

    if (snapshot.matches("exchanging")) {
      return send({
        type: "EXCHANGE",
        card: Array.from(context.players[i].values())[0],
      });
    }

    if (snapshot.matches("playing")) {
    }
  });
}

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
</script>

<template>
  <div class="layout">
    <section class="hand">
      <CardComponent
        v-for="(card, i) in snapshot.context.players[0]"
        :card="card"
        :style="`--index: ${i};`"
        class="card"
      />
    </section>
    <section class="play-area">
      <PlayerInfo
        :is-dealer="snapshot.context.dealer === 2"
        :tricks-taken="0"
        :style="`--rotation: 180deg;`"
      />
      <div></div>
      <PlayerInfo
        :is-dealer="snapshot.context.dealer === 3"
        :tricks-taken="0"
        :style="`--rotation: -90deg;`"
      />
      <div></div>
      <CardComponent
        v-if="snapshot.context.revealed"
        :card="snapshot.context.revealed"
        disabled
      />
      <div></div>
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
    "hand" auto / 1fr;
  justify-items: center;
  background: linear-gradient(180deg, black 10%, rgba(0, 0, 0, 30%)),
    var(--noise-5), rgb(0, 128, 0);
  overflow: hidden;

  --card-width: var(--size-11);
  --card-height: var(--size-12);
}

.play-area {
  grid-area: play-area;
  display: grid;
  align-self: center;
  grid-template-rows: var(--card-height) var(--card-height) var(--card-height);
  grid-template-columns: var(--card-height) var(--card-width) var(--card-height);
  gap: var(--size-2);
}

.auction {
  display: grid;
  place-content: center;
  gap: var(--size-4);
}

.hand {
  grid-area: hand;
  display: flex;
  margin-inline-start: var(--size-8);
}

.hand .card {
  z-index: var(--index);
  transform-origin: 50% 100%;
  margin-inline-start: calc(-1 * var(--size-8));
}
</style>
