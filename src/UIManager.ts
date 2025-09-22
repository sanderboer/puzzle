import { DOMUtils, ImageUtils } from './utils.js';
import { defaultImages, getImagesByCategory, DefaultImage } from './defaultImages.js';

export class UIManager {
    private menuOverlay!: HTMLElement;
    private pieceSlider!: HTMLInputElement;
    private pieceCountValue!: HTMLElement;
    private imageInput!: HTMLInputElement;
    private imagePreview!: HTMLElement;
    private startBtn!: HTMLButtonElement;
    private newGameBtn!: HTMLButtonElement;
    
    // Gallery elements
    private tabButtons!: NodeListOf<HTMLElement>;
    private tabContents!: NodeListOf<HTMLElement>;
    private categoryButtons!: NodeListOf<HTMLElement>;
    private imageGallery!: HTMLElement;

    private currentImageBlobUrl: string | null = null;
    private selectedGalleryImageId: string | null = null;
    private currentCategory: 'kittens' | 'ocean' | 'landscapes' = 'kittens';
    private onImageSelected?: (imageUrl: string) => void;
    private onStartGame?: () => void;
    private onNewGame?: () => void;
    private onPieceCountChanged?: (count: number) => void;
    private errorOverlay?: HTMLElement;
    private headerElement!: HTMLElement;
    private headerTimer: number | null = null;

    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.initializeGallery();
        this.initializeHeaderBehavior();
    }

    private initializeElements(): void {
        this.menuOverlay = DOMUtils.getElementById('menu-overlay');
        this.pieceSlider = DOMUtils.getElementById<HTMLInputElement>('piece-slider');
        this.pieceCountValue = DOMUtils.getElementById('piece-count-value');
        this.imageInput = DOMUtils.getElementById<HTMLInputElement>('image-input');
        this.imagePreview = DOMUtils.getElementById('image-preview');
        this.startBtn = DOMUtils.getElementById<HTMLButtonElement>('start-game-btn');
        this.newGameBtn = DOMUtils.getElementById<HTMLButtonElement>('new-game-btn');
        
        // Gallery elements
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.categoryButtons = document.querySelectorAll('.category-btn');
        this.imageGallery = DOMUtils.getElementById('image-gallery');
        this.headerElement = DOMUtils.getElementById('minimal-header');
    }

    private setupEventListeners(): void {
        this.pieceSlider.addEventListener('input', () => {
            const count = parseInt(this.pieceSlider.value, 10);
            this.pieceCountValue.textContent = String(count);
            this.onPieceCountChanged?.(count);
        });

        this.startBtn.addEventListener('click', () => {
            this.onStartGame?.();
        });

        this.newGameBtn.addEventListener('click', () => {
            this.onNewGame?.();
        });

        this.imageInput.addEventListener('change', () => {
            this.handleImageSelection();
        });

        // Tab switching
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });

        // Category switching
        this.categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-category') as 'kittens' | 'ocean' | 'landscapes';
                if (category) {
                    this.switchCategory(category);
                }
            });
        });
    }

    private switchTab(tabName: string): void {
        // Update tab buttons
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        // Update tab contents
        this.tabContents.forEach(content => {
            const isActive = content.id === `${tabName}-tab`;
            content.classList.toggle('active', isActive);
        });

        // Clear selection when switching tabs
        this.clearSelection();
    }

    private switchCategory(category: 'kittens' | 'ocean' | 'landscapes'): void {
        this.currentCategory = category;
        
        // Update category buttons
        this.categoryButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-category') === category);
        });

        // Update gallery
        this.renderGallery();
        this.clearSelection();
    }

    private initializeGallery(): void {
        this.renderGallery();
    }

    private renderGallery(): void {
        const images = getImagesByCategory(this.currentCategory);
        
        this.imageGallery.innerHTML = '';
        
        images.forEach(image => {
            const imageElement = document.createElement('div');
            imageElement.className = 'gallery-image';
            imageElement.setAttribute('data-image-id', image.id);
            imageElement.title = image.title;
            
            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.title;
            img.loading = 'lazy';
            
            imageElement.appendChild(img);
            
            imageElement.addEventListener('click', () => {
                this.selectGalleryImage(image);
            });
            
            this.imageGallery.appendChild(imageElement);
        });
    }

    private selectGalleryImage(image: DefaultImage): void {
        // Clear previous selection
        this.clearSelection();
        
        // Mark as selected
        const imageElement = this.imageGallery.querySelector(`[data-image-id="${image.id}"]`);
        if (imageElement) {
            imageElement.classList.add('selected');
        }
        
        this.selectedGalleryImageId = image.id;
        this.onImageSelected?.(image.url);
    }

    private clearSelection(): void {
        // Clear gallery selection
        this.imageGallery.querySelectorAll('.gallery-image.selected').forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedGalleryImageId = null;
        
        // Clear upload selection
        this.imageInput.value = '';
        this.imagePreview.innerHTML = '';
        ImageUtils.revokeBlobUrl(this.currentImageBlobUrl);
        this.currentImageBlobUrl = null;
    }

    private handleImageSelection(): void {
        if (!this.imageInput.files || !this.imageInput.files[0]) {
            return;
        }

        // Clear gallery selection when uploading
        this.imageGallery.querySelectorAll('.gallery-image.selected').forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedGalleryImageId = null;

        const file = this.imageInput.files[0];
        const url = URL.createObjectURL(file);

        ImageUtils.revokeBlobUrl(this.currentImageBlobUrl);
        this.currentImageBlobUrl = url;

        const img = new Image();
        img.onload = () => {
            this.updateImagePreview(url);
            this.onImageSelected?.(url);
        };
        img.onerror = (err) => {
            console.error('Image load error:', err);
        };
        img.src = url;
    }

    private updateImagePreview(imageUrl: string): void {
        this.imagePreview.innerHTML = '';
        const thumbnail = document.createElement('img');
        thumbnail.src = imageUrl;
        thumbnail.style.maxWidth = '160px';
        thumbnail.style.maxHeight = '120px';
        thumbnail.alt = 'Preview';
        this.imagePreview.appendChild(thumbnail);
    }

    showMenu(): void {
        this.menuOverlay.classList.remove('hidden');
    }

    hideMenu(): void {
        this.menuOverlay.classList.add('hidden');
    }

    getPieceCount(): number {
        return parseInt(this.pieceSlider.value, 10);
    }

    getSelectedImageUrl(): string | null {
        if (this.currentImageBlobUrl) {
            return this.currentImageBlobUrl; // Upload tab
        }
        
        if (this.selectedGalleryImageId) {
            const selectedImage = defaultImages.find(img => img.id === this.selectedGalleryImageId);
            return selectedImage?.url || null; // Gallery tab
        }
        
        return null;
    }

    hasSelectedImage(): boolean {
        return !!(this.currentImageBlobUrl || this.selectedGalleryImageId);
    }

    setCallbacks(callbacks: {
        onImageSelected?: (imageUrl: string) => void;
        onStartGame?: () => void;
        onNewGame?: () => void;
        onPieceCountChanged?: (count: number) => void;
    }): void {
        this.onImageSelected = callbacks.onImageSelected;
        this.onStartGame = callbacks.onStartGame;
        this.onNewGame = callbacks.onNewGame;
        this.onPieceCountChanged = callbacks.onPieceCountChanged;
    }

    cleanup(): void {
        ImageUtils.revokeBlobUrl(this.currentImageBlobUrl);
        this.currentImageBlobUrl = null;
        this.selectedGalleryImageId = null;
        if (this.headerTimer) {
            clearTimeout(this.headerTimer);
        }
    }

    private initializeHeaderBehavior(): void {
        // Show header on page load if there's a saved state
        this.checkForSavedState();

        // Mouse detection at top of screen
        document.addEventListener('mousemove', (e) => {
            if (e.clientY <= 50) { // Mouse near top of screen
                this.showHeader();
            }
        });

        // Auto-hide when mouse leaves header area
        this.headerElement.addEventListener('mouseleave', () => {
            this.scheduleHeaderHide();
        });

        // Cancel hide when mouse enters header
        this.headerElement.addEventListener('mouseenter', () => {
            this.cancelHeaderHide();
        });
    }

    private showHeader(): void {
        this.headerElement.classList.add('visible');
        this.cancelHeaderHide();
    }

    private hideHeader(): void {
        this.headerElement.classList.remove('visible');
    }

    private scheduleHeaderHide(): void {
        this.cancelHeaderHide();
        this.headerTimer = window.setTimeout(() => {
            this.hideHeader();
        }, 2000);
    }

    private cancelHeaderHide(): void {
        if (this.headerTimer) {
            clearTimeout(this.headerTimer);
            this.headerTimer = null;
        }
    }

    private checkForSavedState(): void {
        // Check if there's a saved game state
        try {
            const savedState = localStorage.getItem('puzzle-game-state');
            if (savedState) {
                // Show header briefly on load if there's a saved state
                this.showHeader();
                this.scheduleHeaderHide();
            }
        } catch (error) {
            // Ignore localStorage errors
        }
    }

    showError(message: string, duration: number = 5000): void {
        this.clearError();
        
        this.errorOverlay = document.createElement('div');
        this.errorOverlay.className = 'error-overlay';
        this.errorOverlay.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button class="error-dismiss">OK</button>
            </div>
        `;
        
        const dismissBtn = this.errorOverlay.querySelector('.error-dismiss') as HTMLButtonElement;
        dismissBtn.addEventListener('click', () => this.clearError());
        
        document.body.appendChild(this.errorOverlay);
        
        if (duration > 0) {
            setTimeout(() => this.clearError(), duration);
        }
    }

    clearError(): void {
        if (this.errorOverlay && this.errorOverlay.parentNode) {
            this.errorOverlay.parentNode.removeChild(this.errorOverlay);
            this.errorOverlay = undefined;
        }
    }
}
