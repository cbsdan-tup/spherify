export const reorderList = (lists, startIndex, endIndex) => {
  const result = Array.from(lists);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  // Calculate new positions
  return result.map((list, index) => ({
    ...list,
    position: index * 1000 // Leave room between positions for future insertions
  }));
};

export const moveCard = (
  sourceList,
  destinationList,
  sourceIndex,
  destinationIndex
) => {
  const sourceCards = Array.from(sourceList.cards || []);
  const destCards = Array.from(destinationList.cards || []);
  
  const [removed] = sourceCards.splice(sourceIndex, 1);
  destCards.splice(destinationIndex, 0, removed);

  return {
    sourceCards,
    destinationCards: destCards
  };
};

export const calculatePosition = (before, after) => {
  if (!before && !after) return 1000; // First item
  if (!before) return after / 2; // Insert at start
  if (!after) return before + 1000; // Insert at end
  return (before + after) / 2; // Insert between
};

export const updateCardsOrder = (cards, startIndex, endIndex) => {
  const result = Array.from(cards);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  // Recalculate positions for all affected cards
  return result.map((card, index) => ({
    ...card,
    position: index * 16384 // Using larger gaps for card positions
  }));
};
