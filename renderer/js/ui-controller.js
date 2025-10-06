// UI Controller - Handle all UI interactions and updates
class UIController {
    constructor() {
        this.elements = {};
        this.progressDragging = false;
        this.throttleTimers = {};
        this.throttleDelay = 50; // ms
        this.initializeElements();
        this.attachEventListeners();
    }
    
    initializeElements() {
        // Title bar
        this.elements.minimizeBtn = document.getElementById('minimize-btn');
        this.elements.maximizeBtn = document.getElementById('maximize-btn');
        this.elements.closeBtn = document.getElementById('close-btn');
        
        // Now playing
        this.elements.albumArt = document.getElementById('album-art');
        this.elements.trackTitle = document.getElementById('track-title');
        this.elements.trackArtist = document.getElementById('track-artist');
        
        // Progress
        this.elements.currentTime = document.getElementById('current-time');
        this.elements.totalTime = document.getElementById('total-time');
        this.elements.progressBar = document.getElementById('progress-bar');
        this.elements.progressFill = document.getElementById('progress-fill');
        this.elements.progressThumb = document.getElementById('progress-thumb');
        
        // Controls
        this.elements.shuffleBtn = document.getElementById('shuffle-btn');
        this.elements.prevBtn = document.getElementById('prev-btn');
        this.elements.playPauseBtn = document.getElementById('play-pause-btn');
        this.elements.nextBtn = document.getElementById('next-btn');
        this.elements.repeatBtn = document.getElementById('repeat-btn');
        
        // Volume
        this.elements.volumeSlider = document.getElementById('volume-slider');
        this.elements.volumeValue = document.getElementById('volume-value');
        
        // Effects
        this.elements.speedSlider = document.getElementById('speed-slider');
        this.elements.speedValue = document.getElementById('speed-value');
        this.elements.pitchSlider = document.getElementById('pitch-slider');
        this.elements.pitchValue = document.getElementById('pitch-value');
        this.elements.reverbSlider = document.getElementById('reverb-slider');
        this.elements.reverbValue = document.getElementById('reverb-value');
        this.elements.bassSlider = document.getElementById('bass-slider');
        this.elements.bassValue = document.getElementById('bass-value');
        this.elements.compressorSlider = document.getElementById('compressor-slider');
        this.elements.compressorValue = document.getElementById('compressor-value');
        
        // Preset
        this.elements.presetSelector = document.getElementById('preset-selector');
        this.elements.savePresetBtn = document.getElementById('save-preset-btn');
        
        // Playlist
        this.elements.playlistHeader = document.getElementById('playlist-header');
        this.elements.playlistContainer = document.getElementById('playlist-container');
        this.elements.playlistItems = document.getElementById('playlist-items');
        this.elements.addFilesBtn = document.getElementById('add-files-btn');
        this.elements.clearPlaylistBtn = document.getElementById('clear-playlist-btn');
        this.elements.exportBtn = document.getElementById('export-btn');
        
        // Drop zone
        this.elements.dropZone = document.getElementById('drop-zone');
        this.elements.appContainer = document.querySelector('.app-container');
    }
    
    attachEventListeners() {
        // Title bar
        this.elements.minimizeBtn.addEventListener('click', () => {
            window.electronAPI.minimizeWindow();
        });
        
        this.elements.maximizeBtn.addEventListener('click', () => {
            window.electronAPI.maximizeWindow();
        });
        
        this.elements.closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
        
        // Progress bar
        this.elements.progressBar.addEventListener('mousedown', (e) => {
            this.progressDragging = true;
            this.handleProgressClick(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.progressDragging) {
                this.handleProgressClick(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.progressDragging = false;
        });
        
        // Volume slider
        this.elements.volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.elements.volumeValue.textContent = `${value}%`;
            this.throttle('volume', () => {
                if (this.onVolumeChange) {
                    this.onVolumeChange(value);
                }
            });
        });
        
        // Effect sliders with throttling
        this.elements.speedSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            this.elements.speedValue.textContent = `${value.toFixed(2)}x`;
            this.throttle('speed', () => {
                if (this.onSpeedChange) {
                    this.onSpeedChange(value);
                }
            });
        });
        
        this.elements.pitchSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.elements.pitchValue.textContent = value > 0 ? `+${value}` : value.toString();
            this.throttle('pitch', () => {
                if (this.onPitchChange) {
                    this.onPitchChange(value);
                }
            });
        });
        
        this.elements.reverbSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.elements.reverbValue.textContent = `${value}%`;
            this.throttle('reverb', () => {
                if (this.onReverbChange) {
                    this.onReverbChange(value);
                }
            });
        });
        
        // Bass Boost slider
        if (this.elements.bassSlider) {
            this.elements.bassSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                this.elements.bassValue.textContent = `${value}%`;
                this.throttle('bass', () => {
                    if (this.onBassChange) {
                        this.onBassChange(value);
                    }
                });
            });
        }
        
        // Compressor slider
        if (this.elements.compressorSlider) {
            this.elements.compressorSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                this.elements.compressorValue.textContent = `${value}%`;
                this.throttle('compressor', () => {
                    if (this.onCompressorChange) {
                        this.onCompressorChange(value);
                    }
                });
            });
        }
        
        // Preset selector
        this.elements.presetSelector.addEventListener('change', (e) => {
            if (this.onPresetChange) {
                this.onPresetChange(e.target.value);
            }
        });
        
        // Playlist collapsible
        this.elements.playlistHeader.addEventListener('click', () => {
            this.elements.playlistHeader.classList.toggle('expanded');
            this.elements.playlistContainer.classList.toggle('expanded');
        });
        
        // Drag and drop
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        let dragCounter = 0;
        
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (dragCounter === 1) {
                this.elements.dropZone.style.display = 'flex';
            }
        });
        
        document.addEventListener('dragleave', (e) => {
            dragCounter--;
            if (dragCounter === 0) {
                this.elements.dropZone.style.display = 'none';
            }
        });
        
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        document.addEventListener('drop', async (e) => {
            e.preventDefault();
            dragCounter = 0;
            this.elements.dropZone.style.display = 'none';
            
            const files = Array.from(e.dataTransfer.files);
            const audioFiles = files.filter(file => 
                /\.(mp3|wav|ogg|flac)$/i.test(file.name)
            );
            
            if (audioFiles.length > 0 && this.onFilesDropped) {
                const paths = audioFiles.map(file => file.path);
                this.onFilesDropped(paths);
            }
        });
    }
    
    handleProgressClick(e) {
        if (!this.onSeek) return;
        
        const rect = this.elements.progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        // Immediately update visual feedback
        this.elements.progressFill.style.width = `${percent * 100}%`;
        this.elements.progressThumb.style.left = `${percent * 100}%`;
        
        this.onSeek(percent);
    }
    
    throttle(key, callback) {
        if (this.throttleTimers[key]) {
            clearTimeout(this.throttleTimers[key]);
        }
        this.throttleTimers[key] = setTimeout(() => {
            callback();
            delete this.throttleTimers[key];
        }, this.throttleDelay);
    }
    
    updateProgress(currentTime, duration) {
        if (this.progressDragging) return;
        
        const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
        
        // Use transform for better performance
        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressThumb.style.left = `${percent}%`;
        
        this.elements.currentTime.textContent = this.formatTime(currentTime);
        this.elements.totalTime.textContent = this.formatTime(duration);
    }
    
    updateTrackInfo(track) {
        if (!track) {
            this.elements.trackTitle.textContent = 'No Track Selected';
            this.elements.trackArtist.textContent = 'Drop files or click to add music';
            return;
        }
        
        this.elements.trackTitle.textContent = track.name;
        this.elements.trackArtist.textContent = track.artist;
    }
    
    updatePlayButton(isPlaying) {
        const playIcon = this.elements.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.elements.playPauseBtn.querySelector('.pause-icon');
        
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            document.body.classList.add('playing');
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            document.body.classList.remove('playing');
        }
    }
    
    updateShuffleButton(enabled) {
        if (enabled) {
            this.elements.shuffleBtn.classList.add('active');
        } else {
            this.elements.shuffleBtn.classList.remove('active');
        }
    }
    
    updateRepeatButton(mode) {
        this.elements.repeatBtn.classList.remove('active');
        
        // Remove any existing badge
        const existingBadge = this.elements.repeatBtn.querySelector('.repeat-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        if (mode === 'all') {
            this.elements.repeatBtn.classList.add('active');
        } else if (mode === 'one') {
            this.elements.repeatBtn.classList.add('active');
            // Add "1" badge
            const badge = document.createElement('span');
            badge.className = 'repeat-badge';
            badge.textContent = '1';
            badge.style.cssText = `
                position: absolute;
                top: 2px;
                right: 2px;
                background: var(--accent);
                color: white;
                border-radius: 50%;
                width: 12px;
                height: 12px;
                font-size: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            this.elements.repeatBtn.appendChild(badge);
        }
    }
    
    updatePlaylist(tracks, currentIndex) {
        this.elements.playlistItems.innerHTML = '';
        
        tracks.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            if (index === currentIndex) {
                item.classList.add('active');
            }
            
            item.innerHTML = `
                <span class="playlist-item-index">${index + 1}</span>
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${track.name}</div>
                    <div class="playlist-item-duration">${this.formatTime(track.duration)}</div>
                </div>
                <button class="playlist-item-remove" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            `;
            
            // Click to play
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.playlist-item-remove')) {
                    if (this.onPlaylistItemClick) {
                        this.onPlaylistItemClick(index);
                    }
                }
            });
            
            // Remove button
            const removeBtn = item.querySelector('.playlist-item-remove');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onPlaylistItemRemove) {
                    this.onPlaylistItemRemove(index);
                }
            });
            
            this.elements.playlistItems.appendChild(item);
        });
    }
    
    updateEffectSliders(speed, pitch, reverb) {
        this.elements.speedSlider.value = speed * 100;
        this.elements.speedValue.textContent = `${speed.toFixed(2)}x`;
        
        this.elements.pitchSlider.value = pitch;
        this.elements.pitchValue.textContent = pitch > 0 ? `+${pitch}` : pitch.toString();
        
        this.elements.reverbSlider.value = reverb;
        this.elements.reverbValue.textContent = `${reverb}%`;
    }
    
    formatTime(seconds) {
        if (!seconds || seconds < 0) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: var(--bg-primary);
            backdrop-filter: blur(10px);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

// Add animations to the page
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .control-btn {
        position: relative;
    }
`;
document.head.appendChild(style);