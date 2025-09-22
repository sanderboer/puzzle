import { DOMUtils, ImageUtils } from './utils.js';
import { defaultImages, getImagesByCategory } from './defaultImages.js';
export class UIManager {
    constructor() {
        this.currentImageBlobUrl = null;
        this.selectedGalleryImageId = null;
        this.currentCategory = 'kittens';
        this.initializeElements();
        this.setupEventListeners();
        this.initializeGallery();
    }
    initializeElements() {
        this.menuOverlay = DOMUtils.getElementById('menu-overlay');
        this.pieceSlider = DOMUtils.getElementById('piece-slider');
        this.pieceCountValue = DOMUtils.getElementById('piece-count-value');
        this.imageInput = DOMUtils.getElementById('image-input');
        this.imagePreview = DOMUtils.getElementById('image-preview');
        this.startBtn = DOMUtils.getElementById('start-game-btn');
        this.newGameBtn = DOMUtils.getElementById('new-game-btn');
        // Gallery elements
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.categoryButtons = document.querySelectorAll('.category-btn');
        this.imageGallery = DOMUtils.getElementById('image-gallery');
    }
    setupEventListeners() {
        this.pieceSlider.addEventListener('input', () => {
            var _a;
            const count = parseInt(this.pieceSlider.value, 10);
            this.pieceCountValue.textContent = String(count);
            (_a = this.onPieceCountChanged) === null || _a === void 0 ? void 0 : _a.call(this, count);
        });
        this.startBtn.addEventListener('click', () => {
            var _a;
            (_a = this.onStartGame) === null || _a === void 0 ? void 0 : _a.call(this);
        });
        this.newGameBtn.addEventListener('click', () => {
            var _a;
            (_a = this.onNewGame) === null || _a === void 0 ? void 0 : _a.call(this);
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
                const category = btn.getAttribute('data-category');
                if (category) {
                    this.switchCategory(category);
                }
            });
        });
    }
    switchTab(tabName) {
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
    switchCategory(category) {
        this.currentCategory = category;
        // Update category buttons
        this.categoryButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-category') === category);
        });
        // Update gallery
        this.renderGallery();
        this.clearSelection();
    }
    initializeGallery() {
        this.renderGallery();
    }
    renderGallery() {
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
    selectGalleryImage(image) {
        var _a;
        // Clear previous selection
        this.clearSelection();
        // Mark as selected
        const imageElement = this.imageGallery.querySelector(`[data-image-id="${image.id}"]`);
        if (imageElement) {
            imageElement.classList.add('selected');
        }
        this.selectedGalleryImageId = image.id;
        (_a = this.onImageSelected) === null || _a === void 0 ? void 0 : _a.call(this, image.url);
    }
    clearSelection() {
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
    handleImageSelection() {
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
            var _a;
            this.updateImagePreview(url);
            (_a = this.onImageSelected) === null || _a === void 0 ? void 0 : _a.call(this, url);
        };
        img.onerror = (err) => {
            console.error('Image load error:', err);
        };
        img.src = url;
    }
    updateImagePreview(imageUrl) {
        this.imagePreview.innerHTML = '';
        const thumbnail = document.createElement('img');
        thumbnail.src = imageUrl;
        thumbnail.style.maxWidth = '160px';
        thumbnail.style.maxHeight = '120px';
        thumbnail.alt = 'Preview';
        this.imagePreview.appendChild(thumbnail);
    }
    showMenu() {
        this.menuOverlay.classList.remove('hidden');
    }
    hideMenu() {
        this.menuOverlay.classList.add('hidden');
    }
    getPieceCount() {
        return parseInt(this.pieceSlider.value, 10);
    }
    getSelectedImageUrl() {
        if (this.currentImageBlobUrl) {
            return this.currentImageBlobUrl; // Upload tab
        }
        if (this.selectedGalleryImageId) {
            const selectedImage = defaultImages.find(img => img.id === this.selectedGalleryImageId);
            return (selectedImage === null || selectedImage === void 0 ? void 0 : selectedImage.url) || null; // Gallery tab
        }
        return null;
    }
    hasSelectedImage() {
        return !!(this.currentImageBlobUrl || this.selectedGalleryImageId);
    }
    setCallbacks(callbacks) {
        this.onImageSelected = callbacks.onImageSelected;
        this.onStartGame = callbacks.onStartGame;
        this.onNewGame = callbacks.onNewGame;
        this.onPieceCountChanged = callbacks.onPieceCountChanged;
    }
    cleanup() {
        ImageUtils.revokeBlobUrl(this.currentImageBlobUrl);
        this.currentImageBlobUrl = null;
        this.selectedGalleryImageId = null;
    }
    showError(message, duration = 5000) {
        this.clearError();
        this.errorOverlay = document.createElement('div');
        this.errorOverlay.className = 'error-overlay';
        this.errorOverlay.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button class="error-dismiss">OK</button>
            </div>
        `;
        const dismissBtn = this.errorOverlay.querySelector('.error-dismiss');
        dismissBtn.addEventListener('click', () => this.clearError());
        document.body.appendChild(this.errorOverlay);
        if (duration > 0) {
            setTimeout(() => this.clearError(), duration);
        }
    }
    clearError() {
        if (this.errorOverlay && this.errorOverlay.parentNode) {
            this.errorOverlay.parentNode.removeChild(this.errorOverlay);
            this.errorOverlay = undefined;
        }
    }
}
//# sourceMappingURL=UIManager.js.map