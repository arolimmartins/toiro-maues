"""
Gera a voz humana do arara para a narrativa de abertura.

Roda UMA vez, no desenvolvimento. O resultado (MP3 + manifesto) fica versionado
em assets/voice/ e o jogo roda 100% offline, sem depender deste script nem de
nuvem em tempo de execucao.

Vozes neurais pt-BR (Edge TTS, sem credencial, sem conta):
    pt-BR-FranciscaNeural   feminina, "Friendly, Positive"  <- padrao
    pt-BR-ThalitaMultilingualNeural
    pt-BR-AntonioNeural     masculina

Uso:
    python -m pip install edge-tts
    python tools/gerar-voz.py
    VOZ=pt-BR-ThalitaMultilingualNeural python tools/gerar-voz.py
"""

import asyncio
import json
import os
import re
import struct
import sys
from pathlib import Path

import edge_tts

BASE = Path(__file__).resolve().parent.parent
SAIDA = BASE / "assets" / "voice"
VOZ = os.environ.get("VOZ", "pt-BR-FranciscaNeural")
RATE = os.environ.get("RATE", "+8%")
PITCH = os.environ.get("PITCH", "+14Hz")
VOLUME = os.environ.get("VOLUME", "+0%")


def falas_do_arara():
    """Le as falas do ARARA direto do story.js: o texto nunca fica duplicado."""
    src = (BASE / "src" / "game" / "story.js").read_text(encoding="utf-8")
    blocos = re.findall(r"\{\s*stage:.*?\n\s*\}", src, re.S)
    falas = []
    for i, bloco in enumerate(blocos):
        orador = re.search(r"speaker:\s*'([^']+)'", bloco)
        texto = re.search(r"text:\s*'((?:[^'\\]|\\.)*)'", bloco)
        if not orador or not texto:
            continue
        if orador.group(1) != "ARARA":
            continue
        limpo = texto.group(1).replace("\\'", "'")
        falas.append({"indiceCena": i, "texto": limpo})
    return falas


def duracao_mp3(caminho):
    """Duracao real lida dos cabecalhos de frame (CBR do Edge TTS)."""
    dados = caminho.read_bytes()
    taxas = [11025, 12000, 8000, 0, 0, 0, 22050, 24000, 32000]
    v1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    v2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    # Indices 3, 4 e 5 sao reservados: nao existe taxa de amostragem valida.
    taxa_valida = {0, 1, 2, 6, 7, 8}

    # Pula a tag ID3, se houver, para nao ler lixo como cabecalho de frame.
    inicio = 0
    if dados[:3] == b"ID3" and len(dados) > 10:
        tamanho = 0
        for b in dados[6:10]:
            tamanho = (tamanho << 7) | (b & 0x7F)
        inicio = 10 + tamanho

    i = inicio
    while i < len(dados) - 4:
        if dados[i] == 0xFF and (dados[i + 1] & 0xE0) == 0xE0:
            versao = (dados[i + 1] >> 3) & 0x03
            camada = (dados[i + 1] >> 1) & 0x03
            bi = (dados[i + 2] >> 4) & 0x0F
            ri = (dados[i + 2] >> 2) & 0x03
            if (
                versao != 1  # 1 = reservado; 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
                and camada == 1
                and 0 < bi < 15
                and ri in taxa_valida
            ):
                break
        i += 1
    if i >= len(dados) - 4:
        return 0.0

    mpeg1 = ((dados[i + 1] >> 3) & 0x03) == 3
    taxa = taxas[(dados[i + 2] >> 2) & 0x03]
    bitrate = (v1 if mpeg1 else v2)[(dados[i + 2] >> 4) & 0x0F] * 1000
    amostras = 1152 if mpeg1 else 576
    if not taxa or not bitrate:
        return 0.0

    quadros = 0
    pos = i
    while pos + 4 <= len(dados):
        if dados[pos] != 0xFF or (dados[pos + 1] & 0xE0) != 0xE0:
            break
        pad = (dados[pos + 2] >> 1) & 0x01
        tamanho = int((amostras / 8) * (bitrate / taxa)) + pad
        if tamanho <= 4:
            break
        pos += tamanho
        quadros += 1
    if not quadros:
        return 0.0
    return (quadros * amostras) / taxa


async def sintetizar(texto):
    """Retorna (bytes mp3, [(tempo_s, texto_da_marca), ...])."""
    comunicador = edge_tts.Communicate(texto, VOZ, rate=RATE, pitch=PITCH, volume=VOLUME)
    audio = bytearray()
    marcas = []
    async for chunk in comunicador.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
            # Edge devolve offset em ticks de 100 ns.
            marcas.append((chunk["offset"] / 1e7, chunk.get("text", "")))
    return bytes(audio), marcas


def indice_marcas(texto, marcas, duracao):
    """
    Converte as marcas do servico em deslocamento de caractere no texto, para o
    jogo escrever a frase no mesmo ritmo em que ela e falada.

    O edge-tts so devolve fronteira por frase, e o offset marca o COMECO da
    frase. Entao cada ancora e (inicio do texto ja falado, instante) e o jogo
    interpola o trecho seguinte ate a proxima ancora. A ultima ancora e o fim
    do audio com a frase inteira, senao o texto nunca completaria.
    """
    saida = []
    cursor = 0
    for tempo, trecho in marcas:
        alvo = texto.lower().find(trecho.lower(), cursor) if trecho else cursor
        if alvo < 0:
            alvo = cursor
        saida.append({"ate": alvo, "t": round(tempo, 3)})
        cursor = alvo + max(1, len(trecho))
    saida.append({"ate": len(texto), "t": round(duracao, 3)})
    return saida


async def main():
    falas = falas_do_arara()
    if not falas:
        print("nenhuma fala de ARARA encontrada em story.js", file=sys.stderr)
        return 1

    print(f"voz: {VOZ}  rate={RATE} pitch={PITCH}")
    print(f"falas do ARARA: {len(falas)}\n")
    SAIDA.mkdir(parents=True, exist_ok=True)

    clips = []
    for i, fala in enumerate(falas):
        texto = fala["texto"]
        audio, marcas = await sintetizar(texto)
        if len(audio) < 2048:
            print(f"  fala {i+1}: audio curto demais, pulando", file=sys.stderr)
            return 1

        nome = f"arara_{i + 1}.mp3"
        destino = SAIDA / nome
        destino.write_bytes(audio)

        dur = duracao_mp3(destino)
        if not dur:
            print(f"  fala {i+1}: nao consegui ler a duracao", file=sys.stderr)
            return 1

        marcas_idx = indice_marcas(texto, marcas, dur)
        kb = destino.stat().st_size / 1024
        print(f"  {nome:14s} {dur:5.2f}s {kb:6.1f} KB  {len(marcas_idx):2d} marcas de ritmo")
        clips.append({
            "arquivo": nome,
            "indiceCena": fala["indiceCena"],
            "duracao": round(dur, 3),
            "texto": texto,
            "marcas": marcas_idx,
        })

    manifesto = {
        "voz": VOZ,
        "rate": RATE,
        "pitch": PITCH,
        "gerador": "edge-tts (voz neural pt-BR) via tools/gerar-voz.py",
        "nota": "marcas[].t em segundos a partir do inicio do clipe; marcas[].ate = deslocamento de caractere ja falado naquele instante",
        "clips": clips,
    }
    (SAIDA / "manifest.json").write_text(
        json.dumps(manifesto, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # O jogo e carregado por file:// (main.js usa loadFile) e o Chromium bloqueia
    # fetch/XHR nesse esquema. Por isso os clipes viram um JS global, no mesmo
    # estilo das demais tabelas do projeto, e o manifesto JSON fica so como
    # referencia para o humans e para os testes.
    js = (
        "/**\n"
        " * Voz do arara - clipes gravados.\n"
        " *\n"
        " * ARQUIVO GERADO por tools/gerar-voz.py. Nao editar a mao.\n"
        " * Mudou a frase em src/game/story.js? Rode o gerador de novo, senao o\n"
        " * papagaio fala uma coisa e a caixa de texto mostra outra.\n"
        " *\n"
        " * marcas[].t  = segundos desde o inicio do clipe\n"
        " * marcas[].ate = quantos caracteres da frase ja foram falados ali\n"
        " */\n"
        f"const VOICE_META = {json.dumps({k: v for k, v in manifesto.items() if k != 'clips'}, ensure_ascii=False, indent=2)};\n\n"
        f"const VOICE_CLIPS = {json.dumps(clips, ensure_ascii=False, indent=2)};\n"
    )
    destino_js = BASE / "src" / "game" / "voice-clips.js"
    destino_js.write_text(js, encoding="utf-8")

    print(f"\nmanifest.json com {len(clips)} clips em {SAIDA}")
    print(f"voice-clips.js gerado em {destino_js}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
