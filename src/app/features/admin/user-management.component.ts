import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { UserManagementService, User, UserRole } from '../../core/services/user-management.service';

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        TagModule,
        SelectModule,
        InputTextModule,
        DialogModule,
        TooltipModule,
        ConfirmDialogModule
    ],
    providers: [ConfirmationService],
    template: `
        <div class="user-management p-4">
            <!-- Main Card Container -->
            <div class="surface-card border-round-lg shadow-1 p-4">
                <!-- Header -->
                <div class="flex justify-content-between align-items-center mb-4">
                    <div>
                        <h1 class="text-2xl font-bold m-0 text-primary">User Management</h1>
                        <p class="text-500 mt-1 mb-0">Manage user accounts and permissions</p>
                    </div>
                    <button pButton 
                        label="Add User" 
                        icon="pi pi-plus"
                        (click)="openAddDialog()">
                    </button>
                </div>

            <!-- Stats Cards -->
            <div class="grid mb-4">
                <div class="col-12 md:col-4">
                    <div class="surface-card border-round-lg p-4">
                        <div class="flex align-items-center gap-3">
                            <div class="bg-blue-100 border-round p-3">
                                <i class="pi pi-users text-blue-500 text-2xl"></i>
                            </div>
                            <div>
                                <div class="text-500 text-sm">Total Users</div>
                                <div class="text-2xl font-bold">{{ users.length }}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 md:col-4">
                    <div class="surface-card border-round-lg p-4">
                        <div class="flex align-items-center gap-3">
                            <div class="bg-green-100 border-round p-3">
                                <i class="pi pi-shield text-green-500 text-2xl"></i>
                            </div>
                            <div>
                                <div class="text-500 text-sm">Administrators</div>
                                <div class="text-2xl font-bold">{{ getAdminCount() }}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 md:col-4">
                    <div class="surface-card border-round-lg p-4">
                        <div class="flex align-items-center gap-3">
                            <div class="bg-purple-100 border-round p-3">
                                <i class="pi pi-user text-purple-500 text-2xl"></i>
                            </div>
                            <div>
                                <div class="text-500 text-sm">End Users</div>
                                <div class="text-2xl font-bold">{{ getEndUserCount() }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                <!-- Users Table -->
                <div class="surface-ground border-round-lg">
                <p-table 
                    [value]="users" 
                    [paginator]="true" 
                    [rows]="10"
                    [showCurrentPageReport]="true"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} users"
                    [globalFilterFields]="['name', 'email', 'role']"
                    styleClass="p-datatable-sm">
                    
                    <ng-template pTemplate="header">
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th>Last Login</th>
                            <th style="width: 150px">Actions</th>
                        </tr>
                    </ng-template>

                    <ng-template pTemplate="body" let-user>
                        <tr>
                            <td>
                                <div class="flex align-items-center gap-2">
                                    <div class="w-2rem h-2rem border-round-lg flex align-items-center justify-content-center"
                                        [class.bg-green-100]="user.role === 'admin'"
                                        [class.bg-blue-100]="user.role === 'enduser'">
                                        <i class="pi text-sm"
                                            [class.pi-shield]="user.role === 'admin'"
                                            [class.pi-user]="user.role === 'enduser'"
                                            [class.text-green-500]="user.role === 'admin'"
                                            [class.text-blue-500]="user.role === 'enduser'"></i>
                                    </div>
                                    <span class="font-bold">{{ user.name }}</span>
                                    <span *ngIf="isCurrentUser(user)" class="text-xs text-500">(you)</span>
                                </div>
                            </td>
                            <td>{{ user.email }}</td>
                            <td>
                                <p-tag 
                                    [value]="user.role === 'admin' ? 'Admin' : 'End User'"
                                    [severity]="user.role === 'admin' ? 'success' : 'info'">
                                </p-tag>
                            </td>
                            <td>{{ user.createdAt | date:'mediumDate' }}</td>
                            <td>{{ user.lastLogin ? (user.lastLogin | date:'medium') : 'Never' }}</td>
                            <td>
                                <div class="flex gap-2">
                                    <button pButton 
                                        icon="pi pi-pencil" 
                                        class="p-button-text p-button-sm"
                                        pTooltip="Edit user"
                                        (click)="openEditDialog(user)">
                                    </button>
                                    <button pButton 
                                        [icon]="user.role === 'admin' ? 'pi pi-user' : 'pi pi-shield'" 
                                        class="p-button-text p-button-sm"
                                        [pTooltip]="user.role === 'admin' ? 'Demote to End User' : 'Promote to Admin'"
                                        (click)="toggleRole(user)">
                                    </button>
                                    <button pButton 
                                        icon="pi pi-trash" 
                                        class="p-button-text p-button-danger p-button-sm"
                                        pTooltip="Delete user"
                                        [disabled]="isCurrentUser(user)"
                                        (click)="confirmDelete(user)">
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </ng-template>

                    <ng-template pTemplate="emptymessage">
                        <tr>
                            <td colspan="6" class="text-center p-4">
                                <i class="pi pi-users text-4xl text-300 mb-3"></i>
                                <p class="text-500">No users found</p>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>

            </div>

            <!-- Add/Edit Dialog -->
            <p-dialog 
                [(visible)]="dialogVisible" 
                [header]="isEditing ? 'Edit User' : 'Add New User'"
                [modal]="true"
                [style]="{ width: '400px' }">
                
                <div class="field mb-3">
                    <label class="block text-500 font-medium mb-2">Name</label>
                    <input pInputText [(ngModel)]="editUser.name" class="w-full">
                </div>

                <div class="field mb-3">
                    <label class="block text-500 font-medium mb-2">Email</label>
                    <input pInputText [(ngModel)]="editUser.email" class="w-full" type="email">
                </div>

                <div class="field mb-3">
                    <label class="block text-500 font-medium mb-2">Role</label>
                    <p-select 
                        [(ngModel)]="editUser.role" 
                        [options]="roleOptions"
                        optionLabel="label"
                        optionValue="value"
                        styleClass="w-full">
                    </p-select>
                </div>

                <ng-template pTemplate="footer">
                    <button pButton 
                        label="Cancel" 
                        class="p-button-text"
                        (click)="dialogVisible = false">
                    </button>
                    <button pButton 
                        [label]="isEditing ? 'Update' : 'Create'"
                        [disabled]="!editUser.name || !editUser.email"
                        (click)="saveUser()">
                    </button>
                </ng-template>
            </p-dialog>

            <p-confirmDialog></p-confirmDialog>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }

        .user-management {
            height: 100%;
        }
    `]
})
export class UserManagementComponent implements OnInit, OnDestroy {
    private userService = inject(UserManagementService);
    private confirmationService = inject(ConfirmationService);
    private destroy$ = new Subject<void>();

    users: User[] = [];
    currentUser: User | null = null;

    dialogVisible = false;
    isEditing = false;
    editUser: Partial<User> = {};

    roleOptions = [
        { label: 'End User', value: 'enduser' },
        { label: 'Administrator', value: 'admin' }
    ];

    ngOnInit(): void {
        this.userService.getUsers()
            .pipe(takeUntil(this.destroy$))
            .subscribe(users => this.users = users);

        this.userService.getCurrentUser()
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => this.currentUser = user);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getAdminCount(): number {
        return this.users.filter(u => u.role === 'admin').length;
    }

    getEndUserCount(): number {
        return this.users.filter(u => u.role === 'enduser').length;
    }

    isCurrentUser(user: User): boolean {
        return this.currentUser?.id === user.id;
    }

    openAddDialog(): void {
        this.isEditing = false;
        this.editUser = { name: '', email: '', role: 'enduser' };
        this.dialogVisible = true;
    }

    openEditDialog(user: User): void {
        this.isEditing = true;
        this.editUser = { ...user };
        this.dialogVisible = true;
    }

    saveUser(): void {
        if (this.isEditing && this.editUser.id) {
            this.userService.updateUser(this.editUser.id, {
                name: this.editUser.name,
                email: this.editUser.email
            });
            if (this.editUser.role) {
                this.userService.updateUserRole(this.editUser.id, this.editUser.role as UserRole);
            }
        } else {
            this.userService.createUser(
                this.editUser.name!,
                this.editUser.email!,
                (this.editUser.role as UserRole) || 'enduser'
            );
        }
        this.dialogVisible = false;
    }

    toggleRole(user: User): void {
        const newRole: UserRole = user.role === 'admin' ? 'enduser' : 'admin';
        this.userService.updateUserRole(user.id, newRole);
    }

    confirmDelete(user: User): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete ${user.name}?`,
            header: 'Delete User',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.userService.deleteUser(user.id);
            }
        });
    }
}
