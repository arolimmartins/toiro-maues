import pygame
import os

class PygameHarvester:
    def __init__(self, screen_w, screen_h, play_rect):
        self.screen_w = screen_w
        self.screen_h = screen_h
        self.play_rect = play_rect

        self.ground_y = play_rect.bottom - 75
        self.x = play_rect.centerx
        self.y = self.ground_y

        self.vx = 0.0
        self.speed = 420.0
        self.turbo_speed = 700.0

        self.facing = 1 # 1 = direita, -1 = esquerda
        self.state = 'frente' # 'frente', 'lado', 'coletando', 'vitoria'
        self.collect_timer = 0.0
        self.is_turbo = False
        self.is_victory = False

        self.draw_h = 135
        self.hitbox_radius = 46

        self.current_player = 1
        self.player_names = {
            1: "Gabriel (CETAM)",
            2: "Ana (Guaraná)",
            3: "Lucas (CETAM)",
            4: "Mayara (Amazônia)",
            5: "Kauã (Sateré-Mawé)"
        }

        self.menino_anims = {
            'idle': {'count': 6, 'loop': True, 'fps': 12, 'frames': []},
            'walk_right': {'count': 8, 'loop': True, 'fps': 14, 'frames': []},
            'walk_left': {'count': 8, 'loop': True, 'fps': 14, 'frames': []},
            'walk_front': {'count': 8, 'loop': True, 'fps': 14, 'frames': []},
            'walk_back': {'count': 8, 'loop': True, 'fps': 14, 'frames': []},
            'run_right': {'count': 8, 'loop': True, 'fps': 16, 'frames': []},
            'run_left': {'count': 8, 'loop': True, 'fps': 16, 'frames': []},
            'jump': {'count': 8, 'loop': False, 'fps': 14, 'frames': []},
            'collect': {'count': 8, 'loop': False, 'fps': 14, 'frames': []},
            'lift_basket': {'count': 8, 'loop': False, 'fps': 14, 'frames': []},
            'collect_happy': {'count': 8, 'loop': False, 'fps': 14, 'frames': []},
            'sad': {'count': 8, 'loop': False, 'fps': 12, 'frames': []},
            'angry': {'count': 8, 'loop': False, 'fps': 12, 'frames': []},
            'surprise': {'count': 8, 'loop': False, 'fps': 12, 'frames': []},
            'hurt': {'count': 8, 'loop': False, 'fps': 14, 'frames': []},
            'death': {'count': 8, 'loop': False, 'fps': 12, 'frames': []},
            'victory': {'count': 8, 'loop': False, 'fps': 12, 'frames': []}
        }
        self.active_menino_anim = 'idle'
        self.menino_frame_idx = 0
        self.menino_frame_timer = 0.0
        self.is_oneshot_active = False

        self.sprites = {}
        self.load_sprites()

        self.font = pygame.font.SysFont("segoeui", 14, bold=True)

    def load_sprites(self):
        for p in range(1, 6):
            self.sprites[p] = {}
            for anim in ['frente', 'lado', 'coletando', 'vitoria', 'portrait']:
                path = os.path.join("assets", "characters", f"player{p}", f"{anim}.png")
                if os.path.exists(path):
                    surf = pygame.image.load(path).convert_alpha()
                    w, h = surf.get_size()
                    target_w = int(w * (self.draw_h / max(1, h)))
                    self.sprites[p][anim] = pygame.transform.smoothscale(surf, (target_w, self.draw_h))
                else:
                    self.sprites[p][anim] = None

        # Carrega as 17 animações numeradas do Menino do Guaraná
        for anim_name, data in self.menino_anims.items():
            for i in range(1, data['count'] + 1):
                num_str = f"{i:02d}"
                p = os.path.join("assets", "characters", "menino_guarana", anim_name, f"{anim_name}_{num_str}.png")
                if os.path.exists(p):
                    surf = pygame.image.load(p).convert_alpha()
                    w, h = surf.get_size()
                    tw = int(w * (self.draw_h / max(1, h)))
                    data['frames'].append(pygame.transform.smoothscale(surf, (tw, self.draw_h)))

    def set_player(self, player_id):
        if 1 <= player_id <= 5:
            self.current_player = player_id

    def play_menino_anim(self, anim_name, force_reset=False):
        if anim_name not in self.menino_anims:
            return
        anim_data = self.menino_anims[anim_name]
        if self.active_menino_anim != anim_name or force_reset:
            self.active_menino_anim = anim_name
            self.menino_frame_idx = 0
            self.menino_frame_timer = 0.0
            self.is_oneshot_active = not anim_data['loop']

    def trigger_collect(self):
        self.collect_timer = 0.45
        self.state = 'coletando'
        self.play_menino_anim('collect', True)

    def trigger_collect_happy(self):
        self.play_menino_anim('collect_happy', True)

    def trigger_hurt(self):
        self.play_menino_anim('hurt', True)

    def trigger_sad(self):
        self.play_menino_anim('sad', True)

    def trigger_jump(self):
        self.play_menino_anim('jump', True)

    def trigger_death(self):
        self.play_menino_anim('death', True)

    def trigger_victory(self):
        self.play_menino_anim('victory', True)

    def update(self, dt, command, steer_val, is_victory=False):
        self.is_victory = is_victory
        self.is_turbo = (command == "TURBO")
        cur_speed = self.turbo_speed if self.is_turbo else self.speed

        move_intent = 0.0
        if not self.is_victory:
            if abs(steer_val) > 0.10:
                move_intent = steer_val
            elif command == "ESQUERDA":
                move_intent = -1.0
            elif command == "DIREITA":
                move_intent = 1.0

            if command in ("PARAR", "FREAR"):
                move_intent = 0.0
                self.vx *= 0.7
        else:
            self.vx *= 0.8
            if abs(self.vx) < 5: self.vx = 0.0

        target_vx = move_intent * cur_speed
        self.vx += (target_vx - self.vx) * min(1.0, dt * 14.0)

        if abs(self.vx) < 5:
            self.vx = 0.0

        self.x += self.vx * dt

        min_x = self.play_rect.left + 50
        max_x = self.play_rect.right - 50
        if self.x < min_x:
            self.x = min_x
            self.vx = 0.0
        elif self.x > max_x:
            self.x = max_x
            self.vx = 0.0

        if self.vx > 15:
            self.facing = 1
        elif self.vx < -15:
            self.facing = -1

        # Ordem de movimentos:
        if self.is_victory:
            self.state = 'vitoria'
            self.play_menino_anim('victory')
        elif self.collect_timer > 0:
            self.collect_timer -= dt
            self.state = 'coletando'
        elif abs(self.vx) > 15:
            self.state = 'lado'
            if not self.is_oneshot_active:
                if self.is_turbo:
                    self.play_menino_anim('run_right' if self.facing == 1 else 'run_left')
                else:
                    self.play_menino_anim('walk_right' if self.facing == 1 else 'walk_left')
        else:
            self.state = 'frente'
            if not self.is_oneshot_active:
                self.play_menino_anim('idle')

        # Atualização de Frame do Menino do Guaraná (Player 5)
        anim_data = self.menino_anims.get(self.active_menino_anim)
        if anim_data and anim_data['frames']:
            self.menino_frame_timer += dt
            frame_duration = 1.0 / anim_data['fps']
            if self.menino_frame_timer >= frame_duration:
                self.menino_frame_timer = 0.0
                if self.menino_frame_idx < anim_data['count'] - 1:
                    self.menino_frame_idx += 1
                elif anim_data['loop']:
                    self.menino_frame_idx = 0
                else:
                    self.is_oneshot_active = False

    def draw(self, surface):
        # 1. Sombra no chão
        shadow_rect = pygame.Rect(0, 0, 60, 16)
        shadow_rect.center = (int(self.x), int(self.y + 4))
        shadow_surf = pygame.Surface((60, 16), pygame.SRCALPHA)
        pygame.draw.ellipse(shadow_surf, (20, 10, 5, 120), shadow_surf.get_rect())
        surface.blit(shadow_surf, shadow_rect.topleft)

        # 2. Sprite do Personagem
        p_assets = self.sprites.get(self.current_player, {})
        img = p_assets.get(self.state) or p_assets.get('frente')

        if self.current_player == 5:
            anim_data = self.menino_anims.get(self.active_menino_anim)
            if anim_data and anim_data['frames'] and self.menino_frame_idx < len(anim_data['frames']):
                img = anim_data['frames'][self.menino_frame_idx]

        if img:
            draw_img = img
            if self.current_player == 5:
                if self.facing == -1 and '_left' not in self.active_menino_anim and '_right' not in self.active_menino_anim:
                    draw_img = pygame.transform.flip(img, True, False)
            elif self.facing == -1:
                draw_img = pygame.transform.flip(img, True, False)

            dest_rect = draw_img.get_rect(midbottom=(int(self.x), int(self.y)))
            surface.blit(draw_img, dest_rect)

            if self.is_turbo:
                pygame.draw.rect(surface, (255, 170, 0), dest_rect.inflate(4, 4), 2, border_radius=4)
        else:
            rect = pygame.Rect(0, 0, 70, self.draw_h)
            rect.midbottom = (int(self.x), int(self.y))
            pygame.draw.rect(surface, (40, 200, 120), rect, border_radius=6)

        # 3. Nome sobre a cabeça
        name_txt = self.font.render(self.player_names[self.current_player], True, (255, 255, 255))
        surface.blit(name_txt, (int(self.x - name_txt.get_width() / 2), int(self.y - self.draw_h - 18)))

    def get_basket_center(self):
        offset_x = (22 if self.state == 'coletando' else 14) if self.facing == 1 else (-22 if self.state == 'coletando' else -14)
        return (self.x + offset_x, self.y - self.draw_h * 0.42, self.hitbox_radius)
