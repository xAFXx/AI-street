import {Hotspot} from "./hotspot.model";

export class Node {
  uid: string;

  id: string;


  name: string;
  type: string;
  title: string;
  description: string;

  x: number;
  y: number;
  w: number;
  h: number;
  isExpandable: boolean;
  availableDirections: { [key: string]: boolean }; // Directions available for new nodes
  hotspotLabels: Hotspot[]; // Labels for each hotspot direction
  hotspotLabel: string;
  


  constructor(
    id: string,
    name: string,
    type: string,
    title: string,
    description: string,
    x: number,
    y: number,
    w: number,
    h: number,
    isExpandable: boolean = true,
    hotspotLabels?: Hotspot[] // Optional labels for hotspots
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.title = title;
    this.description = description;
    this.x = x;
    this.y = y;
    this.isExpandable = isExpandable;

    this.w = w;
    this.h= h;
    // Initialize all directions as available
    this.availableDirections = {
      top: true,
      right: true,
      bottom: true,
      left: true,
    };

    // Initialize hotspot labels; set defaults if not provided
    this.hotspotLabels = hotspotLabels || [
      new Hotspot('top', "NotUsed", null, Math.round(this.x + (this.w / 2)), Math.round(this.y)),
      new Hotspot('right', "NotUsed", null, Math.round(this.x + this.w), Math.round(this.y + (this.h / 2))),
      new Hotspot('bottom', "NotUsed", null, Math.round(this.x + (this.w / 2)), Math.round(this.y + this.h)),
      new Hotspot('left', "NotUsed", null, Math.round(this.x), Math.round(this.y + (this.h / 2))),
    ];
  }

  public toString(): string {
    return `Id: ${this.id}, Title: ${this.title}, Description: ${this.description}, name: ${this.name}, type: ${this.type}, expa: ${this.isExpandable}`;
  }
  public toStringDetail(): string {
    return `Id: ${this.id}, Title: ${this.title}, Description: ${this.description}, name: ${this.name}, type: ${this.type}, expa: ${this.isExpandable}, x: ${this.x}, y: ${this.y}, w: ${this.w}, h: ${this.h}`;
  }
  public setPositions(x: number, y: number): void {
    const deltaX = x - this.x;
    const deltaY = y - this.y;

    this.x = x;
    this.y = y;

    this.hotspotLabels.forEach(hotspot => {
      hotspot.move(deltaX, deltaY);
    });
  }

  public addToNode(name: string, toNode: Node): void {
      // Find the existing connected node by name (if applicable)
      const existingNode = this.hotspotLabels.find(node => node.Label === name);

      if (!existingNode) {
        // If the node with the given name doesn't exist, add the new node
        existingNode.ConnectedNodes.push(toNode);

        console.log(`Node "${name}" added as a connection to Node "${name}".`);
      } else {
        console.log(
          `Node "${name}" is already connected to Node "${this.name}", skipping addition.`
        );
      }
  }

  public getHotspot(name: string): Hotspot {
    return this.hotspotLabels.find(hotspot => hotspot.Label === name);
  }

  public getConnectionPairs(name: string | null): [Hotspot, Hotspot][] {
    console.log(`Debug: Starting getConnectionPairs for node ${this.name} (ID: ${this.id}) with filter name: ${name}`);

    let searchLabels = (name !== null) ? this.hotspotLabels.filter(hotspot => hotspot.Label == name) : this.hotspotLabels;
    console.log(`Debug: searchLabels length: ${searchLabels.length}`);

    // Find the existing connected node by name (if applicable)
    const outgoingNodes = searchLabels.filter(node => node.Direction === 'Output');
    console.log(`Debug: outgoingNodes length: ${outgoingNodes.length}`);

    let pairs: [Hotspot, Hotspot][] = [];

    outgoingNodes.forEach(hotspot => {
      console.log(`Debug: Processing outgoing hotspot: ${hotspot.Label}`);
      hotspot.ConnectedNodes.forEach(connectedNode => {
        console.log(`Debug: Processing connected node: ${connectedNode.name}`);
        const connectedHotspot = connectedNode.getHotspot(this.oppositeDirection(hotspot.Label));
        if (connectedHotspot) {
          console.log(`Debug: Found connected hotspot: ${connectedHotspot.Label}`);
          pairs.push([hotspot, connectedHotspot]);
        } else {
          console.warn(`Debug: No connected hotspot found for direction: ${this.oppositeDirection(hotspot.Label)}`);
        }
      });
    });

    console.log(`Debug: Finished getConnectionPairs. Total pairs: ${pairs.length}`);
    return pairs;
  }


  oppositeDirection(direction: string): string {
    const map: { [key: string]: string } = {
      right: 'left',
      left: 'right',
      top: 'bottom',
      bottom: 'top',
    };

    return map[direction] || '';
  }

}
