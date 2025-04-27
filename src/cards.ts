export const enum Suit {
  Hearts,
  Clubs,
  Spades,
  Diamonds,
}

export function suitIterator() {
  return [Suit.Hearts, Suit.Clubs, Suit.Spades, Suit.Diamonds];
}

export const enum Rank {
  Nine,
  Ten,
  Jack,
  Queen,
  King,
  Ace,
}

export function rankInterator() {
  return [Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace];
}

export class Card {
  constructor(readonly suit: Suit, readonly rank: Rank) {}

  equal(card: Card) {
    return card.rank === this.rank && card.suit === this.suit;
  }

  compare(card: Card, trump: Suit) {
    if (this.equal(card)) {
      return 0;
    }

    if (card.isTrump(trump) && !this.isTrump(trump)) {
      return -1;
    }

    if (!card.isTrump(trump) && this.isTrump(trump)) {
      return 1;
    }

    return card.strength(trump) > this.strength(trump) ? -1 : 1;
  }

  sameSuit(card: Card, trump: Suit) {
    if (card.isTrump(trump) && this.isTrump(trump)) return true;
    return card.suit === this.suit;
  }

  isTrump(trump: Suit) {
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

  strength(trump: Suit) {
    switch (this.rank) {
      case Rank.Nine:
        return 0;
      case Rank.Ten:
        return 1;
      case Rank.Jack:
        if (this.isTrump(trump)) {
          return this.suit === trump ? 6 : 5;
        }
        return 2;
      case Rank.Queen:
        return this.isTrump(trump) ? 2 : 3;
      case Rank.King:
        return this.isTrump(trump) ? 3 : 4;
      case Rank.Ace:
        return this.isTrump(trump) ? 4 : 5;
    }
  }

  toString() {
    const rank = {
      [Rank.Nine]: "9",
      [Rank.Ten]: "10",
      [Rank.Jack]: "J",
      [Rank.Queen]: "Q",
      [Rank.King]: "K",
      [Rank.Ace]: "A",
    }[this.rank];
    const suit = {
      [Suit.Clubs]: "♣",
      [Suit.Diamonds]: "♦",
      [Suit.Hearts]: "♥",
      [Suit.Spades]: "♠",
    }[this.suit];
    return `${rank}${suit}`;
  }
}

export class Deck {
  // holds references to all generated cards, including those dealt out
  private cards: Card[] = [];
  private deck: Card[] = [];

  constructor() {
    this.reset();
  }

  getCardRef(card: Card) {
    return this.cards.find((c) => c.equal(card));
  }

  size() {
    return this.deck.length;
  }

  reset() {
    this.cards = [];
    this.deck = [];
    for (const suit of suitIterator()) {
      for (const rank of rankInterator()) {
        const card = new Card(suit, rank);
        this.cards.push(card);
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
    const dealt = new Set<Card>();
    for (let i = 0; i < n; i++) {
      const card = this.deck.pop();
      if (!card) return dealt;
      dealt.add(card);
    }
    return dealt;
  }

  revealTop() {
    return this.deck[this.deck.length - 1];
  }
}
