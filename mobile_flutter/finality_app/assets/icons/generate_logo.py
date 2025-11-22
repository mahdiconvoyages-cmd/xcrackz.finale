from PIL import Image, ImageDraw
import math

def create_logo():
    """Crée le logo principal 512x512 avec fond blanc"""
    size = 512
    img = Image.new('RGBA', (size, size), 'white')
    draw = ImageDraw.Draw(img)
    
    # Couleur bleue
    blue = (0, 102, 255)
    
    # Paramètres du X
    center = size // 2
    length = 270
    width = 70
    
    # Fonction pour dessiner une barre arrondie
    def draw_rounded_rect_rotated(draw, center_x, center_y, length, width, angle, color):
        # Calculer les coins du rectangle
        half_length = length / 2
        half_width = width / 2
        
        # Points du rectangle avant rotation
        points = [
            (-half_width, -half_length),
            (half_width, -half_length),
            (half_width, half_length),
            (-half_width, half_length)
        ]
        
        # Rotation et translation
        angle_rad = math.radians(angle)
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)
        
        rotated_points = []
        for x, y in points:
            rx = x * cos_a - y * sin_a + center_x
            ry = x * sin_a + y * cos_a + center_y
            rotated_points.append((rx, ry))
        
        draw.polygon(rotated_points, fill=color)
        
        # Ajouter des cercles aux extrémités pour l'effet arrondi
        radius = width / 2
        for i in range(2):  # Deux extrémités
            ex = (-half_width if i == 0 else half_width)
            for ey in [-half_length, half_length]:
                rx = ex * cos_a - ey * sin_a + center_x
                ry = ex * sin_a + ey * cos_a + center_y
                draw.ellipse([rx-radius, ry-radius, rx+radius, ry+radius], fill=color)
    
    # Dessiner les deux barres du X
    draw_rounded_rect_rotated(draw, center, center, length, width, 45, blue)
    draw_rounded_rect_rotated(draw, center, center, length, width, -45, blue)
    
    # Point central décoratif
    circle_radius = 30
    draw.ellipse([center-circle_radius, center-circle_radius, 
                  center+circle_radius, center+circle_radius], 
                 fill=(0, 102, 255, 80))
    
    # Ajouter des coins arrondis au fond blanc
    img_rounded = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size, size], radius=80, fill=255)
    
    img_rounded.paste(img, (0, 0), mask)
    
    return img_rounded

def create_foreground():
    """Crée le foreground 512x512 avec fond transparent et marges 20%"""
    size = 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Couleur bleue
    blue = (0, 102, 255)
    
    # Paramètres du X (réduit de 20%)
    center = size // 2
    length = 220  # Réduit
    width = 60    # Réduit
    
    # Fonction pour dessiner une barre arrondie
    def draw_rounded_rect_rotated(draw, center_x, center_y, length, width, angle, color):
        half_length = length / 2
        half_width = width / 2
        
        points = [
            (-half_width, -half_length),
            (half_width, -half_length),
            (half_width, half_length),
            (-half_width, half_length)
        ]
        
        angle_rad = math.radians(angle)
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)
        
        rotated_points = []
        for x, y in points:
            rx = x * cos_a - y * sin_a + center_x
            ry = x * sin_a + y * cos_a + center_y
            rotated_points.append((rx, ry))
        
        draw.polygon(rotated_points, fill=color)
        
        radius = width / 2
        for i in range(2):
            ex = (-half_width if i == 0 else half_width)
            for ey in [-half_length, half_length]:
                rx = ex * cos_a - ey * sin_a + center_x
                ry = ex * sin_a + ey * cos_a + center_y
                draw.ellipse([rx-radius, ry-radius, rx+radius, ry+radius], fill=color)
    
    # Dessiner les deux barres du X
    draw_rounded_rect_rotated(draw, center, center, length, width, 45, blue)
    draw_rounded_rect_rotated(draw, center, center, length, width, -45, blue)
    
    # Point central
    circle_radius = 25
    draw.ellipse([center-circle_radius, center-circle_radius, 
                  center+circle_radius, center+circle_radius], 
                 fill=(0, 102, 255, 80))
    
    return img

# Générer les logos
print("Génération du logo principal...")
logo = create_logo()
logo.save('logo.png', 'PNG')
print("✓ logo.png créé")

print("Génération du foreground...")
foreground = create_foreground()
foreground.save('logo_foreground.png', 'PNG')
print("✓ logo_foreground.png créé")

print("\n✅ Les deux fichiers ont été créés avec succès!")
