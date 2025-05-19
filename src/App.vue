<script setup lang="ts">
import { computed, watch } from "vue";
import { suitIterator, Card, displaySuit } from "./game/cards";
import CardComponent from "./components/Card.vue";
import Hand from "./components/Hand.vue";
import Deck from "./components/Deck.vue";
import { useServerEuchre } from "./composables/useServerEuchre";
import { useUIState } from "./composables/useUIState";

const { context: serverContext, send } = useServerEuchre();
const { context, next } = useUIState(serverContext);

watch(context, (value) => console.log(value), { immediate: true });

// suits that can be selected for trump
const openSuits = computed(() => {
  const unavailable = context.value.revealed?.suit;
  return suitIterator().filter((suit) => suit !== unavailable);
});

function selectCard(card: Card) {
  switch (context.value.state) {
    case "exchanging":
      return send({ type: "EXCHANGE", card });
    case "playing":
      return send({ type: "PLAY", card });
  }
}

const showDeck = computed(() => {
  const { state } = context.value;
  return ["auction", "open", "exchanging"].includes(state);
});
</script>

<template>
  <div class="layout">
    <Hand
      :cards="context.hand"
      :trump="context.trump"
      :led="context.trick[context.leader]"
      :active="
        (context.state === 'playing' || context.state === 'exchanging') &&
        context.active === 0
      "
      @select-card="selectCard"
    />
    <section class="play-area">
      <div class="cardzone">
        <Deck
          v-if="showDeck && context.revealed && context.dealer === 0"
          :revealed="context.revealed"
        />
        <CardComponent
          v-if="context.trick[0]"
          :card="context.trick[0]"
          disabled
        />
        <div class="call"></div>
      </div>
      <div class="cardzone left">
        <Deck
          v-if="showDeck && context.revealed && context.dealer === 1"
          :revealed="context.revealed"
        />
        <CardComponent
          v-if="context.trick[1]"
          :card="context.trick[1]"
          disabled
        />
      </div>
      <div class="cardzone across">
        <Deck
          v-if="showDeck && context.revealed && context.dealer === 2"
          :revealed="context.revealed"
        />
        <CardComponent
          v-if="context.trick[2]"
          :card="context.trick[2]"
          disabled
        />
      </div>
      <div class="cardzone right">
        <Deck
          v-if="showDeck && context.revealed && context.dealer === 3"
          :revealed="context.revealed"
        />
        <CardComponent
          v-if="context.trick[3]"
          :card="context.trick[3]"
          disabled
        />
      </div>
      <div v-if="context.trump" :class="['trump', context.trump]">
        {{ displaySuit(context.trump) }}
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
