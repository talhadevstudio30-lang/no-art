class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('artCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.brushCursor = document.getElementById('brushCursor');
        this.themeToggle = document.getElementById('themeToggle');
        this.colorPicker = document.getElementById('colorPicker');
        this.colorPalette = document.getElementById('colorPalette');
        this.brushSizeInput = document.getElementById('brushSize');
        this.brushSizeValue = document.getElementById('brushSizeValue');
        this.brushOpacityInput = document.getElementById('brushOpacity');
        this.opacityValue = document.getElementById('opacityValue');
        this.brushHardnessInput = document.getElementById('brushHardness');
        this.hardnessValue = document.getElementById('hardnessValue');
        this.canvasWidthInput = document.getElementById('canvasWidth');
        this.canvasHeightInput = document.getElementById('canvasHeight');
        this.galleryGrid = document.getElementById('galleryGrid');
        this.notification = document.getElementById('notification');
        this.notificationMessage = document.getElementById('notificationMessage');
        this.exportModal = document.getElementById('exportModal');
        this.zoomLevel = document.getElementById('zoomLevel');
        this.brushInfo = document.getElementById('brushInfo');
        this.modeInfo = document.getElementById('modeInfo');
        this.canvasSize = document.getElementById('canvasSize');

        this.currentColor = this.colorPicker.value;
        this.currentSize = parseInt(this.brushSizeInput.value);
        this.currentOpacity = parseFloat(this.brushOpacityInput.value);
        this.currentHardness = parseFloat(this.brushHardnessInput.value);
        this.currentBrushType = 'round';
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        this.isErasing = false;
        this.showGrid = false;
        this.isColorPickerActive = false;
        this.canvasScale = 1;
        this.storageKey = 'mashalCanvasSize';

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupColorPalette();
        this.loadGallery();
        this.setupTheme();
        this.loadCanvasSize();
        this.updateBrushCursor();
        this.saveCanvasState();
    }

    setupCanvas() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.updateBrushStyle();
        this.canvasSize.textContent = `${this.canvas.width}×${this.canvas.height}`;
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));

        this.canvas.addEventListener('mousemove', this.updateBrushCursorPosition.bind(this));
        this.canvas.addEventListener('mouseenter', () => {
            this.brushCursor.style.opacity = '0.7';
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.brushCursor.style.opacity = '0';
        });

        this.brushSizeInput.addEventListener('input', (e) => {
            this.currentSize = parseInt(e.target.value);
            this.brushSizeValue.textContent = this.currentSize;
            this.updateBrushStyle();
            this.updateBrushCursor();
            this.updateBrushInfo();
        });

        this.brushOpacityInput.addEventListener('input', (e) => {
            this.currentOpacity = parseFloat(e.target.value);
            this.opacityValue.textContent = `${Math.round(this.currentOpacity * 100)}%`;
            this.updateBrushStyle();
        });

        this.brushHardnessInput.addEventListener('input', (e) => {
            this.currentHardness = parseFloat(e.target.value);
            this.hardnessValue.textContent = `${Math.round(this.currentHardness * 100)}%`;
            this.updateBrushStyle();
        });

        this.colorPicker.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            this.updateBrushStyle();
            this.updateBrushCursor();
        });

        this.themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            document.body.classList.toggle('light-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');

            const icon = this.themeToggle.querySelector('i');
            const text = this.themeToggle.querySelector('span');
            if (isDark) {
                icon.className = 'fas fa-sun';
                text.textContent = 'Light Mode';
            } else {
                icon.className = 'fas fa-moon';
                text.textContent = 'Dark Mode';
            }
        });

        document.querySelectorAll('.brush-type').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.brush-type').forEach(btn => btn.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentBrushType = e.currentTarget.dataset.type;
                this.isErasing = this.currentBrushType === 'eraser';
                this.updateBrushStyle();
                this.updateBrushCursor();
                this.updateBrushInfo();
            });
        });

        document.getElementById('applyCanvasSize').addEventListener('click', () => {
            this.resizeCanvas(
                parseInt(this.canvasWidthInput.value),
                parseInt(this.canvasHeightInput.value)
            );
        });

        document.querySelectorAll('[data-preset]').forEach(button => {
            button.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                const [width, height] = preset.split('x').map(Number);
                this.canvasWidthInput.value = width;
                this.canvasHeightInput.value = height;
                this.resizeCanvas(width, height);
            });
        });

        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveToGallery());
        document.getElementById('exportBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('fillBtn').addEventListener('click', () => this.fillCanvas());
        document.getElementById('gridBtn').addEventListener('click', () => this.toggleGrid());
        document.getElementById('colorPickerBtn').addEventListener('click', () => this.activateColorPicker());

        document.getElementById('exportPNG').addEventListener('click', () => this.exportImage('png'));
        document.getElementById('exportJPEG').addEventListener('click', () => this.exportImage('jpeg'));
        document.getElementById('exportSVG').addEventListener('click', () => this.showNotification('SVG export not implemented yet', 'warning'));
        document.getElementById('closeModal').addEventListener('click', () => this.hideExportModal());

        this.exportModal.addEventListener('click', (e) => {
            if (e.target === this.exportModal) {
                this.hideExportModal();
            }
        });

        document.getElementById('resetCanvasSize').addEventListener('click', () => {
            if (confirm('Reset canvas size to default 1200×800 and clear saved size?')) {
                localStorage.removeItem(this.storageKey);
                this.canvasWidthInput.value = 1200;
                this.canvasHeightInput.value = 800;
                this.resizeCanvas(1200, 800);
                this.canvas.style.width = '100%';
                this.canvas.style.height = '800px';
                this.showNotification('Canvas size reset to default', 'info');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        e.shiftKey ? this.redo() : this.undo();
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveToGallery();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.toggleEraser();
                        break;
                    case 'g':
                        e.preventDefault();
                        this.toggleGrid();
                        break;
                }
            }
        });

        window.addEventListener('resize', this.updateCanvasScale.bind(this));
        this.updateCanvasScale();
    }

    updateBrushInfo() {
        const type = this.currentBrushType.charAt(0).toUpperCase() + this.currentBrushType.slice(1);
        this.brushInfo.textContent = `${type}: ${this.currentSize}px`;
        this.modeInfo.textContent = 'Mode: Brush';
    }

    setupColorPalette() {
        const colors = [
            '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#38bdf8', '#34d399', '#fbbf24', '#f87171',
            '#4f46e5', '#0369a1', '#047857', '#b45309', '#b91c1c',
            '#ffffff', '#cbd5e1', '#64748b', '#334155', '#000000'
        ];

        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;
            swatch.addEventListener('click', () => {
                this.currentColor = color;
                this.colorPicker.value = color;
                this.updateBrushStyle();
                this.updateBrushCursor();
                this.showNotification(`Color set to ${color}`, 'success');
            });
            this.colorPalette.appendChild(swatch);
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            const icon = this.themeToggle.querySelector('i');
            const text = this.themeToggle.querySelector('span');
            icon.className = 'fas fa-sun';
            text.textContent = 'Light Mode';
        }
    }

    updateBrushStyle() {
        if (this.isErasing) {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
            this.ctx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            const rgb = this.hexToRgb(this.currentColor);
            this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.currentOpacity})`;
            this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.currentOpacity})`;
        }

        this.ctx.lineWidth = this.currentSize;
        this.ctx.lineCap = this.getLineCap();

        if (this.currentBrushType === 'round' && this.currentHardness < 1) {
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.currentSize / 2);
            gradient.addColorStop(0, this.ctx.strokeStyle);
            gradient.addColorStop(this.currentHardness, this.ctx.strokeStyle);
            gradient.addColorStop(1, 'transparent');
            this.ctx.strokeStyle = gradient;
        }
    }

    getLineCap() {
        switch (this.currentBrushType) {
            case 'square': return 'butt';
            case 'pencil': return 'square';
            default: return 'round';
        }
    }

    updateBrushCursor() {
        const size = this.currentSize * this.canvasScale;
        this.brushCursor.style.width = `${size}px`;
        this.brushCursor.style.height = `${size}px`;
        this.brushCursor.style.borderColor = this.isErasing ? '#ef4444' : this.currentColor;
        this.brushCursor.style.borderWidth = `${Math.max(1, size / 10)}px`;

        if (this.currentBrushType === 'eraser') {
            this.brushCursor.style.borderStyle = 'dashed';
        } else {
            this.brushCursor.style.borderStyle = 'solid';
        }
    }

    updateBrushCursorPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.brushCursor.style.left = `${x}px`;
        this.brushCursor.style.top = `${y}px`;
    }

    updateCanvasScale() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvasScale = rect.width / this.canvas.width;
        this.updateBrushCursor();
        this.updateZoomLevel();
    }

    updateZoomLevel() {
        const zoom = Math.round(this.canvasScale * 100);
        this.zoomLevel.textContent = `${zoom}%`;
    }

    startDrawing(e) {
        if (this.isColorPickerActive) {
            this.pickColorFromCanvas(e);
            return;
        }

        this.isDrawing = true;
        const coords = this.getCanvasCoordinates(e);
        [this.lastX, this.lastY] = [coords.x, coords.y];

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.saveCanvasState();
    }

    draw(e) {
        if (!this.isDrawing) return;

        const coords = this.getCanvasCoordinates(e);
        const x = coords.x;
        const y = coords.y;

        switch (this.currentBrushType) {
            case 'spray':
                this.drawSpray(x, y);
                break;
            case 'pencil':
                this.ctx.lineWidth = Math.max(1, this.currentSize / 3);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
                break;
            default:
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
        }
        [this.lastX, this.lastY] = [x, y];
    }

    drawSpray(x, y) {
        const density = this.currentSize * 2;
        const radius = this.currentSize / 2;

        for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const sprayRadius = Math.random() * radius;
            const sprayX = x + Math.cos(angle) * sprayRadius;
            const sprayY = y + Math.sin(angle) * sprayRadius;

            this.ctx.beginPath();
            this.ctx.arc(sprayX, sprayY, Math.random() * 2 + 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.ctx.closePath();
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        let clientX, clientY;

        if (e.type.includes('touch')) {
            const touch = e.touches[0] || e.changedTouches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleTouchStart(e) {
        e.preventDefault();
        this.startDrawing(e);
    }

    handleTouchMove(e) {
        e.preventDefault();
        this.draw(e);
    }

    saveCanvasState() {
        const state = this.canvas.toDataURL();
        this.undoStack.push(state);
        this.redoStack = [];

        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
    }

    restoreLastState() {
        if (this.undoStack.length > 0) {
            const state = this.undoStack[this.undoStack.length - 1];
            this.restoreCanvasState(state);
        }
    }

    undo() {
        if (this.undoStack.length > 1) {
            this.redoStack.push(this.undoStack.pop());
            const state = this.undoStack[this.undoStack.length - 1];
            this.restoreCanvasState(state);
            this.showNotification('Undo performed', 'info');
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const state = this.redoStack.pop();
            this.undoStack.push(state);
            this.restoreCanvasState(state);
            this.showNotification('Redo performed', 'info');
        }
    }

    restoreCanvasState(state) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = state;
    }

    clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas?')) {
            this.saveCanvasState();
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.showNotification('Canvas cleared', 'info');
        }
    }

    fillCanvas() {
        this.saveCanvasState();
        this.ctx.fillStyle = this.currentColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.showNotification('Canvas filled', 'success');
    }

    resizeCanvas(width, height) {
        if (width < 100 || width > 5000 || height < 100 || height > 5000) {
            this.showNotification('Canvas size must be between 100x100 and 5000x5000', 'warning');
            return;
        }

        this.saveCanvasSize(width, height);

        const currentImage = this.canvas.toDataURL();
        this.canvas.width = width;
        this.canvas.height = height;

        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, width, height);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, width, height);
            this.ctx.drawImage(img, 0, 0);
            this.updateBrushStyle();
        };
        img.src = currentImage;

        this.canvasSize.textContent = `${width}×${height}`;
        this.updateCanvasScale();
        this.showNotification(`Canvas resized to ${width}×${height}`, 'success');
    }

    loadCanvasSize() {
        const savedSize = localStorage.getItem(this.storageKey);
        if (savedSize) {
            try {
                const { width, height } = JSON.parse(savedSize);
                if (width && height && width >= 100 && width <= 5000 && height >= 100 && height <= 5000) {
                    this.canvasWidthInput.value = width;
                    this.canvasHeightInput.value = height;

                    if (width !== this.canvas.width || height !== this.canvas.height) {
                        this.resizeCanvas(width, height);
                    }
                    this.showNotification(`Loaded saved canvas size: ${width}×${height}`, 'info');
                }
            } catch (e) {
                console.error('Error loading canvas size:', e);
                localStorage.removeItem(this.storageKey);
            }
        }
    }

    saveCanvasSize(width, height) {
        const sizeData = { width, height };
        localStorage.setItem(this.storageKey, JSON.stringify(sizeData));
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.drawGrid();
        const btn = document.getElementById('gridBtn');
        if (this.showGrid) {
            btn.classList.add('btn-primary');
            this.showNotification('Grid enabled', 'info');
        } else {
            btn.classList.remove('btn-primary');
            this.showNotification('Grid disabled', 'info');
        }
    }

    drawGrid() {
        if (!this.showGrid) {
            const state = this.undoStack[this.undoStack.length - 1];
            this.restoreCanvasState(state);
            return;
        }

        const gridSize = 20;
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    activateColorPicker() {
        this.isColorPickerActive = true;
        this.canvas.style.cursor = 'crosshair';
        this.brushCursor.style.opacity = '0';
        this.showNotification('Click on canvas to pick a color', 'info');

        setTimeout(() => {
            this.isColorPickerActive = false;
            this.canvas.style.cursor = 'crosshair';
            this.brushCursor.style.opacity = '0.7';
        }, 10000);
    }

    pickColorFromCanvas(e) {
        const coords = this.getCanvasCoordinates(e);
        const imageData = this.ctx.getImageData(coords.x, coords.y, 1, 1).data;
        const color = this.rgbToHex(imageData[0], imageData[1], imageData[2]);

        this.currentColor = color;
        this.colorPicker.value = color;
        this.updateBrushStyle();
        this.updateBrushCursor();

        this.isColorPickerActive = false;
        this.canvas.style.cursor = 'crosshair';
        this.brushCursor.style.opacity = '0.7';

        this.showNotification(`Color picked: ${color}`, 'success');
    }

    saveToGallery() {
        const dataUrl = this.canvas.toDataURL('image/png');
        const gallery = JSON.parse(localStorage.getItem('mashalGallery') || '[]');

        gallery.unshift({
            id: Date.now(),
            dataUrl: dataUrl,
            date: new Date().toISOString(),
            brushType: this.currentBrushType,
            color: this.currentColor,
            size: `${this.canvas.width}x${this.canvas.height}`
        });

        if (gallery.length > 20) {
            gallery.pop();
        }

        localStorage.setItem('mashalGallery', JSON.stringify(gallery));
        this.loadGallery();
        this.showNotification('Artwork saved to gallery', 'success');
    }

    loadGallery() {
        const gallery = JSON.parse(localStorage.getItem('mashalGallery') || '[]');
        this.galleryGrid.innerHTML = '';

        if (gallery.length === 0) {
            this.galleryGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">No saved artworks yet</p>';
            return;
        }

        gallery.forEach(item => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.title = `Saved on ${new Date(item.date).toLocaleDateString()}`;

            const img = document.createElement('img');
            img.src = item.dataUrl;
            img.alt = 'Saved artwork';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteGalleryItem(item.id);
            });

            galleryItem.appendChild(img);
            galleryItem.appendChild(deleteBtn);

            galleryItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn')) {
                    this.loadArtwork(item.dataUrl);
                }
            });

            this.galleryGrid.appendChild(galleryItem);
        });
    }

    deleteGalleryItem(id) {
        if (confirm('Delete this artwork from gallery?')) {
            const gallery = JSON.parse(localStorage.getItem('mashalGallery') || '[]');
            const filtered = gallery.filter(item => item.id !== id);
            localStorage.setItem('mashalGallery', JSON.stringify(filtered));
            this.loadGallery();
            this.showNotification('Artwork deleted', 'info');
        }
    }

    loadArtwork(dataUrl) {
        if (confirm('Load this artwork? Current canvas will be replaced.')) {
            this.saveCanvasState();
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            };
            img.src = dataUrl;
            this.showNotification('Artwork loaded', 'success');
        }
    }

    showExportModal() {
        this.exportModal.classList.add('active');
    }

    hideExportModal() {
        this.exportModal.classList.remove('active');
    }

    exportImage(format) {
        const link = document.createElement('a');
        const filename = `mashal-artwork-${Date.now()}.${format}`;

        if (format === 'svg') {
            this.showNotification('SVG export not implemented yet', 'warning');
            return;
        }

        link.download = filename;
        link.href = this.canvas.toDataURL(`image/${format}`, 0.95);
        link.click();
        this.hideExportModal();
        this.showNotification(`Artwork exported as ${filename}`, 'success');
    }

    toggleEraser() {
        const eraserBtn = document.querySelector('.brush-type[data-type="eraser"]');
        const currentBtn = document.querySelector('.brush-type.active');

        if (this.currentBrushType === 'eraser') {
            const roundBtn = document.querySelector('.brush-type[data-type="round"]');
            currentBtn.classList.remove('active');
            roundBtn.classList.add('active');
            this.currentBrushType = 'round';
            this.isErasing = false;
        } else {
            currentBtn.classList.remove('active');
            eraserBtn.classList.add('active');
            this.currentBrushType = 'eraser';
            this.isErasing = true;
        }

        this.updateBrushStyle();
        this.updateBrushCursor();
        this.updateBrushInfo();
    }

    showNotification(message, type = 'info') {
        const icon = this.notification.querySelector('i');

        switch (type) {
            case 'success':
                icon.className = 'fas fa-check-circle';
                icon.style.color = 'var(--success)';
                break;
            case 'warning':
                icon.className = 'fas fa-exclamation-triangle';
                icon.style.color = 'var(--warning)';
                break;
            case 'error':
                icon.className = 'fas fa-times-circle';
                icon.style.color = 'var(--danger)';
                break;
            default:
                icon.className = 'fas fa-info-circle';
                icon.style.color = 'var(--primary)';
        }

        this.notificationMessage.textContent = message;
        this.notification.classList.add('show');

        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new DrawingApp();
    window.drawingApp = app;
});