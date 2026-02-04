import { Node } from './node.model';
import { Direction } from './direction';

export function calculateChildPositions(
  node: Node, // Parent node
  direction: string, // Alignment direction
  totalChildren: any[], // Number of child nodes
  spacing: number = 20 // Spacing between children
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  let oWidth: number[] = [];
  let totalWidth = 0;

  for (let i = 0; i < totalChildren.length; i++) {
    oWidth[i] = calculateLabelWidth(totalChildren[i].title);
    totalWidth += oWidth[i];
  }

  let MaxValue = Math.max(...oWidth);

  let CurrentPosition = 0;
  let staticOffset = 0;
  if (direction === Direction.LEFT) {
    staticOffset = MaxValue + 20;
    CurrentPosition = node.y - (((node.h * totalChildren.length) - (spacing * (totalChildren.length - 1))) / 2);
  } else if (direction === Direction.RIGHT) {
    staticOffset = node.w + 20;
    CurrentPosition = node.y - (((node.h * totalChildren.length) - (spacing * (totalChildren.length - 1))) / 2);
  } else if (direction === Direction.TOP) {
    staticOffset = node.h + spacing;
    CurrentPosition = node.x - ((totalWidth - (spacing * (totalChildren.length - 1))) / 2);
  } else if (direction === Direction.BOTTOM) {
    staticOffset = node.h + spacing;
    CurrentPosition = node.x - ((totalWidth - (spacing * (totalChildren.length - 1))) / 2);
  }

  const startOffset = totalWidth / 2;

  for (let i = 0; i < totalChildren.length; i++) {
    let x = 0;
    let y = 0;
    switch (direction) {
      case Direction.LEFT:
        x = node.x - staticOffset + ((MaxValue / 2) - (oWidth[i] / 2));
        y = CurrentPosition;
        break;

      case Direction.RIGHT:
        x = node.x + staticOffset + ((MaxValue / 2) - (oWidth[i] / 2));
        y = CurrentPosition;
        break;

      case Direction.TOP:
        x = CurrentPosition;
        y = node.y - staticOffset;
        break;

      case Direction.BOTTOM:
        x = CurrentPosition;
        y = node.y + staticOffset;
        break;

      default:
        break;
    }

    positions.push({ x, y });

    switch (direction) {
      case Direction.LEFT:
      case Direction.RIGHT:
        CurrentPosition += node.h + spacing;
        break;
      case Direction.TOP:
      case Direction.BOTTOM:
        CurrentPosition += oWidth[i] + spacing;
        break;
    }
  }

  return positions;
}

function calculateLabelWidth(label: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return 100;
  }
  ctx.font = '14px Arial';
  return ctx.measureText(label).width + 60;
}
