"""
Utilitário de Teste de Câmeras — GestureCar AI
Permite testar e comparar a qualidade das câmeras conectadas (Notebook vs USB Externa).
"""
import cv2
import time
import sys

def test_cameras():
    print("=" * 60)
    print("  GESTURECAR AI — TESTADOR DE QUALIDADE DE CÂMERAS")
    print("=" * 60)
    print("Detectando câmeras disponíveis...")

    caps = {}
    for idx in range(4):
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if cap.isOpened():
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            ok, frame = cap.read()
            if ok and frame is not None:
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                caps[idx] = cap
                print(f"  [OK] Câmera {idx} conectada: Resolução {w}x{h}")
            else:
                cap.release()

    if not caps:
        print("\n[ERRO] Nenhuma câmera detectada no sistema!")
        input("\nPressione ENTER para sair...")
        return

    available_indices = list(caps.keys())
    print(f"\nCâmeras ativas detectadas: {available_indices}")
    print("\nComandos na janela de visualização:")
    print("  - Teclas [0], [1], ... : Alterna a câmera ativa")
    print("  - Tecla [M] : Modo Lado a Lado (Comparação direta de qualidade)")
    print("  - Tecla [S] : Salva a câmera atual como padrão no config.py")
    print("  - Tecla [ESC] ou [Q] : Fechar testador")

    current_idx = available_indices[-1] if len(available_indices) > 1 else available_indices[0]
    side_by_side = len(available_indices) >= 2
    msg_saved = ""
    msg_saved_time = 0

    fps_count = 0
    fps_timer = time.time()
    current_fps = 30

    while True:
        now = time.time()
        fps_count += 1
        if now - fps_timer >= 1.0:
            current_fps = fps_count
            fps_count = 0
            fps_timer = now

        if side_by_side and len(available_indices) >= 2:
            idx_a = available_indices[0]
            idx_b = available_indices[1]
            ret_a, frame_a = caps[idx_a].read()
            ret_b, frame_b = caps[idx_b].read()

            if ret_a and ret_b:
                f_a = cv2.resize(frame_a, (640, 480))
                f_b = cv2.resize(frame_b, (640, 480))

                # Cabeçalhos informativos
                cv2.putText(f_a, f"CAMERA {idx_a} (Integrada/Padrao)", (20, 35),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2, cv2.LINE_AA)
                cv2.putText(f_b, f"CAMERA {idx_b} (USB / Nova)", (20, 35),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)

                display_frame = cv2.hconcat([f_a, f_b])
                info_text = f"Modo Comparacao Lado a Lado | Pressione [0] ou [1] para foco individual | [M] Alternar modo"
            else:
                side_by_side = False
                display_frame = frame_a if ret_a else frame_b
                info_text = "Alternando para modo individual"
        else:
            cap = caps.get(current_idx)
            ret, frame = cap.read() if cap else (False, None)
            if ret and frame is not None:
                display_frame = cv2.resize(frame, (960, 540))
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                cv2.putText(display_frame, f"CAMERA {current_idx} | Resolucao: {w}x{h} | FPS: {current_fps}", (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 120), 2, cv2.LINE_AA)
                info_text = f"Pressione [S] para Definir Cam {current_idx} no Jogo | [M] Lado a Lado | [Q] Sair"
            else:
                display_frame = 255 * (0, 0, 0)
                info_text = f"Falha ao ler frame da camera {current_idx}"

        # Barra inferior de instrução
        h_disp, w_disp = display_frame.shape[:2]
        cv2.rectangle(display_frame, (0, h_disp - 45), (w_disp, h_disp), (15, 15, 25), -1)
        cv2.putText(display_frame, info_text, (20, h_disp - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 220, 220), 1, cv2.LINE_AA)

        if msg_saved and time.time() - msg_saved_time < 3.0:
            cv2.rectangle(display_frame, (w_disp // 4, h_disp // 2 - 30), (3 * w_disp // 4, h_disp // 2 + 30), (0, 120, 0), -1)
            cv2.putText(display_frame, msg_saved, (w_disp // 4 + 20, h_disp // 2 + 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

        cv2.imshow("GestureCar AI - Testador de Cameras", display_frame)

        key = cv2.waitKey(1) & 0xFF
        if key in [27, ord('q'), ord('Q')]:
            break
        elif key == ord('m') or key == ord('M'):
            if len(available_indices) >= 2:
                side_by_side = not side_by_side
        elif key == ord('s') or key == ord('S'):
            target = current_idx
            # Atualiza config.py
            try:
                with open("config.py", "r", encoding="utf-8") as f:
                    content = f.read()
                import re
                new_content = re.sub(r"CAMERA_INDEX\s*=\s*\d+", f"CAMERA_INDEX = {target}", content)
                with open("config.py", "w", encoding="utf-8") as f:
                    f.write(new_content)
                msg_saved = f"Camera {target} salva como padrao no config.py!"
                msg_saved_time = time.time()
                print(f"\n[SUCESSO] Camera {target} salva no config.py!")
            except Exception as e:
                msg_saved = f"Erro ao salvar: {e}"
                msg_saved_time = time.time()
        elif key in [ord(str(i)) for i in available_indices]:
            idx_pressed = int(chr(key))
            current_idx = idx_pressed
            side_by_side = False

    for cap in caps.values():
        cap.release()
    cv2.destroyAllWindows()
    print("\nTestador finalizado com sucesso.")

if __name__ == "__main__":
    test_cameras()
