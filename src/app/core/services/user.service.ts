import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type UserRole = 'enduser' | 'admin';

export interface User {
    name: string;
    role: UserRole;
    avatar?: string;
}

/**
 * Simple user service for role-based access control
 * In production, this would integrate with your auth system
 */
@Injectable({
    providedIn: 'root'
})
export class UserService {
    private readonly STORAGE_KEY = 'user_role';

    private currentUser: User = {
        name: 'Guest User',
        role: 'enduser'
    };

    private user$ = new BehaviorSubject<User>(this.currentUser);

    constructor() {
        this.loadFromStorage();
    }

    /**
     * Get current user observable
     */
    getUser(): Observable<User> {
        return this.user$.asObservable();
    }

    /**
     * Get current user synchronously
     */
    getCurrentUser(): User {
        return this.currentUser;
    }

    /**
     * Check if current user is admin
     */
    isAdmin(): boolean {
        return this.currentUser.role === 'admin';
    }

    /**
     * Check if current user is end user
     */
    isEndUser(): boolean {
        return this.currentUser.role === 'enduser';
    }

    /**
     * Set user role
     */
    setRole(role: UserRole): void {
        this.currentUser = { ...this.currentUser, role };
        this.user$.next(this.currentUser);
        this.saveToStorage();
    }

    /**
     * Toggle between admin and enduser (for demo purposes)
     */
    toggleRole(): void {
        const newRole: UserRole = this.currentUser.role === 'admin' ? 'enduser' : 'admin';
        this.setRole(newRole);
    }

    /**
     * Set user info
     */
    setUser(user: Partial<User>): void {
        this.currentUser = { ...this.currentUser, ...user };
        this.user$.next(this.currentUser);
        this.saveToStorage();
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                this.currentUser = { ...this.currentUser, ...data };
                this.user$.next(this.currentUser);
            }
        } catch (e) {
            console.warn('Failed to load user data', e);
        }
    }

    private saveToStorage(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
        } catch (e) {
            console.warn('Failed to save user data', e);
        }
    }
}
