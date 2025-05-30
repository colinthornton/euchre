import { computed, ref } from "vue";
import { assign, createActor, setup, transition } from "xstate";
import { euchreClientMachine, type ClientEvent } from "../game/euchre";

/**
 * The state of the game client
 */
const euchreClient = createActor(euchreClientMachine, {
  input: { player: 0 },
});

const euchreClientSnapshot = ref(euchreClient.getSnapshot());
euchreClient.subscribe((s) => (euchreClientSnapshot.value = s));
euchreClient.start();

/**
 * The state of the UI
 *
 * The server is quick to select moves for bots, and so it's possible
 * for us to receive those events from the server while we're still
 * animating a previous state. This state machine lets us build up a
 * queue of events from the server and process them manually one-by-one.
 */
const eventQueue = createActor(
  setup({
    types: {
      context: {} as { queue: ClientEvent[]; event: ClientEvent | null },
      events: {} as { type: "ENQUEUE"; event: ClientEvent } | { type: "NEXT" },
    },
    actions: {
      enqueueEvent: assign(({ context, event }) => {
        if (event.type !== "ENQUEUE") throw new Error();

        const queue = context.queue.concat(event.event);
        console.log(queue);
        return {
          queue,
        };
      }),
      dequeueEvent: assign(({ context }) => {
        if (context.queue.length === 0) throw new Error();

        const [event, ...queue] = context.queue;
        return {
          queue,
          event,
        };
      }),
      setEvent: assign(({ event }) => {
        if (event.type !== "ENQUEUE") throw new Error();

        return {
          event: event.event,
        };
      }),
      clearEvent: assign({
        event: null,
      }),
      updateClient: ({ context }) => {
        if (context.event === null) throw new Error();

        euchreClient.send(context.event);
      },
    },
    guards: {
      canDequeue: ({ context }) => {
        if (context.queue.length < 1) return false;

        const event = context.queue[0];
        return euchreClientSnapshot.value.can(event);
      },
      canSet: ({ event }) => {
        if (event.type !== "ENQUEUE") return false;

        return euchreClientSnapshot.value.can(event.event);
      },
    },
  }).createMachine({
    context: {
      queue: [],
      event: null,
    },
    initial: "waiting",
    states: {
      waiting: {
        always: {
          guard: "canDequeue",
          actions: "dequeueEvent",
          target: "animating",
        },
        on: {
          ENQUEUE: {
            guard: "canSet",
            actions: "setEvent",
            target: "animating",
          },
        },
      },
      animating: {
        on: {
          ENQUEUE: {
            actions: "enqueueEvent",
            target: "animating",
          },
          NEXT: {
            actions: ["updateClient", "clearEvent"],
            target: "waiting",
          },
        },
      },
    },
  })
);

const eventQueueSnapshot = ref(eventQueue.getSnapshot());
eventQueue.subscribe((s) => (eventQueueSnapshot.value = s));
eventQueue.start();

const state = computed(() => {
  return {
    ...euchreClientSnapshot.value.context,
    phase: euchreClientSnapshot.value.value,
  };
});
const event = computed(() => eventQueueSnapshot.value.context.event);
const nextState = computed(() => {
  if (!event.value) return;
  const [snapshot] = transition(
    euchreClientMachine,
    euchreClient.getSnapshot(),
    event.value
  );
  return {
    ...snapshot.context,
    phase: snapshot.value,
  };
});

export function useEuchreClient() {
  return {
    /**
     * The current state of the game client
     */
    state,
    /**
     * The event that will trigger the next state transition. Run animations for this event then call `next()`.
     */
    event,
    /**
     * The game client will transition to this state after `next()` is called
     */
    nextState,
    /**
     * Enqueues events received from the game server
     */
    enqueue: (event: ClientEvent) => {
      eventQueue.send({ type: "ENQUEUE", event });
    },
    /**
     * Sends the current event to the game client to trigger the state transition. Call this when you are done animating the event.
     */
    next: () => {
      eventQueue.send({ type: "NEXT" });
    },
  };
}
