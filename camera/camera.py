import cv2
import numpy as np
import time

try:
    from config import CAMERA_INDEX
except ImportError:
    CAMERA_INDEX = 1

class Camera:
    def __init__(self, index=None, width=640, height=480):
        self.width = width
        self.height = height
        self.target_index = index if index is not None else CAMERA_INDEX
        self.cap = None
        self.is_connected = False
        self.last_retry_time = 0
        self.connect()

    def connect(self):
        """Tenta conectar na webcam usando múltiplos backends e índices."""
        # Se já estiver aberto, libera antes
        self.release()

        # Tenta no índice alvo e depois nos outros índices (0, 1)
        indices_to_try = [self.target_index]
        for alt in [0, 1]:
            if alt not in indices_to_try:
                indices_to_try.append(alt)

        for idx in indices_to_try:
            # 1. Tenta com DirectShow (Windows)
            try:
                cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
                if cap and cap.isOpened():
                    ok, test_frame = cap.read()
                    if ok and test_frame is not None:
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                        cap.set(cv2.CAP_PROP_FPS, 30)
                        self.cap = cap
                        self.is_connected = True
                        return True
                    cap.release()
            except Exception:
                pass

            # 2. Tenta com backend padrão
            try:
                cap = cv2.VideoCapture(idx)
                if cap and cap.isOpened():
                    ok, test_frame = cap.read()
                    if ok and test_frame is not None:
                        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                        cap.set(cv2.CAP_PROP_FPS, 30)
                        self.cap = cap
                        self.is_connected = True
                        return True
                    cap.release()
            except Exception:
                pass

        self.is_connected = False
        return False

    def read(self):
        # Se estiver conectada, tenta ler
        if self.is_connected and self.cap and self.cap.isOpened():
            ok, frame = self.cap.read()
            if ok and frame is not None:
                return cv2.flip(frame, 1)
            else:
                # Se falhou ao ler o frame, marca como desconectada para tentar reconectar
                self.is_connected = False

        # Tenta reconectar automaticamente a cada 2 segundos se estiver desligada
        now = time.time()
        if now - self.last_retry_time > 2.0:
            self.last_retry_time = now
            if self.connect():
                ok, frame = self.cap.read()
                if ok and frame is not None:
                    return cv2.flip(frame, 1)

        # Fallback visual elegante enquanto a câmera está conectando/desligada
        fallback = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        fallback[:] = (18, 24, 34)
        
        # Desenha ícone e mensagens
        cv2.putText(fallback, "Webcam Desconectada", (self.width // 6, self.height // 2 - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 180, 255), 2, cv2.LINE_AA)
        cv2.putText(fallback, "Reconectando automaticamente...", (self.width // 8, self.height // 2 + 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 220, 255), 1, cv2.LINE_AA)
        cv2.putText(fallback, "Controle por Teclado Ativo: W, A, S, D", (self.width // 10, self.height // 2 + 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (40, 240, 120), 2, cv2.LINE_AA)
        return fallback

    def release(self):
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.is_connected = False
