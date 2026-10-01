import math
from collections import deque

class GestureDetector:
    """
    Detector avançado de gestos e volante virtual (1 ou 2 mãos).
    - Modo 2 Mãos: Opera como um volante virtual de controle, medindo o ângulo de rotação
      entre a mão esquerda e a direita no espaço 3D/2D.
    - Modo 1 Mão (Fallback): Opera por inclinação do punho.
    - Reconhece ações: ACELERAR, FREAR, TURBO, ESQUERDA, DIREITA, NEUTRO.
    """
    def __init__(self):
        self.history = deque(maxlen=6)
        self.smooth_steer = 0.0
        self.steer_alpha = 0.28 # Suavização exponencial rápida e estável
        self.last_wheel_info = {"mode": "NONE"}

    @staticmethod
    def dist(a, b):
        return math.hypot(a.x - b.x, a.y - b.y)

    def classify(self, landmarks_input, frame_w=320, frame_h=240):
        """
        Classifica gestos e ângulo do volante.
        landmarks_input pode ser uma lista de mãos (multi_hand_landmarks)
        ou um único objeto de landmarks.
        """
        # Normaliza a entrada para uma lista de mãos
        hands_list = []
        if landmarks_input is not None:
            if isinstance(landmarks_input, (list, tuple)):
                hands_list = [h for h in landmarks_input if h and hasattr(h, 'landmark')]
            elif hasattr(landmarks_input, 'landmark'):
                hands_list = [landmarks_input]

        if not hands_list:
            self.smooth_steer *= 0.82
            self.last_wheel_info = {"mode": "NONE", "action": "SEM MÃO"}
            return "SEM MÃO", 0.0, self.smooth_steer, self.last_wheel_info

        tips = [8, 12, 16, 20]
        pips = [6, 10, 14, 18]

        # =========================================================================
        # CASO A: DUAS MÃOS DETECTADAS (VOLANTE VIRTUAL / DIREÇÃO DO PERSONAGEM)
        # =========================================================================
        if len(hands_list) >= 2:
            h1 = hands_list[0].landmark
            h2 = hands_list[1].landmark

            # Identifica centro aproximado de cada mão (média entre punho e MCP do meio)
            c1_x = (h1[0].x + h1[9].x) * 0.5 * frame_w
            c1_y = (h1[0].y + h1[9].y) * 0.5 * frame_h
            c2_x = (h2[0].x + h2[9].x) * 0.5 * frame_w
            c2_y = (h2[0].y + h2[9].y) * 0.5 * frame_h

            # No frame espelhado (Python cv2.flip 1):
            # A mão com menor X na tela é a mão ESQUERDA do jogador
            # A mão com maior X na tela é a mão DIREITA do jogador
            if c1_x < c2_x:
                hl, hr = h1, h2
                lx, ly = c1_x, c1_y
                rx, ry = c2_x, c2_y
            else:
                hl, hr = h2, h1
                lx, ly = c2_x, c2_y
                rx, ry = c1_x, c1_y

            # Vetor da mão esquerda até a direita
            dx = rx - lx
            dy = ry - ly # Em telas, Y cresce para baixo

            # Ângulo do volante:
            # Se mãos alinhadas na horizontal: dy = 0 -> angle = 0
            # Ao virar para a DIREITA (horário): mão esquerda sobe (ly menor), mão direita desce (ry maior) -> dy > 0 -> angle > 0
            # Ao virar para a ESQUERDA (anti-horário): mão esquerda desce, mão direita sobe -> dy < 0 -> angle < 0
            angle_rad = math.atan2(dy, max(1.0, dx))
            angle_deg = math.degrees(angle_rad)

            # Normalização: ~28 graus (+-0.48 rad) = esterçamento máximo (+-1.0)
            target_steer = max(-1.0, min(1.0, angle_rad / 0.48))

            # Deadzone suave de 6% para permitir andar em linha reta perfeitamente
            if abs(target_steer) < 0.08:
                target_steer = 0.0

            self.smooth_steer += (target_steer - self.smooth_steer) * self.steer_alpha

            # Análise de dedos de cada mão
            ext_l = [self.dist(hl[t], hl[0]) > self.dist(hl[p], hl[0]) * 1.15 for t, p in zip(tips, pips)]
            ext_r = [self.dist(hr[t], hr[0]) > self.dist(hr[p], hr[0]) * 1.15 for t, p in zip(tips, pips)]

            num_l = sum(ext_l)
            num_r = sum(ext_r)

            # Sinal de Paz (✌️) em qualquer mão = TURBO NITRO
            peace_l = ext_l[0] and ext_l[1] and not ext_l[2] and not ext_l[3]
            peace_r = ext_r[0] and ext_r[1] and not ext_r[2] and not ext_r[3]

            # Punho fechado em ambas = FREAR
            fist_l = (num_l == 0)
            fist_r = (num_r == 0)

            label = "ACELERAR"
            conf = 0.94

            if peace_l or peace_r:
                label = "TURBO"
                conf = 0.98
            elif fist_l and fist_r:
                label = "FREAR"
                conf = 0.96
            elif num_l >= 2 or num_r >= 2:
                # Pegada normal no volante
                if self.smooth_steer < -0.25:
                    label = "ESQUERDA"
                elif self.smooth_steer > 0.25:
                    label = "DIREITA"
                else:
                    label = "ACELERAR"
                conf = 0.92

            center_x = (lx + rx) * 0.5
            center_y = (ly + ry) * 0.5
            radius = max(20.0, math.hypot(dx, dy) * 0.5)

            wheel_info = {
                "mode": "DUAL",
                "cx": center_x,
                "cy": center_y,
                "radius": radius,
                "lx": lx,
                "ly": ly,
                "rx": rx,
                "ry": ry,
                "angle_deg": angle_deg,
                "action": label
            }
            self.last_wheel_info = wheel_info

        # =========================================================================
        # CASO B: UMA MÃO DETECTADA (MODO HÍBRIDO / FALLBACK)
        # =========================================================================
        else:
            lm = hands_list[0].landmark
            wrist = lm[0]

            extended = [
                self.dist(lm[t], wrist) > self.dist(lm[p], wrist) * 1.15
                for t, p in zip(tips, pips)
            ]
            num_extended = sum(extended)
            index_ext, middle_ext, ring_ext, pinky_ext = extended

            # Ângulo de inclinação da mão única
            base_center_x = (lm[5].x + lm[17].x) * 0.5
            base_center_y = (lm[5].y + lm[17].y) * 0.5
            dx = base_center_x - wrist.x
            dy = base_center_y - wrist.y
            tilt_angle = math.atan2(dx, -dy)

            target_steer = max(-1.0, min(1.0, tilt_angle / 0.45))
            if abs(target_steer) < 0.10:
                target_steer = 0.0

            self.smooth_steer += (target_steer - self.smooth_steer) * self.steer_alpha

            label = "PARAR"
            conf = 0.75

            if index_ext and middle_ext and not ring_ext and not pinky_ext:
                label = "TURBO"
                conf = 0.95
            elif num_extended == 0:
                label = "FREAR"
                conf = 0.94
            elif num_extended >= 3 or (index_ext and not middle_ext and not ring_ext):
                label = "ACELERAR"
                conf = 0.92
            else:
                if self.smooth_steer < -0.25:
                    label = "ESQUERDA"
                    conf = 0.85
                elif self.smooth_steer > 0.25:
                    label = "DIREITA"
                    conf = 0.85
                else:
                    label = "NEUTRO"
                    conf = 0.70

            wheel_info = {
                "mode": "SINGLE",
                "cx": base_center_x * frame_w,
                "cy": base_center_y * frame_h,
                "radius": 35.0,
                "angle_deg": math.degrees(tilt_angle),
                "action": label
            }
            self.last_wheel_info = wheel_info

        # Suavização temporal do comando
        self.history.append(label)
        if len(self.history) >= 4:
            counts = {g: self.history.count(g) for g in set(self.history)}
            best = max(counts, key=counts.get)
            if counts[best] >= 3:
                label = best

        return label, conf, self.smooth_steer, wheel_info
