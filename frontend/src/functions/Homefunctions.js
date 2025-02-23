export function createInfiniteScroll(carousel) {
  if (!carousel) {
    console.error('Carousel element not found');
    return;
  }

  const items = carousel.querySelectorAll('.feature-item');
  const totalItems = items.length;

  if (totalItems === 0) {
    console.warn('No feature items found');
    return;
  }

  // Duplicate the items to create an infinite scroll effect
  for (let i = 0; i < totalItems; i++) {
    const clone = items[i].cloneNode(true);
    carousel.appendChild(clone);
  }

  // Adjust the animation to account for the duplicate items
  // After the initial animation cycle, the carousel will seamlessly loop
  carousel.style.animation = 'scroll-carousel 20s linear infinite';
}
