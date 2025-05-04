<script setup lang="ts">
import CardComponent from "./Card.vue";
import { type Card } from "../game/cards";

defineProps<{ revealed: Card }>();
</script>

<template>
  <div id="deck">
    <CardComponent
      v-for="i in 3"
      hidden
      :style="`transform: translateZ(calc(${i} * -2px))`"
    />
    <CardComponent id="revealed" :card="revealed" disabled />
  </div>
</template>

<style scoped>
#deck {
  transform-style: preserve-3d;
  position: relative;
  opacity: 0;
}

#deck .card {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
