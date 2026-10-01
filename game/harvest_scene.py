import pygame
import random
import math
import os

HARVEST_PHASES = [
    {
        'id': 1,
        'name': "FASE 1: FLORESTA AMAZÔNICA",
        'short_title': "Fase 1 — Floresta Amazônica",
        'motto': "O coração da nossa terra! 🍃",
        'bg': os.path.join("assets", "backgrounds", "cenario_1.png"),
        'target_guarana': 20,
        'total_time': 60.0,
        'min_speed': 130,
        'max_speed': 210,
        'spawn_delay_min': 0.70,
        'spawn_delay_max': 0.95
    },
    {
        'id': 2,
        'name': "FASE 2: VILA RIBEIRINHA",
        'short_title': "Fase 2 — Vila Ribeirinha",
        'motto': "Tradição que alimenta! 🍃",
        'bg': os.path.join("assets", "backgrounds", "cenario_2.png"),
        'target_guarana': 25,
        'total_time': 60.0,
        'min_speed': 150,
        'max_speed': 230,
        'spawn_delay_min': 0.65,
        'spawn_delay_max': 0.90
    },
    {
        'id': 3,
        'name': "FASE 3: CACHOEIRA DO GUAPORÉ",
        'short_title': "Fase 3 — Cachoeira do Guaporé",
        'motto': "Energia que vem da natureza! 🍃",
        'bg': os.path.join("assets", "backgrounds", "cenario_3.png"),
        'target_guarana': 30,
        'total_time': 60.0,
        'min_speed': 170,
        'max_speed': 260,
        'spawn_delay_min': 0.60,
        'spawn_delay_max': 0.85
    },
    {
        'id': 4,
        'name': "FASE 4: PLANTIO SUSTENTÁVEL",
        'short_title': "Fase 4 — Plantio Sustentável",
        'motto': "Hoje planta, amanhã colhe! 🍃",
        'bg': os.path.join("assets", "backgrounds", "cenario_4.png"),
        'target_guarana': 35,
        'total_time': 60.0,
        'min_speed': 190,
        'max_speed': 290,
        'spawn_delay_min': 0.55,
        'spawn_delay_max': 0.80
    },
    {
        'id': 5,
        'name': "FASE 5: ALDEIA SAGRADA SATERÉ-MAWÉ",
        'short_title': "Fase 5 — Aldeia Sateré-Mawé",
        'motto': "Berço e sabedoria ancestral do guaraná! 🍃",
        'bg': os.path.join("assets", "backgrounds", "cenario_5.png"),
        'target_guarana': 40,
        'total_time': 60.0,
        'min_speed': 210,
        'max_speed': 310,
        'spawn_delay_min': 0.50,
        'spawn_delay_max': 0.75
    },
    {
        'id': 6,
        'name': "FASE 6: FESTIVAL DO SOL AMAZÔNICO",
        'short_title': "Fase 6 — Festival do Sol",
        'motto': "Brilho e força da Amazônia! ☀️",
        'bg': os.path.join("assets", "backgrounds", "cenario_6.png"),
        'target_guarana': 45,
        'total_time': 60.0,
        'min_speed': 230,
        'max_speed': 330,
        'spawn_delay_min': 0.45,
        'spawn_delay_max': 0.70
    },
    {
        'id': 7,
        'name': "FASE 7: ENCONTRO DAS ÁGUAS",
        'short_title': "Fase 7 — Encontro das Águas",
        'motto': "União que gera vida e prosperidade! 💧",
        'bg': os.path.join("assets", "backgrounds", "cenario_7.png"),
        'target_guarana': 50,
        'total_time': 60.0,
        'min_speed': 250,
        'max_speed': 350,
        'spawn_delay_min': 0.40,
        'spawn_delay_max': 0.65
    },
    {
        'id': 8,
        'name': "FASE 8: CORAÇÃO DA SELVA ANCESTRAL",
        'short_title': "Fase 8 — Selva Ancestral",
        'motto': "A força indomável da floresta! 🌿",
        'bg': os.path.join("assets", "backgrounds", "cenario_8.png"),
        'target_guarana': 55,
        'total_time': 60.0,
        'min_speed': 270,
        'max_speed': 370,
        'spawn_delay_min': 0.35,
        'spawn_delay_max': 0.60
    },
    {
        'id': 9,
        'name': "FASE 9: GRANDE FESTIVAL DO GUARANÁ CETAM",
        'short_title': "Fase 9 — Festival CETAM",
        'motto': "Nossa Terra, Nossa Energia, Nosso Futuro! 🏆",
        'bg': os.path.join("assets", "backgrounds", "cenario_9.png"),
        'target_guarana': 60,
        'total_time': 60.0,
        'min_speed': 290,
        'max_speed': 400,
        'spawn_delay_min': 0.30,
        'spawn_delay_max': 0.55
    }
]

class PygameHarvestScene:
    def __init__(self, play_rect, sound_manager, particle_system):
        self.play_rect = play_rect
        self.sound = sound_manager
        self.particles = particle_system

        # Pré-carrega cenários das 9 fases
        self.phase_bgs = []
        for phase in HARVEST_PHASES:
            if os.path.exists(phase['bg']):
                loaded = pygame.image.load(phase['bg']).convert()
                scaled = pygame.transform.smoothscale(loaded, (play_rect.width, play_rect.height))
                self.phase_bgs.append(scaled)
            else:
                self.phase_bgs.append(None)

        # Carrega ícones dos itens
        self.item_icons = {}
        icon_names = {
            'guarana': 'guarana.png',
            'moeda': 'moeda.png',
            'folha': 'folha.png',
            'estrela': 'estrela_cheia.png'
        }
        for itype, fname in icon_names.items():
            path = os.path.join("assets", "ui", "icons", fname)
            if os.path.exists(path):
                img = pygame.image.load(path).convert_alpha()
                self.item_icons[itype] = pygame.transform.smoothscale(img, (46, 46))
            else:
                self.item_icons[itype] = None

        self.current_phase_index = 0
        self.score = 0
        self.coins_collected = 0
        self.time_bonus = 0

        self.target_guarana = 15
        self.total_time = 50.0
        self.time_left = self.total_time
        self.guarana_collected = 0
        self.combo = 0
        self.combo_timer = 0.0

        self.falling_items = []
        self.spawn_timer = 0.0
        self.next_spawn_delay = 0.7

        self.floating_texts = []
        self.font_countdown_big = pygame.font.SysFont("segoeui", 72, bold=True)
        self.font_countdown_sub = pygame.font.SysFont("segoeui", 20, bold=True)
        self.font_score = pygame.font.SysFont("segoeui", 20, bold=True)
        self.font_hud = pygame.font.SysFont("segoeui", 18, bold=True)

        self.is_victory = False
        self.is_game_over = False

        self.countdown = 3.6
        self.countdown_step_beep = 4

        self.load_phase(0, keep_score=False)

    def get_current_phase(self):
        return HARVEST_PHASES[self.current_phase_index]

    def has_next_phase(self):
        return self.current_phase_index < len(HARVEST_PHASES) - 1

    def load_phase(self, phase_index, keep_score=False):
        self.current_phase_index = max(0, min(phase_index, len(HARVEST_PHASES) - 1))
        phase = self.get_current_phase()

        self.target_guarana = phase['target_guarana']
        self.total_time = phase['total_time']
        self.time_left = self.total_time
        self.guarana_collected = 0
        self.time_bonus = 0

        if not keep_score:
            self.score = 0
            self.coins_collected = 0

        self.combo = 0
        self.combo_timer = 0.0
        self.falling_items.clear()
        self.floating_texts.clear()
        self.is_victory = False
        self.is_game_over = False

        self.countdown = 3.6
        self.countdown_step_beep = 4

    def advance_phase(self):
        if self.has_next_phase():
            self.load_phase(self.current_phase_index + 1, keep_score=True)
            return True
        return False

    def reset(self):
        self.load_phase(self.current_phase_index, keep_score=True)

    def spawn_item(self):
        phase = self.get_current_phase()
        rel_x = random.randint(60, self.play_rect.width - 60)
        x = self.play_rect.left + rel_x
        y = self.play_rect.top + random.randint(80, 140)

        rand = random.random()
        base_speed = random.uniform(phase['min_speed'], phase['max_speed'])
        if rand < 0.65:
            itype = 'guarana'
            speed = base_speed
            radius = 24
        elif rand < 0.82:
            itype = 'moeda'
            speed = base_speed * 1.15
            radius = 20
        elif rand < 0.94:
            itype = 'folha'
            speed = base_speed * 0.85
            radius = 18
        else:
            itype = 'estrela'
            speed = base_speed * 1.25
            radius = 24

        self.falling_items.append({
            'type': itype,
            'x': float(x),
            'y': float(y),
            'base_x': float(x),
            'sway_offset': random.uniform(0, math.pi * 2),
            'sway_speed': random.uniform(2.0, 4.0),
            'sway_amount': random.uniform(12, 24),
            'speed': speed,
            'radius': radius,
            'time': 0.0
        })

    def add_floating_text(self, text, x, y, color):
        self.floating_texts.append({
            'text': text,
            'x': x,
            'y': y,
            'color': color,
            'life': 0.8,
            'max_life': 0.8
        })

    def update(self, dt, harvester):
        if self.is_victory or self.is_game_over:
            return

        if self.countdown > -0.6:
            self.countdown -= dt
            if self.countdown <= 3.0 and self.countdown_step_beep == 4:
                if self.sound: self.sound.play("coin")
                self.countdown_step_beep = 3
            elif self.countdown <= 2.0 and self.countdown_step_beep == 3:
                if self.sound: self.sound.play("coin")
                self.countdown_step_beep = 2
            elif self.countdown <= 1.0 and self.countdown_step_beep == 2:
                if self.sound: self.sound.play("coin")
                self.countdown_step_beep = 1
            elif self.countdown <= 0.0 and self.countdown_step_beep == 1:
                if self.sound: self.sound.play("turbo")
                self.countdown_step_beep = 0

            if self.countdown > 0:
                return

        self.time_left -= dt
        if self.time_left <= 0:
            self.time_left = 0.0
            self.is_game_over = True
            if self.sound: self.sound.play("crash")

        if self.combo_timer > 0:
            self.combo_timer -= dt
            if self.combo_timer <= 0:
                self.combo = 0

        phase = self.get_current_phase()
        self.spawn_timer += dt
        if self.spawn_timer >= self.next_spawn_delay:
            self.spawn_timer = 0.0
            self.next_spawn_delay = random.uniform(phase['spawn_delay_min'], phase['spawn_delay_max'])
            self.spawn_item()

        bx, by, b_radius = harvester.get_basket_center()
        ground_y = harvester.ground_y

        items_to_remove = []
        for item in self.falling_items:
            item['time'] += dt
            item['y'] += item['speed'] * dt
            item['x'] = item['base_x'] + math.sin(item['time'] * item['sway_speed'] + item['sway_offset']) * item['sway_amount']

            dx = item['x'] - bx
            dy = item['y'] - by
            dist = math.hypot(dx, dy)

            if dist < (item['radius'] + b_radius):
                self.handle_pickup(item, harvester)
                items_to_remove.append(item)
                continue

            if item['y'] >= ground_y:
                if item['type'] == 'guarana':
                    self.particles.emit_sparks(item['x'], ground_y, count=4)
                items_to_remove.append(item)

        for it in items_to_remove:
            if it in self.falling_items:
                self.falling_items.remove(it)

        ft_to_remove = []
        for ft in self.floating_texts:
            ft['y'] -= dt * 40
            ft['life'] -= dt
            if ft['life'] <= 0:
                ft_to_remove.append(ft)

        for ft in ft_to_remove:
            if ft in self.floating_texts:
                self.floating_texts.remove(ft)

        if self.guarana_collected >= self.target_guarana and not self.is_victory:
            self.is_victory = True
            self.time_bonus = max(0, int(self.time_left) * 50)
            self.score += self.time_bonus
            self.add_floating_text(f"+{self.time_bonus} BÔNUS TEMPO!", self.play_rect.centerx, self.play_rect.centery - 40, (0, 240, 144))
            if self.sound:
                self.sound.play("lap")

    def handle_pickup(self, item, harvester):
        harvester.trigger_collect()

        if item['type'] == 'guarana':
            self.guarana_collected += 1
            self.combo += 1
            self.combo_timer = 2.5
            points = 100 + min(self.combo * 20, 200)
            self.score += points
            self.add_floating_text(f"+{points} Guaraná!", item['x'], item['y'] - 10, (50, 230, 120))
            self.particles.emit_coin_pickup(item['x'], item['y'])
            if self.sound: self.sound.play("coin")

        elif item['type'] == 'moeda':
            self.coins_collected += 1
            points = 250
            self.score += points
            self.add_floating_text(f"+{points} Moeda!", item['x'], item['y'] - 10, (255, 215, 0))
            self.particles.emit_coin_pickup(item['x'], item['y'])
            if self.sound: self.sound.play("coin")

        elif item['type'] == 'estrela':
            points = 500
            self.score += points
            self.add_floating_text(f"+{points} SUPER!", item['x'], item['y'] - 10, (255, 160, 0))
            self.particles.emit_sparks(item['x'], item['y'], count=8)
            if self.sound: self.sound.play("turbo")

        elif item['type'] == 'folha':
            penalty = 50
            self.score = max(0, self.score - penalty)
            self.combo = 0
            self.add_floating_text(f"-{penalty} Cuidado!", item['x'], item['y'] - 10, (255, 60, 60))
            self.particles.emit_sparks(item['x'], item['y'], count=6)
            if self.sound: self.sound.play("crash")

    def draw(self, surface):
        bg = self.phase_bgs[self.current_phase_index]
        if bg:
            surface.blit(bg, self.play_rect.topleft)
        else:
            pygame.draw.rect(surface, (10, 40, 20), self.play_rect)

        for item in self.falling_items:
            icon = self.item_icons.get(item['type'])
            if icon:
                dest = icon.get_rect(center=(int(item['x']), int(item['y'])))
                surface.blit(icon, dest)
            else:
                color = (220, 40, 40) if item['type'] == 'guarana' else (255, 200, 0)
                pygame.draw.circle(surface, color, (int(item['x']), int(item['y'])), int(item['radius']))

        for ft in self.floating_texts:
            txt_surf = self.font_score.render(ft['text'], True, ft['color'])
            surface.blit(txt_surf, (int(ft['x'] - txt_surf.get_width() / 2), int(ft['y'])))

        mins = int(self.time_left // 60)
        secs = int(self.time_left % 60)
        time_str = f"Tempo: {mins:02d}:{secs:02d}"
        meta_str = f"Meta: {self.guarana_collected} / {self.target_guarana}"
        score_str = f"Pontos: {self.score}"
        phase_str = self.get_current_phase()['short_title'].upper()

        surf_phase = self.font_hud.render(phase_str, True, (0, 240, 144))
        surf_meta = self.font_hud.render(meta_str, True, (255, 255, 255))
        surf_time = self.font_hud.render(time_str, True, (0, 220, 255))
        surf_pts = self.font_hud.render(score_str, True, (255, 215, 0))

        surface.blit(surf_phase, (self.play_rect.left + 20, self.play_rect.top + 16))
        surface.blit(surf_meta, (self.play_rect.left + 260, self.play_rect.top + 16))
        surface.blit(surf_time, (self.play_rect.centerx + 40, self.play_rect.top + 16))
        surface.blit(surf_pts, (self.play_rect.right - surf_pts.get_width() - 20, self.play_rect.top + 16))

        if self.countdown > -0.6:
            cx = self.play_rect.centerx
            cy = self.play_rect.centery - 20
            phase = self.get_current_phase()

            if self.countdown > 2.0:
                text = "3"
                color = (255, 120, 0)
            elif self.countdown > 1.0:
                text = "2"
                color = (255, 200, 0)
            elif self.countdown > 0.0:
                text = "1"
                color = (50, 220, 130)
            else:
                text = "COLHER!"
                color = (0, 240, 144)

            sub = phase['motto']

            box_rect = pygame.Rect(cx - 240, cy - 100, 480, 200)
            overlay_surf = pygame.Surface((480, 200), pygame.SRCALPHA)
            overlay_surf.fill((3, 12, 24, 210))
            surface.blit(overlay_surf, box_rect.topleft)
            pygame.draw.rect(surface, color, box_rect, width=2, border_radius=16)

            surf_txt = self.font_countdown_big.render(text, True, color)
            surf_sub = self.font_countdown_sub.render(f'"{sub}"', True, (255, 255, 255))
            surface.blit(surf_txt, (cx - surf_txt.get_width() // 2, cy - 65))
            surface.blit(surf_sub, (cx - surf_sub.get_width() // 2, cy + 35))
