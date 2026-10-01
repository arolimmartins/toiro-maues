import os
import time
import cv2
import pygame
from config import WIDTH, HEIGHT, FPS, CAM_W, CAM_H, CONFIDENCE_THRESHOLD
from camera.camera import Camera
from vision.hand_detector import HandDetector
from vision.gesture_detector import GestureDetector
from game.game import Game

def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("To'iro Maués — CETAM • Visão Computacional")
    
    font_title = pygame.font.SysFont("segoeui", 26, bold=True)
    font_bold = pygame.font.SysFont("segoeui", 20, bold=True)
    font_norm = pygame.font.SysFont("segoeui", 16)
    font_small = pygame.font.SysFont("segoeui", 14)
    font_badge = pygame.font.SysFont("segoeui", 17, bold=True)

    cam = Camera(width=320, height=240)
    detector = HandDetector()
    gestures = GestureDetector()
    game = Game(WIDTH, HEIGHT)
    clock = pygame.time.Clock()
    running = True

    # Cores do tema Cyberpunk Racing / Floresta CETAM
    COLOR_BG = (10, 16, 26)
    COLOR_CARD_BG = (14, 25, 40)
    COLOR_CARD_BORDER = (0, 180, 230)
    COLOR_CYAN = (0, 220, 255)
    COLOR_GREEN = (40, 240, 120)
    COLOR_ORANGE = (255, 140, 30)
    COLOR_RED = (255, 60, 60)
    COLOR_TEXT = (235, 245, 255)
    COLOR_MUTED = (140, 165, 190)

    # Carrega retratos dos 5 personagens para o seletor visual
    char_portraits = {}
    for p in range(1, 6):
        p_path = os.path.join("assets", "characters", f"player{p}", "portrait.png")
        if os.path.exists(p_path):
            img = pygame.image.load(p_path).convert_alpha()
            char_portraits[p] = pygame.transform.smoothscale(img, (26, 26))
        else:
            char_portraits[p] = None

    char_buttons = [
        (1, "1. Gabriel", pygame.Rect(335, 82, 115, 30)),
        (2, "2. Ana", pygame.Rect(455, 82, 95, 30)),
        (3, "3. Lucas", pygame.Rect(555, 82, 105, 30)),
        (4, "4. Mayara", pygame.Rect(665, 82, 115, 30)),
        (5, "5. Kauã", pygame.Rect(785, 82, 105, 30))
    ]

    def draw_card(rect, title_text=""):
        pygame.draw.rect(screen, COLOR_CARD_BG, rect, border_radius=10)
        pygame.draw.rect(screen, (25, 50, 75), rect, 1, border_radius=10)
        if title_text:
            screen.blit(font_bold.render(title_text, True, COLOR_CYAN), (rect.x + 12, rect.y + 8))

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = event.pos
                for pid, name, r in char_buttons:
                    if r.collidepoint(mx, my):
                        game.set_player(pid)
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_p:
                    game.paused = not game.paused
                elif event.key == pygame.K_r:
                    game.restart()
                elif event.key in (pygame.K_SPACE, pygame.K_RETURN, pygame.K_n):
                    if game.harvest_scene.is_victory:
                        if game.harvest_scene.has_next_phase():
                            game.harvest_scene.advance_phase()
                        else:
                            game.restart()
                elif event.key == pygame.K_m:
                    game.sound.toggle_mute()
                elif event.key == pygame.K_F11:
                    pygame.display.toggle_fullscreen()
                elif event.key in (pygame.K_1, pygame.K_KP1):
                    game.set_player(1)
                elif event.key in (pygame.K_2, pygame.K_KP2):
                    game.set_player(2)
                elif event.key in (pygame.K_3, pygame.K_KP3):
                    game.set_player(3)
                elif event.key in (pygame.K_4, pygame.K_KP4):
                    game.set_player(4)
                elif event.key in (pygame.K_5, pygame.K_KP5):
                    game.set_player(5)

        # 1. Captura e Processamento de Imagem
        frame = cam.read()
        command = "SEM MÃO"
        conf = 0.0
        steer_val = 0.0
        wheel_info = {"mode": "NONE"}

        if frame is not None:
            results = detector.process(frame)
            if results and results.multi_hand_landmarks:
                command, conf, steer_val, wheel_info = gestures.classify(
                    results.multi_hand_landmarks, frame.shape[1], frame.shape[0]
                )
            detector.draw(frame, results, steer_val, wheel_info)

        # 2. Controles do Teclado (Prioridade para testes manuais e híbridos)
        keys = pygame.key.get_pressed()
        kb_active = False
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            command = "ACELERAR"
            conf = 1.0
            kb_active = True
        if keys[pygame.K_LSHIFT] or keys[pygame.K_RSHIFT] or keys[pygame.K_e]:
            command = "TURBO"
            conf = 1.0
            kb_active = True
        if keys[pygame.K_DOWN] or keys[pygame.K_s] or keys[pygame.K_SPACE]:
            command = "PARAR"
            conf = 1.0
            kb_active = True
        
        # Direção pelo teclado
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            steer_val = -1.0
            if not kb_active: command = "ESQUERDA"
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            steer_val = 1.0
            if not kb_active: command = "DIREITA"

        # 3. Atualiza e Renderiza o Jogo
        game.update(command, steer_val)
        
        # Preenche fundo
        screen.fill(COLOR_BG)
        
        # Desenha Área de Jogo (Cenário da Colheita, Personagem, Frutos, Partículas)
        game.draw(screen)

        # Barra de Seleção de Personagens
        for pid, name, r in char_buttons:
            is_active = (game.harvester.current_player == pid)
            bg_col = (0, 70, 35) if is_active else (15, 30, 48)
            border_col = COLOR_GREEN if is_active else (35, 65, 95)
            pygame.draw.rect(screen, bg_col, r, border_radius=15)
            pygame.draw.rect(screen, border_col, r, 2 if is_active else 1, border_radius=15)

            port = char_portraits.get(pid)
            if port:
                screen.blit(port, (r.x + 4, r.y + 2))

            txt_col = (255, 255, 255) if is_active else COLOR_MUTED
            txt = font_small.render(name, True, txt_col)
            screen.blit(txt, (r.x + 34, r.y + 6))

        # 4. Barra Superior (Header)
        header_rect = pygame.Rect(0, 0, WIDTH, 75)
        pygame.draw.rect(screen, (8, 18, 30), header_rect)
        pygame.draw.line(screen, (0, 160, 220), (0, 75), (WIDTH, 75), 2)
        
        screen.blit(font_title.render("🌿 TO'IRO MAUÉS", True, (255, 255, 255)), (25, 12))
        screen.blit(font_small.render("VISÃO COMPUTACIONAL • PERSONAGENS DO CETAM", True, COLOR_CYAN), (28, 44))

        # Status rápidos no header (Lado direito)
        fps_text = font_small.render(f"FPS: {int(clock.get_fps())}", True, COLOR_MUTED)
        screen.blit(fps_text, (WIDTH - 110, 26))

        mute_status = "🔊 SOM ATIVO" if game.sound.enabled else "🔇 MUDO"
        screen.blit(font_small.render(f"{mute_status} [M]", True, (150, 200, 220)), (WIDTH - 240, 26))

        # 5. Painel Lateral Esquerdo (HUD do Jogador)
        
        # Card 1: Feed da Câmera
        cam_card = pygame.Rect(15, 88, 300, 230)
        draw_card(cam_card, "📷 CÂMERA & VOLANTE")
        if frame is not None:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb_resized = cv2.resize(rgb_frame, (276, 184))
            surf_cam = pygame.surfarray.make_surface(rgb_resized.swapaxes(0, 1))
            screen.blit(surf_cam, (27, 124))
            pygame.draw.rect(screen, (40, 80, 120), (27, 124, 276, 184), 1, border_radius=4)

        # Card 2: Telemetria da IA e Gesto Detectado
        gest_card = pygame.Rect(15, 326, 300, 106)
        draw_card(gest_card, "🤖 DETECÇÃO DE GESTO")
        
        # Badge com cor dinâmica baseada na ação
        badge_color = COLOR_MUTED
        if command == "TURBO": badge_color = COLOR_ORANGE
        elif command == "ACELERAR": badge_color = COLOR_GREEN
        elif command in ("FREAR", "PARAR"): badge_color = COLOR_RED
        elif command in ("ESQUERDA", "DIREITA"): badge_color = COLOR_CYAN
        
        badge_rect = pygame.Rect(27, 360, 145, 30)
        pygame.draw.rect(screen, (badge_color[0]//5, badge_color[1]//5, badge_color[2]//5), badge_rect, border_radius=6)
        pygame.draw.rect(screen, badge_color, badge_rect, 1, border_radius=6)
        
        txt_cmd = font_badge.render(f"● {command}", True, badge_color)
        screen.blit(txt_cmd, (badge_rect.x + 8, badge_rect.y + 4))

        # Barra de Confiança
        conf_pct = int(conf * 100)
        screen.blit(font_small.render(f"Confiança: {conf_pct}%", True, COLOR_TEXT), (184, 355))
        bar_bg = pygame.Rect(184, 375, 116, 12)
        pygame.draw.rect(screen, (30, 45, 60), bar_bg, border_radius=3)
        bar_fill = pygame.Rect(184, 375, int(116 * min(1.0, conf)), 12)
        pygame.draw.rect(screen, COLOR_CYAN, bar_fill, border_radius=3)

        # Medidor do Volante e Modo
        if wheel_info.get("mode") == "DUAL":
            deg = wheel_info.get("angle_deg", 0.0)
            steer_str = f"Volante 2 Mãos: {deg:+.0f}° ({steer_val*100:+.0f}%)"
            steer_clr = COLOR_GREEN
        elif wheel_info.get("mode") == "SINGLE":
            steer_str = f"Modo 1 Mão: {steer_val*100:+.0f}%"
            steer_clr = COLOR_CYAN
        else:
            steer_str = "Aguardando Mãos..."
            steer_clr = COLOR_MUTED
        screen.blit(font_small.render(steer_str, True, steer_clr), (27, 400))

        # Card 3: Instrumentos da Colheita (Velocidade, Meta, Tempo, Pontos)
        dash_card = pygame.Rect(15, 440, 300, 140)
        cur_phase = game.harvest_scene.get_current_phase()
        draw_card(dash_card, f"🍒 {cur_phase['short_title'].upper()}")
        
        # Velocidade do Personagem
        kmh = abs(game.harvester.vx) * 0.15
        txt_speed = font_bold.render(f"{kmh:.0f} km/h", True, (255, 255, 255))
        screen.blit(txt_speed, (30, 472))
        
        # Barra de velocidade
        spd_bg = pygame.Rect(125, 478, 175, 14)
        pygame.draw.rect(screen, (30, 45, 60), spd_bg, border_radius=4)
        spd_fill_w = int(175 * min(1.0, abs(game.harvester.vx) / game.harvester.turbo_speed))
        spd_fill = pygame.Rect(125, 478, spd_fill_w, 14)
        color_spd = COLOR_ORANGE if game.harvester.is_turbo else COLOR_GREEN
        pygame.draw.rect(screen, color_spd, spd_fill, border_radius=4)

        # Meta e Cronômetro
        screen.blit(font_norm.render(f"🍒 Meta: {game.current_lap} / {game.total_laps}", True, COLOR_TEXT), (30, 508))
        mins = int(game.current_lap_time // 60)
        secs = int(game.current_lap_time % 60)
        screen.blit(font_norm.render(f"⏱️ Tempo: {mins:02d}:{secs:02d}", True, COLOR_CYAN), (180, 508))

        # Pontuação e Moedas
        screen.blit(font_norm.render(f"🪙 Moedas: {game.harvest_scene.coins_collected}", True, (255, 215, 0)), (30, 540))
        screen.blit(font_norm.render(f"⭐ Pontos: {game.score}", True, COLOR_GREEN), (180, 540))

        # Card 4: Guia de Gestos & Atalhos
        help_card = pygame.Rect(15, 588, 300, 122)
        draw_card(help_card, "💡 GUIA DE GESTOS")
        
        screen.blit(font_small.render("👐 Volante / Mãos: Move o Personagem!", True, COLOR_CYAN), (25, 618))
        screen.blit(font_small.render("🖐️ Palmas: Andar   ✊ Dois Punhos: Parar", True, COLOR_TEXT), (25, 638))
        screen.blit(font_small.render("✌️ Dois Dedos (V): TURBO COLHEITA 🚀", True, COLOR_ORANGE), (25, 658))
        screen.blit(font_small.render("⌨️ A/D ou Setas • Teclas [1, 2, 3, 4]: Personagens", True, COLOR_MUTED), (25, 678))

        pygame.display.flip()
        clock.tick(FPS)

    cam.release()
    pygame.quit()

if __name__ == "__main__":
    main()
