import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Unit tests for Document Management helper functions
 * These tests don't require Angular TestBed since they test pure functions
 */

// Mock UploadedFile interface
interface MockUploadedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    path?: string;
    content?: string;
    status: 'pending' | 'analyzing' | 'analyzed' | 'mapped' | 'error';
}

// Mock ProcessingQueueItem interface
interface MockProcessingQueueItem {
    id: string;
    fileId?: string;
    name: string;
    size: number;
    fileIndex: number;
    status: 'queued' | 'processing' | 'completed' | 'error';
    progress: number;
}

// ============================================
// FILE TYPE DETECTION FUNCTIONS (extracted for testing)
// ============================================

function isPdfFile(file: MockUploadedFile): boolean {
    return file.type === 'application/pdf';
}

function isImageFile(file: MockUploadedFile): boolean {
    return file.type.startsWith('image/');
}

function isOfficeFile(file: MockUploadedFile): boolean {
    const officeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    return officeTypes.includes(file.type) ||
        file.name.endsWith('.pdf') ||
        file.name.endsWith('.doc') ||
        file.name.endsWith('.docx') ||
        file.name.endsWith('.xls') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.ppt') ||
        file.name.endsWith('.pptx');
}

function isProcessableFile(file: MockUploadedFile): boolean {
    if (file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed' ||
        file.name.toLowerCase().endsWith('.zip')) {
        return false;
    }
    return file.size > 0;
}

// ============================================
// TESTS
// ============================================

describe('Document Management Helper Functions', () => {

    // ============================================
    // FILE TYPE DETECTION TESTS
    // ============================================
    describe('File Type Detection', () => {
        describe('isPdfFile', () => {
            it('should return true for PDF files', () => {
                const pdfFile: MockUploadedFile = {
                    id: '1',
                    name: 'test.pdf',
                    size: 1000,
                    type: 'application/pdf',
                    status: 'pending'
                };
                expect(isPdfFile(pdfFile)).toBe(true);
            });

            it('should return false for non-PDF files', () => {
                const txtFile: MockUploadedFile = {
                    id: '2',
                    name: 'test.txt',
                    size: 500,
                    type: 'text/plain',
                    status: 'pending'
                };
                expect(isPdfFile(txtFile)).toBe(false);
            });
        });

        describe('isImageFile', () => {
            it('should return true for JPEG images', () => {
                const file: MockUploadedFile = {
                    id: '1',
                    name: 'photo.jpg',
                    size: 5000,
                    type: 'image/jpeg',
                    status: 'pending'
                };
                expect(isImageFile(file)).toBe(true);
            });

            it('should return true for PNG images', () => {
                const file: MockUploadedFile = {
                    id: '2',
                    name: 'icon.png',
                    size: 2000,
                    type: 'image/png',
                    status: 'pending'
                };
                expect(isImageFile(file)).toBe(true);
            });

            it('should return false for PDF files', () => {
                const file: MockUploadedFile = {
                    id: '3',
                    name: 'doc.pdf',
                    size: 1000,
                    type: 'application/pdf',
                    status: 'pending'
                };
                expect(isImageFile(file)).toBe(false);
            });
        });

        describe('isOfficeFile', () => {
            it('should return true for PDF files', () => {
                const file: MockUploadedFile = {
                    id: '1',
                    name: 'doc.pdf',
                    size: 1000,
                    type: 'application/pdf',
                    status: 'pending'
                };
                expect(isOfficeFile(file)).toBe(true);
            });

            it('should return true for DOCX files', () => {
                const file: MockUploadedFile = {
                    id: '2',
                    name: 'report.docx',
                    size: 2000,
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    status: 'pending'
                };
                expect(isOfficeFile(file)).toBe(true);
            });

            it('should return true for .docx extension even with wrong MIME', () => {
                const file: MockUploadedFile = {
                    id: '3',
                    name: 'report.docx',
                    size: 2000,
                    type: 'application/octet-stream',
                    status: 'pending'
                };
                expect(isOfficeFile(file)).toBe(true);
            });

            it('should return false for text files', () => {
                const file: MockUploadedFile = {
                    id: '4',
                    name: 'readme.txt',
                    size: 100,
                    type: 'text/plain',
                    status: 'pending'
                };
                expect(isOfficeFile(file)).toBe(false);
            });
        });
    });

    // ============================================
    // PROCESSABLE FILE TESTS (ZIP filtering, 0kb files)
    // ============================================
    describe('isProcessableFile', () => {
        it('should return false for ZIP files by MIME type', () => {
            const zipFile: MockUploadedFile = {
                id: '1',
                name: 'archive.zip',
                size: 10000,
                type: 'application/zip',
                status: 'pending'
            };
            expect(isProcessableFile(zipFile)).toBe(false);
        });

        it('should return false for ZIP files by x-zip-compressed MIME', () => {
            const zipFile: MockUploadedFile = {
                id: '2',
                name: 'archive.zip',
                size: 10000,
                type: 'application/x-zip-compressed',
                status: 'pending'
            };
            expect(isProcessableFile(zipFile)).toBe(false);
        });

        it('should return false for .zip extension regardless of MIME type', () => {
            const zipFile: MockUploadedFile = {
                id: '3',
                name: 'archive.ZIP',
                size: 10000,
                type: 'application/octet-stream',
                status: 'pending'
            };
            expect(isProcessableFile(zipFile)).toBe(false);
        });

        it('should return false for 0kb files', () => {
            const emptyFile: MockUploadedFile = {
                id: '4',
                name: 'empty.txt',
                size: 0,
                type: 'text/plain',
                status: 'pending'
            };
            expect(isProcessableFile(emptyFile)).toBe(false);
        });

        it('should return true for valid PDF files', () => {
            const pdfFile: MockUploadedFile = {
                id: '5',
                name: 'document.pdf',
                size: 5000,
                type: 'application/pdf',
                status: 'pending'
            };
            expect(isProcessableFile(pdfFile)).toBe(true);
        });

        it('should return true for valid text files', () => {
            const txtFile: MockUploadedFile = {
                id: '6',
                name: 'readme.txt',
                size: 1000,
                type: 'text/plain',
                status: 'pending'
            };
            expect(isProcessableFile(txtFile)).toBe(true);
        });

        it('should return true for valid image files', () => {
            const imgFile: MockUploadedFile = {
                id: '7',
                name: 'photo.jpg',
                size: 25000,
                type: 'image/jpeg',
                status: 'pending'
            };
            expect(isProcessableFile(imgFile)).toBe(true);
        });
    });

    // ============================================
    // QUEUE MANAGEMENT TESTS
    // ============================================
    describe('Queue Management', () => {
        describe('removeFromQueue (simulated)', () => {
            it('should filter out item by queue ID', () => {
                const queue: MockProcessingQueueItem[] = [
                    { id: 'q1', fileId: 'f1', name: 'file1.pdf', size: 1000, fileIndex: 0, status: 'queued', progress: 0 },
                    { id: 'q2', fileId: 'f2', name: 'file2.pdf', size: 2000, fileIndex: 1, status: 'queued', progress: 0 }
                ];

                const filtered = queue.filter(i => i.id !== 'q1');

                expect(filtered.length).toBe(1);
                expect(filtered[0].id).toBe('q2');
            });

            it('should keep all items if queue ID does not exist', () => {
                const queue: MockProcessingQueueItem[] = [
                    { id: 'q1', fileId: 'f1', name: 'file1.pdf', size: 1000, fileIndex: 0, status: 'queued', progress: 0 }
                ];

                const filtered = queue.filter(i => i.id !== 'nonexistent');

                expect(filtered.length).toBe(1);
            });
        });

        describe('removeUploadedFile (simulated)', () => {
            it('should filter out file by ID', () => {
                const files: MockUploadedFile[] = [
                    { id: 'f1', name: 'file1.pdf', size: 1000, type: 'application/pdf', status: 'pending' },
                    { id: 'f2', name: 'file2.pdf', size: 2000, type: 'application/pdf', status: 'pending' }
                ];

                const filtered = files.filter(f => f.id !== 'f1');

                expect(filtered.length).toBe(1);
                expect(filtered[0].id).toBe('f2');
            });
        });
    });

    // ============================================
    // UNIQUE FILE ID TESTS
    // ============================================
    describe('Unique File IDs', () => {
        it('generates unique IDs with crypto.randomUUID()', () => {
            const id1 = crypto.randomUUID();
            const id2 = crypto.randomUUID();
            expect(id1).not.toBe(id2);
        });

        it('should find files by ID even with duplicate names', () => {
            const files: MockUploadedFile[] = [
                { id: 'unique-1', name: 'duplicate.pdf', size: 1000, type: 'application/pdf', status: 'pending' },
                { id: 'unique-2', name: 'duplicate.pdf', size: 2000, type: 'application/pdf', status: 'pending' }
            ];

            const found = files.find(f => f.id === 'unique-2');
            expect(found).toBeDefined();
            expect(found!.size).toBe(2000);
        });
    });

    // ============================================
    // ZIP EXTRACTION FILTERING TESTS
    // ============================================
    describe('ZIP Extraction Filtering', () => {
        it('should filter out __MACOSX paths', () => {
            const paths = [
                'documents/file1.pdf',
                '__MACOSX/documents/._file1.pdf',
                '__MACOSX/.DS_Store',
                'documents/file2.pdf'
            ];

            const filtered = paths.filter(path =>
                !path.includes('__MACOSX/') && !path.startsWith('__MACOSX')
            );

            expect(filtered).toEqual(['documents/file1.pdf', 'documents/file2.pdf']);
        });

        it('should filter out hidden files starting with dot', () => {
            const fileNames = [
                'document.pdf',
                '.DS_Store',
                '.hidden_file',
                'report.docx'
            ];

            const filtered = fileNames.filter(name => !name.startsWith('.'));

            expect(filtered).toEqual(['document.pdf', 'report.docx']);
        });

        it('should correctly extract filename from path', () => {
            const path = 'folder1/subfolder/document.pdf';
            const fileName = path.split('/').pop() || path;

            expect(fileName).toBe('document.pdf');
        });

        it('should skip 0kb blobs', () => {
            const blobs = [
                { name: 'file1.pdf', size: 1000 },
                { name: 'empty.txt', size: 0 },
                { name: 'file2.pdf', size: 500 }
            ];

            const filtered = blobs.filter(b => b.size > 0);

            expect(filtered.length).toBe(2);
            expect(filtered.map(b => b.name)).toEqual(['file1.pdf', 'file2.pdf']);
        });
    });
});
