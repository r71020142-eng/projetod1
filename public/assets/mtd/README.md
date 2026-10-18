# Backgrounds oficiais MTD — versão fiel v4

Este pacote substitui os SVGs simplificados anteriores. Os arquivos foram reconstruídos diretamente a partir da referência visual aprovada.

## Arquivos recomendados

- `webp/mtd-main-background.webp`: fundo principal do portal do aluno.
- `webp/mtd-sidebar-background.webp`: fundo vertical da sidebar.
- `webp/mtd-class-card-background.webp`: fundo completo e aprovado do cabeçalho da próxima aula, já com mapa discreto.
- `webp/mtd-class-card-base.webp`: mesma imagem sem mapa.
- `webp/mtd-world-map-overlay.webp`: mapa separado para ajuste fino opcional.
- `webp/mtd-journey-background.webp`: fundo da faixa Sua Jornada MTD.
- `png/`: versões PNG em alta qualidade dos mesmos arquivos.
- `dashboard-referencia-aprovada.png`: composição oficial a ser seguida.

Use WebP na aplicação e mantenha PNG como fonte de alta qualidade/fallback.

## Aplicação

```css
.student-shell {
  background-color: #f9f7f2;
  background-image: url('/assets/mtd/mtd-main-background.webp');
  background-position: top center;
  background-size: cover;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.student-sidebar {
  background-color: #06142c;
  background-image: url('/assets/mtd/mtd-sidebar-background.webp');
  background-position: center right;
  background-size: cover;
  background-repeat: no-repeat;
}

.next-class-hero {
  background-color: #06142c;
  background-image: url('/assets/mtd/mtd-class-card-background.webp');
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.journey-card {
  background-color: #faf8f3;
  background-image: url('/assets/mtd/mtd-journey-background.webp');
  background-position: center right;
  background-size: cover;
  background-repeat: no-repeat;
}
```

## Mapa separado opcional

O arquivo `mtd-class-card-background.webp` já contém o mapa na posição recomendada. Use a versão separada apenas se precisar de ajuste fino responsivo.

```css
.next-class-hero {
  position: relative;
  overflow: hidden;
  background-image: url('/assets/mtd/mtd-class-card-base.webp');
}

.next-class-hero::after {
  content: '';
  position: absolute;
  width: clamp(160px, 24%, 220px);
  aspect-ratio: 2 / 1;
  right: 16%;
  top: 24%;
  background: url('/assets/mtd/mtd-world-map-overlay.webp') center / contain no-repeat;
  opacity: 0.2;
  pointer-events: none;
  z-index: 0;
}

.next-class-hero > * {
  position: relative;
  z-index: 1;
}
```

## Regras obrigatórias

- Não aplicar filtros, gradientes ou overlays adicionais sobre estes backgrounds.
- Não alterar cor, saturação, contraste ou opacidade do arquivo completo.
- Não usar o dashboard inteiro como imagem de fundo.
- Cards, textos, botões, ícones e dados continuam sendo HTML/React.
- Assets decorativos devem usar `pointer-events: none` quando estiverem em pseudo-elementos.
- Não reutilizar os SVGs simplificados das versões anteriores.

