export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 400,
  damping: 32,
  mass: 0.8,
} as const;

export const SPRING_PRESS = {
  type: "spring",
  stiffness: 500,
  damping: 30,
} as const;

