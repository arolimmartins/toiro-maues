import pygame
import random
import math

class Particle:
    def __init__(self, x, y, vx, vy, color, radius, decay, kind="smoke"):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.color = list(color)
        self.radius = radius
        self.decay = decay
        self.kind = kind
        self.alpha = 255

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.radius = max(0, self.radius - self.decay)
        self.alpha = max(0, self.alpha - int(self.decay * 40))
        return self.radius > 0.5 and self.alpha > 10

    def draw(self, screen):
        if self.radius <= 0: return
        surf = pygame.Surface((int(self.radius * 2 + 2), int(self.radius * 2 + 2)), pygame.SRCALPHA)
        c = (self.color[0], self.color[1], self.color[2], int(min(255, self.alpha)))
        pygame.draw.circle(surf, c, (int(self.radius + 1), int(self.radius + 1)), int(self.radius))
        screen.blit(surf, (self.x - self.radius, self.y - self.radius))

class ParticleSystem:
    def __init__(self):
        self.particles = []

    def emit_smoke(self, x, y, count=2):
        for _ in range(count):
            vx = random.uniform(-0.6, 0.6)
            vy = random.uniform(-0.6, 0.6)
            color = (200, 210, 220)
            p = Particle(x, y, vx, vy, color, radius=random.uniform(4, 7), decay=0.25, kind="smoke")
            self.particles.append(p)

    def emit_nitro(self, x, y, angle, count=3):
        # Emite no sentido oposto ao movimento
        for _ in range(count):
            speed = random.uniform(3.0, 5.5)
            spread = random.uniform(-0.4, 0.4)
            vx = -math.cos(angle + spread) * speed
            vy = -math.sin(angle + spread) * speed
            color = random.choice([(0, 220, 255), (0, 140, 255), (255, 200, 50)])
            p = Particle(x, y, vx, vy, color, radius=random.uniform(3.5, 6.0), decay=0.35, kind="nitro")
            self.particles.append(p)

    def emit_sparks(self, x, y, count=8):
        for _ in range(count):
            spd = random.uniform(2.0, 5.0)
            ang = random.uniform(0, 2 * math.pi)
            vx = math.cos(ang) * spd
            vy = math.sin(ang) * spd
            color = random.choice([(255, 230, 80), (255, 140, 30), (255, 255, 200)])
            p = Particle(x, y, vx, vy, color, radius=random.uniform(2.5, 4.0), decay=0.3, kind="spark")
            self.particles.append(p)

    def emit_coin_pickup(self, x, y, count=10):
        for _ in range(count):
            spd = random.uniform(1.5, 3.5)
            ang = random.uniform(0, 2 * math.pi)
            vx = math.cos(ang) * spd
            vy = math.sin(ang) * spd - 1.0 # flutua para cima
            color = random.choice([(255, 220, 40), (255, 255, 120), (255, 180, 0)])
            p = Particle(x, y, vx, vy, color, radius=random.uniform(3.0, 5.0), decay=0.18, kind="coin")
            self.particles.append(p)

    def update(self):
        self.particles = [p for p in self.particles if p.update()]

    def draw(self, screen):
        for p in self.particles:
            p.draw(screen)
