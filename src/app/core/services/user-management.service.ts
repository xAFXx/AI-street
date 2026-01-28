import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type UserRole = 'enduser' | 'admin';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: Date;
    lastLogin?: Date;
}

/**
 * User management service with authentication and role management
 */
@Injectable({
    providedIn: 'root'
})
export class UserManagementService {
    private readonly STORAGE_KEY = 'users_db';
    private readonly CURRENT_USER_KEY = 'current_user';

    // Default admin users
    private defaultUsers: User[] = [
        {
            id: 'admin-1',
            email: 'ievtushenko.oleg@gmail.com',
            name: 'Oleg',
            role: 'admin',
            createdAt: new Date('2026-01-01')
        },
        {
            id: 'admin-2',
            email: 'sascha@getdatainsight.com',
            name: 'Sascha',
            role: 'admin',
            createdAt: new Date('2026-01-01')
        },
        {
            id: 'admin-3',
            email: 'philipine@apprx.nl',
            name: 'Philipine',
            role: 'admin',
            createdAt: new Date('2026-01-01')
        }
    ];

    private users: User[] = [];
    private users$ = new BehaviorSubject<User[]>([]);

    private currentUser: User | null = null;
    private currentUser$ = new BehaviorSubject<User | null>(null);

    constructor() {
        this.loadUsers();
        this.loadCurrentUser();
    }

    // ========================
    // Authentication
    // ========================

    /**
     * Login with email or username
     */
    login(emailOrName: string): { success: boolean; user?: User; error?: string } {
        const input = emailOrName.toLowerCase().trim();

        // Find user by email or name
        let user = this.users.find(u =>
            u.email.toLowerCase() === input ||
            u.name.toLowerCase() === input
        );

        if (!user) {
            // Auto-create new end user
            user = this.createUser(input, input.includes('@') ? input : `${input}@user.local`, 'enduser');
        }

        // Update last login
        user.lastLogin = new Date();
        this.saveUsers();

        // Set current user
        this.currentUser = user;
        this.currentUser$.next(user);
        this.saveCurrentUser();

        return { success: true, user };
    }

    /**
     * Logout current user
     */
    logout(): void {
        this.currentUser = null;
        this.currentUser$.next(null);
        localStorage.removeItem(this.CURRENT_USER_KEY);
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn(): boolean {
        return this.currentUser !== null;
    }

    /**
     * Get current user observable
     */
    getCurrentUser(): Observable<User | null> {
        return this.currentUser$.asObservable();
    }

    /**
     * Get current user synchronously
     */
    getCurrentUserSync(): User | null {
        return this.currentUser;
    }

    /**
     * Check if current user is admin
     */
    isAdmin(): boolean {
        return this.currentUser?.role === 'admin';
    }

    // ========================
    // User Management (Admin)
    // ========================

    /**
     * Get all users
     */
    getUsers(): Observable<User[]> {
        return this.users$.asObservable();
    }

    /**
     * Get all users synchronously
     */
    getUsersSync(): User[] {
        return [...this.users];
    }

    /**
     * Create a new user
     */
    createUser(name: string, email: string, role: UserRole = 'enduser'): User {
        const user: User = {
            id: this.generateId(),
            email: email.toLowerCase(),
            name,
            role,
            createdAt: new Date()
        };

        this.users.push(user);
        this.saveUsers();
        this.users$.next([...this.users]);

        return user;
    }

    /**
     * Update user role
     */
    updateUserRole(userId: string, role: UserRole): boolean {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.role = role;
            this.saveUsers();
            this.users$.next([...this.users]);

            // Update current user if it's the same user
            if (this.currentUser?.id === userId) {
                this.currentUser.role = role;
                this.currentUser$.next(this.currentUser);
                this.saveCurrentUser();
            }

            return true;
        }
        return false;
    }

    /**
     * Update user info
     */
    updateUser(userId: string, updates: Partial<Pick<User, 'name' | 'email'>>): boolean {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            if (updates.name) user.name = updates.name;
            if (updates.email) user.email = updates.email.toLowerCase();
            this.saveUsers();
            this.users$.next([...this.users]);

            // Update current user if it's the same user
            if (this.currentUser?.id === userId) {
                Object.assign(this.currentUser, updates);
                this.currentUser$.next(this.currentUser);
                this.saveCurrentUser();
            }

            return true;
        }
        return false;
    }

    /**
     * Delete a user
     */
    deleteUser(userId: string): boolean {
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
            // Don't allow deleting yourself
            if (this.currentUser?.id === userId) {
                return false;
            }

            this.users.splice(index, 1);
            this.saveUsers();
            this.users$.next([...this.users]);
            return true;
        }
        return false;
    }

    /**
     * Get user by ID
     */
    getUserById(userId: string): User | undefined {
        return this.users.find(u => u.id === userId);
    }

    // ========================
    // Storage
    // ========================

    private loadUsers(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.users = JSON.parse(stored).map((u: any) => ({
                    ...u,
                    createdAt: new Date(u.createdAt),
                    lastLogin: u.lastLogin ? new Date(u.lastLogin) : undefined
                }));

                // Ensure all default admin users exist and have admin role
                for (const defaultUser of this.defaultUsers) {
                    const existingUser = this.users.find(u =>
                        u.email.toLowerCase() === defaultUser.email.toLowerCase() ||
                        u.name.toLowerCase() === defaultUser.name.toLowerCase()
                    );
                    if (existingUser) {
                        // Ensure they have admin role
                        existingUser.role = 'admin';
                    } else {
                        // Add missing default admin
                        this.users.push({ ...defaultUser });
                    }
                }
                this.saveUsers();
            } else {
                // Initialize with default users
                this.users = [...this.defaultUsers];
                this.saveUsers();
            }
            this.users$.next([...this.users]);
        } catch (e) {
            console.warn('Failed to load users', e);
            this.users = [...this.defaultUsers];
            this.saveUsers();
        }
    }

    private saveUsers(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.users));
        } catch (e) {
            console.warn('Failed to save users', e);
        }
    }

    private loadCurrentUser(): void {
        try {
            const stored = localStorage.getItem(this.CURRENT_USER_KEY);
            if (stored) {
                const userData = JSON.parse(stored);
                // Find the user in the users list to ensure it's valid
                this.currentUser = this.users.find(u => u.id === userData.id) || null;
                this.currentUser$.next(this.currentUser);
            }
        } catch (e) {
            console.warn('Failed to load current user', e);
        }
    }

    private saveCurrentUser(): void {
        if (this.currentUser) {
            localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(this.currentUser));
        }
    }

    private generateId(): string {
        return 'user-' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * Clear all data (for testing)
     */
    clearAllData(): void {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.CURRENT_USER_KEY);
        this.users = [...this.defaultUsers];
        this.currentUser = null;
        this.users$.next([...this.users]);
        this.currentUser$.next(null);
    }
}
