import { Howl, Howler } from 'howler';
import AssetManager from '$lib/AssetManager';
import {settings} from '$src/game/logica/data'

export default class AudioManager {
    static audioPlayAllowed = false;
    static lastPlayedTimes: Record<string, number> = {}; // Tracks last played times for sounds

    static playMusic(assetMusicName: string, volume: number = 1) {
        const music = AssetManager.get(assetMusicName);
        settings.music_level.on('change', ({value}) => {
            if (!music.playing()) return
            music.volume(volume * (value / 100))
        })

        if (!music.playing()) {
            music.play();
            music.loop(true);
            if (volume) music.volume(volume * (settings.music_level.amount / 100));
        }
    }

    static stopMusic(assetMusicName: string) {
        const music = AssetManager.get(assetMusicName);
        if (music.playing()) {
            music.stop();
        }
    }

    static playSound(assetSoundName: string, volume: number = 1.0, rate: number | number[] = 1.0) {
        volume = volume * (settings.sound_level.amount / 100)
        const currentTime = Date.now();

        // Check if the sound was played recently
        if (this.lastPlayedTimes[assetSoundName]) {
            const elapsedTime = currentTime - this.lastPlayedTimes[assetSoundName];
            if (elapsedTime < 150) {
                return; // Skip playing the sound
            }
        }

        if (!this.audioPlayAllowed) {
            if (Howler.ctx.state === 'running') {
                this.audioPlayAllowed = true;
            }
        }

        if (this.audioPlayAllowed) {
            const sound = AssetManager.get(assetSoundName);
            const soundId = sound.play();

            sound.volume(volume, soundId);

            if (Array.isArray(rate)) {
                const randomRate = rate[Math.floor(Math.random() * rate.length)];
                sound.rate(randomRate, soundId);
            } else {
                sound.rate(rate, soundId);
            }

            // Record the time the sound was played
            this.lastPlayedTimes[assetSoundName] = currentTime;
        }
    }
}
