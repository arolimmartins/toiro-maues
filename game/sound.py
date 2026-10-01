import pygame
import numpy as np
import math

class SoundManager:
    """Sintetizador de efeitos sonoros arcade usando numpy e pygame.mixer."""
    def __init__(self):
        self.enabled = True
        self.sample_rate = 22050
        self.sounds = {}
        self.engine_channel = None
        self.engine_sound = None
        
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=self.sample_rate, size=-16, channels=2, buffer=512)
            self._generate_sounds()
        except Exception as e:
            print("Aviso: Falha ao inicializar o áudio:", e)
            self.enabled = False

    def _generate_sine(self, freq, duration, decay=True):
        num_samples = int(self.sample_rate * duration)
        t = np.linspace(0, duration, num_samples, endpoint=False)
        wave = np.sin(2 * np.pi * freq * t)
        if decay:
            envelope = np.exp(-4 * t / duration)
            wave = wave * envelope
        stereo = np.column_stack((wave, wave))
        stereo_int16 = (stereo * 12000).astype(np.int16)
        return pygame.sndarray.make_sound(stereo_int16)

    def _generate_coin(self):
        # Arpeggio duplo brilhante tipo arcade
        duration = 0.22
        t = np.linspace(0, duration, int(self.sample_rate * duration), endpoint=False)
        freq = np.where(t < 0.10, 987.77, 1318.51) # B5 para E6
        wave = np.sin(2 * np.pi * freq * t)
        envelope = np.exp(-3.5 * t / duration)
        stereo = np.column_stack((wave * envelope, wave * envelope))
        return pygame.sndarray.make_sound((stereo * 16000).astype(np.int16))

    def _generate_boost(self):
        # Varredura ascendente sci-fi / turbo
        duration = 0.4
        t = np.linspace(0, duration, int(self.sample_rate * duration), endpoint=False)
        freq = 300 + 1200 * (t / duration) ** 2
        wave = np.sin(2 * np.pi * freq * t) * (1.0 - t / duration)
        stereo = np.column_stack((wave, wave))
        return pygame.sndarray.make_sound((stereo * 18000).astype(np.int16))

    def _generate_crash(self):
        # Ruído com decaimento exponencial
        duration = 0.28
        num_samples = int(self.sample_rate * duration)
        noise = np.random.uniform(-1.0, 1.0, num_samples)
        t = np.linspace(0, duration, num_samples, endpoint=False)
        envelope = np.exp(-12.0 * t / duration)
        wave = noise * envelope
        stereo = np.column_stack((wave, wave))
        return pygame.sndarray.make_sound((stereo * 22000).astype(np.int16))

    def _generate_screech(self):
        duration = 0.15
        num_samples = int(self.sample_rate * duration)
        t = np.linspace(0, duration, num_samples, endpoint=False)
        # Mistura de tom agudo com ruído
        wave = 0.6 * np.sin(2 * np.pi * 1850 * t) + 0.4 * np.random.uniform(-1.0, 1.0, num_samples)
        envelope = np.exp(-5.0 * t / duration)
        stereo = np.column_stack((wave * envelope, wave * envelope))
        return pygame.sndarray.make_sound((stereo * 12000).astype(np.int16))

    def _generate_sounds(self):
        self.sounds["coin"] = self._generate_coin()
        self.sounds["boost"] = self._generate_boost()
        self.sounds["turbo"] = self.sounds["boost"]
        self.sounds["click"] = self._generate_sine(600, 0.08, decay=True)
        self.sounds["crash"] = self._generate_crash()
        self.sounds["screech"] = self._generate_screech()
        self.sounds["lap"] = self._generate_sine(880, 0.35, decay=True)

    def play(self, name):
        if not self.enabled: return
        sound = self.sounds.get(name)
        if sound:
            sound.play()

    def toggle_mute(self):
        self.enabled = not self.enabled
        return self.enabled
