<script setup lang="ts">
import CardComponent from "./Card.vue";
import { Rank, Suit, type Card } from "../game/cards";

defineProps<{ revealed: Card }>();
</script>

<template>
  <div id="deck">
    <CardComponent
      v-for="i in 3"
      :suit="Suit.Spades"
      :rank="Rank.Ace"
      hidden
      :style="`translate: z (calc(${i} * -2px))`"
    />
    <CardComponent id="revealed" :suit="revealed.suit" :rank="revealed.rank" />
  </div>
</template>

<style scoped>
#deck {
  transform-style: preserve-3d;
  position: relative;
}

#deck .card {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
