<script setup lang="ts">
import { watch } from "vue";
import { Card, displaySuit } from "./game/cards";
import Hand from "./components/Hand.vue";
import BidSelection from "./components/BidSelection.vue";
import { useEuchreClient } from "./composables/useEuchreClient.ts";
import { EuchreServer } from "./game/server";
import Debug from "./components/Debug.vue";
import Cardzone from "./components/Cardzone.vue";
import type { ClientEvent } from "./game/euchre";
import BidDisplay from "./components/BidDisplay.vue";

const { state, event, enqueue, next } = useEuchreClient();

const server = new EuchreServer(0);
server.listen((event) => {
  enqueue(event);
});
server.start();

watch(
  event,
  () => {
    if (!event.value) return;
    switch (event.value.type) {
      // animate these someday
      case "CHOOSE_DEALER":
      case "DEAL":
      case "EXCHANGE":
      case "ORDER_UP":
      case "CALL_SUIT":
        return next();
    }
  },
  { immediate: true }
);

function selectCard(card: Card) {
  switch (state.value.phase) {
    case "exchanging":
      return send({ type: "EXCHANGE", card });
    case "playing":
      return send({ type: "PLAY", card });
  }
}

function send(event: ClientEvent) {
  server.send(event);
  next();
}
</script>

<template>
  <div class="layout">
    <Hand
      :cards="state.hand"
      :trump="state.trump"
      :led="state.led"
      :active="
        ['exchanging', 'playing'].includes(state.phase) && state.active === 0
      "
      @select-card="selectCard"
    />
    <BidSelection class="bid" @event="(event) => send(event)" />
    <section class="play-area">
      <Cardzone :player="0" />
      <Cardzone area="left" :player="1" />
      <Cardzone area="across" :player="2" />
      <Cardzone area="right" :player="3" />
      <div v-if="state.trump" class="trump" :class="state.trump">
        {{ displaySuit(state.trump) }}
      </div>
    </section>
    <BidDisplay />
  </div>

  <Debug />
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

.bid {
  position: fixed;
  bottom: var(--card-height);
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
}
.cardzone.left {
  grid-area: left;
}
.cardzone.across {
  grid-area: across;
}
.cardzone.right {
  grid-area: right;
}

.trump {
  grid-area: trump;
  border-radius: var(--radius-round);
  font-size: var(--font-size-8);
  padding: 0;
  width: 1em;
  height: 1em;
  line-height: 1em;
  text-align: center;
  user-select: none;
  opacity: 0.8;
}

.trump.hearts,
.trump.diamonds {
  color: var(--red-7);
}
</style>
