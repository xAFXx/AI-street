import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { VdbAppComponent } from './vdb-app.component';
import { VdbApiService } from './api/vdb-api.service';
import { API_BASE_URL } from '../../core/api-client';

describe('VdbAppComponent', () => {
    let component: VdbAppComponent;
    let fixture: ComponentFixture<VdbAppComponent>;
    let httpMock: HttpTestingController;

    const mockDatabases = [
        { name: 'test-db-1' },
        { name: 'test-db-2' },
        { name: 'cache-store' }
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [VdbAppComponent, NoopAnimationsModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                VdbApiService,
                { provide: API_BASE_URL, useValue: 'http://localhost:5000' }
            ]
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(VdbAppComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        httpMock.verify(); // Verify no outstanding requests
    });

    describe('Initialization', () => {
        it('should create the component', () => {
            expect(component).toBeTruthy();
        });

        it('should make exactly ONE API request on init', fakeAsync(() => {
            // Trigger ngOnInit
            fixture.detectChanges();

            // Should have exactly one pending request
            const requests = httpMock.match(req =>
                req.url.includes('GetVirtualDbs')
            );

            expect(requests.length).toBe(1);

            // Complete the request
            requests[0].flush({
                items: mockDatabases,
                totalCount: mockDatabases.length
            });

            tick();
            fixture.detectChanges();

            // Verify no more requests were made
            httpMock.expectNone(req => req.url.includes('GetVirtualDbs'));
        }));

        it('should display loading state initially', () => {
            fixture.detectChanges();

            expect(component.isLoading()).toBe(true);

            // Complete the request
            const req = httpMock.expectOne(req => req.url.includes('GetVirtualDbs'));
            req.flush({ items: [], totalCount: 0 });
        });
    });

    describe('Data Loading', () => {
        it('should populate databases signal after successful load', fakeAsync(() => {
            fixture.detectChanges();

            const req = httpMock.expectOne(req => req.url.includes('GetVirtualDbs'));
            req.flush({
                items: mockDatabases,
                totalCount: mockDatabases.length
            });

            tick();
            fixture.detectChanges();

            expect(component.databases().length).toBe(3);
            expect(component.databases()[0].name).toBe('test-db-1');
            expect(component.isLoading()).toBe(false);
        }));

        it('should set error signal on API failure', fakeAsync(() => {
            fixture.detectChanges();

            const req = httpMock.expectOne(req => req.url.includes('GetVirtualDbs'));
            req.error(new ErrorEvent('Network error'));

            tick();
            fixture.detectChanges();

            expect(component.error()).toBeTruthy();
            expect(component.isLoading()).toBe(false);
        }));

        it('should handle empty database list', fakeAsync(() => {
            fixture.detectChanges();

            const req = httpMock.expectOne(req => req.url.includes('GetVirtualDbs'));
            req.flush({ items: [], totalCount: 0 });

            tick();
            fixture.detectChanges();

            expect(component.databases().length).toBe(0);
        }));
    });

    describe('Create Database', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            const req = httpMock.expectOne(req => req.url.includes('GetVirtualDbs'));
            req.flush({ items: mockDatabases, totalCount: 3 });
            tick();
        }));

        it('should not create database with empty name', () => {
            component.newDbName = '';
            component.createDatabase();

            // No request should be made
            httpMock.expectNone(req => req.url.includes('SaveToVirtualDb'));
        });

        it('should create database and refresh list', fakeAsync(() => {
            component.showCreateDialog = true;
            component.newDbName = 'new-database';
            component.newDbTtl = 7;

            component.createDatabase();

            // Should make save request
            const saveReq = httpMock.expectOne(req =>
                req.url.includes('SaveToVirtualDb')
            );
            expect(saveReq.request.body.databaseName).toBe('new-database');
            expect(saveReq.request.body.ttl).toBe(7);

            saveReq.flush(null);
            tick();

            // Should refresh the list
            const refreshReq = httpMock.expectOne(req =>
                req.url.includes('GetVirtualDbs')
            );
            refreshReq.flush({ items: [...mockDatabases, { name: 'new-database' }], totalCount: 4 });
            tick();

            expect(component.showCreateDialog).toBe(false);
            expect(component.newDbName).toBe('');
        }));
    });

    describe('Delete Database', () => {
        beforeEach(fakeAsync(() => {
            fixture.detectChanges();
            const req = httpMock.expectOne(req => req.url.includes('GetVirtualDbs'));
            req.flush({ items: mockDatabases, totalCount: 3 });
            tick();
        }));

        it('should delete database and refresh list', fakeAsync(() => {
            // Mock confirm dialog
            spyOn(window, 'confirm').and.returnValue(true);

            component.deleteDatabase('test-db-1');

            const deleteReq = httpMock.expectOne(req =>
                req.url.includes('DeleteVirtualDb') && req.url.includes('test-db-1')
            );
            deleteReq.flush(null);
            tick();

            // Should refresh list after delete
            const refreshReq = httpMock.expectOne(req =>
                req.url.includes('GetVirtualDbs')
            );
            refreshReq.flush({
                items: mockDatabases.filter(d => d.name !== 'test-db-1'),
                totalCount: 2
            });
            tick();

            expect(component.databases().length).toBe(2);
        }));

        it('should not delete if user cancels confirmation', () => {
            spyOn(window, 'confirm').and.returnValue(false);

            component.deleteDatabase('test-db-1');

            // No delete request should be made
            httpMock.expectNone(req => req.url.includes('DeleteVirtualDb'));
        });
    });
});
