import { ensureHash, isValid, textColor } from "./color-helpers";
import styles from "./color-input.css";

const DEFAULT_COLOR = "#000000";

let sharedSheet: CSSStyleSheet | undefined;
function getSheet(): CSSStyleSheet {
  if (!sharedSheet) {
    sharedSheet = new CSSStyleSheet();
    sharedSheet.replaceSync(styles);
  }
  return sharedSheet;
}

const TEMPLATE = document.createElement("template");
TEMPLATE.innerHTML = `
  <div class="color-inputs" role="group">
    <input type="color" class="picker" aria-label="Color picker" tabindex="-1"/>
    <input type="text" class="text" aria-label="Hex code" />
  </div>`;

const normalize = (raw: string) => ensureHash(raw.trim().toLowerCase());

class ColorInput extends HTMLElement {
  private readonly group: HTMLElement;
  private readonly textInput: HTMLInputElement;
  private readonly pickerInput: HTMLInputElement;

  constructor() {
    super();

    const root = this.attachShadow({ mode: "open" });
    root.adoptedStyleSheets = [getSheet()];
    root.append(TEMPLATE.content.cloneNode(true));

    this.group = root.querySelector<HTMLElement>(".color-inputs")!;
    this.textInput = root.querySelector<HTMLInputElement>(".text")!;
    this.pickerInput = root.querySelector<HTMLInputElement>(".picker")!;

    this.textInput.addEventListener("input", this.onTextInput);
    this.pickerInput.addEventListener("input", this.onPickerInput);
    this.group.addEventListener("mousedown", this.onGroupMouseDown);

    this.sync();
    this.syncLabel();
  }

  static get observedAttributes() {
    return ["value", "title", "aria-label"];
  }

  attributeChangedCallback(name: string) {
    if (name === "value") this.sync();
    else this.syncLabel();
  }

  get value(): string {
    const v = normalize(this.getAttribute("value") ?? "");
    return isValid(v) ? v : DEFAULT_COLOR;
  }

  set value(val: string) {
    this.setAttribute("value", val);
  }

  override focus(options?: FocusOptions) {
    this.textInput.focus(options);
  }

  private onTextInput = () => {
    const v = normalize(this.textInput.value);
    if (isValid(v)) this.value = v;
  };

  private onPickerInput = () => {
    this.value = this.pickerInput.value;
  };

  private onGroupMouseDown = (e: Event) => {
    if (e.target === this.group) {
      e.preventDefault();
      this.textInput.focus();
    }
  };

  private sync() {
    const v = this.value;
    if (this.textInput.value !== v) this.textInput.value = v;
    if (this.pickerInput.value !== v) this.pickerInput.value = v;

    this.group.style.backgroundColor = v;
    this.group.style.color = textColor(v);
  }

  private syncLabel() {
    const label = this.getAttribute("title") || this.getAttribute("aria-label");
    if (label) this.group.setAttribute("aria-label", label);
    else this.group.removeAttribute("aria-label");
  }
}

if (!customElements.get("color-input")) {
  customElements.define("color-input", ColorInput);
}

declare global {
  interface HTMLElementTagNameMap {
    "color-input": ColorInput;
  }
}
