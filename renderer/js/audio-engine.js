// Audio Engine - Web Audio API wrapper for audio playback and effects
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.sourceNode = null;
        this.audioBuffer = null;
        this.startTime = 0;
        this.pauseTime = 0;
        this.isPlaying = false;
        this.currentTime = 0;
        
        // Effect nodes
        this.gainNode = null;
        this.pitchShifter = null;
        this.convolverNode = null;
        this.analyserNode = null;
        this.bassFilter = null;
        this.bassGain = null;
        this.compressor = null;
        
        // Effect parameters
        this.playbackRate = 1.0;  // Speed only (time stretch)
        this.pitchShift = 0;      // Pitch only (without speed change)
        this.reverbMix = 0;
        this.bassBoost = 0; // 0 to 20 dB
        this.preservePitch = true; // Enable pitch preservation for speed changes
        this.actualPlaybackRate = 1.0; // For playback calculations
        
        // Impulse response for reverb
        this.impulseBuffer = null;
        
        // Throttling for performance
        this.lastEffectUpdate = 0;
        this.effectUpdateThrottle = 50; // ms
        
        this.initializeAudioContext();
    }
    
    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create nodes
            this.gainNode = this.audioContext.createGain();
            this.convolverNode = this.audioContext.createConvolver();
            this.analyserNode = this.audioContext.createAnalyser();
            
            // Bass boost filter (low-shelf filter)
            this.bassFilter = this.audioContext.createBiquadFilter();
            this.bassFilter.type = 'lowshelf';
            this.bassFilter.frequency.value = 320; // Bass frequencies
            this.bassFilter.gain.value = 0; // Initial gain
            
            // Compressor for better sound quality
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -24; // dB
            this.compressor.knee.value = 30; // dB
            this.compressor.ratio.value = 12; // ratio
            this.compressor.attack.value = 0.003; // seconds
            this.compressor.release.value = 0.25; // seconds
            
            // Create dry/wet mix for reverb
            this.dryGain = this.audioContext.createGain();
            this.wetGain = this.audioContext.createGain();
            this.dryGain.gain.value = 1.0;
            this.wetGain.gain.value = 0.0;
            
            // Load impulse response for reverb
            await this.loadImpulseResponse();
            
            // Connect nodes (will be reconnected when playing)
            this.setupAudioChain();
            
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }
    
    async loadImpulseResponse() {
        // Create synthetic impulse response for reverb
        const length = this.audioContext.sampleRate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        this.impulseBuffer = impulse;
        this.convolverNode.buffer = this.impulseBuffer;
    }
    
    setupAudioChain() {
        // This will be called each time we play to set up the audio chain
        // Source -> Gain -> Dry/Wet Mix -> Analyser -> Destination
    }
    
    async loadAudioFile(arrayBuffer) {
        try {
            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Decode audio data
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.pauseTime = 0;
            this.startTime = 0;
            
            return {
                duration: this.audioBuffer.duration,
                sampleRate: this.audioBuffer.sampleRate,
                channels: this.audioBuffer.numberOfChannels
            };
        } catch (error) {
            console.error('Failed to decode audio:', error);
            throw error;
        }
    }
    
    play() {
        if (!this.audioBuffer || this.isPlaying) return;
        
        // Create new source node
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        
        // Set playback rate for speed
        this.updateActualPlaybackRate();
        this.sourceNode.playbackRate.value = this.actualPlaybackRate;
        
        // Apply pitch shift separately using detune
        if (this.preservePitch && this.pitchShift !== 0) {
            // detune is in cents (100 cents = 1 semitone)
            this.sourceNode.detune.value = this.pitchShift * 100;
        }
        
        // Connect audio chain with compressor
        this.sourceNode.connect(this.gainNode);
        
        // Bass boost in the chain
        this.gainNode.connect(this.bassFilter);
        
        // Add compressor before reverb split
        this.bassFilter.connect(this.compressor);
        
        // Split for dry/wet mix after compressor
        this.compressor.connect(this.dryGain);
        this.compressor.connect(this.convolverNode);
        this.convolverNode.connect(this.wetGain);
        
        // Mix back together
        this.dryGain.connect(this.analyserNode);
        this.wetGain.connect(this.analyserNode);
        
        // Final output
        this.analyserNode.connect(this.audioContext.destination);
        
        // Handle playback end
        this.sourceNode.onended = () => {
            if (this.isPlaying) {
                this.stop();
                if (this.onEnded) {
                    this.onEnded();
                }
            }
        };
        
        // Start playback
        const offset = this.pauseTime;
        this.sourceNode.start(0, offset);
        // Adjust startTime for the playback rate
        this.startTime = this.audioContext.currentTime - (offset / this.actualPlaybackRate);
        this.isPlaying = true;
    }
    
    pause() {
        if (!this.isPlaying || !this.sourceNode) return;
        
        // Calculate accurate pause time
        const elapsed = (this.audioContext.currentTime - this.startTime);
        this.pauseTime = this.pauseTime + (elapsed * this.actualPlaybackRate);
        
        try {
            this.sourceNode.stop();
            this.sourceNode.disconnect();
        } catch (e) {
            // Already stopped/disconnected
        }
        
        this.sourceNode = null;
        this.isPlaying = false;
    }
    
    stop() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
                this.sourceNode.disconnect();
            } catch (e) {
                // Already stopped/disconnected
            }
            this.sourceNode = null;
        }
        
        this.isPlaying = false;
        this.pauseTime = 0;
        this.startTime = 0;
    }
    
    seek(time) {
        if (!this.audioBuffer) return;
        
        const wasPlaying = this.isPlaying;
        const targetTime = Math.max(0, Math.min(time, this.audioBuffer.duration));
        
        if (this.isPlaying) {
            // Stop current playback
            try {
                this.sourceNode.stop();
                this.sourceNode.disconnect();
            } catch (e) {
                // Already stopped
            }
            this.sourceNode = null;
            this.isPlaying = false;
        }
        
        // Set new position
        this.pauseTime = targetTime;
        this.startTime = this.audioContext.currentTime;
        
        // Resume if was playing
        if (wasPlaying) {
            // Small delay to ensure clean restart
            setTimeout(() => this.play(), 10);
        }
    }
    
    getCurrentTime() {
        if (!this.audioBuffer) return 0;
        
        if (this.isPlaying && this.sourceNode) {
            const elapsed = (this.audioContext.currentTime - this.startTime);
            // Don't multiply by rate for actual time position
            const currentTime = this.pauseTime + elapsed * this.actualPlaybackRate;
            return Math.min(currentTime, this.audioBuffer.duration);
        }
        
        return this.pauseTime;
    }
    
    getDuration() {
        return this.audioBuffer ? this.audioBuffer.duration : 0;
    }
    
    setVolume(value) {
        if (this.gainNode) {
            // Smooth volume transition to avoid clicks
            const now = this.audioContext.currentTime;
            this.gainNode.gain.cancelScheduledValues(now);
            this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
            this.gainNode.gain.linearRampToValueAtTime(value / 100, now + 0.05);
        }
    }
    
    setPlaybackRate(rate) {
        this.playbackRate = rate;
        this.updatePlaybackRateThrottled();
    }
    
    setPitchShift(semitones) {
        this.pitchShift = semitones;
        this.updatePlaybackRateThrottled();
    }
    
    updateActualPlaybackRate() {
        // For independent speed and pitch control
        // Speed changes time without affecting pitch
        // Pitch changes frequency without affecting speed
        if (this.preservePitch) {
            // Only apply speed, pitch will be handled separately
            this.actualPlaybackRate = this.playbackRate;
        } else {
            // Legacy mode: combine both
            const pitchFactor = Math.pow(2, this.pitchShift / 12);
            this.actualPlaybackRate = this.playbackRate * pitchFactor;
        }
    }
    
    updatePlaybackRateThrottled() {
        const now = Date.now();
        if (now - this.lastEffectUpdate < this.effectUpdateThrottle) {
            // Schedule update
            if (this.pendingEffectUpdate) {
                clearTimeout(this.pendingEffectUpdate);
            }
            this.pendingEffectUpdate = setTimeout(() => {
                this.applyPlaybackRate();
            }, this.effectUpdateThrottle);
        } else {
            this.applyPlaybackRate();
            this.lastEffectUpdate = now;
        }
    }
    
    applyPlaybackRate() {
        this.updateActualPlaybackRate();
        
        if (this.sourceNode && this.isPlaying) {
            const now = this.audioContext.currentTime;
            
            // Update pause time before changing rate
            const elapsed = now - this.startTime;
            this.pauseTime += elapsed * this.actualPlaybackRate;
            this.startTime = now;
            
            // Apply speed with smooth transition
            this.sourceNode.playbackRate.cancelScheduledValues(now);
            this.sourceNode.playbackRate.setValueAtTime(
                this.sourceNode.playbackRate.value, 
                now
            );
            this.sourceNode.playbackRate.linearRampToValueAtTime(
                this.actualPlaybackRate, 
                now + 0.1
            );
            
            // Apply pitch separately using detune
            if (this.preservePitch) {
                this.sourceNode.detune.cancelScheduledValues(now);
                this.sourceNode.detune.setValueAtTime(
                    this.sourceNode.detune.value,
                    now
                );
                this.sourceNode.detune.linearRampToValueAtTime(
                    this.pitchShift * 100,
                    now + 0.1
                );
            }
        }
    }
    
    setReverbMix(value) {
        this.reverbMix = value / 100;
        
        if (this.dryGain && this.wetGain) {
            const now = this.audioContext.currentTime;
            
            // Smooth transition to avoid artifacts
            this.dryGain.gain.cancelScheduledValues(now);
            this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
            this.dryGain.gain.linearRampToValueAtTime(1 - this.reverbMix, now + 0.1);
            
            this.wetGain.gain.cancelScheduledValues(now);
            this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
            this.wetGain.gain.linearRampToValueAtTime(this.reverbMix, now + 0.1);
        }
    }
    
    setBassBoost(value) {
        // Value is 0-100, convert to 0-20 dB
        this.bassBoost = (value / 100) * 20;
        
        if (this.bassFilter) {
            const now = this.audioContext.currentTime;
            this.bassFilter.gain.cancelScheduledValues(now);
            this.bassFilter.gain.setValueAtTime(this.bassFilter.gain.value, now);
            this.bassFilter.gain.linearRampToValueAtTime(this.bassBoost, now + 0.1);
        }
    }
    
    applyPreset(preset) {
        // Batch update to avoid multiple recalculations
        const presets = {
            'concert': { reverb: 40, pitch: 0, speed: 1.0 },
            'studio': { reverb: 15, pitch: 0, speed: 1.0 },
            'radio': { reverb: 5, pitch: 1, speed: 1.0 },
            'nightcore': { reverb: 10, pitch: 4, speed: 1.25 },
            'slowed': { reverb: 60, pitch: -2, speed: 0.75 },
            'default': { reverb: 0, pitch: 0, speed: 1.0 }
        };
        
        const config = presets[preset] || presets['default'];
        
        // Update all parameters at once
        this.reverbMix = config.reverb / 100;
        this.pitchShift = config.pitch;
        this.playbackRate = config.speed;
        
        // Apply reverb immediately
        if (this.dryGain && this.wetGain) {
            const now = this.audioContext.currentTime;
            this.dryGain.gain.cancelScheduledValues(now);
            this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
            this.dryGain.gain.linearRampToValueAtTime(1 - this.reverbMix, now + 0.2);
            
            this.wetGain.gain.cancelScheduledValues(now);
            this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
            this.wetGain.gain.linearRampToValueAtTime(this.reverbMix, now + 0.2);
        }
        
        // Apply playback rate
        this.applyPlaybackRate();
        
        return config;
    }
    
    async exportProcessedAudio(progressCallback) {
        if (!this.audioBuffer) return null;
        
        const offlineContext = new OfflineAudioContext(
            this.audioBuffer.numberOfChannels,
            this.audioBuffer.length,
            this.audioBuffer.sampleRate
        );
        
        // Create nodes in offline context
        const source = offlineContext.createBufferSource();
        source.buffer = this.audioBuffer;
        
        // Use the combined rate
        this.updateActualPlaybackRate();
        source.playbackRate.value = this.actualPlaybackRate;
        
        const gain = offlineContext.createGain();
        gain.gain.value = this.gainNode.gain.value;
        
        const convolver = offlineContext.createConvolver();
        convolver.buffer = this.impulseBuffer;
        
        const dry = offlineContext.createGain();
        const wet = offlineContext.createGain();
        dry.gain.value = 1 - this.reverbMix;
        wet.gain.value = this.reverbMix;
        
        // Connect nodes
        source.connect(gain);
        gain.connect(dry);
        gain.connect(convolver);
        convolver.connect(wet);
        dry.connect(offlineContext.destination);
        wet.connect(offlineContext.destination);
        
        // Start rendering
        source.start(0);
        
        // Render and return buffer
        const renderedBuffer = await offlineContext.startRendering();
        
        if (progressCallback) {
            progressCallback(100);
        }
        
        return renderedBuffer;
    }
    
    getFrequencyData() {
        if (!this.analyserNode) return new Uint8Array(0);
        
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyserNode.getByteFrequencyData(dataArray);
        
        return dataArray;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioEngine;
}