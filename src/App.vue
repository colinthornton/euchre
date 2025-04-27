<script setup lang="ts">
import { createBrowserInspector } from "@statelyai/inspect";
import { useMachine } from "@xstate/vue";
import { computed } from "vue";
import { euchreMachine } from "./euchre";
import { suitIterator, Suit } from "./cards";
import type { Card } from "./cards";

const { inspect } = createBrowserInspector();

const { snapshot, send } = useMachine(euchreMachine, { inspect });

const openSuits = computed(() => {
  const unavailable = snapshot.value.context.revealed?.suit;
  return suitIterator().filter((suit) => suit !== unavailable);
});

function displaySuit(suit: Suit) {
  return {
    [Suit.Clubs]: "♣",
    [Suit.Diamonds]: "♦",
    [Suit.Hearts]: "♥",
    [Suit.Spades]: "♠",
  }[suit];
}

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
  <div v-if="snapshot.matches('playing')">
    <button v-for="card in snapshot.context.trick">
      {{ card.toString() }}
    </button>
  </div>
  <div v-if="snapshot.context.trump">
    Trump: {{ displaySuit(snapshot.context.trump) }}
  </div>
  <div v-if="snapshot.matches('auction')">
    Revealed: {{ snapshot.context.revealed?.toString() }}
  </div>
  <div v-if="snapshot.matches('exchanging')">
    Exchanging: {{ snapshot.context.revealed?.toString() }}
  </div>
  <div class="player" v-for="(hand, i) in snapshot.context.players">
    <button v-for="card in hand" @click="selectCard(card)">
      {{ card.toString() }}
    </button>
    <span v-if="i === snapshot.context.dealer">Dealer</span>
    <span v-if="i === snapshot.context.active">Active</span>
    <template
      v-if="snapshot.hasTag('bidding') && i === snapshot.context.active"
    >
      <button @click="send({ type: 'PASS' })">Pass</button>
      <button
        v-if="snapshot.matches('auction')"
        @click="send({ type: 'ORDER_UP' })"
      >
        Pick it up
      </button>
      <template v-if="snapshot.matches('open')">
        <button
          v-for="suit in openSuits"
          @click="send({ type: 'CALL_SUIT', suit })"
        >
          {{ displaySuit(suit) }}
        </button>
      </template>
    </template>
    <span v-if="snapshot.matches('playing')"
      >Tricks: {{ snapshot.context.tricksTaken[i] }}</span
    >
  </div>
</template>

<style scoped></style>
