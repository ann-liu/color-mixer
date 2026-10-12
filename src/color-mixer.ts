import {
  isValid,
  mixHex,
  randomColor,
  stepsArray,
  textColor,
} from "./color-helpers";
import css from "./color-mixer.css";

const DEFAULT_COLOR = "#ffffff";
const DEFAULT_STEPS = 4;
const MIN_STEPS = 1;
const MAX_STEPS = 8;
const COPY_FLASH_MS = 150;

const PLUS_PATH =
  "M304.96 196.06q-50.513 0-101.025.002V95.042c0-5.078-7.871-5.078-7.871 0v101.02l-101.025.002c-5.078 0-5.078 7.87 0 7.87h101.02v101.02c0 5.079 7.871 5.079 7.871 0v-101.02l101.025-.001c5.08 0 5.08-7.873.002-7.873z";
const CARET_PATH =
  "m222.09 125.333-67.881 67.883c-4.166 4.165-4.166 10.92 0 15.085l67.882 67.881";

const plusIcon = (deg: number) =>
  `<svg width="1.75rem" viewBox="0 0 400 400" aria-hidden="true"><path transform="rotate(${deg} 200 200)" fill="currentColor" d="${PLUS_PATH}"/></svg>`;
const caretIcon = (deg: number) =>
  `<svg width="3.25rem" viewBox="0 0 400 400" aria-hidden="true"><path transform="rotate(${deg} 200 200)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="10.66667" d="${CARET_PATH}"/></svg>`;

const ADD_SVG = plusIcon(0);
const REMOVE_SVG = plusIcon(45);
const LEFT_CARET = caretIcon(0);
const RIGHT_CARET = caretIcon(180);

const SWATCH_HTML = `<div class="swatch" role="button" tabindex="0"><span class="swatch-text"></span></div>`;

const columnHtml = (index: number, color: string) => `
  <div class="mix-color-column" data-index="${index}">
    <div class="mix-inputs">
      <color-input data-index="${index}" name="mix-color" aria-label="Mix color selection" value="${color}"></color-input>
      <button class="remove-mix-btn icon-btn" type="button" title="Remove" aria-label="Remove color" data-action="remove" data-index="${index}">${REMOVE_SVG}</button>
    </div>
  </div>`;

let sharedSheet: CSSStyleSheet | undefined;
function getSheet(): CSSStyleSheet {
  if (!sharedSheet) {
    sharedSheet = new CSSStyleSheet();
    sharedSheet.replaceSync(css);
  }
  return sharedSheet;
}

type ValueElement = HTMLElement & { value: string };

interface UI {
  header: HTMLElement;
  mainInput: ValueElement;
  stepsInput: HTMLInputElement;
  stepsText: HTMLElement;
  container: HTMLElement;
  probe: HTMLElement;
  columns: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
}

class ColorMixer extends HTMLElement {
  private shadow: ShadowRoot;
  private ui: UI | null = null;

  private mixColors: string[] = ["#ffffff", "#777777", "#000000"];

  private activeColumnIndex = 0;
  private visibleColumns = 1;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [getSheet()];

    this.shadow.addEventListener("input", this.onInput);
    this.shadow.addEventListener("click", this.onClick);
    this.shadow.addEventListener("keydown", this.onKeyDown);
  }

  static get observedAttributes() {
    return ["main-color", "steps"];
  }

  connectedCallback() {
    if (!this.ui) this.renderShell();

    this.visibleColumns = this.measureVisibleColumns();
    this.renderColumns();

    this.resizeObserver = new ResizeObserver(() => {
      const next = this.measureVisibleColumns();
      if (next === this.visibleColumns) return;
      this.visibleColumns = next;
      this.renderColumns();
    });
    this.resizeObserver.observe(this.ui!.container);
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ) {
    const { ui } = this;
    if (!ui || oldValue === newValue) return;

    if (name === "main-color") sync(ui.mainInput, this.mainColor);
    else sync(ui.stepsInput, this.steps);

    this.paint();
  }

  get mainColor(): string {
    const value = this.getAttribute("main-color");
    return value && isValid(value) ? value : DEFAULT_COLOR;
  }

  set mainColor(value: string) {
    this.setAttribute("main-color", value);
  }

  get steps(): string {
    const n = parseInt(this.getAttribute("steps") ?? "", 10);
    const clamped = Number.isNaN(n)
      ? DEFAULT_STEPS
      : Math.min(MAX_STEPS, Math.max(MIN_STEPS, n));
    return String(clamped);
  }

  set steps(value: string) {
    this.setAttribute("steps", value);
  }

  private onInput = (e: Event) => {
    const target = e.target as ValueElement;
    const name = target.getAttribute("name");
    const value = target.value;
    if (!name || !value) return;

    switch (name) {
      case "steps":
        this.steps = value;
        break;
      case "main-color":
        if (isValid(value)) this.mainColor = value;
        break;
      case "mix-color": {
        const index = Number(target.dataset.index);
        if (this.mixColors[index] === undefined || !isValid(value)) return;
        this.mixColors[index] = value;
        this.paint();
        break;
      }
    }
  };

  private onClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const action = target.closest<HTMLElement>("[data-action]");

    switch (action?.dataset.action) {
      case "prev":
        return this.navigate(-1);
      case "next":
        return this.navigate(1);
      case "add":
        return this.addColor();
      case "remove":
        return this.removeColor(Number(action.dataset.index));
    }

    const swatch = target.closest<HTMLElement>(".swatch");
    if (swatch) void this.copy(swatch);
  };

  private onKeyDown = (e: Event) => {
    const event = e as KeyboardEvent;
    const target = event.target as HTMLElement;
    if (
      (event.key === "Enter" || event.key === " ") &&
      target.matches(".swatch")
    ) {
      event.preventDefault();
      target.click();
    }
  };

  private measureVisibleColumns(): number {
    const { ui } = this;
    if (!ui) return this.visibleColumns;

    const available = ui.container.clientWidth;
    const columnWidth = ui.probe.getBoundingClientRect().width;
    if (!available || !columnWidth) return this.visibleColumns;

    return Math.max(1, Math.floor(available / columnWidth));
  }

  private addColor() {
    this.mixColors.push(randomColor());
    this.activeColumnIndex = Math.max(
      0,
      this.mixColors.length - this.visibleColumns
    );
    this.renderColumns();
  }

  private removeColor(index: number) {
    if (!Number.isInteger(index)) return;
    this.mixColors.splice(index, 1);
    this.renderColumns();
  }

  private navigate(direction: -1 | 1) {
    const n = this.mixColors.length;
    if (n <= this.visibleColumns) return;
    this.activeColumnIndex = (this.activeColumnIndex + direction + n) % n;
    this.renderColumns();
  }

  private async copy(swatch: HTMLElement) {
    const hex = swatch.dataset.hex;
    if (!hex) return;

    swatch.classList.add("active");
    setTimeout(() => swatch.classList.remove("active"), COPY_FLASH_MS);

    try {
      await navigator.clipboard.writeText(hex);
    } catch (err) {
      console.error(err);
    }
  }

  private renderShell() {
    this.shadow.innerHTML = `
      <div class="color-mixer">
        <div class="main-color-container">
          <color-input name="main-color" aria-label="Main color selection" value="${this.mainColor}"></color-input>
          <div class="steps-container">
            <input type="range" name="steps" class="steps" min="${MIN_STEPS}" max="${MAX_STEPS}" value="${this.steps}" aria-label="Number of steps" />
            <span class="steps-text" aria-live="polite"></span>
          </div>
          <button class="add-mix-btn" type="button" title="Add Mix Color" aria-label="Add mix color" data-action="add">
            ${ADD_SVG}<span>Color</span>
          </button>
        </div>
        <div class="mix-colors-container">
          <div class="column-probe" aria-hidden="true"></div>
          <button class="slide-control icon-btn prev-btn" type="button" aria-label="Previous color column" data-action="prev" hidden disabled>
            ${LEFT_CARET}
          </button>
          <div class="mix-color-swatches" role="group" aria-label="Mixed colors"></div>
          <button class="slide-control icon-btn next-btn" type="button" aria-label="Next color column" data-action="next" hidden disabled>
            ${RIGHT_CARET}
          </button>
        </div>
      </div>
    `;

    const q = <T extends Element>(selector: string) =>
      this.shadow.querySelector<T>(selector)!;

    this.ui = {
      header: q(".main-color-container"),
      mainInput: q<ValueElement>('[name="main-color"]'),
      stepsInput: q<HTMLInputElement>('[name="steps"]'),
      stepsText: q(".steps-text"),
      container: q(".mix-colors-container"),
      probe: q(".column-probe"),
      columns: q(".mix-color-swatches"),
      prev: q<HTMLButtonElement>(".prev-btn"),
      next: q<HTMLButtonElement>(".next-btn"),
    };
  }

  private renderColumns() {
    const { ui } = this;
    if (!ui) return;

    const n = this.mixColors.length;
    const canNavigate = n > this.visibleColumns;

    this.activeColumnIndex = canNavigate ? this.activeColumnIndex % n : 0;

    ui.columns.innerHTML = Array.from(
      { length: Math.min(n, this.visibleColumns) },
      (_, offset) => {
        const index = (this.activeColumnIndex + offset) % n;
        return columnHtml(index, this.mixColors[index]!);
      }
    ).join("");

    ui.prev.hidden = ui.prev.disabled = !canNavigate;
    ui.next.hidden = ui.next.disabled = !canNavigate;

    this.paint();
  }

  private paint() {
    const { ui } = this;
    if (!ui) return;

    const main = this.mainColor;
    const steps = this.steps;
    const percentages = stepsArray(steps);

    ui.header.style.setProperty("--background-color", main);
    ui.header.style.setProperty("--color", textColor(main));
    ui.stepsText.textContent = steps;

    for (const col of Array.from(ui.columns.children) as HTMLElement[]) {
      const mixColor = this.mixColors[Number(col.dataset.index)];
      if (!mixColor) continue;

      const inputs = col.querySelector<HTMLElement>(".mix-inputs")!;
      inputs.style.setProperty("--background-color", mixColor);
      inputs.style.setProperty("--color", textColor(mixColor));

      const swatches = col.getElementsByClassName(
        "swatch"
      ) as HTMLCollectionOf<HTMLElement>;
      while (swatches.length > percentages.length) {
        swatches[swatches.length - 1]!.remove();
      }
      if (swatches.length < percentages.length) {
        inputs.insertAdjacentHTML(
          "beforebegin",
          SWATCH_HTML.repeat(percentages.length - swatches.length)
        );
      }

      for (let i = 0; i < swatches.length; i++) {
        const el = swatches[i]!;
        const blend = mixHex(main, mixColor, percentages[i]!);

        if (el.dataset.hex === blend) continue;

        const fg = textColor(blend);
        el.dataset.hex = blend;
        el.style.backgroundColor = blend;
        el.style.color = fg;
        el.style.setProperty("--color", fg);
        el.setAttribute("aria-label", `Copy color ${blend} to clipboard`);
        el.firstElementChild!.textContent = blend;
      }
    }
  }
}

function sync(control: { value: string }, value: string) {
  if (control.value !== value) control.value = value;
}

if (!customElements.get("color-mixer")) {
  customElements.define("color-mixer", ColorMixer);
}

declare global {
  interface HTMLElementTagNameMap {
    "color-mixer": ColorMixer;
  }
}
