import { Component, OnInit, Injector, Input, Output, EventEmitter, ViewChild, HostListener, ChangeDetectorRef } from '@angular/core';
import { AppComponentBase } from '@axilla/axilla-shared';
import { ProcessorDebugServiceProxy } from '../../../shared/service-proxies/service-proxies';
import { ProcessorService } from '../../shared/services/processor.service';
import { Node } from './node.model';
import { NodeHelper } from './node-helper';
import { CanvasInteractions } from './canvas-interactions';
import { NavigationProcessorService } from './navigation-processor.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'navigate-processor-homepage',
  templateUrl: './navigate-processor-homepage.component.html',
  styleUrls: ['./navigate-processor-homepage.component.scss'],
})
export class NavigateProcessorHomepageComponent extends AppComponentBase implements OnInit {
  @Input() processorName: string;
  @Input() processorId: string;
  processorDescription: string;

  @Output() onOpen: EventEmitter<any> = new EventEmitter<any>();
  @Output() goBackHome = new EventEmitter();

  @ViewChild('dv', { static: true }) dv: any;

  //indicate if we are dragging node, pan is executed wrongly
  dragNode = false;
  canvasWidth = 800; // Replace with your fixed width
  canvasHeight = 800; // Replace with your fixed width
 
  // region coordinates
  //centerX: number = 0; // Center X coordinate
  //centerY: number = 0; // Center Y coordinate

  canvasInteractions = new CanvasInteractions();
  private nodesSubscription: Subscription;



  _navigationProcessorService: NavigationProcessorService

  constructor(
    injector: Injector,
    private _processorDebugService: ProcessorDebugServiceProxy,
    private processorService: ProcessorService,
    private cdr: ChangeDetectorRef
  ) {
    super(injector);
    this._navigationProcessorService = injector.get(NavigationProcessorService);
    //// Recalculate on window resize
    //window.addEventListener('resize', () => {
    //  this.updateCenterCoordinates();
    //});
  }

  // region navigation
  close(): void {
    setTimeout(() => this.processorService.clear(), 2000);
  }

  goHome() {
    this.goBackHome.emit();
  }
  updateNodeHeight(node: Node, newHeight: number) {
    node.h = newHeight;
    this._navigationProcessorService.updateNode(node);
    this.cdr.detectChanges(); // Manually trigger change detection
  }
  ngOnInit(): void {
    // Create the first node (initial starting node)
    const startNode = new Node(this.processorId,
      this.processorName,
      'Processor',
      this.processorName,
      this.processorDescription,
      150,
      this._navigationProcessorService.nodeDefaultHeight,
      NodeHelper.calculateLabelWidth(this.processorName),
      this._navigationProcessorService.nodeDefaultHeight, true);
    this._navigationProcessorService.addNode(startNode);

    // Preload dependency tree for the starting node
    this._navigationProcessorService.preloadDependencyTree(startNode).subscribe({
      next: () => { },
      error: (err) => { }
    });

    this.nodesSubscription = this._navigationProcessorService.nodes$.subscribe(() => {

      this.updateSvgSize();
    });
  }


  ngOnDestroy(): void {
    if (this.nodesSubscription) {
      this.nodesSubscription.unsubscribe();
    }
  }

  updateSvgSize(): void {
    const svgElement = document.querySelector('.lines-layer') as SVGElement;
    if (!svgElement) return;

    const nodes = this._navigationProcessorService.nodes;
    if (nodes.length === 0) return;

    const minX = Math.min(...nodes.map(node => node.x));
    const minY = Math.min(...nodes.map(node => node.y));
    const maxX = Math.max(...nodes.map(node => node.x + node.w));
    const maxY = Math.max(...nodes.map(node => node.y + node.h));

    const width = maxX - minX + 400;
    const height = maxY - minY + 400;

    svgElement.setAttribute('width', `${width}px`);
    svgElement.setAttribute('height', `${height}px`);
   // svgElement.style.transform = `translate(${minX}px, ${minY}px)`;
  }

  closeNode(node: Node): void {
  // this._navigationProcessorService.closeNode(node);
  }

  ngAfterViewInit(): void {
    const maxX = Math.max(...this._navigationProcessorService.nodes.map(node => node.x + node.w)); // Max width
    const maxY = Math.max(...this._navigationProcessorService.nodes.map(node => node.y + node.h)); // Max height
    this.canvasWidth = maxX * this.canvasInteractions.zoomFactor;
    this.canvasHeight = maxY * this.canvasInteractions.zoomFactor;
  }

  navigateToVDB(node: any, event: MouseEvent): void {
    event.stopPropagation();
    if (node.type === 'VDB') {
      const url = `/app/appstore/vdb/${node.id}`;
      window.open(url, '_blank');
    }
  }

 

  startDrag(node: Node, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._navigationProcessorService.setUsed();

    this.dragNode = true;
    this._navigationProcessorService.currentBaseNode = node;
    this.canvasInteractions.startDrag(node, event);
    window.addEventListener('mousemove', this.onDragBound);
    window.addEventListener('mouseup', this.stopDragBound);
  }

  onDragBound = (event: MouseEvent) => this.onDrag(event);
  stopDragBound = () => this.stopDrag();

  onDrag(event: MouseEvent): void {
    this._navigationProcessorService.setUsed();
    this.canvasInteractions.onDrag(this._navigationProcessorService.currentBaseNode, event);
  }

  stopDrag(): void {
    this._navigationProcessorService.setUnused();
    this.dragNode = false;
    this.canvasInteractions.stopDrag();
    window.removeEventListener('mousemove', this.onDragBound);
    window.removeEventListener('mouseup', this.stopDragBound);
    this._navigationProcessorService.currentBaseNode = null;

    this.updateSvgSize();
  }

  @HostListener('mousewheel', ['$event'])
  onZoom(event: WheelEvent): void {
    this.canvasInteractions.onZoom(event);
  }

  updateZoomFactor(newZoom: number): void {
    this.canvasInteractions.updateZoomFactor(newZoom);
  }

  zoomIn(): void {
    this.canvasInteractions.zoomIn();
  }

  zoomOut(): void {
    this.canvasInteractions.zoomOut();
  }

  ///** Update center coordinates dynamically */
  //updateCenterCoordinates(): void {
  //  const canvasElement = document.querySelector('.canvas') as HTMLElement;

  //  if (canvasElement) {
  //    const rect = canvasElement.getBoundingClientRect();
  //    this.centerX = Math.round((rect.left + rect.right) / 2); // Horizontal center
  //    this.centerY = Math.round((rect.top + rect.bottom) / 2); // Vertical center
  //  }
  //}

  // Panning methods
  startPan(event: MouseEvent): void {


    event.preventDefault();
    event.stopPropagation();
    if (this.dragNode) {
      return;

    }

    if ((event.target as HTMLElement).classList.contains('node-label')) {
      return;
    }
    this.canvasInteractions.startPan(event);
  }

  pan(event: MouseEvent): void {
    this.canvasInteractions.pan(event);
  }

  stopPan(): void {
    this.canvasInteractions.stopPan();
  }
}
