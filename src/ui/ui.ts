const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

/** Escapes text for safe insertion as HTML. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * The thin layer of text over the world. It shows information only when it
 * is needed, then gets out of the way (§26).
 */
export class Ui {
  private clockEl = $('#clock');
  private speedEl = $('#speed');
  private locationEl = $('#location');
  private labelEl = $('#label');
  private toastsEl = $('#toasts');
  private dialogueEl = $('#dialogue');
  private choiceEl = $('#choice');
  private panelEl = $('#panel');
  private fadeEl = $('#fade');
  private locationTimer = 0;
  private dialoguePages: string[] = [];
  private dialoguePage = 0;
  private choiceOptions: string[] = [];
  choiceIndex = 0;
  panelKind: string | null = null;

  setClock(html: string | null): void {
    this.clockEl.hidden = html === null;
    if (html !== null && this.clockEl.innerHTML !== html) this.clockEl.innerHTML = html;
  }

  setSpeed(text: string | null): void {
    this.speedEl.textContent = text ?? '';
  }

  showLocation(name: string): void {
    this.locationEl.textContent = name;
    this.locationEl.classList.add('show');
    window.clearTimeout(this.locationTimer);
    this.locationTimer = window.setTimeout(() => this.locationEl.classList.remove('show'), 2600);
  }

  setLabel(text: string | null, x = 0, y = 0): void {
    if (text === null) {
      this.labelEl.classList.remove('show');
      return;
    }
    this.labelEl.textContent = text;
    this.labelEl.style.left = `${x}px`;
    this.labelEl.style.top = `${y}px`;
    this.labelEl.classList.add('show');
  }

  toast(text: string, seconds = 6): void {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    this.toastsEl.appendChild(el);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstElementChild!.remove();
    window.setTimeout(() => el.classList.add('fade'), seconds * 1000);
    window.setTimeout(() => el.remove(), seconds * 1000 + 1300);
  }

  // ------------------------------------------------------------ dialogue

  get dialogueOpen(): boolean {
    return !this.dialogueEl.hidden;
  }

  openDialogue(name: string, pages: string[]): void {
    this.dialoguePages = pages;
    this.dialoguePage = 0;
    this.dialogueEl.querySelector('.name')!.textContent = name;
    this.dialogueEl.hidden = false;
    this.renderPage();
  }

  /** Next page; returns false when the conversation is over. */
  advanceDialogue(): boolean {
    this.dialoguePage++;
    if (this.dialoguePage >= this.dialoguePages.length) {
      this.dialogueEl.hidden = true;
      return false;
    }
    this.renderPage();
    return true;
  }

  closeDialogue(): void {
    this.dialogueEl.hidden = true;
  }

  private renderPage(): void {
    const text = this.dialoguePages[this.dialoguePage];
    const el = this.dialogueEl.querySelector('.text')!;
    el.textContent = text;
    el.classList.toggle('narration', /^\(.*\)$/.test(text.trim()));
    (this.dialogueEl.querySelector('.more') as HTMLElement).textContent =
      this.dialoguePage < this.dialoguePages.length - 1 ? '▾' : '·';
  }

  // ------------------------------------------------------------ choice

  get choiceOpen(): boolean {
    return !this.choiceEl.hidden;
  }

  openChoice(question: string, options: string[]): void {
    this.choiceOptions = options;
    this.choiceIndex = 0;
    this.choiceEl.hidden = false;
    this.renderChoice(question);
  }

  moveChoice(delta: number): void {
    const n = this.choiceOptions.length;
    this.choiceIndex = (this.choiceIndex + delta + n) % n;
    this.renderChoice(null);
  }

  closeChoice(): void {
    this.choiceEl.hidden = true;
  }

  private renderChoice(question: string | null): void {
    const q = question ?? this.choiceEl.querySelector('.q')?.textContent ?? '';
    this.choiceEl.innerHTML =
      `<div class="q">${esc(q)}</div>` +
      this.choiceOptions.map((o, i) => `<span class="opt${i === this.choiceIndex ? ' sel' : ''}">${esc(o)}</span>`).join('');
  }

  // ------------------------------------------------------------ panel

  openPanel(kind: string, title: string, html: string): void {
    this.panelKind = kind;
    this.panelEl.querySelector('h2')!.textContent = title;
    this.panelEl.querySelector('.body')!.innerHTML = html;
    this.panelEl.hidden = false;
  }

  closePanel(): void {
    this.panelKind = null;
    this.panelEl.hidden = true;
  }

  setFade(on: boolean): void {
    this.fadeEl.classList.toggle('on', on);
  }
}
