#!/usr/bin/env python3
"""
Gera o conjunto completo de ícones PWA oficiais da plataforma Método Paulo (MTD).
Baseado na geometria vetorial do mtd-logo-mark.svg com acabamento em degradê dourado
sobre fundo marinho nobre (#0F172A) ou transparente, com zonas seguras de maskable icon.
"""

import math
import os
from PIL import Image, ImageDraw

OUTPUT_DIR = "/Users/raypires/.gemini/antigravity/scratch/demonstrativo-mtd/public/icons"
PUBLIC_DIR = "/Users/raypires/.gemini/antigravity/scratch/demonstrativo-mtd/public"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def render_logo(size=512, bg_color=(15, 23, 42, 255), padding_ratio=0.18):
    # Supersampling 4x para antialiasing de precisão cirúrgica
    ss = 4
    canvas_size = size * ss
    img = Image.new('RGBA', (canvas_size, canvas_size), bg_color)
    
    # Escala e offset para o viewBox 96x96
    target_box_size = canvas_size * (1.0 - 2 * padding_ratio)
    scale = target_box_size / 96.0
    offset_x = (canvas_size - 96.0 * scale) / 2.0
    offset_y = (canvas_size - 96.0 * scale) / 2.0
    
    # Degradê dourado oficial MTD:
    # 0.00: #F4C35B (244, 195, 91)
    # 0.55: #D89A25 (216, 154, 37)
    # 1.00: #B97812 (185, 120, 18)
    def get_gold_color(t, opacity=1.0):
        if t <= 0.55:
            f = t / 0.55
            r = int(244 + f * (216 - 244))
            g = int(195 + f * (154 - 195))
            b = int(91 + f * (37 - 91))
        else:
            f = (t - 0.55) / 0.45
            r = int(216 + f * (185 - 216))
            g = int(154 + f * (120 - 154))
            b = int(37 + f * (18 - 37))
        a = int(255 * opacity)
        return (r, g, b, a)

    # Polígonos vetoriais originais do mtd-logo-mark.svg
    polys = [
        ([(16, 24), (48, 43), (80, 24), (80, 36), (48, 55), (16, 36)], 1.0),
        ([(16, 43), (48, 62), (80, 43), (80, 55), (48, 74), (16, 55)], 0.90),
        ([(28, 67), (48, 79), (68, 67), (68, 78), (48, 90), (28, 78)], 0.78),
    ]

    for raw_pts, opacity in polys:
        scaled_pts = [(offset_x + p[0] * scale, offset_y + p[1] * scale) for p in raw_pts]
        mask = Image.new('L', (canvas_size, canvas_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.polygon(scaled_pts, fill=255)
        
        # Vetor gradiente (x1=18, y1=14) -> (x2=78, y2=82)
        gx1 = offset_x + 18 * scale
        gy1 = offset_y + 14 * scale
        gx2 = offset_x + 78 * scale
        gy2 = offset_y + 82 * scale
        glen = math.hypot(gx2 - gx1, gy2 - gy1)
        gux = (gx2 - gx1) / glen
        guy = (gy2 - gy1) / glen
        
        min_x = max(0, int(min(p[0] for p in scaled_pts)))
        max_x = min(canvas_size, int(max(p[0] for p in scaled_pts)) + 1)
        min_y = max(0, int(min(p[1] for p in scaled_pts)))
        max_y = min(canvas_size, int(max(p[1] for p in scaled_pts)) + 1)
        
        poly_layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        for y in range(min_y, max_y):
            for x in range(min_x, max_x):
                if mask.getpixel((x, y)) > 0:
                    proj = (x - gx1) * gux + (y - gy1) * guy
                    t = max(0.0, min(1.0, proj / glen))
                    poly_layer.putpixel((x, y), get_gold_color(t, opacity))
        
        img = Image.alpha_composite(img, poly_layer)

    return img.resize((size, size), Image.Resampling.LANCZOS)

def main():
    navy_bg = (15, 23, 42, 255)       # #0F172A (Brand Navy)
    transparent_bg = (0, 0, 0, 0)     # Transparente

    print("Gerando ícones PWA para o DEMOSTRATIVO MTD...")
    
    # 1. Ícones padrão com fundo da marca (alta visibilidade no launcher)
    icon_192 = render_logo(size=192, bg_color=navy_bg, padding_ratio=0.18)
    icon_192.save(os.path.join(OUTPUT_DIR, "icon-192.png"))
    print("✓ icon-192.png")

    icon_512 = render_logo(size=512, bg_color=navy_bg, padding_ratio=0.18)
    icon_512.save(os.path.join(OUTPUT_DIR, "icon-512.png"))
    print("✓ icon-512.png")

    # 2. Ícone maskable (com padding de 25% para respeitar a safe-zone de 80% do Android)
    icon_maskable = render_logo(size=512, bg_color=navy_bg, padding_ratio=0.25)
    icon_maskable.save(os.path.join(OUTPUT_DIR, "icon-maskable-512.png"))
    print("✓ icon-maskable-512.png")

    # 3. Apple Touch Icon (180x180, fundo sólido obrigatório para iOS)
    apple_icon = render_logo(size=180, bg_color=navy_bg, padding_ratio=0.18)
    apple_icon.save(os.path.join(OUTPUT_DIR, "apple-touch-icon.png"))
    apple_icon.save(os.path.join(PUBLIC_DIR, "apple-touch-icon.png"))
    print("✓ apple-touch-icon.png (em /public/icons e /public)")

    # 4. Ícones transparentes (para barra de notificações ou splash transparente)
    icon_t192 = render_logo(size=192, bg_color=transparent_bg, padding_ratio=0.12)
    icon_t192.save(os.path.join(OUTPUT_DIR, "icon-transparent-192.png"))
    print("✓ icon-transparent-192.png")

    icon_t512 = render_logo(size=512, bg_color=transparent_bg, padding_ratio=0.12)
    icon_t512.save(os.path.join(OUTPUT_DIR, "icon-transparent-512.png"))
    print("✓ icon-transparent-512.png")

    # 5. Favicons pequenos
    fav_32 = render_logo(size=32, bg_color=navy_bg, padding_ratio=0.12)
    fav_32.save(os.path.join(OUTPUT_DIR, "favicon-32x32.png"))
    fav_32.save(os.path.join(PUBLIC_DIR, "favicon-32x32.png"))
    
    fav_16 = render_logo(size=16, bg_color=navy_bg, padding_ratio=0.10)
    fav_16.save(os.path.join(OUTPUT_DIR, "favicon-16x16.png"))
    fav_16.save(os.path.join(PUBLIC_DIR, "favicon-16x16.png"))
    print("✓ favicons 32x32 e 16x16")

    print("\nTodos os ícones PWA gerados com sucesso!")

if __name__ == "__main__":
    main()
