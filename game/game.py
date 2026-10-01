import pygame
import time
import math
from .harvester import PygameHarvester
from .harvest_scene import PygameHarvestScene
from .particles import ParticleSystem
from .sound import SoundManager

class Game:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.play_rect = pygame.Rect(330, 120, 930, 580)

        self.particles = ParticleSystem()
        self.sound = SoundManager()

        self.harvester = PygameHarvester(width, height, self.play_rect)
        self.harvest_scene = PygameHarvestScene(self.play_rect, self.sound, self.particles)

        self.paused = False
        self.last_update_time = time.time()
        self.race_finished = False

    @property
    def score(self):
        return self.harvest_scene.score

    @score.setter
    def score(self, val):
        self.harvest_scene.score = val

    @property
    def coins_collected(self):
        return self.harvest_scene.guarana_collected

    @coins_collected.setter
    def coins_collected(self, val):
        self.harvest_scene.guarana_collected = val

    @property
    def current_lap(self):
        return self.harvest_scene.guarana_collected

    @property
    def total_laps(self):
        return self.harvest_scene.target_guarana

    @property
    def current_lap_time(self):
        return self.harvest_scene.time_left

    def set_player(self, player_id):
        self.harvester.set_player(player_id)
        if self.sound:
            self.sound.play("click")

    def restart(self):
        self.harvest_scene.reset()
        self.harvester.x = self.play_rect.centerx
        self.harvester.vx = 0.0
        self.harvester.facing = 1
        self.paused = False
        self.race_finished = False
        self.last_update_time = time.time()

    def update(self, command, steer_val=0.0):
        if self.paused or self.harvest_scene.is_victory or self.harvest_scene.is_game_over:
            return

        now = time.time()
        dt = min(now - self.last_update_time, 0.1)
        self.last_update_time = now

        # Atualiza personagem e colheita
        self.harvester.update(dt, command, steer_val, self.harvest_scene.is_victory)
        self.harvest_scene.update(dt, self.harvester)
        self.particles.update()

        if self.harvest_scene.is_victory or self.harvest_scene.is_game_over:
            self.race_finished = True

    def draw(self, screen):
        # 1. Desenha a cena da colheita e frutos caindo
        self.harvest_scene.draw(screen)

        # 2. Desenha o personagem
        self.harvester.draw(screen)

        # 3. Desenha sistema de partículas
        self.particles.draw(screen)

        # 4. Telas de sobreposição
        if self.harvest_scene.is_victory or self.harvest_scene.is_game_over:
            self._draw_victory_overlay(screen)
        elif self.paused:
            self._draw_pause_overlay(screen)

    def _draw_victory_overlay(self, screen):
        overlay = pygame.Surface((self.play_rect.width, self.play_rect.height), pygame.SRCALPHA)
        overlay.fill((5, 15, 25, 215))
        screen.blit(overlay, self.play_rect.topleft)

        font_large = pygame.font.SysFont("segoeui", 38, bold=True)
        font_med = pygame.font.SysFont("segoeui", 22)
        font_small = pygame.font.SysFont("segoeui", 16)

        cx = self.play_rect.centerx
        cy = self.play_rect.centery

        cur_p = self.harvest_scene.get_current_phase()
        if self.harvest_scene.is_victory:
            if self.harvest_scene.has_next_phase():
                from .harvest_scene import HARVEST_PHASES
                next_p = HARVEST_PHASES[self.harvest_scene.current_phase_index + 1]
                title_txt = f"🏆 {cur_p['short_title'].upper()} CONCLUÍDA!"
                color_title = (255, 220, 60)
                restart_label = f"Pressione [ ESPAÇO / N ] para {next_p['short_title']} ou [ R ] para Repetir"
            else:
                title_txt = "🌟 LENDÁRIO MESTRE DA AMAZÔNIA! 🌟"
                color_title = (255, 220, 60)
                restart_label = "Pressione [ R ] para Jogar Novamente desde o Início"
        else:
            title_txt = "⏱️ TEMPO ESGOTADO!"
            color_title = (255, 100, 100)
            restart_label = f"Pressione [ R ] para Tentar Novamente a Fase {cur_p['id']}"

        txt_vic = font_large.render(title_txt, True, color_title)
        screen.blit(txt_vic, txt_vic.get_rect(center=(cx, cy - 80)))

        txt_score = font_med.render(f"Pontuação Final: {self.score} pts", True, (240, 245, 255))
        screen.blit(txt_score, txt_score.get_rect(center=(cx, cy - 25)))

        mins = int(self.harvest_scene.time_left // 60)
        secs = int(self.harvest_scene.time_left % 60)
        txt_best = font_med.render(f"Tempo Restante: {mins:02d}:{secs:02d}", True, (80, 230, 255))
        screen.blit(txt_best, txt_best.get_rect(center=(cx, cy + 15)))

        txt_coins = font_med.render(f"Guaranás Colhidos: 🍒 {self.harvest_scene.guarana_collected} / {self.harvest_scene.target_guarana}", True, (50, 240, 120))
        screen.blit(txt_coins, txt_coins.get_rect(center=(cx, cy + 55)))

        txt_restart = font_small.render(restart_label, True, (160, 220, 255))
        screen.blit(txt_restart, txt_restart.get_rect(center=(cx, cy + 115)))

    def _draw_pause_overlay(self, screen):
        overlay = pygame.Surface((self.play_rect.width, self.play_rect.height), pygame.SRCALPHA)
        overlay.fill((5, 10, 20, 180))
        screen.blit(overlay, self.play_rect.topleft)

        font_large = pygame.font.SysFont("segoeui", 36, bold=True)
        font_small = pygame.font.SysFont("segoeui", 18)

        cx = self.play_rect.centerx
        cy = self.play_rect.centery

        txt_p = font_large.render("⏸️ JOGO PAUSADO", True, (255, 255, 255))
        screen.blit(txt_p, txt_p.get_rect(center=(cx, cy - 20)))

        txt_sub = font_small.render("Pressione [ P ] para Continuar", True, (0, 210, 255))
        screen.blit(txt_sub, txt_sub.get_rect(center=(cx, cy + 25)))
