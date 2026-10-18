# Kit Visual MTD — Dashboard do Aluno

Estes assets reproduzem as camadas decorativas da referência aprovada sem transformar os componentes funcionais em imagens.

## Arquivos

- `svg/mtd-main-background.svg`: fundo perolado e arquitetura institucional da área principal.
- `svg/mtd-sidebar-background.svg`: fundo completo da sidebar, com fachada e curvas douradas.
- `svg/mtd-class-card-background.svg`: fundo do cabeçalho da próxima aula, com mapa pontilhado e recortes geométricos.
- `svg/mtd-journey-background.svg`: fundo decorativo da faixa “Sua Jornada MTD”.
- `svg/mtd-logo-mark.svg`: símbolo dourado demonstrativo da marca.
- `png/`: versões PNG prontas para ferramentas que não aceitem SVG.
- `dashboard-referencia-aprovada.png`: referência visual que define composição, proporções e hierarquia.

## Regra de implementação

Os SVGs devem ser usados somente como `background-image`, `<img>` decorativa ou pseudo-elemento. Textos, números, botões, links, estados, fotos, barras de progresso e dados devem continuar sendo HTML/React dinâmico.

Não usar o print completo como fundo da página e não recortar cards inteiros como imagens.

## Aplicação sugerida

```css
.student-shell {
  background: #f8f6f1 url('/assets/mtd/mtd-main-background.svg') center top / cover no-repeat;
}

.student-sidebar {
  background: #06142c url('/assets/mtd/mtd-sidebar-background.svg') center / cover no-repeat;
}

.next-class-hero {
  background: #06142c url('/assets/mtd/mtd-class-card-background.svg') center / cover no-repeat;
}

.journey-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/assets/mtd/mtd-journey-background.svg') center / cover no-repeat;
  pointer-events: none;
  z-index: 0;
}
```

Todos os conteúdos do card da jornada devem usar `position: relative; z-index: 1`.

## Cores principais

- Navy: `#06142C`
- Navy secundário: `#0B1D43`
- Violeta: `#5B2FE8`
- Dourado: `#D89A25`
- Marfim: `#F8F6F1`
- Texto: `#07132E`
- Muted: `#60708F`
- Sucesso: `#16A879`

## Fontes

- Títulos editoriais: `DM Serif Display` ou `Playfair Display`.
- Interface: `Inter`.

