# [Color Mixer](https://color-mixer.annliu.dev/)

`<color-mixer>` blends one main color with other colors at evenly spaced steps. Each blend appears as a swatch that copies the hex value to the clipboard on a mouse click or enter/space keydown. The number of mix colors and steps (1-8) are customizable through the UI.

`<color-input>` is a color input field consisting of a native color picker paired with a hex text field synced to one value.

```
<color-input value="#ff0000"></color-input>
<color-mixer main-color="#ff0000" steps="5"></color-mixer>
```
