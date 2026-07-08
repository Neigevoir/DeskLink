export interface MouseMovePayload {
  type: 'mouse-move';
  x: number; // 0~1 ratio
  y: number; // 0~1 ratio
}

export interface MouseButtonPayload {
  type: 'mouse-down' | 'mouse-up';
  button: 'left' | 'right' | 'middle';
}

export interface MouseWheelPayload {
  type: 'mouse-wheel';
  deltaX: number;
  deltaY: number;
}

export interface KeyPayload {
  type: 'key-down' | 'key-up';
  key: string;
  code: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

export type ControlMessage =
  | MouseMovePayload
  | MouseButtonPayload
  | MouseWheelPayload
  | KeyPayload;
