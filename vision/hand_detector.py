import cv2
import mediapipe as mp
import math

class HandDetector:
    def __init__(self, max_hands=2, detection_conf=0.6, tracking_conf=0.6):
        self.mp_hands = mp.solutions.hands
        self.drawer = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=max_hands,
            min_detection_confidence=detection_conf,
            min_tracking_confidence=tracking_conf,
        )

    def process(self, frame):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        return self.hands.process(rgb)

    def draw(self, frame, results, steer_val=0.0, wheel_info=None):
        """Desenha esqueleto estilizado com linhas neon e volante virtual (1 ou 2 mãos)."""
        h, w, _ = frame.shape
        
        # 1. Desenha esqueleto das mãos detectadas
        if results and results.multi_hand_landmarks:
            for hand in results.multi_hand_landmarks:
                self.drawer.draw_landmarks(
                    frame,
                    hand,
                    self.mp_hands.HAND_CONNECTIONS,
                    self.drawer.DrawingSpec(color=(0, 240, 255), thickness=2, circle_radius=3),
                    self.drawer.DrawingSpec(color=(255, 140, 0), thickness=2)
                )

        # 2. Renderização do Volante Virtual com 2 Mãos
        if wheel_info and wheel_info.get("mode") == "DUAL":
            cx = int(wheel_info["cx"])
            cy = int(wheel_info["cy"])
            r = int(wheel_info["radius"])
            lx, ly = int(wheel_info["lx"]), int(wheel_info["ly"])
            rx, ry = int(wheel_info["rx"]), int(wheel_info["ry"])
            angle_deg = wheel_info["angle_deg"]
            action = wheel_info.get("action", "NEUTRO")

            # Cor dinâmica do volante baseada no estado
            if action == "TURBO":
                wheel_color = (30, 140, 255) # Laranja Nitro (BGR)
                glow_color = (0, 90, 200)
            elif action == "FREAR":
                wheel_color = (60, 60, 255) # Vermelho Freio (BGR)
                glow_color = (20, 20, 150)
            elif action == "ACELERAR":
                wheel_color = (60, 240, 100) # Verde Aceleração (BGR)
                glow_color = (20, 150, 40)
            else:
                wheel_color = (255, 215, 0) if abs(steer_val) > 0.2 else (200, 230, 255) # Ciano/Branco (BGR)
                glow_color = (150, 120, 0)

            # Aro externo do volante (Efeito Neon Glow com círculos concêntricos)
            if r > 15:
                cv2.circle(frame, (cx, cy), r + 3, glow_color, 1, cv2.LINE_AA)
                cv2.circle(frame, (cx, cy), r, wheel_color, 3, cv2.LINE_AA)
                cv2.circle(frame, (cx, cy), max(5, r - 3), glow_color, 1, cv2.LINE_AA)

                # Raio esquerdo (do cubo à mão esquerda)
                cv2.line(frame, (cx, cy), (lx, ly), wheel_color, 3, cv2.LINE_AA)
                # Raio direito (do cubo à mão direita)
                cv2.line(frame, (cx, cy), (rx, ry), wheel_color, 3, cv2.LINE_AA)

                # Raio inferior do volante (perpendicular ao eixo das mãos, estilo esportivo)
                rad = math.radians(angle_deg)
                bot_x = int(cx - math.sin(rad) * (r * 0.85))
                bot_y = int(cy + math.cos(rad) * (r * 0.85))
                cv2.line(frame, (cx, cy), (bot_x, bot_y), wheel_color, 3, cv2.LINE_AA)

                # Cubo central do volante
                cv2.circle(frame, (cx, cy), 16, (20, 30, 45), -1)
                cv2.circle(frame, (cx, cy), 16, wheel_color, 2, cv2.LINE_AA)
                cv2.circle(frame, (cx, cy), 5, (255, 255, 255), -1)

                # Halos de pegada nas mãos (Left / Right Grip)
                cv2.circle(frame, (lx, ly), 14, (0, 240, 255), 2, cv2.LINE_AA)
                cv2.circle(frame, (rx, ry), 14, (0, 240, 255), 2, cv2.LINE_AA)

                # Rótulos ESQ e DIR nas mãos
                cv2.putText(frame, "ESQ", (lx - 16, ly - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 240, 255), 1, cv2.LINE_AA)
                cv2.putText(frame, "DIR", (rx - 16, ry - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 240, 255), 1, cv2.LINE_AA)

                # Mostrador digital de ângulo acima do cubo central
                if abs(angle_deg) < 3.0:
                    ang_txt = "0 RETO"
                elif angle_deg > 0:
                    ang_txt = f"DIR +{angle_deg:.0f}"
                else:
                    ang_txt = f"ESQ {angle_deg:.0f}"
                
                # Fundo do texto do ângulo para máxima legibilidade
                tw = 76
                cv2.rectangle(frame, (cx - tw//2, cy - 32), (cx + tw//2, cy - 16), (10, 20, 30), -1)
                cv2.rectangle(frame, (cx - tw//2, cy - 32), (cx + tw//2, cy - 16), wheel_color, 1)
                cv2.putText(frame, ang_txt, (cx - tw//2 + 5, cy - 21), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1, cv2.LINE_AA)

        elif results and results.multi_hand_landmarks and len(results.multi_hand_landmarks) == 1:
            # Modo 1 mão (Vetor do punho até articulações dos dedos)
            lm = results.multi_hand_landmarks[0].landmark
            wx, wy = int(lm[0].x * w), int(lm[0].y * h)
            cx, cy = int((lm[5].x + lm[17].x) * 0.5 * w), int((lm[5].y + lm[17].y) * 0.5 * h)
            cv2.line(frame, (wx, wy), (cx, cy), (0, 255, 100), 3, cv2.LINE_AA)
            cv2.circle(frame, (cx, cy), 6, (0, 255, 0), -1)
            cv2.putText(frame, "1 MAO (INCLINAR)", (wx - 40, wy + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 240, 255), 1, cv2.LINE_AA)

        # 3. Mini gauge visual de volante no rodapé da câmera
        gw_center = w // 2
        gw_y = h - 18
        cv2.line(frame, (gw_center - 85, gw_y), (gw_center + 85, gw_y), (60, 75, 90), 4, cv2.LINE_AA)
        cv2.circle(frame, (gw_center, gw_y), 4, (120, 140, 160), -1)
        
        indicator_x = int(gw_center + steer_val * 80)
        indicator_x = max(gw_center - 85, min(gw_center + 85, indicator_x))
        gauge_color = (0, 230, 255) if abs(steer_val) > 0.1 else (180, 180, 180)
        cv2.circle(frame, (indicator_x, gw_y), 7, gauge_color, -1)
        cv2.circle(frame, (indicator_x, gw_y), 8, (255, 255, 255), 1)

        return frame
