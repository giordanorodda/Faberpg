import type { Libro } from '../data/libri';

/**
 * Reading: an open book over the scene. Two pages at a time, turned by
 * hand; the page is lit by whatever light there is in the room, and each
 * book keeps its bookmark.
 */
export class Reader {
  book: Libro | null = null;
  private spread = 0;
  private el = document.getElementById('reader')!;
  private left = this.el.querySelector('.left') as HTMLElement;
  private right = this.el.querySelector('.right') as HTMLElement;
  private hint = this.el.querySelector('.hint') as HTMLElement;
  private bookEl = this.el.querySelector('.book') as HTMLElement;

  get isOpen(): boolean {
    return this.book !== null;
  }

  open(book: Libro): void {
    this.book = book;
    this.spread = Math.min(this.bookmark(book.id), Math.ceil(book.pagine.length / 2) - 1);
    this.el.classList.add('open');
    this.render();
  }

  close(): void {
    if (this.book) this.setBookmark(this.book.id, this.spread);
    this.book = null;
    this.el.classList.remove('open');
  }

  turn(d: number): void {
    if (!this.book) return;
    const last = Math.ceil(this.book.pagine.length / 2) - 1;
    this.spread = Math.max(0, Math.min(last, this.spread + d));
    this.render();
  }

  /** How much light falls on the page (0 dark … 1 plenty), with the candle's flicker in it. */
  setLight(l: number): void {
    const b = Math.max(0.18, Math.min(1.05, l));
    this.bookEl.style.setProperty('--light', b.toFixed(3));
    this.bookEl.style.setProperty('--warm', (0.1 + (1 - Math.min(1, l)) * 0.35).toFixed(3));
    const dark = l < 0.33;
    this.hint.textContent = dark ? 'È troppo buio per leggere. Accendi una candela (E per chiudere il libro).' : 'A / D per voltare pagina · E per chiudere il libro';
  }

  private render(): void {
    const b = this.book!;
    const i = this.spread * 2;
    const page = (el: HTMLElement, n: number) => {
      const text = b.pagine[n];
      el.replaceChildren();
      el.dataset.n = text ? String(n + 1) : '';
      const head = document.createElement('div');
      head.className = 'head';
      head.textContent = text ? b.titolo : '';
      const body = document.createElement('div');
      body.className = 'text';
      body.textContent = text ?? '';
      el.append(head, body);
    };
    page(this.left, i);
    page(this.right, i + 1);
  }

  private bookmark(id: string): number {
    try {
      return Number(localStorage.getItem(`segnalibro:${id}`) ?? 0) || 0;
    } catch {
      return 0;
    }
  }

  private setBookmark(id: string, spread: number): void {
    try {
      localStorage.setItem(`segnalibro:${id}`, String(spread));
    } catch {
      /* the bookmark is a convenience: without storage the book opens at the start */
    }
  }
}
