export const enum Suit {
  Hearts = "hearts",
  Clubs = "clubs",
  Spades = "spades",
  Diamonds = "diamonds",
}

export function suits() {
  return [Suit.Hearts, Suit.Clubs, Suit.Spades, Suit.Diamonds];
}

export function displaySuit(suit: Suit) {
  return {
    [Suit.Clubs]: "♣",
    [Suit.Diamonds]: "♦",
    [Suit.Hearts]: "♥",
    [Suit.Spades]: "♠",
  }[suit];
}

export const enum Rank {
  Nine = "nine",
  Ten = "ten",
  Jack = "jack",
  Queen = "queen",
  King = "king",
  Ace = "ace",
}

export function ranks() {
  return [Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace];
}

export function displayRank(rank: Rank) {
  return {
    [Rank.Nine]: "9",
    [Rank.Ten]: "10",
    [Rank.Jack]: "J",
    [Rank.Queen]: "Q",
    [Rank.King]: "K",
    [Rank.Ace]: "A",
  }[rank];
}

export class Card {
  constructor(readonly suit: Suit, readonly rank: Rank) {}

  equal(card: Card) {
    return card.rank === this.rank && card.suit === this.suit;
  }

  compare(card: Card, trump: Suit | null, led: Card | null) {
    return card.strength(trump, led) - this.strength(trump, led);
  }

  sameSuit(card: Card, trump: Suit | null) {
    const cardIsTrump = card.isTrump(trump);
    const thisIsTrump = this.isTrump(trump);
    if (cardIsTrump && thisIsTrump) return true;
    if (cardIsTrump || thisIsTrump) return false;
    return card.suit === this.suit;
  }

  isTrump(trump: Suit | null) {
    if (trump === null) return false;
    if (this.suit === trump) return true;
    if (this.rank !== Rank.Jack) return false;
    switch (trump) {
      case Suit.Hearts:
        return this.suit === Suit.Diamonds;
      case Suit.Clubs:
        return this.suit === Suit.Spades;
      case Suit.Spades:
        return this.suit === Suit.Clubs;
      case Suit.Diamonds:
        return this.suit === Suit.Hearts;
    }
  }

  strength(trump: Suit | null, led: Card | null) {
    if (!this.isTrump(trump)) {
      if (led && !this.sameSuit(led, trump)) {
        return 0;
      }

      switch (this.rank) {
        case Rank.Nine:
          return 1;
        case Rank.Ten:
          return 2;
        case Rank.Jack:
          return 3;
        case Rank.Queen:
          return 4;
        case Rank.King:
          return 5;
        case Rank.Ace:
          return 6;
      }
    }

    switch (this.rank) {
      case Rank.Nine:
        return 7;
      case Rank.Ten:
        return 8;
      case Rank.Queen:
        return 9;
      case Rank.King:
        return 10;
      case Rank.Ace:
        return 11;
      case Rank.Jack:
        return this.suit === trump ? 13 : 12;
    }
  }
}

export class Deck {
  private deck: Card[] = [];

  constructor(private removed: Card[] = []) {
    this.reset();
  }

  size() {
    return this.deck.length;
  }

  reset() {
    this.deck = [];
    for (const suit of suits()) {
      for (const rank of ranks()) {
        const card = new Card(suit, rank);
        if (this.removed.some(card.equal)) continue;
        this.deck.push(card);
      }
    }
  }

  shuffle() {
    let j = this.deck.length;
    while (j > 0) {
      const i = Math.floor(Math.random() * j--);
      const temp = this.deck[j];
      this.deck[j] = this.deck[i];
      this.deck[i] = temp;
    }
  }

  deal(n: number) {
    const dealt: Card[] = [];
    for (let i = 0; i < n; i++) {
      const card = this.deck.pop();
      if (!card) return dealt;
      dealt.push(card);
    }
    return dealt;
  }

  revealTop() {
    return this.deck[this.deck.length - 1];
  }
}
