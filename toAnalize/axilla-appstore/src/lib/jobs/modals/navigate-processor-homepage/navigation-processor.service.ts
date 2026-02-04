import { Injectable, Injector, Renderer2, RendererFactory2 } from '@angular/core';
import { Observable, tap, catchError, throwError, shareReplay, BehaviorSubject } from 'rxjs';
import { CacheHelper } from './cache-helper';
import { Direction } from './direction';
import { Hotspot } from './hotspot.model';
import { NodeHelper } from './node-helper';
import { calculateChildPositions } from './node-utils';
import { Node } from './node.model';
import { ProcessorDebugServiceProxy, IProcessorFlowDependencyOutputDto, IProcessorDependency } from '../../../shared/service-proxies/service-proxies';
import { sequence } from '@angular/animations';


@Injectable({
  providedIn: 'root',
})
export class NavigationProcessorService {

  _inUse: boolean = false;

  nodeDefaultHeight: number = 60; // Default height for nodes
  _nodes: Node[] = []; // Array of nodes
  lines: { from: Hotspot; to: Hotspot }[] = []; // Array of connections (lines between nodes)
  fadeOutTimeout: any;
  sequence: number = 0;
  isChildSelectionOpen = false;
  isPropertySelectionOpen = false; // Tracks whether the selection modal is open
  availableProperties: { title: string, count: number }[] = [];
  availableChilds: { title: string, id: string}[] = [];
  currentBaseNode: Node | null = null; // Current node being expanded
  currentDirection: 'top' | 'right' | 'bottom' | 'left' | null = null; // Direction for new node

  selectOnInput = true;
  selectOnOutput = true;

  dependencyCache: CacheHelper<Observable<IProcessorFlowDependencyOutputDto>> = new CacheHelper();
  extensionPossibleCache: CacheHelper<boolean> = new CacheHelper(); // Cache for isExtensionPossible results
  extensionForNodePossibleCache: CacheHelper<boolean> = new CacheHelper(); // Cache for isExtensionPossible results

  private renderer: Renderer2;
  constructor(injector: Injector,
    private _processorDebugService: ProcessorDebugServiceProxy,
    rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);

  }
  private nodesSubject = new BehaviorSubject<Node[]>(this._nodes);

  get nodes(): Node[] {
    return this._nodes;
  }

  set nodes(value: Node[]) {
    this._nodes = value;
    this.nodesSubject.next(this._nodes);
  }

  get nodes$() {
    return this.nodesSubject.asObservable();
  }

  // region node
  /** Add a new node dynamically */
  addNode(node: Node): void {
    // Add a uid for the node to allow multiple instances with the same id
    node.uid = `${node.id}-${this.sequence++}`;

    this.nodes = [...this.nodes, node];
    setTimeout(() => {
      const nodeElement = document.getElementById(`node-${node.uid}-${sequence}`);
          if (nodeElement) {
            console.log(`Node node-${node.uid} found:`, nodeElement.offsetHeight);
              this.renderer.listen(nodeElement, 'resize', (event) => {
                console.log(`Node node-${node.uid} resized:`, nodeElement.offsetHeight);
                  this.updateNodeHeight(node);
              });
          } else {
            console.log(`Node node-${node.uid} not found`);
          }
      }, 1000)
   
  }
  updateNode(updatedNode: Node) {
    const index = this.nodes.findIndex(node => node.uid === updatedNode.uid);
    if (index !== -1) {
      this.nodes[index] = updatedNode;
      this.nodes = [...this.nodes];
    }
  }
  updateNodeHeight(node: Node) {
      // Trigger change detection manually
      const nodeElement = document.getElementById(`node-${node.uid}`);

      node.h = nodeElement.offsetHeight;
      //this.updateNode(node);

      if (nodeElement) {
        //  const event = new Event('input');
        //  nodeElement.dispatchEvent(event);
      }
    

  }


  /** Update a node's label dynamically and adjust its width */
  updateNodeLabel(node: Node, newLabel: string): void {
    NodeHelper.updateNodeLabel(node, newLabel);
  }

  /** Connect two nodes */
  connectNodes(fromNode: Node, toNode: Node, direction: 'top' | 'right' | 'bottom' | 'left'): void {
    NodeHelper.connectNodes(this.nodes, this.lines, fromNode, toNode, direction);
  }

  populateLines() {
    NodeHelper.populateLines(this.nodes, this.lines);
  }

  /** Preload and cache the processor dependency tree for a specific node */
  preloadDependencyTree(node: Node): Observable<IProcessorFlowDependencyOutputDto> {
    if (!this.dependencyCache.has(node.id)) {
      const dependencyTree$ = this._processorDebugService.getProcessorDependencyTree(node.id, node.type).pipe(
        tap((result) => {
          if (this.getValidExpandableProperties(result).length > 0) {
            this.extensionPossibleCache.set(node.id, true);
            NodeHelper.activateHotspotsWhichAreNotInput(node);
          } else {
            this.extensionPossibleCache.set(node.id, false);
            NodeHelper.enableAllHotspots(node, false);
          }
        }),
        catchError((err) => {
          return throwError(err);
        }),
        shareReplay(1) // Ensures the observable is shared and replayed for subsequent subscriptions
      );
      this.dependencyCache.set(node.id, dependencyTree$);
      this.extensionForNodePossibleCache.set(node.uid, true);
    } else if (!this.extensionForNodePossibleCache.has(node.uid)  && this.dependencyCache.has(node.id) && this.extensionPossibleCache.get(node.id)) {

      NodeHelper.activateHotspotsWhichAreNotInput(node);
      this.extensionForNodePossibleCache.set(node.uid, true);
    }
    return this.dependencyCache.get(node.id)!;
  }

  /** Get valid expandable properties from dependencies */
  getValidExpandableProperties(dependencies: IProcessorFlowDependencyOutputDto): { title: string, count: number }[] {
    if (!dependencies || typeof dependencies !== 'object') {
      return [];
    }
    let expandableProperties: { title: string, count: number }[] = [];
    for (const [key, value] of Object.entries(dependencies)) {
      if (key === 'dependingObjects' && Array.isArray(value)) {
        value.forEach((obj: any) => {
          if (obj.label && Array.isArray(obj.children)) {
            expandableProperties.push({ title: obj.label, count: obj.children.length });
          }
        });
      } else if (value && typeof value === 'object' && Array.isArray(value.children) && value.children.length > 0) {
        expandableProperties.push({ title: key, count: value.children.length });
      }
    }
    return expandableProperties;
  }

  /** Get valid expandable childsfrom dependencies */
  getValidExpandableChilds(dependencies: IProcessorFlowDependencyOutputDto, property: string): { title: string, id: string }[] {
    if (!dependencies || typeof dependencies !== 'object') {
      return [];
    }
    let expandableProperties: { title: string, id: string }[] = [];

    if (dependencies.dependingObjects) {
      let item = dependencies.dependingObjects.find(s => s.label == property);
      if (item) {
        item.children.forEach((child: any) => {
          console.log(`Child found ${child.name} ${child.title}`);
          expandableProperties.push({ title: child.title , id: child.id});
        });
      }
    }

    return expandableProperties;
  }



  /** Check if node extension is possible by validating dependencies */
  async isExtensionPossible(nodeId: string): Promise<boolean> {
    if (this.extensionPossibleCache.has(nodeId)) {
      return this.extensionPossibleCache.get(nodeId)!;
    }

    const dependencyTree$ = this.dependencyCache.get(nodeId);
    if (!dependencyTree$) {
      this.extensionPossibleCache.set(nodeId, false);
      return false;
    }

    const result = await new Promise<boolean>((resolve, reject) => {
      dependencyTree$.subscribe({
        next: (dependencies) =>
          resolve(this.getValidExpandableProperties(dependencies).length > 0),
        error: (err) => {
          resolve(false);
        },
      });
    });

    this.extensionPossibleCache.set(nodeId, result);
    return result;
  }


  // Map of colors for each hotspot direction
  hotspotColors: { [key: string]: string } = {
    [Direction.TOP]: '#ff5733', // Red for top
    [Direction.RIGHT]: '#33c1ff', // Blue for right
    [Direction.BOTTOM]: '#75ff33', // Green for bottom
    [Direction.LEFT]: '#f5ff33', // Yellow for left
  };

  /** Handle clicking on a hotspot to open property selection */
  openChildSelection(node: Node, direction: 'top' | 'right' | 'bottom' | 'left', property: string): void {
    this.currentBaseNode = node;
    this.currentDirection = direction;
    
    const dependencyTree$ = this.dependencyCache.get(this.currentBaseNode.id);
    if (dependencyTree$) {
      dependencyTree$.subscribe({
        next: (dependencies) => {
          this.availableChilds = this.getValidExpandableChilds(dependencies, property);

          console.log(`Dependency found ${this.availableChilds.length}`);
          if (this.availableProperties.length === 0) {
          }
          this.isChildSelectionOpen = true;
        },
        error: (err) => { }
      });
    }
    else {
      console.log("Dependency not found");
    }
  }

  /** Handle clicking on a hotspot to open property selection */
  openPropertySelection(input: any): void {

    this.currentBaseNode = input.node;
    this.currentDirection = input.direction;
    console.log(`openPropertySelection => node: ${this.currentBaseNode}, dir: ${this.currentDirection}`);

    this.isPropertySelectionOpen = true;

    const dependencyTree$ = this.dependencyCache.get(this.currentBaseNode.id);
    if (dependencyTree$) {
      dependencyTree$.subscribe({
        next: (dependencies) => {
          this.availableProperties = this.getValidExpandableProperties(dependencies);

          console.log(`Dependency found ${this.availableProperties.length}`);
          if (this.availableProperties.length === 0) {
          }
          else
            this.isPropertySelectionOpen = true;
        },
        error: (err) => { }
      });
    }
    else {
      console.log("Dependency not found");
    }
  }

  idOrName(node: Node): string {
    if (node.type == 'Processors') {
      return node.name;
    }
    return node.id;
  }
  idOrNameIPD(node: IProcessorDependency): string {
    if (node.type == 'Processors') {
      return node.name;
    }
    return node.id;
  }


  selectAllProperty(input: any): void {

    this.currentBaseNode = input.node;
    this.currentDirection = input.direction;
    const dependencyTree$ = this.dependencyCache.get(this.currentBaseNode.id);
    if (dependencyTree$) {
      dependencyTree$.subscribe({
        next: (dependencies) => {
          this.availableProperties = this.getValidExpandableProperties(dependencies);

          console.log(`Dependency found ${this.availableProperties.length}`);
          if (this.availableProperties.length > 0) {
            this.availableProperties.forEach((child, index) => {
              this.selectProperty(child.title, this.currentBaseNode, NodeHelper.getHotspotByName(this.currentBaseNode, this.currentDirection));
            });
          }
        },
        error: (err) => { }
      });
    }
    else {
      console.log("Dependency not found");
    }
  }
  /**
    * Handles the selection of a property for a node.
    * Aligns children dynamically based on the selected direction and logs full debug details.
    */
  selectProperty(property: any, node: Node, hotspot: Hotspot, child: string = null): void {


    console.log('Selecting property:', property);
    console.log('Current selected hotspot:', hotspot.toString());

    const dependencies = this.dependencyCache.get(node.id);
    if (!dependencies) {
      console.log('No dependencies found for node:', node.id);
      return;
    }

    dependencies.subscribe({
      next: (dependencyTree) => {
        console.log('Dependency tree:', dependencyTree);

        

        const selectedProperty = dependencyTree.dependingObjects.find(s => s.label == property);
        if (!selectedProperty || !Array.isArray(selectedProperty.children)) {
          console.log('Selected property has no children or is invalid:', selectedProperty);
          console.log(`${property}`)
          return;
        }
        console.log('Selected property:', selectedProperty);


        if (child) {
        }


        let childArr: IProcessorDependency[] = child ? [selectedProperty.children.find(s => s.id == child)] : selectedProperty.children;

        const newPosition = calculateChildPositions(node, this.currentDirection, childArr);
        console.log('New positions for children:', newPosition);

        childArr.forEach((child, index) => {
          const newNode = new Node( 
            child.id,
            child.name,
            child.type,
            child.title,
            child.description,
            newPosition[index].x,
            newPosition[index].y,
            NodeHelper.calculateLabelWidth(child.name),
            this.nodeDefaultHeight
          );

          console.log('Creating new node:', newNode);

          this.addNode(newNode);
          this.preloadDependencyTree(newNode).subscribe({
            next: () => {
              console.log(`Successfully loaded node ${newNode.name} (${newNode.id})`);
            },
            error: (err) => {
              console.error(`Error loading node ${newNode.name} (${newNode.id}):`, err);
            }
          });

          NodeHelper.connectNodes(this.nodes, this.lines, node, newNode, this.currentDirection);
        });
      },
      error: (err) => {
        console.error('Error retrieving dependencies:', err);
      }
    });

    this.closePropertySelection();
  }

  /** Close the property selection UI */
  closePropertySelection(): void {
    this.isPropertySelectionOpen = false;
    this.currentBaseNode = null;
    this.currentDirection = null;
    this.isChildSelectionOpen = false;
    this.availableProperties = [];
    this.availableChilds = [];
  }






  /** Find the opposite direction for node connection */
  oppositeDirection(direction: string): string {
    return Direction.opposite(direction);
  }

  hidePropertySelectionWithDelay(): void {
    this.fadeOutTimeout = setTimeout(() => {
      this.closePropertySelection();
    }, 3000); // 3 seconds delay
  }

  startFadeout() {
    if (this.fadeOutTimeout) {
      clearTimeout(this.fadeOutTimeout);
    }
    this.hidePropertySelectionWithDelay();
  }

  stopFadeout() {
    if (this.fadeOutTimeout) {
      clearTimeout(this.fadeOutTimeout);
      this.fadeOutTimeout = null;
    }
  }


  setUsed() {

    this._inUse = true;
  }

  setUnused() {
    this._inUse = false;
  }

  getUsed(): boolean {
    return this._inUse;
  }


}
