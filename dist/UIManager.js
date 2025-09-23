import { DOMUtils, ImageUtils } from './utils.js';
import { defaultImages, getImagesByCategory } from './defaultImages.js';
export class UIManager {
    constructor() {
        this.currentImageBlobUrl = null;
        this.selectedGalleryImageId = null;
        this.currentCategory = 'kittens';
        this.headerTimer = null;
        this.headerShowTimer = null;
        this.lastMouseY = 0;
        this.initializeElements();
        this.setupEventListeners();
        this.initializeGallery();
        this.initializeHeaderBehavior();
    }
    initializeElements() {
        this.menuOverlay = DOMUtils.getElementById('menu-overlay');
        this.pieceSlider = DOMUtils.getElementById('piece-slider');
        this.pieceCountValue = DOMUtils.getElementById('piece-count-value');
        this.imageInput = DOMUtils.getElementById('image-input');
        this.imagePreview = DOMUtils.getElementById('image-preview');
        this.startBtn = DOMUtils.getElementById('start-game-btn');
        this.newGameBtn = DOMUtils.getElementById('new-game-btn');
        // Viewport controls
        this.viewportControls = DOMUtils.getElementById('viewport-controls');
        this.zoomInBtn = DOMUtils.getElementById('zoom-in-btn');
        this.zoomOutBtn = DOMUtils.getElementById('zoom-out-btn');
        this.resetZoomBtn = DOMUtils.getElementById('reset-zoom-btn');
        this.fitContentBtn = DOMUtils.getElementById('fit-content-btn');
        // Gallery elements
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.categoryButtons = document.querySelectorAll('.category-btn');
        this.imageGallery = DOMUtils.getElementById('image-gallery');
        this.headerElement = DOMUtils.getElementById('minimal-header');
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
        // Viewport controls
        this.zoomInBtn.addEventListener('click', () => {
            var _a;
            (_a = this.onZoomIn) === null || _a === void 0 ? void 0 : _a.call(this);
        });
        this.zoomOutBtn.addEventListener('click', () => {
            var _a;
            (_a = this.onZoomOut) === null || _a === void 0 ? void 0 : _a.call(this);
        });
        this.resetZoomBtn.addEventListener('click', () => {
            var _a;
            (_a = this.onResetZoom) === null || _a === void 0 ? void 0 : _a.call(this);
        });
        this.fitContentBtn.addEventListener('click', () => {
            var _a;
            (_a = this.onFitContent) === null || _a === void 0 ? void 0 : _a.call(this);
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
        this.viewportControls.classList.add('hidden');
    }
    hideMenu() {
        this.menuOverlay.classList.add('hidden');
        this.viewportControls.classList.remove('hidden');
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
        this.onZoomIn = callbacks.onZoomIn;
        this.onZoomOut = callbacks.onZoomOut;
        this.onResetZoom = callbacks.onResetZoom;
        this.onFitContent = callbacks.onFitContent;
    }
    cleanup() {
        ImageUtils.revokeBlobUrl(this.currentImageBlobUrl);
        this.currentImageBlobUrl = null;
        this.selectedGalleryImageId = null;
        if (this.headerTimer) {
            clearTimeout(this.headerTimer);
        }
        if (this.headerShowTimer) {
            clearTimeout(this.headerShowTimer);
        }
    }
    initializeHeaderBehavior() {
        // Show header on page load if there's a saved state
        this.checkForSavedState();
        // Mouse detection at top of screen with improved sensitivity
        document.addEventListener('mousemove', (e) => {
            const currentY = e.clientY;
            // Only trigger if mouse is within 20px of top and moving slowly upward
            if (currentY <= 20 && (this.lastMouseY === 0 || currentY < this.lastMouseY + 5)) {
                this.scheduleHeaderShow();
            }
            this.lastMouseY = currentY;
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
    showHeader() {
        this.headerElement.classList.add('visible');
        this.cancelHeaderHide();
        this.cancelHeaderShow();
    }
    hideHeader() {
        this.headerElement.classList.remove('visible');
    }
    scheduleHeaderShow() {
        if (this.headerShowTimer || this.headerElement.classList.contains('visible')) {
            return; // Already scheduled or already visible
        }
        this.headerShowTimer = window.setTimeout(() => {
            this.showHeader();
        }, 500); // Longer delay before showing (500ms)
    }
    cancelHeaderShow() {
        if (this.headerShowTimer) {
            clearTimeout(this.headerShowTimer);
            this.headerShowTimer = null;
        }
    }
    scheduleHeaderHide() {
        this.cancelHeaderHide();
        this.headerTimer = window.setTimeout(() => {
            this.hideHeader();
        }, 2000);
    }
    cancelHeaderHide() {
        if (this.headerTimer) {
            clearTimeout(this.headerTimer);
            this.headerTimer = null;
        }
    }
    checkForSavedState() {
        // Check if there's a saved game state
        try {
            const savedState = localStorage.getItem('puzzle-game-state');
            if (savedState) {
                // Show header briefly on load if there's a saved state
                this.showHeader();
                this.scheduleHeaderHide();
            }
        }
        catch (error) {
            // Ignore localStorage errors
        }
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