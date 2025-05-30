<script lang="ts" setup>
import { computed } from "vue";
import { useEuchreClient } from "../composables/useEuchreClient";
import Deck from "./Deck.vue";
import Card from "./Card.vue";

const props = defineProps<{
  area?: string;
  player: number;
}>();

const { state, event, next } = useEuchreClient();

const showRevealed = computed(() => {
  return (
    ["auction", "exchanging"].includes(state.value.phase) &&
    state.value.dealer === props.player
  );
});

const playedCard = computed(() => {
  if (event.value?.type === "PLAY" && state.value.active === props.player) {
    return event.value.card;
  }
  return state.value.trick[props.player];
});
</script>

<template>
  <div class="cardzone" :class="[area]">
    <Deck v-if="showRevealed" :revealed="state.revealed!" />
    <Card
      v-if="playedCard"
      class="played-card"
      :card="playedCard"
      @animationend="next"
    />
  </div>
</template>

<style scoped>
.cardzone {
  width: var(--card-width);
  height: var(--card-height);
  transform-style: preserve-3d;
}

.cardzone.left {
  transform: rotate(90deg);
}
.cardzone.across {
  transform: rotate(180deg);
}
.cardzone.right {
  transform: rotate(-90deg);
}

.played-card {
  opacity: 0;
  animation: fade-in ease-in 1s forwards;
}

@keyframes fade-in {
  to {
    opacity: 1;
  }
}
</style>
