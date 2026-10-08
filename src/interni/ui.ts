/**
 * The words on screen when you talk to someone: their name, what they say
 * (appearing as they speak), your possible answers; and the free
 * conversation, where you write and they answer. Built in the page with a
 * little CSS of its own, so every interior page gets it for free.
 */

const CSS = `
#talk { position: fixed; left: 50%; bottom: 5%; transform: translateX(-50%); width: min(760px, 92vw); padding: 1em 1.3em 0.9em; background: rgba(26, 21, 16, 0.86); border: 1px solid rgba(214, 196, 160, 0.35); border-radius: 6px; color: #f1ead8; font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif; line-height: 1.5; display: none; box-shadow: 0 10px 40px rgba(0,0,0,0.45); }
#talk.open { display: block; }
#talk .who { color: #e2c27a; font-style: italic; letter-spacing: 0.03em; margin-bottom: 0.35em; }
#talk .who small { color: #9a8f78; font-style: normal; margin-left: 0.6em; }
#talk .text { min-height: 3em; font-size: 1.06em; white-space: pre-wrap; }
#talk .text .nar { color: #b8ad94; font-style: italic; }
#talk ol { margin: 0.7em 0 0; padding: 0; list-style: none; }
#talk li { padding: 0.18em 0; color: #d8cfb8; cursor: pointer; }
#talk li b { color: #e2c27a; font-weight: normal; display: inline-block; width: 1.6em; }
#talk li.chat { color: #a8c8d8; }
#talk .hint { margin-top: 0.6em; font-size: 0.82em; color: #8a8068; font-style: italic; }
#talk .log { max-height: 34vh; overflow-y: auto; margin-bottom: 0.6em; }
#talk .log p { margin: 0.25em 0; }
#talk .log .me { color: #a8c8d8; }
#talk input, #talk select { width: 100%; box-sizing: border-box; padding: 0.5em 0.7em; background: rgba(255,255,255,0.06); color: #f1ead8; border: 1px solid rgba(214,196,160,0.3); border-radius: 4px; font: inherit; }
#talk .row { display: flex; gap: 0.6em; margin-top: 0.4em; }
#talk .row > * { flex: 1; }
#bark { position: fixed; left: 50%; bottom: 14%; transform: translateX(-50%); max-width: 640px; color: #f1ead8; font-family: 'Iowan Old Style', Palatino, Georgia, serif; font-style: italic; text-shadow: 0 1px 4px #000, 0 0 12px rgba(0,0,0,0.6); opacity: 0; transition: opacity 0.8s; text-align: center; pointer-events: none; }
#bark.show { opacity: 1; }
`;

export class TalkUi {
  readonly el: HTMLDivElement;
  private who: HTMLDivElement;
  private text: HTMLDivElement;
  private list: HTMLOListElement;
  private hint: HTMLDivElement;
  private barkEl: HTMLDivElement;
  private typing = 0;
  private full = '';
  private shown = 0;
  private barkTimer = 0;
  /** True while text is still appearing. */
  get busy(): boolean {
    return this.shown < this.full.length;
  }

  constructor() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    this.el = document.createElement('div');
    this.el.id = 'talk';
    this.el.innerHTML = '<div class="who"></div><div class="text"></div><ol></ol><div class="hint"></div>';
    document.body.append(this.el);
    this.who = this.el.querySelector('.who')!;
    this.text = this.el.querySelector('.text')!;
    this.list = this.el.querySelector('ol')!;
    this.hint = this.el.querySelector('.hint')!;
    this.barkEl = document.createElement('div');
    this.barkEl.id = 'bark';
    document.body.append(this.barkEl);
  }

  open(name: string, role: string): void {
    this.who.innerHTML = `${name}<small>${role}</small>`;
    this.el.classList.add('open');
  }

  close(): void {
    this.el.classList.remove('open');
    window.clearInterval(this.typing);
  }

  /** Shows a page of speech, letter by letter. Narration in brackets is set apart. */
  say(page: string, onDone?: () => void): void {
    window.clearInterval(this.typing);
    this.full = page;
    this.shown = 0;
    this.list.innerHTML = '';
    this.hint.textContent = '';
    const render = () => {
      const s = this.full.slice(0, this.shown);
      this.text.innerHTML = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\(([^)]*)\)?/g, (m, inner) => `<span class="nar">(${inner}${m.endsWith(')') ? ')' : ''}</span>`);
    };
    this.typing = window.setInterval(() => {
      this.shown = Math.min(this.full.length, this.shown + 2);
      render();
      if (!this.busy) {
        window.clearInterval(this.typing);
        onDone?.();
      }
    }, 22);
    render();
  }

  /** Shows the whole page at once (a key pressed while it was still appearing). */
  finish(): void {
    if (!this.busy) return;
    this.shown = this.full.length - 1;
  }

  choices(items: { text: string; to: string }[], chatTo?: string): void {
    this.list.innerHTML = '';
    items.forEach((c, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${i + 1}</b>${c.text}`;
      if (c.to === chatTo) li.classList.add('chat');
      li.dataset.i = String(i);
      this.list.append(li);
    });
    this.hint.textContent = 'Premi il numero della risposta · Esc per salutare';
  }

  more(): void {
    this.list.innerHTML = '';
    this.hint.textContent = 'E (o spazio) per continuare';
  }

  // ------------------------------------------------------------------ free conversation

  private log: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;

  /** Turns the box into a conversation: a log of what has been said and a line to write in. */
  chatMode(onSend: (text: string) => void, onLeave: () => void): void {
    this.text.innerHTML = '<div class="log"></div><input type="text" maxlength="400" placeholder="Scrivi e premi Invio · Esc per tornare ai saluti" />';
    this.list.innerHTML = '';
    this.hint.textContent = '';
    this.log = this.text.querySelector('.log');
    this.input = this.text.querySelector('input');
    const inp = this.input!;
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && inp.value.trim()) {
        const t = inp.value.trim();
        inp.value = '';
        onSend(t);
      }
      if (e.key === 'Escape') onLeave();
    });
    inp.addEventListener('keyup', (e) => e.stopPropagation());
    window.setTimeout(() => inp.focus(), 30);
  }

  /** Adds a line to the conversation log; returns the paragraph so streaming text can grow in it. */
  addLine(who: string, text: string, me = false): HTMLParagraphElement {
    const p = document.createElement('p');
    if (me) p.className = 'me';
    p.innerHTML = `<b>${who}:</b> <span></span>`;
    (p.querySelector('span') as HTMLSpanElement).textContent = text;
    this.log?.append(p);
    if (this.log) this.log.scrollTop = this.log.scrollHeight;
    return p;
  }

  grow(p: HTMLParagraphElement, more: string): void {
    const span = p.querySelector('span') as HTMLSpanElement;
    span.textContent += more;
    if (this.log) this.log.scrollTop = this.log.scrollHeight;
  }

  setInputEnabled(on: boolean): void {
    if (this.input) {
      this.input.disabled = !on;
      if (on) this.input.focus();
    }
  }

  /** Asks once for the key to talk freely (and which model), explaining what it is for. */
  askKey(hasKeyStorage: 'app' | 'browser', onSave: (key: string, model: string) => void, onCancel: () => void, models: { id: string; label: string }[]): void {
    this.text.innerHTML = `
      <div>Per parlare liberamente serve una chiave delle API di Anthropic: la conversazione passa da Claude, che risponde nella parte del personaggio.
      ${hasKeyStorage === 'app' ? 'La chiave resta su questo computer, cifrata.' : 'Nel browser la chiave resta solo in questo browser: per giocare con altri, meglio l’app.'}
      Le risposte sono brevi apposta, per spendere poco.</div>
      <div class="row"><input type="password" placeholder="sk-ant-..." /></div>
      <div class="row"><select>${models.map((m) => `<option value="${m.id}">${m.label}</option>`).join('')}</select></div>`;
    this.list.innerHTML = '';
    this.hint.textContent = 'Invio per salvare · Esc per lasciar stare';
    const inp = this.text.querySelector('input') as HTMLInputElement;
    const sel = this.text.querySelector('select') as HTMLSelectElement;
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && inp.value.trim().startsWith('sk-')) onSave(inp.value.trim(), sel.value);
      if (e.key === 'Escape') onCancel();
    });
    inp.addEventListener('keyup', (e) => e.stopPropagation());
    window.setTimeout(() => inp.focus(), 30);
  }

  /** A line said to no one in particular, shown for a while like a subtitle. */
  bark(name: string, text: string): void {
    this.barkEl.textContent = `${name}: «${text}»`;
    this.barkEl.classList.add('show');
    window.clearTimeout(this.barkTimer);
    this.barkTimer = window.setTimeout(() => this.barkEl.classList.remove('show'), 4800);
  }
}
