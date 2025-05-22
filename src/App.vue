<script setup lang="ts">
import { computed, watch } from "vue";
import { suitIterator, Card, displaySuit } from "./game/cards";
import CardComponent from "./components/Card.vue";
import Hand from "./components/Hand.vue";
import Deck from "./components/Deck.vue";
import { useEuchreClient } from "./composables/useEuchreClient";
import { EuchreServer } from "./game/server";
import Debug from "./components/Debug.vue";

const { state, context, enqueue, next } = useEuchreClient();

const server = new EuchreServer(0);
server.listen((event) => {
  console.log("server", event);
  enqueue(event);
});
server.start();

function selectCard(card: Card) {
  switch (state.value) {
    case "exchanging":
      return server.send({ type: "EXCHANGE", card });
    case "playing":
      return server.send({ type: "PLAY", card });
  }
}
</script>

<template>
  <div class="layout">
    <Hand
      :cards="context.hand"
      :trump="context.trump"
      :led="context.led"
      :active="
        (state === 'playing' || state === 'exchanging') && context.active === 0
      "
      @select-card="selectCard"
    />
    <section class="play-area">
      <div class="cardzone"></div>
      <div class="cardzone left"></div>
      <div class="cardzone across"></div>
      <div class="cardzone right"></div>
    </section>
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
