import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule, ToolbarModule, ButtonModule, InputTextModule],
    template: `
    <div class="flex justify-content-between align-items-center px-4 py-3 surface-card border-bottom-1 surface-border" style="height: 60px;">
        <div class="flex align-items-center gap-2">
           <div class="search-wrapper relative w-30rem">
                <i class="pi pi-search absolute top-50 z-1 text-500" style="left: 1rem; transform: translateY(-50%)"></i>
                <input 
                    type="text" 
                    pInputText 
                    placeholder="Search..." 
                    class="w-full border-none surface-100 text-900 border-round-3xl py-2 pl-5 pr-3 shadow-none transition-all transition-duration-300 focus:surface-0 focus:shadow-4 focus:ring-0"
                    style="padding-left: 2.5rem !important;" 
                />
            </div>
        </div>
        <div class="flex align-items-center gap-3">
            <p-button icon="pi pi-bell" [rounded]="true" [text]="true" severity="secondary"></p-button>
            <p-button icon="pi pi-cog" [rounded]="true" [text]="true" severity="secondary"></p-button>
        </div>
    </div>
  `,
    styles: ``
})
export class TopbarComponent { }
