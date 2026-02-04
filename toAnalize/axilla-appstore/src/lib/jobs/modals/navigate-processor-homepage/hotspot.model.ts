import { Node } from './node.model';

export class Hotspot {
  Label: string;
  Direction: 'Input' | 'Output' | 'NotUsed';
  Type: string;
  Enabled: boolean = true;
  X: number;
  Y: number;
  ConnectedNodes: Node[];
  Visible: boolean; // Add this property

  constructor(
    Label: string,
    Direction: 'Input' | 'Output' | 'NotUsed' = 'NotUsed',
    Type: string = null,
    x: number = 0,
    y: number = 0
  ) {
    this.Label = Label;
    this.Direction = Direction;
    this.Type = Type;
    this.X = x;
    this.Y = y;
    this.ConnectedNodes = [];
    this.Visible = true; // Initialize as true
  }

  changePosition(deltaX: number, deltaY: number): void {
    this.X = deltaX;
    this.Y = deltaY;
  }

  move(deltaX: number, deltaY: number): void {
    this.X += deltaX;
    this.Y += deltaY;
  }
  toString(): string {
    return `Hotspot ${this.Label}, dir: ${this.Direction}, type: ${this.Type}, en: ${this.Enabled}, vs: ${this.Visible}`;
  }
  toStringDetail(): string {
    return `Hotspot ${this.Label}, dir: ${this.Direction}, type: ${this.Type}, en: ${this.Enabled}, vs: ${this.Visible}, x: ${this.X}, y: ${this.Y}}`;
  }

  setAsInput(): void {
    this.Direction = 'Input';
    this.markAsConnection();
  }
  setAsOutput(): void {
    this.Direction = 'Output';
    this.markAsConnection();
  }

  markAsConnection(): void {
    this.Visible = true;
    this.Enabled = false;
  }
}
