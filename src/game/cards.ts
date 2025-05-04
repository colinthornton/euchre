export const enum Suit {
  Hearts = "hearts",
  Clubs = "clubs",
  Spades = "spades",
  Diamonds = "diamonds",
}

export function suitIterator() {
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

export function rankInterator() {
  return [Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace];
}

export class Card {
  constructor(readonly suit: Suit, readonly rank: Rank) {}

  equal(card: Card) {
    return card.rank === this.rank && card.suit === this.suit;
  }

  compare(card: Card, trump: Suit | null) {
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
    const cardIsTrump = card.isTrump(trump);
    const thisIsTrump = this.isTrump(trump);
    if (cardIsTrump && !thisIsTrump) return false;
    if (!cardIsTrump && thisIsTrump) return false;
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

  strength(trump: Suit | null) {
    switch (this.rank) {
      case Rank.Nine:
        return 0;
      case Rank.Ten:
        return 1;
      case Rank.Queen:
        return 3;
      case Rank.King:
        return 4;
      case Rank.Ace:
        return 5;
      case Rank.Jack:
        if (this.isTrump(trump)) {
          return this.suit === trump ? 7 : 6;
        }
        return 2;
    }
  }
}

export class Deck {
  private deck: Card[] = [];

  constructor() {
    this.reset();
  }

  size() {
    return this.deck.length;
  }

  reset() {
    this.deck = [];
    for (const suit of suitIterator()) {
      for (const rank of rankInterator()) {
        const card = new Card(suit, rank);
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
