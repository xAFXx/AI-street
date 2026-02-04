import { Component, OnInit, Injector, Input, OnChanges, SimpleChanges, AfterViewInit, HostListener } from '@angular/core';
import { AppComponentBase } from '@axilla/axilla-shared';
import { Node } from './node.model';
import { NodeHelper } from './node-helper';
import { Direction } from './direction';
import { Hotspot } from './hotspot.model';
import { NavigationProcessorService } from './navigation-processor.service';

@Component({
  selector: 'navigation-hotspot',
  templateUrl: './navigation-hotspot.component.html',
  styleUrls: ['./navigation-hotspot.component.scss'],
})
export class NavigateHotspotComponent extends AppComponentBase implements OnInit, OnChanges, AfterViewInit {
  @Input() node: Node;
  @Input() direction: 'top' | 'right' | 'bottom' | 'left';

  _navigationProcessorService: NavigationProcessorService
  localHotspot: Hotspot;

  localSelectedProperty: string;

  constructor(
    injector: Injector
  ) {
    super(injector);
    this._navigationProcessorService = injector.get(NavigationProcessorService);

    //// Recalculate on window resize
    //window.addEventListener('resize', () => {
    //  this.updateCenterCoordinates();
    //});
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes.node) {
      this.updateHotspotPosition();
    }
  }

  updateHotspotPosition() {
     this._navigationProcessorService.updateNodeHeight(this.node);
    if (!this.localHotspot) {
      this.localHotspot = NodeHelper.getHotspotByName(this.node, this.direction);
      if (!this.localHotspot) {

        return;
      }
    }

    console.log(`3. Hotspot: ${this.localHotspot.toStringDetail()}`);
    const { x, y, w, h } = this.node;
    console.log(`The node information changed is ${x}, ${y}, ${w}, ${h}`);
    switch (this.direction) {
      case 'left':
        this.localHotspot.changePosition(x, y + h / 2);
        break;
      case 'right':
        this.localHotspot.changePosition(x + w, y + h / 2);
        break;
      case 'top':
        this.localHotspot.changePosition(x + w / 2, y);
        break;
      case 'bottom':
        this.localHotspot.changePosition(x + w / 2, y + h );
        break;
    }
  }

  ngOnInit(): void {
    this.localHotspot = NodeHelper.getHotspotByName(this.node, this.direction);
  }

  ngAfterViewInit(): void {
    this.updateHotspotPosition();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.updateHotspotPosition();
  }
  // Map of colors for each hotspot direction
  hotspotColors: { [key: string]: string } = {
    [Direction.TOP]: '#ff5733', // Red for top
    [Direction.RIGHT]: '#33c1ff', // Blue for right
    [Direction.BOTTOM]: '#75ff33', // Green for bottom
    [Direction.LEFT]: '#f5ff33', // Yellow for left
  };

  getHotspotColor(): string {
    //console.log(`Hotspot color determine ${this.localHotspot.toString()}`);
    if (this.localHotspot && this.localHotspot.Enabled) {
      const canExtend = this._navigationProcessorService.extensionPossibleCache.get(this.node.id);
      if (canExtend) {
        return this.hotspotColors[this.direction];
      }
    }
    return 'gray'; // Default color for unused hotspots
  }

  canUseHotspot(): boolean {
    //console.log(`Hotspot can use determine ${this.localHotspot.toString()}`);
    if (this.localHotspot && this.localHotspot.Enabled) {
      return this._navigationProcessorService.extensionPossibleCache.get(this.node.id) || false;
    }
    return false;
  }

  onHotspotHover(): void {

    event.stopPropagation(); // Prevent event bubbling
    //console.log(`Hotspot hover ${this.localHotspot.toString()}`);
    if (!this.localHotspot.Enabled && !this._navigationProcessorService.getUsed()) {
      return;
    }
    this._navigationProcessorService.openPropertySelection({ node: this.node, direction: this.direction });

    this._navigationProcessorService.stopFadeout();
  }

  onHotspotHoverLeave(): void {
    this._navigationProcessorService.hidePropertySelectionWithDelay()
  }

  onPropertyHover(property: any): void {

    if (property.count == 0 && !this._navigationProcessorService.getUsed())  {
      return;
    }

    this.localSelectedProperty = property.title;
    this._navigationProcessorService.openChildSelection(this.node, this.direction, property.title);
  }

  onSelectProperty(input: string): void {
    event.stopPropagation(); // Prevent event bubbling
    this._navigationProcessorService.selectProperty(input, this.node, this.localHotspot);
  }

  onSelectChild(event: MouseEvent, input: string, property: string): void {
    event.stopPropagation(); // Prevent event bubbling
    this._navigationProcessorService.selectProperty(property, this.node, this.localHotspot, input);
  }

  onDoubleClick(event: Event): void {
    event.stopPropagation(); // Prevent event bubbling
    console.log(`Add everything`);
    this._navigationProcessorService.selectAllProperty({ node: this.node, direction: this.direction });
  }

  toggleSelectOnInput(): void {
    this._navigationProcessorService.selectOnInput = !this._navigationProcessorService.selectOnInput;
  }

  toggleSelectOnOutput(): void {
    this._navigationProcessorService.selectOnOutput = !this._navigationProcessorService.selectOnOutput;
  }

  get isVisible(): boolean {
    return (this._navigationProcessorService.currentBaseNode?.uid == this.node.uid && this._navigationProcessorService.currentDirection == this.direction);
  }

  isChildVisible(input: string): boolean {
    return (input == this.localSelectedProperty);
  }
  reset(): void {
    this.localSelectedProperty = undefined;
  }
}


