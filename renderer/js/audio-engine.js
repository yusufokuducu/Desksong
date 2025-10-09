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
        this.delayInput = null;
        this.delayNode = null;
        this.delayFeedback = null;
        this.delayWetGain = null;
        this.chorusInput = null;
        this.chorusDelay = null;
        this.chorusDepth = null;
        this.chorusLFO = null;
        this.chorusWetGain = null;
        
        // Effect parameters
        this.playbackRate = 1.0;  // Speed only (time stretch)
        this.pitchShift = 0;      // Pitch only (without speed change)
        this.reverbMix = 0;
        this.bassBoost = 0; // 0 to 20 dB
        this.compressorEnabled = true; // Enable/disable compressor
        this.compressorThreshold = -24; // dB
        this.preservePitch = true; // Enable pitch preservation for speed changes
        this.actualPlaybackRate = 1.0; // For playback calculations
        this.delayMix = 0; // 0 to 1
        this.chorusMix = 0; // 0 to 1
        
        // Impulse response for reverb
        this.impulseBuffer = null;
        
        // Throttling for performance
        this.lastEffectUpdate = 0;
        this.effectUpdateThrottle = 20; // ms
        this.pendingEffectUpdate = null;
        this.chainConfigured = false;
        this.pendingDelayMix = null;
        this.pendingChorusMix = null;
        
        this.initializeAudioContext();
    }
    
    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create nodes
            this.gainNode = this.audioContext.createGain();
            this.convolverNode = this.audioContext.createConvolver();
            this.analyserNode = this.audioContext.createAnalyser();
            
            // Bass boost filter (low-shelf filter for clean bass enhancement)
            this.bassFilter = this.audioContext.createBiquadFilter();
            this.bassFilter.type = 'lowshelf';
            this.bassFilter.frequency.value = 250; // Focus on sub-bass and bass
            this.bassFilter.Q.value = 0.7; // Quality factor for natural sound
            this.bassFilter.gain.value = 0; // Initial gain
            
            // Dynamic compressor for better sound quality and loudness
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -24; // dB (when compression starts)
            this.compressor.knee.value = 30; // dB (smooth transition)
            this.compressor.ratio.value = 12; // compression ratio
            this.compressor.attack.value = 0.003; // seconds (how fast it reacts)
            this.compressor.release.value = 0.25; // seconds (how fast it recovers)
            
            // Create dry/wet mix for reverb
            this.dryGain = this.audioContext.createGain();
            this.wetGain = this.audioContext.createGain();
            this.dryGain.gain.value = 1.0;
            this.wetGain.gain.value = 0.0;

            // Advanced effects: delay/echo
            this.delayInput = this.audioContext.createGain();
            this.delayInput.gain.value = 1.0;
            this.delayNode = this.audioContext.createDelay(2.0);
            this.delayNode.delayTime.value = 0.25;
            this.delayFeedback = this.audioContext.createGain();
            this.delayFeedback.gain.value = 0.2;
            this.delayWetGain = this.audioContext.createGain();
            this.delayWetGain.gain.value = 0.0;
            this.delayInput.connect(this.delayNode);
            this.delayNode.connect(this.delayFeedback);
            this.delayFeedback.connect(this.delayNode);
            this.delayNode.connect(this.delayWetGain);

            // Advanced effects: chorus
            this.chorusInput = this.audioContext.createGain();
            this.chorusInput.gain.value = 1.0;
            this.chorusDelay = this.audioContext.createDelay(0.05);
            this.chorusDelay.delayTime.value = 0.015;
            this.chorusDepth = this.audioContext.createGain();
            this.chorusDepth.gain.value = 0.004;
            this.chorusWetGain = this.audioContext.createGain();
            this.chorusWetGain.gain.value = 0.0;
            this.chorusInput.connect(this.chorusDelay);
            this.chorusDelay.connect(this.chorusWetGain);
            this.chorusLFO = this.audioContext.createOscillator();
            this.chorusLFO.frequency.value = 0.8;
            this.chorusLFO.type = 'sine';
            this.chorusLFO.connect(this.chorusDepth);
            this.chorusDepth.connect(this.chorusDelay.delayTime);
            this.chorusLFO.start();
            
            // Load impulse response for reverb
            await this.loadImpulseResponse();
            
            // Connect nodes (will be reconnected when playing)
            this.setupAudioChain();

            if (this.pendingDelayMix !== null) {
                const value = this.pendingDelayMix;
                this.pendingDelayMix = null;
                this.setDelayMix(value);
            } else {
                this.setDelayMix(this.delayMix * 100);
            }

            if (this.pendingChorusMix !== null) {
                const value = this.pendingChorusMix;
                this.pendingChorusMix = null;
                this.setChorusMix(value);
            } else {
                this.setChorusMix(this.chorusMix * 100);
            }
            
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
        }
    }
    
    async loadImpulseResponse() {
        // Create high-quality synthetic impulse response for reverb
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 3; // 3 seconds for richer reverb
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            
            // Create realistic reverb with early reflections and late diffusion
            for (let i = 0; i < length; i++) {
                const t = i / sampleRate;
                
                // Early reflections (first 50ms)
                const early = t < 0.05 ? Math.random() * 0.5 : 0;
                
                // Late diffuse reverb with exponential decay
                const decayTime = 2.0; // seconds
                const late = (Math.random() * 2 - 1) * Math.exp(-3 * t / decayTime);
                
                // Add some modulation for richer sound
                const modulation = Math.sin(2 * Math.PI * 0.5 * t) * 0.1;
                
                // Combine all components
                channelData[i] = (early + late) * (1 + modulation);
                
                // Stereo width for channel separation
                if (channel === 1) {
                    channelData[i] *= 0.95; // Slight difference for stereo effect
                }
            }
        }
        
        this.impulseBuffer = impulse;
        this.convolverNode.buffer = this.impulseBuffer;
    }
    
    setupAudioChain() {
        if (!this.audioContext || this.chainConfigured) {
            return;
        }

        // Primary path
        this.gainNode.connect(this.bassFilter);
        this.bassFilter.connect(this.compressor);
        this.compressor.connect(this.dryGain);
        this.compressor.connect(this.convolverNode);
        this.convolverNode.connect(this.wetGain);

        // Advanced effects paths
        if (this.delayInput && this.delayWetGain) {
            this.compressor.connect(this.delayInput);
            this.delayWetGain.connect(this.analyserNode);
        }

        if (this.chorusInput && this.chorusWetGain) {
            this.compressor.connect(this.chorusInput);
            this.chorusWetGain.connect(this.analyserNode);
        }

        // Mix back together
        this.dryGain.connect(this.analyserNode);
        this.wetGain.connect(this.analyserNode);

        // Final output
        this.analyserNode.connect(this.audioContext.destination);

        this.chainConfigured = true;
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
        this.setupAudioChain();
        
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
            // Calculate actual position in the original audio file
            const currentTime = this.pauseTime + (elapsed * this.actualPlaybackRate);
            return Math.min(currentTime, this.audioBuffer.duration);
        }
        
        return this.pauseTime;
    }
    
    getDuration() {
        // Always return the original file duration, regardless of playback rate
        return this.audioBuffer ? this.audioBuffer.duration : 0;
    }
    
    getEffectiveDuration() {
        // Get the perceived duration with current playback rate
        // This shows how long it will take to play in real-time
        if (!this.audioBuffer) return 0;
        const rate = this.actualPlaybackRate || 0;
        if (rate <= 0) {
            return Infinity;
        }
        return this.audioBuffer.duration / rate;
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
                this.lastEffectUpdate = Date.now();
                this.pendingEffectUpdate = null;
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
    
    setCompressor(value) {
        // Value is 0-100, convert to threshold -50 to -10 dB
        // Higher value = more compression (lower threshold)
        this.compressorThreshold = -50 + (value / 100) * 40;
        
        if (this.compressor) {
            const now = this.audioContext.currentTime;
            this.compressor.threshold.setValueAtTime(this.compressorThreshold, now);
            // Adjust ratio based on intensity
            const ratio = 4 + (value / 100) * 16; // 4:1 to 20:1
            this.compressor.ratio.setValueAtTime(ratio, now);
        }
    }
    
    setDelayMix(value) {
        const clamped = Math.max(0, Math.min(100, Number(value)));
        this.delayMix = clamped / 100;
        if (!this.audioContext || !this.delayNode || !this.delayFeedback || !this.delayWetGain) {
            this.pendingDelayMix = clamped;
            return;
        }
        this.pendingDelayMix = null;
        const now = this.audioContext.currentTime;
        const minDelay = 0.08;
        const maxDelay = 0.6;
        const targetDelay = minDelay + (maxDelay - minDelay) * this.delayMix;
        const feedback = 0.1 + this.delayMix * 0.6;
        const wetLevel = this.delayMix * 0.9;
        
        this.delayNode.delayTime.cancelScheduledValues(now);
        this.delayNode.delayTime.setValueAtTime(this.delayNode.delayTime.value, now);
        this.delayNode.delayTime.linearRampToValueAtTime(targetDelay, now + 0.12);
        
        this.delayFeedback.gain.cancelScheduledValues(now);
        this.delayFeedback.gain.setValueAtTime(this.delayFeedback.gain.value, now);
        this.delayFeedback.gain.linearRampToValueAtTime(feedback, now + 0.12);
        
        this.delayWetGain.gain.cancelScheduledValues(now);
        this.delayWetGain.gain.setValueAtTime(this.delayWetGain.gain.value, now);
        this.delayWetGain.gain.linearRampToValueAtTime(wetLevel, now + 0.12);
    }
    
    setChorusMix(value) {
        const clamped = Math.max(0, Math.min(100, Number(value)));
        this.chorusMix = clamped / 100;
        if (!this.audioContext || !this.chorusDepth || !this.chorusWetGain || !this.chorusLFO) {
            this.pendingChorusMix = clamped;
            return;
        }
        this.pendingChorusMix = null;
        const now = this.audioContext.currentTime;
        const depth = 0.001 + this.chorusMix * 0.004;
        const rate = 0.3 + this.chorusMix * 1.2;
        const wet = this.chorusMix * 0.8;
        
        this.chorusDepth.gain.cancelScheduledValues(now);
        this.chorusDepth.gain.setValueAtTime(this.chorusDepth.gain.value, now);
        this.chorusDepth.gain.linearRampToValueAtTime(depth, now + 0.12);
        
        this.chorusLFO.frequency.setValueAtTime(rate, now);
        
        this.chorusWetGain.gain.cancelScheduledValues(now);
        this.chorusWetGain.gain.setValueAtTime(this.chorusWetGain.gain.value, now);
        this.chorusWetGain.gain.linearRampToValueAtTime(wet, now + 0.12);
    }
    
    applyPreset(preset) {
        // Batch update to avoid multiple recalculations
        const presets = {
            'concert': { reverb: 40, pitch: 0, speed: 1.0, delay: 25, chorus: 12 },
            'studio': { reverb: 15, pitch: 0, speed: 1.0, delay: 10, chorus: 8 },
            'radio': { reverb: 5, pitch: 1, speed: 1.0, delay: 0, chorus: 0 },
            'nightcore': { reverb: 10, pitch: 4, speed: 1.25, delay: 8, chorus: 30 },
            'slowed': { reverb: 60, pitch: -2, speed: 0.75, delay: 45, chorus: 16 },
            'default': { reverb: 0, pitch: 0, speed: 1.0, delay: 0, chorus: 0 }
        };
        
        const config = presets[preset] || presets['default'];
        
        // Update all parameters at once
        this.setReverbMix(config.reverb);
        this.pitchShift = config.pitch;
        this.playbackRate = config.speed;
        this.setDelayMix(config.delay);
        this.setChorusMix(config.chorus);
        
        // Apply playback rate
        this.applyPlaybackRate();
        
        return { ...config };
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

        // Delay effect (echo)
        const delayInput = offlineContext.createGain();
        delayInput.gain.value = 1.0;
        const delayNode = offlineContext.createDelay(2.0);
        const delayFeedback = offlineContext.createGain();
        const delayWet = offlineContext.createGain();
        const baseDelay = 0.08;
        const maxDelay = 0.6;
        const delayTime = baseDelay + (maxDelay - baseDelay) * this.delayMix;
        const delayFeedbackValue = 0.1 + this.delayMix * 0.6;
        const delayWetLevel = this.delayMix * 0.9;
        delayNode.delayTime.value = delayTime;
        delayFeedback.gain.value = delayFeedbackValue;
        delayWet.gain.value = delayWetLevel;
        delayInput.connect(delayNode);
        delayNode.connect(delayFeedback);
        delayFeedback.connect(delayNode);
        delayNode.connect(delayWet);

        // Chorus effect
        const chorusInput = offlineContext.createGain();
        chorusInput.gain.value = 1.0;
        const chorusDelay = offlineContext.createDelay(0.05);
        const chorusWet = offlineContext.createGain();
        const chorusDepth = offlineContext.createGain();
        const chorusLFO = offlineContext.createOscillator();
        const chorusDepthValue = 0.001 + this.chorusMix * 0.004;
        const chorusRate = 0.3 + this.chorusMix * 1.2;
        const chorusWetLevel = this.chorusMix * 0.8;
        chorusDelay.delayTime.value = 0.015;
        chorusDepth.gain.value = chorusDepthValue;
        chorusWet.gain.value = chorusWetLevel;
        chorusLFO.type = 'sine';
        chorusLFO.frequency.value = chorusRate;
        chorusLFO.connect(chorusDepth);
        chorusDepth.connect(chorusDelay.delayTime);
        chorusInput.connect(chorusDelay);
        chorusDelay.connect(chorusWet);
        
        // Connect nodes
        source.connect(gain);
        gain.connect(dry);
        gain.connect(convolver);
        gain.connect(delayInput);
        gain.connect(chorusInput);
        convolver.connect(wet);
        dry.connect(offlineContext.destination);
        wet.connect(offlineContext.destination);
        delayWet.connect(offlineContext.destination);
        chorusWet.connect(offlineContext.destination);
        chorusLFO.start(0);
        
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