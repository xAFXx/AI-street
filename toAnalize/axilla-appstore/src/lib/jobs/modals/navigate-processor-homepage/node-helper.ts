import { Node } from './node.model';
import { Hotspot } from './hotspot.model';
import { Direction } from './direction';

export class NodeHelper {

  static updateNodeLabel(node: Node, newLabel: string): void {
    node.name = newLabel;
    this.adjustNodeSize(node);
  }

  static connectNodes(nodes: Node[], lines: { from: Hotspot; to: Hotspot }[], fromNode: Node, toNode: Node, direction: 'top' | 'right' | 'bottom' | 'left'): void {
    this.configureHotspots(fromNode, toNode, direction);
    this.populateLines(nodes, lines);
    //console.log(`Connected nodes: ${fromNode.name} -> ${toNode.name}`);
  }

  static populateLines(nodes: Node[], lines: { from: Hotspot; to: Hotspot }[]): void {
    //console.log('Debug: Starting to populate lines...');
    lines.length = 0;
    let index = 0;

    const processNode = () => {
      if (index < nodes.length) {
        const node = nodes[index];
        //console.log(`Debug: Processing node ${node.name} (ID: ${node.id})`);
        const connectionPairs = node.getConnectionPairs(null);
        //console.log(`Debug: Found ${connectionPairs.length} connection pairs for node ${node.name}`);
        connectionPairs.forEach(pair => {
          //console.log(`Debug: Adding line from ${pair[0].Label} to ${pair[1].Label}`);
          lines.push({ from: pair[0], to: pair[1] });
        });
        index++;
        setTimeout(processNode, 0); // Break up the loop
      } else {
        //console.log('Debug: Finished populating lines. Total lines:', lines.length);
      }
    };

    processNode();
  }

  static adjustNodeSize(node: Node): void {
    const labelWidth = this.calculateLabelWidth(node.name);
    const updatedWidth = Math.max(labelWidth + 20, node.w);
    node.w = updatedWidth;
    //console.log(`Node ${node.id}: Width adjusted to ${node.w}px`);
  }

  static calculateLabelWidth(label: string): number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Canvas context is unavailable for text measurement.');
      return 100;
    }
    ctx.font = '14px Arial';
    return ctx.measureText(label).width + 60;
  }

  /**
  * Configures the hotspots between two nodes based on the specified direction.
  * 
  * @param outputNode - The node from which the connection starts.
  * @param inputNode - The node to which the connection is made.
  * @param direction - The direction of the connection ('top', 'right', 'bottom', 'left').
  */
  static configureHotspots(outputNode: Node, inputNode: Node, direction: 'top' | 'right' | 'bottom' | 'left'): void {
    console.log(`Configuring hotspots: ${outputNode.title}/${outputNode.name}/${outputNode.id} -> ${inputNode.title}/${inputNode.name}/${inputNode.id} in direction ${direction}`);

    const hotspotOut = outputNode.getHotspot(direction);
    const hotspotIn = inputNode.getHotspot(Direction.opposite(direction));

    if (hotspotOut && hotspotIn) {
      console.log(`Hotspot out found: ${hotspotOut.Label}, Hotspot in found: ${hotspotIn.Label}`);

      hotspotOut.setAsOutput();
      hotspotOut.ConnectedNodes.push(inputNode);
      console.log(`Hotspot out configured: ${hotspotOut.Label}, connected to ${inputNode.name}`);

      hotspotIn.setAsInput();
      console.log(`Hotspot in configured: ${hotspotIn.Label}`);

    } else {
      console.log(`Hotspot out or in not found for nodes: ${outputNode.name}, ${inputNode.name}`);
    }
  }

  static isHotspotEnable (node: Node, name: string): boolean {
    let hotspotToChange = node.getHotspot(name);
    

    if (hotspotToChange) {
      //console.log(`Hotspot ${name}  found for node ${node.name}, it is ${hotspotToChange.Enabled}`); 
      return hotspotToChange.Enabled;
    } else {
      node.hotspotLabels.forEach(hotspot => {
        //console.log(`Hotspot ${name} not found for node ${node.name}`)
      });
      //console.log(`Hotspot ${name} not found for node ${node.name} with length ${node.hotspotLabels.length}`); 
    }
    return false;
  }

  static activateHotspotsWhichAreNotInput(node: Node) {
    node.hotspotLabels.forEach(hotspot => {
      if (hotspot.Direction !== 'Input') {
        hotspot.Enabled = true;
        hotspot.Visible = true;
      } else {
        hotspot.Enabled = false;
      }
    });
  }

  static enableAllHotspots(node: Node, enable: boolean = true): void {
    node.hotspotLabels.forEach(hotspot => {
      hotspot.Enabled = true;
    });
    //console.log(`All hotspots enabled for node ${node.name}`);
  }
  static setAllHotspotsVisibility(node: Node, visible: boolean): void {
    node.hotspotLabels.forEach(hotspot => {
      hotspot.Visible = visible;
    });
    //console.log(`Hotspot visibility set to ${visible} for node ${node.name}`);
  }

  static setHotspotVisibilityExcept(node: Node, hotspotName: string): void {
    node.hotspotLabels.forEach(hotspot => {
      hotspot.Visible = hotspot.Label === hotspotName;
      hotspot.Enabled = hotspot.Label === hotspotName;
    });
    //console.log(`Hotspot ${hotspotName} enabled, all others disabled for node ${node.name}`);
  }

  static setHotspotsVisibility(node: Node, name: string, visible: boolean = true): void {
    let hotspotToChange = node.hotspotLabels.find(hotspot => {
      hotspot.Label== name;
    });
    if (hotspotToChange) {
      //console.log(`Hotspot visibility set to ${visible} for node ${node.name}`);
      hotspotToChange.Visible = visible;
    }
  }

  static setHotspotsEnable(node: Node, name: string, enable: boolean = true): void {
    let hotspotToChange = node.hotspotLabels.find(hotspot => {
      hotspot.Label == name;
    });
    if (hotspotToChange) {
      //console.log(`Hotspot visibility set to ${enable} for node ${node.name}`);
      hotspotToChange.Enabled = enable;
    }
  }


  /**
 * Retrieve a hotspot by its name (direction) from a node and include detailed debugging.
 *
 * @param node - The node containing the hotspots.
 * @param name -
 *
 */
  static getHotspotByName(node: Node, name: string): Hotspot | undefined {
    return node.hotspotLabels.find(hotspot => hotspot.Label.toLowerCase() === name.toLowerCase());
  }
}

