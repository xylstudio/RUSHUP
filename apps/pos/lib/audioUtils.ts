let audioCtx: AudioContext | null = null;
const audioBuffers: Record<string, AudioBuffer> = {};

export const initAudio = async () => {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Preload sounds
        const sounds = [
            { id: 'pay', path: '/assets/sounds/pay.mp3' },
            { id: 'notification', path: '/notification.wav' }
        ];

        for (const sound of sounds) {
            if (!audioBuffers[sound.id]) {
                const response = await fetch(sound.path);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                audioBuffers[sound.id] = audioBuffer;
            }
        }
    } catch (e: any) {
        console.error('Failed to init Web Audio API', e);
    }
};

export const playAppSound = async (soundId: 'pay' | 'notification') => {
    try {
        if (!audioCtx) {
            await initAudio();
        }
        
        // If context is suspended (due to autoplay policies), resume it
        if (audioCtx && audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const buffer = audioBuffers[soundId];
        if (buffer && audioCtx) {
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start(0);
        } else {
            // Fallback if not loaded
            const path = soundId === 'pay' ? '/assets/sounds/pay.mp3' : '/notification.wav';
            const audio = new Audio(path);
            audio.play().catch(() => {});
        }
    } catch (e: any) {
        console.error('Failed to play sound via Web Audio API', e);
    }
};
