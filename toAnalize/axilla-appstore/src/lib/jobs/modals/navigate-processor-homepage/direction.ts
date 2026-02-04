export class Direction {
  static readonly TOP = 'top';
  static readonly RIGHT = 'right';
  static readonly BOTTOM = 'bottom';
  static readonly LEFT = 'left';

  static opposite(direction: string): string {
    const map: { [key: string]: string } = {
      [Direction.TOP]: Direction.BOTTOM,
      [Direction.RIGHT]: Direction.LEFT,
      [Direction.BOTTOM]: Direction.TOP,
      [Direction.LEFT]: Direction.RIGHT,
    };
    return map[direction] || '';
  }
}
