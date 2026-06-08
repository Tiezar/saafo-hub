# Especificação de Design — Ambiente Sonoro no Pomodoro (Lo-Fi & Chuva)

**Data:** 2026-06-08  
**Autor:** Antigravity  
**Status:** Proposto  

---

## 1. Objetivo & Escopo
Melhorar a experiência de foco do usuário no módulo de Pomodoro do SAAFO HUB, permitindo a reprodução de faixas de som ambiente (Lo-Fi, Chuva, Sons de Natureza, Café Jazz) e a inserção de playlists/vídeos personalizados do YouTube. O player deve ser visualmente integrado ao **Marginália Design System**, operando de forma silenciosa/oculta e controlado via React.

---

## 2. Requisitos de Interface (UI/UX)
*   **Integração no Painel:** O player ficará posicionado na coluna da direita do Pomodoro, abaixo do "Contexto de Estudo".
*   **Controles Disponíveis:**
    *   Dropdown customizado (`CustomSelect` ou seletor estilizado) com faixas pré-definidas e faixas customizadas.
    *   Botões de Play/Pause.
    *   Botão "Pular faixa" (Next).
    *   Slider de volume minimalista (0% a 100%) com ícone de áudio.
    *   Botão "Adicionar som" (ícone de `+`) para abrir o modal customizado.
*   **Modal de Criação:** Um modal estilizado com as classes `.modal-overlay` e `.modal` contendo:
    *   Campo "Nome do Som" (ex: "Meu Lo-Fi Favorito").
    *   Campo "URL do Vídeo/Playlist no YouTube".
    *   Botões "Cancelar" e "Adicionar".

---

## 3. Arquitetura Técnica & API do YouTube
*   **Iframe Oculto:** O player do YouTube será montado em um container off-screen:
    ```css
    .hidden-youtube-player {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    }
    ```
*   **Carregamento Dinâmico:** Script do YouTube IFrame API (`https://www.youtube.com/iframe_api`) será injetado dinamicamente caso `window.YT` não esteja disponível.
*   **Manipulação de Eventos:**
    *   O volume e o status de reprodução (`isPlaying`) serão controlados através das chamadas de API do objeto `YT.Player`.
    *   Extração de IDs: Utilitário regex para extrair ID de vídeo (`v=ID`) ou ID de playlist (`list=ID`) de links colados pelo usuário.

---

## 4. Persistência de Estado (localStorage)
As preferências serão salvas localmente nas chaves correspondentes:
*   `pomo_audio_volume`: Último volume ajustado (padrão: `50`).
*   `pomo_audio_track_id`: ID da última faixa ativa (padrão: primeira faixa curada).
*   `pomo_audio_custom_tracks`: Array JSON com os sons personalizados cadastrados pelo usuário.

---

## 5. Lista Inicial de Sons Curados
1.  **Lofi Girl Focus:** `jfKfPfyJRdk` (Live stream ID / Vídeo ID)
2.  **Som de Chuva Intensa:** `hBGwt25VJ-s`
3.  **Café Jazz Lounge:** `5w3T1Jg0t6w`
4.  **Sons da Floresta:** `mPZkdNFkNps`

---

## 6. Autoplay & Restrições do Navegador
*   Devido às políticas modernas dos navegadores, a reprodução de mídia requer uma ação direta do usuário. O player será inicializado em estado **pausado**, dependendo do clique inicial no botão "Play" para começar.
