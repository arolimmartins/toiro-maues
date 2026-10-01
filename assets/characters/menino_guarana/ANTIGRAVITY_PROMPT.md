# Prompt para Google Antigravity

Integre a pasta `Menino_Guarana_Sprites` ao projeto atual.

1. Localize o personagem do menino do guaraná.
2. Use os PNGs organizados nas pastas de animação.
3. Não redesenhe o personagem e não altere as proporções.
4. Crie as animações: idle, walk_right, walk_left, walk_front, walk_back, run_right, run_left, jump, collect, lift_basket, collect_happy, sad, angry, surprise, hurt, death e victory.
5. Para cada animação, carregue os frames numerados em ordem.
6. Use loop apenas em idle, walk e run. As animações de coleta, dano, morte, vitória e emoções devem tocar uma vez quando disparadas.
7. Conecte as animações à lógica do personagem:
   - parado -> idle
   - movimento -> walk
   - corrida -> run
   - espaço -> jump
   - perto de um pé de guaraná + ação -> collect
   - coleta concluída -> collect_happy
   - coleta perdida -> sad
   - obstáculo/inimigo -> hurt
   - fim da vida -> death
   - objetivo concluído -> victory
8. Se o projeto já possuir um controlador de personagem, preserve a lógica existente e altere apenas a camada de animação.
9. Primeiro analise a estrutura do projeto e depois faça a integração.
10. Ao terminar, teste as transições e informe quais arquivos foram alterados.
