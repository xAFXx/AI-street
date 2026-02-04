import { Injectable, signal } from '@angular/core';
import { AiModel } from '../models/ai-model.model';

@Injectable({
    providedIn: 'root'
})
export class AiModelService {
    private _models = signal<AiModel[]>([
        {
            id: 'gemini',
            name: 'Gemini Ultra',
            provider: 'Google',
            description: 'State-of-the-art multimodal model optimized for complex reasoning.',
            capabilities: ['Vision', 'Code', 'Reasoning'],
            tokens: '1M+',
            processedCount: 245000,
            testCount: 12400,
            speed: 95,
            supportedTypes: ['text', 'image', 'video'],
            icon: 'pi-bolt'
        },
        {
            id: 'gpt4',
            name: 'GPT-4 Turbo',
            provider: 'OpenAI',
            description: 'High-intelligence model with broad general knowledge.',
            capabilities: ['Text', 'Code', 'DALL-E'],
            tokens: '128k',
            processedCount: 890000,
            testCount: 45000,
            speed: 88,
            supportedTypes: ['text', 'image'],
            icon: 'pi-bolt'
        },
        {
            id: 'claude',
            name: 'Claude 3 Opus',
            provider: 'Anthropic',
            description: 'Excellent at analysis and long-context understanding.',
            capabilities: ['Text', 'Analysis'],
            tokens: '200k',
            processedCount: 125000,
            testCount: 8900,
            speed: 85,
            supportedTypes: ['text'],
            icon: 'pi-bolt'
        },
        {
            id: 'llama3',
            name: 'Llama 3 70B',
            provider: 'Meta',
            description: 'Open source powerhouse, great for local deployment simulation.',
            capabilities: ['Text', 'Open Source'],
            tokens: '128k',
            processedCount: 1540000,
            testCount: 240000,
            speed: 98,
            supportedTypes: ['text'],
            icon: 'pi-bolt'
        },
        {
            id: 'whisper-v3',
            name: 'Whisper v3',
            provider: 'OpenAI',
            description: 'State-of-the-art audio transcription and translation model.',
            capabilities: ['Audio', 'Transcription'],
            tokens: '30s / Chunk',
            processedCount: 45000,
            testCount: 3200,
            speed: 92,
            supportedTypes: ['audio'],
            icon: 'pi-bolt'
        },
        {
            id: 'yolov8',
            name: 'YOLOv8',
            provider: 'Ultralytics',
            description: 'Real-time object detection and segmentation model.',
            capabilities: ['Vision', 'Detection'],
            tokens: 'Multi-Res',
            processedCount: 12500000,
            testCount: 890000,
            speed: 99,
            supportedTypes: ['image', 'video'],
            icon: 'pi-bolt'
            // No logo for Ultralytics yet
        },
        {
            id: 'vit',
            name: 'ViT (Vision Transformer)',
            provider: 'Google',
            description: 'Leading model for image classification and feature extraction.',
            capabilities: ['Vision', 'Classification'],
            tokens: '256 Patch',
            processedCount: 895000,
            testCount: 45000,
            speed: 90,
            supportedTypes: ['image'],
            icon: 'pi-bolt'
        },
        {
            id: 'mistral-7b',
            name: 'Mistral 7B',
            provider: 'Mistral AI',
            description: 'Highly efficient small language model for fast inference.',
            capabilities: ['Text', 'Reasoning'],
            tokens: '32k',
            processedCount: 345000,
            testCount: 12500,
            speed: 97,
            supportedTypes: ['text'],
            icon: 'pi-bolt'
        },
        {
            id: 'phi3-mini',
            name: 'phi-3-mini',
            provider: 'Microsoft',
            description: 'Lightweight model optimized for mobile and local environments.',
            capabilities: ['Text', 'Efficient'],
            tokens: '128k',
            processedCount: 89000,
            testCount: 4200,
            speed: 96,
            supportedTypes: ['text'],
            icon: 'pi-bolt'
        },
        {
            id: 'wav2vec',
            name: 'Wav2Vec 2.0',
            provider: 'Meta',
            description: 'Self-supervised learning model for speech recognition.',
            capabilities: ['Audio', 'Recognition'],
            tokens: '10s Sequence',
            processedCount: 12400,
            testCount: 1500,
            speed: 88,
            supportedTypes: ['audio'],
            icon: 'pi-bolt'
        },
        {
            id: 'x3d',
            name: 'X3D',
            provider: 'Meta',
            description: 'Specialized model for video action recognition and behavior analysis.',
            capabilities: ['Video', 'Behavior'],
            tokens: '16 Frames',
            processedCount: 5600,
            testCount: 450,
            speed: 82,
            supportedTypes: ['video'],
            icon: 'pi-bolt'
        },
        {
            id: 'bert-large',
            name: 'BERT-Large',
            provider: 'Google',
            description: 'Optimized for structured data analysis and understanding.',
            capabilities: ['Text', 'Structured'],
            tokens: '8k (Modern)',
            processedCount: 4560000,
            testCount: 124000,
            speed: 94,
            supportedTypes: ['text'],
            icon: 'pi-bolt'
        }
    ]);

    readonly models = this._models.asReadonly();

    getModelsByType(type: string | undefined): AiModel[] {
        if (!type) return this._models();
        return this._models().filter(m => m.supportedTypes.includes(type as any));
    }
}
