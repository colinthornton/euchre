import { computed, ref } from "vue";
import { Queue } from "../utilities/Queue";
import { euchreClientMachine, type ClientEvent } from "../game/euchre";
import { createActor } from "xstate";

const client = createActor(euchreClientMachine, {
  input: { player: 0 },
});

const snapshot = ref(client.getSnapshot());
client.subscribe((s) => (snapshot.value = s));
client.start();

const state = computed(() => snapshot.value.value);
const context = computed(() => snapshot.value.context);

const eventQueue = new Queue<ClientEvent>();

function enqueue(event: ClientEvent) {
  eventQueue.enqueue(event);
}

function next() {
  if (eventQueue.size > 0) {
    const event = eventQueue.dequeue();
    console.log("client", event);
    client.send(event);
  }
}

export function useEuchreClient() {
  return {
    state,
    context,
    enqueue,
    next,
  };
}
