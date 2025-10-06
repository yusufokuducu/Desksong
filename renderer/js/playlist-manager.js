// Playlist Manager - Handle playlist operations and track management
class PlaylistManager {
    constructor() {
        this.tracks = [];
        this.currentIndex = -1;
        this.shuffleMode = false;
        this.repeatMode = 'none'; // 'none', 'one', 'all'
        this.shuffledIndices = [];
    }
    
    addTrack(filePath, metadata = {}) {
        const track = {
            id: Date.now() + Math.random(),
            path: filePath,
            name: metadata.name || this.getFileNameFromPath(filePath),
            artist: metadata.artist || 'Unknown Artist',
            duration: metadata.duration || 0,
            size: metadata.size || 0
        };
        
        this.tracks.push(track);
        
        if (this.shuffleMode) {
            this.updateShuffleOrder();
        }
        
        return track;
    }
    
    addTracks(filePaths) {
        const newTracks = filePaths.map(path => this.addTrack(path));
        return newTracks;
    }
    
    removeTrack(index) {
        if (index < 0 || index >= this.tracks.length) return false;
        
        this.tracks.splice(index, 1);
        
        // Adjust current index if necessary
        if (index < this.currentIndex) {
            this.currentIndex--;
        } else if (index === this.currentIndex) {
            // If we removed the current track, reset
            if (this.currentIndex >= this.tracks.length) {
                this.currentIndex = this.tracks.length - 1;
            }
        }
        
        if (this.shuffleMode) {
            this.updateShuffleOrder();
        }
        
        return true;
    }
    
    clearPlaylist() {
        this.tracks = [];
        this.currentIndex = -1;
        this.shuffledIndices = [];
    }
    
    moveTrack(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.tracks.length ||
            toIndex < 0 || toIndex >= this.tracks.length) {
            return false;
        }
        
        const [track] = this.tracks.splice(fromIndex, 1);
        this.tracks.splice(toIndex, 0, track);
        
        // Adjust current index
        if (fromIndex === this.currentIndex) {
            this.currentIndex = toIndex;
        } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
            this.currentIndex--;
        } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
            this.currentIndex++;
        }
        
        return true;
    }
    
    getCurrentTrack() {
        if (this.currentIndex >= 0 && this.currentIndex < this.tracks.length) {
            return this.tracks[this.currentIndex];
        }
        return null;
    }
    
    getTrackAt(index) {
        if (index >= 0 && index < this.tracks.length) {
            return this.tracks[index];
        }
        return null;
    }
    
    setCurrentIndex(index) {
        if (index >= 0 && index < this.tracks.length) {
            this.currentIndex = index;
            return true;
        }
        return false;
    }
    
    next() {
        if (this.tracks.length === 0) return null;
        
        let nextIndex;
        
        if (this.shuffleMode) {
            nextIndex = this.getNextShuffleIndex();
        } else {
            nextIndex = this.currentIndex + 1;
            
            if (nextIndex >= this.tracks.length) {
                if (this.repeatMode === 'all') {
                    nextIndex = 0;
                } else {
                    return null; // End of playlist
                }
            }
        }
        
        this.currentIndex = nextIndex;
        return this.getCurrentTrack();
    }
    
    previous() {
        if (this.tracks.length === 0) return null;
        
        let prevIndex;
        
        if (this.shuffleMode) {
            prevIndex = this.getPreviousShuffleIndex();
        } else {
            prevIndex = this.currentIndex - 1;
            
            if (prevIndex < 0) {
                if (this.repeatMode === 'all') {
                    prevIndex = this.tracks.length - 1;
                } else {
                    prevIndex = 0; // Stay at beginning
                }
            }
        }
        
        this.currentIndex = prevIndex;
        return this.getCurrentTrack();
    }
    
    setShuffleMode(enabled) {
        this.shuffleMode = enabled;
        
        if (enabled) {
            this.updateShuffleOrder();
        } else {
            this.shuffledIndices = [];
        }
    }
    
    setRepeatMode(mode) {
        // mode can be 'none', 'one', 'all'
        this.repeatMode = mode;
    }
    
    updateShuffleOrder() {
        this.shuffledIndices = [];
        
        for (let i = 0; i < this.tracks.length; i++) {
            if (i !== this.currentIndex) {
                this.shuffledIndices.push(i);
            }
        }
        
        // Fisher-Yates shuffle
        for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffledIndices[i], this.shuffledIndices[j]] = 
            [this.shuffledIndices[j], this.shuffledIndices[i]];
        }
    }
    
    getNextShuffleIndex() {
        if (this.shuffledIndices.length === 0) {
            this.updateShuffleOrder();
        }
        
        if (this.shuffledIndices.length === 0) {
            return this.currentIndex; // Only one track or no tracks
        }
        
        const nextIndex = this.shuffledIndices.shift();
        
        if (this.shuffledIndices.length === 0 && this.repeatMode === 'all') {
            this.updateShuffleOrder();
        }
        
        return nextIndex;
    }
    
    getPreviousShuffleIndex() {
        // In shuffle mode, previous goes back in play history
        // For simplicity, we'll just go to a random track
        return this.getNextShuffleIndex();
    }
    
    getFileNameFromPath(filePath) {
        const parts = filePath.replace(/\\/g, '/').split('/');
        const fileName = parts[parts.length - 1];
        // Remove extension
        return fileName.replace(/\.[^/.]+$/, '');
    }
    
    getTotalDuration() {
        return this.tracks.reduce((total, track) => total + (track.duration || 0), 0);
    }
    
    getTrackCount() {
        return this.tracks.length;
    }
    
    exportPlaylist() {
        return {
            tracks: this.tracks.map(track => ({
                path: track.path,
                name: track.name,
                artist: track.artist,
                duration: track.duration
            })),
            currentIndex: this.currentIndex,
            shuffleMode: this.shuffleMode,
            repeatMode: this.repeatMode
        };
    }
    
    importPlaylist(data) {
        if (!data || !data.tracks) return false;
        
        this.tracks = data.tracks.map(track => ({
            id: Date.now() + Math.random(),
            ...track
        }));
        
        this.currentIndex = data.currentIndex || -1;
        this.shuffleMode = data.shuffleMode || false;
        this.repeatMode = data.repeatMode || 'none';
        
        if (this.shuffleMode) {
            this.updateShuffleOrder();
        }
        
        return true;
    }
    
    searchTracks(query) {
        const lowerQuery = query.toLowerCase();
        
        return this.tracks.filter(track => 
            track.name.toLowerCase().includes(lowerQuery) ||
            track.artist.toLowerCase().includes(lowerQuery)
        );
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaylistManager;
}