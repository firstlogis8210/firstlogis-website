(() => {
  const gallery = document.querySelector('.case-gallery');
  const slides = [...document.querySelectorAll('.case-gallery figure')];
  const status = document.querySelector('.gallery-status');

  if (!gallery || !slides.length) return;

  const step = () => slides[1]?.offsetLeft - slides[0].offsetLeft || gallery.clientWidth;
  const updateStatus = () => {
    const index = Math.min(slides.length - 1, Math.max(0, Math.round(gallery.scrollLeft / step())));
    if (status) status.textContent = `${index + 1} / ${slides.length}`;
  };
  const move = direction => gallery.scrollBy({ left: step() * direction, behavior: 'smooth' });

  document.querySelector('.gallery-prev')?.addEventListener('click', () => move(-1));
  document.querySelector('.gallery-next')?.addEventListener('click', () => move(1));
  gallery.addEventListener('scroll', updateStatus, { passive: true });
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  });
  window.addEventListener('resize', updateStatus);
  updateStatus();
})();
