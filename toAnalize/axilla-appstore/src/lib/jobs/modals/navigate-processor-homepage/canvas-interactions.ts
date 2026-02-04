import { Node } from './node.model';

export class CanvasInteractions {
  isDraggingNode = false; // Manage drag state for nodes
  dragOffset = { x: 0, y: 0 }; // Drag offset for positioning
  zoomFactor: number = 1; // Default zoom factor

  // Variables for panning
  isPanning: boolean = false;
  startX: number = 0;
  startY: number = 0;
  translateX: number = 0;
  translateY: number = 0;

  currentDragNode: Node = null;


  startDrag(node: Node, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingNode = true;

    const target = (event.target as HTMLElement).parentElement.parentElement;

    this.currentDragNode = node;

    let i = {
      x: (event.clientX * 1 / this.zoomFactor) - node.x, //, / 2, // Half the width of the node (center)
      y: (event.clientY * 1 / this.zoomFactor) - node.y // / 2, // Half the height of the node (center)
    };

    this.dragOffset = i;
   
  }

  onDrag(node: Node, event: MouseEvent): void {

    this.currentDragNode = node;
    if (this.isDraggingNode) {
      const canvasBounds = (event.target as HTMLElement).closest('.canvas')?.getBoundingClientRect();

      if (!canvasBounds) {
        return;
      }

      //const newX = event.clientX - canvasBounds.left - this.dragOffset.x;
      //const newY = event.clientY - canvasBounds.top - this.dragOffset.y;

      const newX = (event.clientX * 1/this.zoomFactor) - this.dragOffset.x;
      const newY = (event.clientY * 1 /this.zoomFactor) - this.dragOffset.y;

      this.currentDragNode.setPositions(newX, newY);
    }
  }


  stopDrag(): void {
    this.currentDragNode = null;
    this.isDraggingNode = false; // Disable dragging state
  }

  updateZoomFactor(newZoom: number): void {
    this.zoomFactor = Math.max(0.1, Math.min(newZoom, 3)); // Min: 0.1x, Max: 3x
  }

  zoomIn(): void {
    this.zoomFactor = Math.min(this.zoomFactor + 0.1, 3); // Limit max zoom to 3x
  }

  zoomOut(): void {
    this.zoomFactor = Math.max(this.zoomFactor - 0.1, 0.1); // Limit min zoom to 0.1x
  }

  onZoom(event: WheelEvent): void {
    const zoomChange = event.deltaY > 0 ? -0.1 : 0.1; // Zoom out or in
    this.updateZoomFactor(this.zoomFactor + zoomChange);
  }

  // Panning methods
  startPan(event: MouseEvent): void {
    this.isPanning = true;
    this.startX = event.clientX - this.translateX;
    this.startY = event.clientY - this.translateY;
  }

  pan(event: MouseEvent): void {
    if (!this.isPanning) return;
    this.translateX = event.clientX - this.startX;
    this.translateY = event.clientY - this.startY;
  }

  stopPan(): void {
    this.isPanning = false;
  }
}


