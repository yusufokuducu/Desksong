// Main Application Controller
class DeskSongApp {
    constructor() {
        this.audioEngine = new AudioEngine();
        this.playlistManager = new PlaylistManager();
        this.uiController = new UIController();
        
        this.repeatModes = ['none', 'one', 'all'];
        this.currentRepeatIndex = 0;
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventHandlers();
        this.setupUICallbacks();
        this.startProgressUpdate();
        this.loadSavedSettings();
    }
    
    setupEventHandlers() {
        // Playback controls
        this.uiController.elements.playPauseBtn.addEventListener('click', () => {
            this.togglePlayPause();
        });
        
        this.uiController.elements.prevBtn.addEventListener('click', () => {
            this.playPrevious();
        });
        
        this.uiController.elements.nextBtn.addEventListener('click', () => {
            this.playNext();
        });
        
        // Shuffle and repeat
        this.uiController.elements.shuffleBtn.addEventListener('click', () => {
            const enabled = !this.playlistManager.shuffleMode;
            this.playlistManager.setShuffleMode(enabled);
            this.uiController.updateShuffleButton(enabled);
            this.saveSettings();
        });
        
        this.uiController.elements.repeatBtn.addEventListener('click', () => {
            this.currentRepeatIndex = (this.currentRepeatIndex + 1) % this.repeatModes.length;
            const mode = this.repeatModes[this.currentRepeatIndex];
            this.playlistManager.setRepeatMode(mode);
            this.uiController.updateRepeatButton(mode);
            this.saveSettings();
        });
        
        // Playlist controls
        this.uiController.elements.addFilesBtn.addEventListener('click', async () => {
            const files = await window.electronAPI.selectAudioFiles();
            if (files && files.length > 0) {
                await this.addFilesToPlaylist(files);
            }
        });
        
        this.uiController.elements.clearPlaylistBtn.addEventListener('click', () => {
            this.playlistManager.clearPlaylist();
            this.audioEngine.stop();
            this.uiController.updatePlaylist([], -1);
            this.uiController.updateTrackInfo(null);
            this.uiController.updatePlayButton(false);
        });
        
        this.uiController.elements.exportBtn.addEventListener('click', async () => {
            await this.exportAudio();
        });
        
        this.uiController.elements.savePresetBtn.addEventListener('click', () => {
            this.saveCurrentPreset();
        });
        
        // Audio engine callbacks
        this.audioEngine.onEnded = () => {
            if (this.playlistManager.repeatMode === 'one') {
                this.audioEngine.play();
            } else {
                this.playNext(true);
            }
        };
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                this.togglePlayPause();
            } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
                this.playPrevious();
            } else if (e.code === 'ArrowRight' && e.ctrlKey) {
                this.playNext();
            }
        });
    }
    
    setupUICallbacks() {
        // Volume
        this.uiController.onVolumeChange = (value) => {
            this.audioEngine.setVolume(value);
            this.saveSettings();
        };
        
        // Effects
        this.uiController.onSpeedChange = (value) => {
            this.audioEngine.setPlaybackRate(value);
            this.saveSettings();
        };
        
        this.uiController.onPitchChange = (value) => {
            this.audioEngine.setPitchShift(value);
            this.saveSettings();
        };
        
        this.uiController.onReverbChange = (value) => {
            this.audioEngine.setReverbMix(value);
            this.saveSettings();
        };
        
        this.uiController.onBassChange = (value) => {
            this.audioEngine.setBassBoost(value);
            this.saveSettings();
        };
        
        this.uiController.onCompressorChange = (value) => {
            this.audioEngine.setCompressor(value);
            this.saveSettings();
        };
        
        // Preset
        this.uiController.onPresetChange = (preset) => {
            const config = this.audioEngine.applyPreset(preset);
            if (config) {
                // Update UI to match preset
                this.uiController.updateEffectSliders(
                    config.speed,
                    config.pitch,
                    config.reverb
                );
                if (preset !== 'default') {
                    this.uiController.showNotification(`Applied ${preset} preset`);
                }
            }
        };
        
        // Progress seek
        this.uiController.onSeek = (percent) => {
            const duration = this.audioEngine.getDuration();
            if (duration > 0) {
                const time = duration * percent;
                this.audioEngine.seek(time);
            }
        };
        
        // Playlist
        this.uiController.onPlaylistItemClick = (index) => {
            this.playTrackAt(index);
        };
        
        this.uiController.onPlaylistItemRemove = (index) => {
            this.playlistManager.removeTrack(index);
            this.uiController.updatePlaylist(
                this.playlistManager.tracks,
                this.playlistManager.currentIndex
            );
        };
        
        // Files dropped
        this.uiController.onFilesDropped = async (files) => {
            await this.addFilesToPlaylist(files);
        };
    }
    
    async addFilesToPlaylist(filePaths) {
        const newTracks = [];
        
        // Show loading indicator
        this.uiController.showNotification('Loading files...');
        
        // Process files in parallel with a limit
        const processFile = async (filePath) => {
            try {
                // Read file
                const buffer = await window.electronAPI.readFile(filePath);
                if (!buffer) return null;
                
                // Try to load it to get duration (read only header for performance)
                const arrayBuffer = buffer.buffer.slice(
                    buffer.byteOffset,
                    buffer.byteOffset + Math.min(buffer.byteLength, 1024 * 1024) // Max 1MB for metadata
                );
                
                // Create a temporary audio context to decode metadata
                const tempContext = new (window.AudioContext || window.webkitAudioContext)();
                let duration = 0;
                
                try {
                    // Try to decode just enough for duration
                    const audioBuffer = await tempContext.decodeAudioData(arrayBuffer.slice(0));
                    duration = audioBuffer.duration;
                } catch (e) {
                    // If partial decode fails, duration will be updated when playing
                    console.log('Could not decode duration, will update later');
                }
                
                tempContext.close();
                
                // Add to playlist
                const track = this.playlistManager.addTrack(filePath, { duration });
                return track;
            } catch (error) {
                console.error(`Failed to load ${filePath}:`, error);
                return null;
            }
        };
        
        // Process files with concurrency limit
        const chunkSize = 3;
        for (let i = 0; i < filePaths.length; i += chunkSize) {
            const chunk = filePaths.slice(i, i + chunkSize);
            const results = await Promise.all(chunk.map(processFile));
            newTracks.push(...results.filter(track => track !== null));
        }
        
        // Update UI
        this.uiController.updatePlaylist(
            this.playlistManager.tracks,
            this.playlistManager.currentIndex
        );
        
        // If nothing is playing, start playing the first new track
        if (!this.audioEngine.isPlaying && newTracks.length > 0) {
            const firstNewIndex = this.playlistManager.tracks.indexOf(newTracks[0]);
            this.playTrackAt(firstNewIndex);
        }
        
        if (newTracks.length > 0) {
            this.uiController.showNotification(
                `Added ${newTracks.length} track${newTracks.length > 1 ? 's' : ''} to playlist`
            );
        }
    }
    
    async playTrackAt(index) {
        if (!this.playlistManager.setCurrentIndex(index)) {
            return;
        }
        
        const track = this.playlistManager.getCurrentTrack();
        if (!track) return;
        
        try {
            // Stop current playback
            this.audioEngine.stop();
            
            // Load new track
            const buffer = await window.electronAPI.readFile(track.path);
            if (!buffer) {
                throw new Error('Failed to read file');
            }
            
            const arrayBuffer = buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength
            );
            
            const info = await this.audioEngine.loadAudioFile(arrayBuffer);
            
            // Update track duration if not set
            if (!track.duration) {
                track.duration = info.duration;
            }
            
            // Start playing
            this.audioEngine.play();
            
            // Update UI
            this.uiController.updateTrackInfo(track);
            this.uiController.updatePlayButton(true);
            this.uiController.updatePlaylist(
                this.playlistManager.tracks,
                this.playlistManager.currentIndex
            );
            
        } catch (error) {
            console.error('Failed to play track:', error);
            this.uiController.showNotification('Failed to play track', 'error');
        }
    }
    
    togglePlayPause() {
        if (!this.audioEngine.audioBuffer) {
            // If no track loaded, try to play first track
            if (this.playlistManager.tracks.length > 0) {
                this.playTrackAt(0);
            }
            return;
        }
        
        if (this.audioEngine.isPlaying) {
            this.audioEngine.pause();
            this.uiController.updatePlayButton(false);
        } else {
            this.audioEngine.play();
            this.uiController.updatePlayButton(true);
        }
    }
    
    playNext(autoPlay = false) {
        const nextTrack = this.playlistManager.next();
        
        if (nextTrack) {
            this.playTrackAt(this.playlistManager.currentIndex);
        } else if (!autoPlay) {
            // Manual next at end of playlist
            this.audioEngine.stop();
            this.uiController.updatePlayButton(false);
        }
    }
    
    playPrevious() {
        // If more than 3 seconds into the song, restart it
        if (this.audioEngine.getCurrentTime() > 3) {
            this.audioEngine.seek(0);
        } else {
            const prevTrack = this.playlistManager.previous();
            if (prevTrack) {
                this.playTrackAt(this.playlistManager.currentIndex);
            }
        }
    }
    
    updateEffectControls() {
        // Debounce UI updates to prevent loops
        if (this.effectUpdateTimeout) {
            clearTimeout(this.effectUpdateTimeout);
        }
        this.effectUpdateTimeout = setTimeout(() => {
            this.uiController.updateEffectSliders(
                this.audioEngine.playbackRate,
                this.audioEngine.pitchShift,
                this.audioEngine.reverbMix * 100
            );
        }, 100);
    }
    
    startProgressUpdate() {
        // Use requestAnimationFrame for smoother updates
        const updateProgress = () => {
            if (this.audioEngine.isPlaying) {
                const currentTime = this.audioEngine.getCurrentTime();
                const duration = this.audioEngine.getDuration();
                this.uiController.updateProgress(currentTime, duration);
            }
            requestAnimationFrame(updateProgress);
        };
        requestAnimationFrame(updateProgress);
    }
    
    async exportAudio() {
        if (!this.audioEngine.audioBuffer) {
            this.uiController.showNotification('No audio loaded', 'error');
            return;
        }
        
        const track = this.playlistManager.getCurrentTrack();
        const defaultName = track ? `${track.name}_processed.wav` : 'processed_audio.wav';
        
        const savePath = await window.electronAPI.saveAudioFile(defaultName);
        if (!savePath) return;
        
        try {
            this.uiController.showNotification('Exporting audio...');
            
            const processedBuffer = await this.audioEngine.exportProcessedAudio((progress) => {
                // Progress callback if needed
            });
            
            // Convert AudioBuffer to WAV
            const wavBuffer = this.audioBufferToWav(processedBuffer);
            
            // Save file
            const success = await window.electronAPI.writeFile(savePath, Buffer.from(wavBuffer));
            
            if (success) {
                this.uiController.showNotification('Audio exported successfully', 'success');
            } else {
                throw new Error('Failed to write file');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.uiController.showNotification('Export failed', 'error');
        }
    }
    
    audioBufferToWav(buffer) {
        const length = buffer.length * buffer.numberOfChannels * 2 + 44;
        const arrayBuffer = new ArrayBuffer(length);
        const view = new DataView(arrayBuffer);
        const channels = [];
        let offset = 0;
        let pos = 0;
        
        // Write WAV header
        const setUint16 = (data) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };
        
        const setUint32 = (data) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };
        
        // RIFF identifier
        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length minus RIFF header
        setUint32(0x45564157); // "WAVE"
        
        // Format chunk
        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM
        setUint16(buffer.numberOfChannels);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // byte rate
        setUint16(buffer.numberOfChannels * 2); // block align
        setUint16(16); // bits per sample
        
        // Data chunk
        setUint32(0x61746164); // "data" chunk
        setUint32(length - pos - 4); // chunk length
        
        // Write interleaved data
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }
        
        while (pos < length) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }
        
        return arrayBuffer;
    }
    
    saveCurrentPreset() {
        const name = prompt('Enter preset name:');
        if (!name) return;
        
        const preset = {
            name: name,
            speed: this.audioEngine.playbackRate,
            pitch: this.audioEngine.pitchShift,
            reverb: this.audioEngine.reverbMix * 100
        };
        
        // Save to localStorage
        const customPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');
        customPresets.push(preset);
        localStorage.setItem('customPresets', JSON.stringify(customPresets));
        
        // Add to preset selector
        const option = document.createElement('option');
        option.value = `custom_${customPresets.length - 1}`;
        option.textContent = name;
        this.uiController.elements.presetSelector.appendChild(option);
        
        this.uiController.showNotification(`Preset "${name}" saved`);
    }
    
    loadSavedSettings() {
        const settings = localStorage.getItem('desksongSettings');
        if (!settings) return;
        
        try {
            const data = JSON.parse(settings);
            
            // Apply volume
            if (data.volume !== undefined) {
                this.uiController.elements.volumeSlider.value = data.volume;
                this.uiController.elements.volumeValue.textContent = `${data.volume}%`;
                this.audioEngine.setVolume(data.volume);
            }
            
            // Apply effects
            if (data.speed !== undefined) {
                this.audioEngine.setPlaybackRate(data.speed);
            }
            if (data.pitch !== undefined) {
                this.audioEngine.setPitchShift(data.pitch);
            }
            if (data.reverb !== undefined) {
                this.audioEngine.setReverbMix(data.reverb);
            }
            
            this.updateEffectControls();
            
            // Load custom presets
            const customPresets = JSON.parse(localStorage.getItem('customPresets') || '[]');
            customPresets.forEach((preset, index) => {
                const option = document.createElement('option');
                option.value = `custom_${index}`;
                option.textContent = preset.name;
                this.uiController.elements.presetSelector.appendChild(option);
            });
            
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    saveSettings() {
        const settings = {
            volume: parseInt(this.uiController.elements.volumeSlider.value),
            speed: this.audioEngine.playbackRate,
            pitch: this.audioEngine.pitchShift,
            reverb: this.audioEngine.reverbMix * 100,
            shuffle: this.playlistManager.shuffleMode,
            repeat: this.playlistManager.repeatMode
        };
        
        localStorage.setItem('desksongSettings', JSON.stringify(settings));
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new DeskSongApp();
    window.desksongApp = app; // For debugging
});