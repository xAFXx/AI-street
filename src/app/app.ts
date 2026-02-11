import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DebugLogPanelComponent } from './shared/components/debug-log-panel.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DebugLogPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.less'
})
export class App {
  protected readonly title = signal('ai-street-manager');
}
