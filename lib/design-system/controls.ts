"use client";

// Interactive Jigsaw controls. The snapshot's files don't declare "use client", so this boundary
// lets server pages import the design system without pulling client-only code into them.
export { Slider, type SliderProps } from "./jigsaw/components/ui/controls/slider/slider";
export { WrappedSelect, type WrappedSelectOption } from "./jigsaw/components/ui/controls/select/select";
export { ToggleSwitch } from "./jigsaw/components/ui/controls/toggle-switch/toggle-switch";
export { Input } from "./jigsaw/components/ui/controls/input/input";
export { InputGroup, InputGroupInput } from "./jigsaw/components/ui/controls/input-group/input-group";
export { Textarea } from "./jigsaw/components/ui/controls/textarea/textarea";
