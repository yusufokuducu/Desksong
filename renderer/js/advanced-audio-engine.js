// Advanced Audio Engine - Enhanced Web Audio API wrapper with professional features
class AdvancedAudioEngine {
    constructor() {
        this.audioContext = null;
        this.sourceNode = null;
        this.nextSourceNode = null; // For crossfade and gapless playback
        this.audioBuffer = null;
        this.nextAudioBuffer = null; // Preload next track
        this.startTime = 0;
        this.pauseTime = 0;
        this.isPlaying = false;
        this.currentTime = 0;
        
        // Advanced nodes
        this.masterGainNode = null;
        this.crossfadeGainA = null;
        this.crossfadeGainB = null;
        this.pannerNode = null;
        this.stereoPannerNode = null;
        
        // Parametric EQ nodes (10-band)
        this.eqFilters = [];
        this.eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        this.eqGains = new Array(10).fill(0); // dB values
        
        // Visualization nodes
        this.analyserNode = null;
        this.waveformAnalyser = null;
        this.splitter = null;
        this.merger = null;
        
        // Effect nodes
        this.convolverNode = null;
        this.bassFilter = null;
        this.compressor = null;
        this.limiter = null;
        this.distortionNode = null;
        this.delayNode = null;
        this.feedbackGain = null;
        this.chorusNode = null;
        this.flangerNode = null;
        this.phaserNode = null;
        
        // Advanced parameters
        this.spatialPosition = { x: 0, y: 0, z: 0 };
        this.crossfadeDuration = 3; // seconds
        this.isCrossfading = false;
        this.gaplessMode = true;
        this.normalizationGain = 1.0;
        
        // Performance monitoring
        this.cpuUsage = 0;
        this.memoryUsage = 0;
        this.bufferUnderruns = 0;
        this.performanceMonitor = null;
        
        // Audio worklet for custom DSP
        this.audioWorkletNode = null;
        
        // Initialize everything
        this.initializeAudioContext();
    }
    
    async initializeAudioContext() {
        try {
            // Create audio context with optimized settings
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'playback',
                sampleRate: 48000 // Higher quality
            });
            
            // Create master gain for output limiting
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.gain.value = 1.0;
            
            // Create crossfade gains for smooth transitions
            this.crossfadeGainA = this.audioContext.createGain();
            this.crossfadeGainB = this.audioContext.createGain();
            this.crossfadeGainA.gain.value = 1.0;
            this.crossfadeGainB.gain.value = 0.0;
            
            // Initialize spatial audio
            this.initializeSpatialAudio();
            
            // Initialize parametric EQ
            this.initializeParametricEQ();
            
            // Initialize advanced effects
            this.initializeAdvancedEffects();
            
            // Initialize visualization
            this.initializeVisualization();
            
            // Load custom audio worklet for advanced DSP
            await this.loadAudioWorklet();
            
            // Start performance monitoring
            this.startPerformanceMonitoring();
            
            // Setup the audio chain
            this.setupAudioChain();
            
        } catch (error) {
            console.error('Failed to initialize advanced audio context:', error);
            throw error;
        }
    }
    
    initializeSpatialAudio() {
        // Create 3D panner for spatial audio
        this.pannerNode = this.audioContext.createPanner();
        this.pannerNode.panningModel = 'HRTF'; // Head-Related Transfer Function
        this.pannerNode.distanceModel = 'inverse';
        this.pannerNode.refDistance = 1;
        this.pannerNode.maxDistance = 10000;
        this.pannerNode.rolloffFactor = 1;
        this.pannerNode.coneInnerAngle = 360;
        this.pannerNode.coneOuterAngle = 0;
        this.pannerNode.coneOuterGain = 0;
        
        // Set listener position (user's position)
        const listener = this.audioContext.listener;
        if (listener.positionX) {
            listener.positionX.value = 0;
            listener.positionY.value = 0;
            listener.positionZ.value = 0;
            listener.forwardX.value = 0;
            listener.forwardY.value = 0;
            listener.forwardZ.value = -1;
            listener.upX.value = 0;
            listener.upY.value = 1;
            listener.upZ.value = 0;
        }
        
        // Create stereo panner for simpler L/R panning
        this.stereoPannerNode = this.audioContext.createStereoPanner();
        this.stereoPannerNode.pan.value = 0;
    }
    
    initializeParametricEQ() {
        // Create 10-band parametric EQ
        this.eqFilters = this.eqFrequencies.map((freq, index) => {
            const filter = this.audioContext.createBiquadFilter();
            
            if (index === 0) {
                filter.type = 'lowshelf';
            } else if (index === this.eqFrequencies.length - 1) {
                filter.type = 'highshelf';
            } else {
                filter.type = 'peaking';
            }
            
            filter.frequency.value = freq;
            filter.Q.value = 1.0; // Bandwidth
            filter.gain.value = 0; // Initial flat response
            
            return filter;
        });
        
        // Connect EQ filters in series
        for (let i = 0; i < this.eqFilters.length - 1; i++) {
            this.eqFilters[i].connect(this.eqFilters[i + 1]);
        }
    }
    
    initializeAdvancedEffects() {
        // Dynamic range compressor with better settings
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        // Limiter (aggressive compressor to prevent clipping)
        this.limiter = this.audioContext.createDynamicsCompressor();
        this.limiter.threshold.value = -0.1;
        this.limiter.knee.value = 0;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.001;
        this.limiter.release.value = 0.01;
        
        // Enhanced bass filter
        this.bassFilter = this.audioContext.createBiquadFilter();
        this.bassFilter.type = 'lowshelf';
        this.bassFilter.frequency.value = 250;
        this.bassFilter.Q.value = 0.7;
        this.bassFilter.gain.value = 0;
        
        // Delay effect
        this.delayNode = this.audioContext.createDelay(5.0);
        this.delayNode.delayTime.value = 0.0;
        this.feedbackGain = this.audioContext.createGain();
        this.feedbackGain.gain.value = 0.0;
        
        // Create convolver for reverb
        this.convolverNode = this.audioContext.createConvolver();
        this.loadImpulseResponse();
        
        // Create dry/wet mix nodes
        this.dryGain = this.audioContext.createGain();
        this.wetGain = this.audioContext.createGain();
        this.dryGain.gain.value = 1.0;
        this.wetGain.gain.value = 0.0;
        
        // Distortion using WaveShaper
        this.distortionNode = this.audioContext.createWaveShaper();
        this.distortionNode.curve = this.makeDistortionCurve(0);
        this.distortionNode.oversample = '4x';
        
        // Initialize chorus effect
        this.initializeChorus();
        
        // Initialize flanger effect
        this.initializeFlanger();
        
        // Initialize phaser effect
        this.initializePhaser();
    }
    
    initializeChorus() {
        // Chorus using oscillator-controlled delay
        this.chorusNode = this.audioContext.createDelay(0.1);
        this.chorusNode.delayTime.value = 0.03;
        
        this.chorusLFO = this.audioContext.createOscillator();
        this.chorusLFO.frequency.value = 0.5; // Hz
        this.chorusLFO.type = 'sine';
        
        this.chorusDepth = this.audioContext.createGain();
        this.chorusDepth.gain.value = 0.002; // Depth in seconds
        
        this.chorusLFO.connect(this.chorusDepth);
        this.chorusDepth.connect(this.chorusNode.delayTime);
        this.chorusLFO.start();
        
        this.chorusMix = this.audioContext.createGain();
        this.chorusMix.gain.value = 0; // Start with no chorus
    }
    
    initializeFlanger() {
        // Flanger using shorter delay with feedback
        this.flangerNode = this.audioContext.createDelay(0.02);
        this.flangerNode.delayTime.value = 0.005;
        
        this.flangerLFO = this.audioContext.createOscillator();
        this.flangerLFO.frequency.value = 0.25;
        this.flangerLFO.type = 'triangle';
        
        this.flangerDepth = this.audioContext.createGain();
        this.flangerDepth.gain.value = 0.002;
        
        this.flangerLFO.connect(this.flangerDepth);
        this.flangerDepth.connect(this.flangerNode.delayTime);
        this.flangerLFO.start();
        
        this.flangerFeedback = this.audioContext.createGain();
        this.flangerFeedback.gain.value = 0.5;
        
        this.flangerMix = this.audioContext.createGain();
        this.flangerMix.gain.value = 0;
    }
    
    initializePhaser() {
        // Phaser using all-pass filters
        this.phaserFilters = [];
        const frequencies = [200, 400, 800, 1600];
        
        frequencies.forEach(freq => {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'allpass';
            filter.frequency.value = freq;
            filter.Q.value = 2;
            this.phaserFilters.push(filter);
        });
        
        // Connect phaser filters in series
        for (let i = 0; i < this.phaserFilters.length - 1; i++) {
            this.phaserFilters[i].connect(this.phaserFilters[i + 1]);
        }
        
        this.phaserLFO = this.audioContext.createOscillator();
        this.phaserLFO.frequency.value = 0.3;
        this.phaserLFO.type = 'sine';
        
        this.phaserDepth = this.audioContext.createGain();
        this.phaserDepth.gain.value = 500;
        
        this.phaserLFO.connect(this.phaserDepth);
        this.phaserFilters.forEach(filter => {
            this.phaserDepth.connect(filter.frequency);
        });
        this.phaserLFO.start();
        
        this.phaserMix = this.audioContext.createGain();
        this.phaserMix.gain.value = 0;
    }
    
    initializeVisualization() {
        // Main analyser for frequency visualization
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 2048;
        this.analyserNode.smoothingTimeConstant = 0.8;
        
        // Waveform analyser
        this.waveformAnalyser = this.audioContext.createAnalyser();
        this.waveformAnalyser.fftSize = 2048;
        
        // Channel splitter/merger for stereo visualization
        this.splitter = this.audioContext.createChannelSplitter(2);
        this.merger = this.audioContext.createChannelMerger(2);
        
        // Left/right channel analysers
        this.leftAnalyser = this.audioContext.createAnalyser();
        this.rightAnalyser = this.audioContext.createAnalyser();
        this.leftAnalyser.fftSize = 1024;
        this.rightAnalyser.fftSize = 1024;
    }
    
    async loadAudioWorklet() {
        try {
            // Create custom DSP processor
            const processorCode = `
                class CustomDSPProcessor extends AudioWorkletProcessor {
                    constructor() {
                        super();
                        this.sampleRate = sampleRate;
                    }
                    
                    process(inputs, outputs, parameters) {
                        const input = inputs[0];
                        const output = outputs[0];
                        
                        if (input.length > 0) {
                            for (let channel = 0; channel < output.length; channel++) {
                                const inputChannel = input[channel];
                                const outputChannel = output[channel];
                                
                                for (let i = 0; i < outputChannel.length; i++) {
                                    // Custom DSP processing here
                                    outputChannel[i] = inputChannel[i];
                                }
                            }
                        }
                        
                        return true;
                    }
                }
                
                registerProcessor('custom-dsp', CustomDSPProcessor);
            `;
            
            const blob = new Blob([processorCode], { type: 'application/javascript' });
            const workletUrl = URL.createObjectURL(blob);
            
            await this.audioContext.audioWorklet.addModule(workletUrl);
            this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'custom-dsp');
            
            URL.revokeObjectURL(workletUrl);
        } catch (error) {
            console.warn('Audio worklet not supported or failed to load:', error);
        }
    }
    
    async loadImpulseResponse() {
        // Create multiple high-quality impulse responses for different spaces
        const presets = {
            hall: { size: 4, decay: 3, brightness: 0.8 },
            room: { size: 1.5, decay: 1.5, brightness: 0.6 },
            chamber: { size: 2, decay: 2, brightness: 0.7 },
            cathedral: { size: 5, decay: 5, brightness: 0.9 },
            plate: { size: 2, decay: 2.5, brightness: 0.95 }
        };
        
        const createImpulse = (preset) => {
            const sampleRate = this.audioContext.sampleRate;
            const length = sampleRate * preset.size;
            const impulse = this.audioContext.createBuffer(2, length, sampleRate);
            
            for (let channel = 0; channel < 2; channel++) {
                const channelData = impulse.getChannelData(channel);
                
                for (let i = 0; i < length; i++) {
                    const t = i / sampleRate;
                    
                    // Early reflections
                    let early = 0;
                    if (t < 0.1) {
                        const numReflections = Math.floor(Math.random() * 5) + 3;
                        for (let r = 0; r < numReflections; r++) {
                            const reflectionTime = Math.random() * 0.1;
                            if (Math.abs(t - reflectionTime) < 0.001) {
                                early = (Math.random() * 2 - 1) * Math.exp(-t * 10);
                            }
                        }
                    }
                    
                    // Late reverb with decay
                    const late = (Math.random() * 2 - 1) * 
                                 Math.exp(-3 * t / preset.decay) * 
                                 preset.brightness;
                    
                    // Modulation for richness
                    const mod1 = Math.sin(2 * Math.PI * 0.7 * t) * 0.05;
                    const mod2 = Math.sin(2 * Math.PI * 1.3 * t) * 0.03;
                    
                    channelData[i] = (early + late) * (1 + mod1 + mod2);
                    
                    // Stereo spread
                    if (channel === 1) {
                        channelData[i] *= 0.95;
                        channelData[i] += (Math.random() - 0.5) * 0.02;
                    }
                }
            }
            
            return impulse;
        };
        
        this.impulseBuffer = createImpulse(presets.hall);
        this.convolverNode.buffer = this.impulseBuffer;
    }
    
    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            if (amount === 0) {
                curve[i] = x; // Linear (no distortion)
            } else {
                curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
            }
        }
        
        return curve;
    }
    
    setupAudioChain() {
        // Complex audio routing for maximum flexibility
        // This will be reconnected dynamically based on enabled effects
    }
    
    async loadAudioFile(arrayBuffer, analyzeAudio = true) {
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Decode audio data
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Analyze audio for normalization if enabled
            if (analyzeAudio) {
                this.normalizationGain = await this.analyzeAudioLoudness(audioBuffer);
            }
            
            // Store for playback
            this.audioBuffer = audioBuffer;
            this.pauseTime = 0;
            this.startTime = 0;
            
            // Extract additional metadata
            const metadata = {
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels,
                length: audioBuffer.length,
                normalizationGain: this.normalizationGain
            };
            
            // Generate waveform data for visualization
            metadata.waveform = this.generateWaveformData(audioBuffer);
            
            return metadata;
            
        } catch (error) {
            console.error('Failed to decode audio:', error);
            throw error;
        }
    }
    
    async analyzeAudioLoudness(audioBuffer) {
        // Analyze perceived loudness for normalization
        const channelData = audioBuffer.getChannelData(0);
        const blockSize = 2048;
        let sum = 0;
        let count = 0;
        
        for (let i = 0; i < channelData.length; i += blockSize) {
            let blockSum = 0;
            const blockEnd = Math.min(i + blockSize, channelData.length);
            
            for (let j = i; j < blockEnd; j++) {
                blockSum += channelData[j] * channelData[j];
            }
            
            const rms = Math.sqrt(blockSum / (blockEnd - i));
            sum += rms;
            count++;
        }
        
        const avgRMS = sum / count;
        const targetRMS = 0.2; // Target loudness
        const gain = targetRMS / (avgRMS + 0.001); // Avoid division by zero
        
        // Limit gain to reasonable range
        return Math.min(Math.max(gain, 0.1), 3.0);
    }
    
    generateWaveformData(audioBuffer, resolution = 1000) {
        const channelData = audioBuffer.getChannelData(0);
        const samples = Math.floor(channelData.length / resolution);
        const waveform = new Float32Array(resolution);
        
        for (let i = 0; i < resolution; i++) {
            let sum = 0;
            const start = i * samples;
            const end = Math.min(start + samples, channelData.length);
            
            for (let j = start; j < end; j++) {
                sum += Math.abs(channelData[j]);
            }
            
            waveform[i] = sum / (end - start);
        }
        
        return waveform;
    }
    
    async preloadNextTrack(arrayBuffer) {
        // Preload next track for gapless playback
        try {
            this.nextAudioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            return true;
        } catch (error) {
            console.error('Failed to preload next track:', error);
            return false;
        }
    }
    
    play() {
        if (!this.audioBuffer || this.isPlaying) return;
        
        // Create source node
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        
        // Apply playback parameters
        this.sourceNode.playbackRate.value = this.playbackRate || 1.0;
        if (this.pitchShift) {
            this.sourceNode.detune.value = this.pitchShift * 100;
        }
        
        // Build complex audio chain
        this.connectAudioChain(this.sourceNode);
        
        // Handle playback end
        this.sourceNode.onended = () => {
            if (this.isPlaying) {
                this.handleTrackEnd();
            }
        };
        
        // Start playback
        const offset = this.pauseTime;
        this.sourceNode.start(0, offset);
        this.startTime = this.audioContext.currentTime - (offset / (this.playbackRate || 1.0));
        this.isPlaying = true;
        
        // Prepare next track if available
        if (this.nextAudioBuffer && this.gaplessMode) {
            this.prepareGaplessTransition();
        }
    }
    
    connectAudioChain(source) {
        // Build dynamic audio processing chain
        let currentNode = source;
        
        // Apply normalization gain
        const normGain = this.audioContext.createGain();
        normGain.gain.value = this.normalizationGain;
        currentNode.connect(normGain);
        currentNode = normGain;
        
        // Connect through EQ if any band is active
        if (this.eqGains.some(gain => gain !== 0)) {
            currentNode.connect(this.eqFilters[0]);
            currentNode = this.eqFilters[this.eqFilters.length - 1];
        }
        
        // Bass boost
        currentNode.connect(this.bassFilter);
        currentNode = this.bassFilter;
        
        // Distortion if enabled
        if (this.distortionAmount > 0) {
            currentNode.connect(this.distortionNode);
            currentNode = this.distortionNode;
        }
        
        // Compressor
        currentNode.connect(this.compressor);
        currentNode = this.compressor;
        
        // Effects routing (parallel processing)
        const effectsSend = this.audioContext.createGain();
        currentNode.connect(effectsSend);
        
        // Delay
        if (this.delayTime > 0) {
            effectsSend.connect(this.delayNode);
            this.delayNode.connect(this.feedbackGain);
            this.feedbackGain.connect(this.delayNode);
            this.delayNode.connect(this.wetGain);
        }
        
        // Reverb
        effectsSend.connect(this.convolverNode);
        this.convolverNode.connect(this.wetGain);
        
        // Chorus
        if (this.chorusMix.gain.value > 0) {
            effectsSend.connect(this.chorusNode);
            this.chorusNode.connect(this.chorusMix);
            this.chorusMix.connect(this.wetGain);
        }
        
        // Dry signal
        currentNode.connect(this.dryGain);
        
        // Mix dry and wet
        this.dryGain.connect(this.stereoPannerNode);
        this.wetGain.connect(this.stereoPannerNode);
        
        // Spatial audio if enabled
        if (this.spatialAudioEnabled) {
            this.stereoPannerNode.connect(this.pannerNode);
            this.pannerNode.connect(this.crossfadeGainA);
        } else {
            this.stereoPannerNode.connect(this.crossfadeGainA);
        }
        
        // Connect to visualization
        this.crossfadeGainA.connect(this.analyserNode);
        this.crossfadeGainA.connect(this.waveformAnalyser);
        this.crossfadeGainA.connect(this.splitter);
        
        this.splitter.connect(this.leftAnalyser, 0);
        this.splitter.connect(this.rightAnalyser, 1);
        
        // Final output through limiter
        this.crossfadeGainA.connect(this.limiter);
        this.limiter.connect(this.masterGainNode);
        this.masterGainNode.connect(this.audioContext.destination);
    }
    
    prepareGaplessTransition() {
        // Prepare next source node for gapless playback
        const remainingTime = this.getDuration() - this.getCurrentTime();
        
        setTimeout(() => {
            if (this.nextAudioBuffer && this.isPlaying) {
                this.nextSourceNode = this.audioContext.createBufferSource();
                this.nextSourceNode.buffer = this.nextAudioBuffer;
                
                // Connect to crossfade gain B
                // Build similar chain but output to crossfadeGainB
                this.connectAudioChain(this.nextSourceNode);
                
                // Start next track at exact end of current
                const startTime = this.audioContext.currentTime + 
                                 (remainingTime / (this.playbackRate || 1.0));
                this.nextSourceNode.start(startTime);
                
                // Crossfade between tracks
                this.startCrossfade(startTime - this.crossfadeDuration);
            }
        }, (remainingTime - this.crossfadeDuration) * 1000);
    }
    
    startCrossfade(startTime) {
        if (this.isCrossfading) return;
        
        this.isCrossfading = true;
        const duration = this.crossfadeDuration;
        
        // Fade out current track
        this.crossfadeGainA.gain.setValueAtTime(1, startTime);
        this.crossfadeGainA.gain.linearRampToValueAtTime(0, startTime + duration);
        
        // Fade in next track
        this.crossfadeGainB.gain.setValueAtTime(0, startTime);
        this.crossfadeGainB.gain.linearRampToValueAtTime(1, startTime + duration);
        
        setTimeout(() => {
            this.isCrossfading = false;
            // Swap buffers and gains
            this.audioBuffer = this.nextAudioBuffer;
            this.sourceNode = this.nextSourceNode;
            this.nextAudioBuffer = null;
            this.nextSourceNode = null;
            
            // Reset gains
            this.crossfadeGainA.gain.value = 1;
            this.crossfadeGainB.gain.value = 0;
        }, duration * 1000);
    }
    
    handleTrackEnd() {
        this.stop();
        if (this.onEnded) {
            this.onEnded();
        }
    }
    
    pause() {
        if (!this.isPlaying || !this.sourceNode) return;
        
        const elapsed = this.audioContext.currentTime - this.startTime;
        this.pauseTime = this.pauseTime + (elapsed * (this.playbackRate || 1.0));
        
        try {
            this.sourceNode.stop();
            this.sourceNode.disconnect();
            if (this.nextSourceNode) {
                this.nextSourceNode.stop();
                this.nextSourceNode.disconnect();
            }
        } catch (e) {
            // Already stopped
        }
        
        this.sourceNode = null;
        this.nextSourceNode = null;
        this.isPlaying = false;
    }
    
    stop() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
                this.sourceNode.disconnect();
            } catch (e) {
                // Already stopped
            }
            this.sourceNode = null;
        }
        
        if (this.nextSourceNode) {
            try {
                this.nextSourceNode.stop();
                this.nextSourceNode.disconnect();
            } catch (e) {
                // Already stopped
            }
            this.nextSourceNode = null;
        }
        
        this.isPlaying = false;
        this.isCrossfading = false;
        this.pauseTime = 0;
        this.startTime = 0;
    }
    
    seek(time) {
        if (!this.audioBuffer) return;
        
        const wasPlaying = this.isPlaying;
        const targetTime = Math.max(0, Math.min(time, this.audioBuffer.duration));
        
        if (this.isPlaying) {
            this.pause();
        }
        
        this.pauseTime = targetTime;
        
        if (wasPlaying) {
            setTimeout(() => this.play(), 10);
        }
    }
    
    getCurrentTime() {
        if (!this.audioBuffer) return 0;
        
        if (this.isPlaying && this.sourceNode) {
            const elapsed = this.audioContext.currentTime - this.startTime;
            const currentTime = this.pauseTime + (elapsed * (this.playbackRate || 1.0));
            return Math.min(currentTime, this.audioBuffer.duration);
        }
        
        return this.pauseTime;
    }
    
    getDuration() {
        return this.audioBuffer ? this.audioBuffer.duration : 0;
    }
    
    // Setters for all effects
    setVolume(value) {
        if (this.masterGainNode) {
            const now = this.audioContext.currentTime;
            this.masterGainNode.gain.cancelScheduledValues(now);
            this.masterGainNode.gain.setValueAtTime(this.masterGainNode.gain.value, now);
            this.masterGainNode.gain.linearRampToValueAtTime(value / 100, now + 0.05);
        }
    }
    
    setEQBand(index, gain) {
        if (index >= 0 && index < this.eqFilters.length) {
            this.eqGains[index] = gain;
            const now = this.audioContext.currentTime;
            this.eqFilters[index].gain.cancelScheduledValues(now);
            this.eqFilters[index].gain.setValueAtTime(
                this.eqFilters[index].gain.value, 
                now
            );
            this.eqFilters[index].gain.linearRampToValueAtTime(gain, now + 0.1);
        }
    }
    
    setEQPreset(preset) {
        const presets = {
            flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            bass: [6, 5, 4, 2, 0, -1, -2, -2, -2, -2],
            treble: [-2, -2, -1, 0, 1, 2, 3, 4, 5, 6],
            vocal: [-2, -1, 0, 2, 4, 4, 3, 2, 1, 0],
            classical: [0, 0, 0, 0, 0, 0, -2, -2, -2, -3],
            rock: [5, 4, 3, 1, -1, 0, 1, 3, 4, 5],
            electronic: [6, 5, 2, 0, -2, 2, 0, 1, 4, 5],
            jazz: [3, 2, 1, 2, -2, -2, 0, 1, 2, 3]
        };
        
        const gains = presets[preset] || presets.flat;
        gains.forEach((gain, index) => this.setEQBand(index, gain));
    }
    
    setSpatialPosition(x, y, z) {
        this.spatialPosition = { x, y, z };
        
        if (this.pannerNode) {
            const now = this.audioContext.currentTime;
            
            if (this.pannerNode.positionX) {
                this.pannerNode.positionX.setValueAtTime(x, now);
                this.pannerNode.positionY.setValueAtTime(y, now);
                this.pannerNode.positionZ.setValueAtTime(z, now);
            } else {
                // Fallback for older browsers
                this.pannerNode.setPosition(x, y, z);
            }
        }
    }
    
    setStereoPan(value) {
        // value: -1 (full left) to 1 (full right)
        if (this.stereoPannerNode) {
            const now = this.audioContext.currentTime;
            this.stereoPannerNode.pan.cancelScheduledValues(now);
            this.stereoPannerNode.pan.setValueAtTime(
                this.stereoPannerNode.pan.value,
                now
            );
            this.stereoPannerNode.pan.linearRampToValueAtTime(value, now + 0.05);
        }
    }
    
    setDistortion(amount) {
        // amount: 0-100
        this.distortionAmount = amount / 100;
        this.distortionNode.curve = this.makeDistortionCurve(this.distortionAmount * 50);
    }
    
    setDelay(time, feedback, mix) {
        // time: 0-5 seconds, feedback: 0-0.95, mix: 0-1
        this.delayTime = time;
        this.delayNode.delayTime.value = time;
        this.feedbackGain.gain.value = feedback;
        
        const now = this.audioContext.currentTime;
        const wetAmount = mix;
        const dryAmount = 1 - mix * 0.5; // Keep some dry signal
        
        this.dryGain.gain.cancelScheduledValues(now);
        this.dryGain.gain.setValueAtTime(this.dryGain.gain.value, now);
        this.dryGain.gain.linearRampToValueAtTime(dryAmount, now + 0.1);
        
        this.wetGain.gain.cancelScheduledValues(now);
        this.wetGain.gain.setValueAtTime(this.wetGain.gain.value, now);
        this.wetGain.gain.linearRampToValueAtTime(wetAmount, now + 0.1);
    }
    
    setChorus(rate, depth, mix) {
        this.chorusLFO.frequency.value = rate;
        this.chorusDepth.gain.value = depth * 0.01; // Convert to seconds
        this.chorusMix.gain.value = mix;
    }
    
    setFlanger(rate, depth, feedback, mix) {
        this.flangerLFO.frequency.value = rate;
        this.flangerDepth.gain.value = depth * 0.001;
        this.flangerFeedback.gain.value = feedback;
        this.flangerMix.gain.value = mix;
    }
    
    setPhaser(rate, depth, mix) {
        this.phaserLFO.frequency.value = rate;
        this.phaserDepth.gain.value = depth * 10;
        this.phaserMix.gain.value = mix;
    }
    
    // Visualization methods
    getFrequencyData() {
        if (!this.analyserNode) return new Uint8Array(0);
        
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyserNode.getByteFrequencyData(dataArray);
        
        return dataArray;
    }
    
    getWaveformData() {
        if (!this.waveformAnalyser) return new Uint8Array(0);
        
        const bufferLength = this.waveformAnalyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        this.waveformAnalyser.getByteTimeDomainData(dataArray);
        
        return dataArray;
    }
    
    getStereoFrequencyData() {
        const left = new Uint8Array(this.leftAnalyser.frequencyBinCount);
        const right = new Uint8Array(this.rightAnalyser.frequencyBinCount);
        
        this.leftAnalyser.getByteFrequencyData(left);
        this.rightAnalyser.getByteFrequencyData(right);
        
        return { left, right };
    }
    
    // Performance monitoring
    startPerformanceMonitoring() {
        this.performanceMonitor = setInterval(() => {
            // Monitor CPU usage (simplified)
            if (performance.memory) {
                this.memoryUsage = performance.memory.usedJSHeapSize / 
                                  performance.memory.jsHeapSizeLimit * 100;
            }
            
            // Check for buffer underruns
            if (this.audioContext.baseLatency !== undefined) {
                const latency = this.audioContext.outputLatency || 0;
                if (latency > 0.1) {
                    this.bufferUnderruns++;
                }
            }
        }, 1000);
    }
    
    getPerformanceMetrics() {
        return {
            cpuUsage: this.cpuUsage,
            memoryUsage: this.memoryUsage,
            bufferUnderruns: this.bufferUnderruns,
            latency: this.audioContext.outputLatency || this.audioContext.baseLatency || 0,
            sampleRate: this.audioContext.sampleRate
        };
    }
    
    // Cleanup
    destroy() {
        if (this.performanceMonitor) {
            clearInterval(this.performanceMonitor);
        }
        
        this.stop();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedAudioEngine;
}