import { Injectable } from '@angular/core';

/**
 * Centralized Storage Service
 * Provides persistent data storage using localStorage with JSON serialization.
 * All data persists across browser sessions.
 */
@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private readonly prefix = 'ai-street-manager-';

    /**
     * Save data to localStorage
     */
    save<T>(key: string, data: T): void {
        try {
            const serialized = JSON.stringify(data, this.dateReplacer);
            localStorage.setItem(this.prefix + key, serialized);
        } catch (error) {
            console.error(`Failed to save data for key "${key}":`, error);
        }
    }

    /**
     * Load data from localStorage
     */
    load<T>(key: string): T | null {
        try {
            const serialized = localStorage.getItem(this.prefix + key);
            if (serialized === null) {
                return null;
            }
            return JSON.parse(serialized, this.dateReviver) as T;
        } catch (error) {
            console.error(`Failed to load data for key "${key}":`, error);
            return null;
        }
    }

    /**
     * Remove data from localStorage
     */
    remove(key: string): void {
        localStorage.removeItem(this.prefix + key);
    }

    /**
     * Check if key exists
     */
    exists(key: string): boolean {
        return localStorage.getItem(this.prefix + key) !== null;
    }

    /**
     * Clear all app data
     */
    clearAll(): void {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    /**
     * Get all keys for this app
     */
    getAllKeys(): string[] {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                keys.push(key.replace(this.prefix, ''));
            }
        }
        return keys;
    }

    /**
     * JSON replacer to handle Date objects
     */
    private dateReplacer(key: string, value: any): any {
        if (value instanceof Date) {
            return { __type: 'Date', value: value.toISOString() };
        }
        return value;
    }

    /**
     * JSON reviver to restore Date objects
     */
    private dateReviver(key: string, value: any): any {
        if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.value);
        }
        return value;
    }
}
