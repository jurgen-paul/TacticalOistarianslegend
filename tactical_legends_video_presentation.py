#!/usr/bin/env python3
"""
TACTICAL LEGENDS - RISE OF OISTARIAN
Video Presentation Generator & Visualizer

A high-fidelity Python presentation runner using Pygame. Designed to run both in
an interactive GUI window with custom retro effects AND headlessly inside CI/CD
environments to output individual video frames.
"""

import os
import sys
import math
import random
import time

# Handle headless execution for CI/CD pipelines
if "--headless" in sys.argv:
    os.environ["SDL_VIDEODRIVER"] = "dummy"
    os.environ["SDL_AUDIODRIVER"] = "dummy"

try:
    import pygame
except ImportError:
    print("Pygame library is required! Please run: pip install pygame", file=sys.stderr)
    sys.exit(1)

# Check for OpenCV optional support to export MP4 files
HAS_OPENCV = False
try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    pass

# ==============================================================================
# CONFIGURATIONS & THEME COLORS
# ==============================================================================
WIDTH, HEIGHT = 1280, 720
FPS = 60

# Cyberpunk slate/neon design palette
COLOR_BG = (10, 10, 12)
COLOR_WHITE = (245, 245, 250)
COLOR_GREY = (80, 85, 95)
COLOR_CYAN = (34, 211, 238)       # #22d3ee
COLOR_CYAN_DIM = (10, 80, 100)
COLOR_RED = (239, 68, 68)         # #ef4444
COLOR_RED_DIM = (90, 20, 20)
COLOR_GREEN = (34, 197, 94)       # #22c55e
COLOR_GREEN_DIM = (10, 70, 30)

# SCENE CONFIGURATIONS (Timings in milliseconds)
SCENES = [
    {
        "id": "opening",
        "title": "ARCHIVE PROTOCOL #404-NEXUS",
        "subtitle": "SECURE DATA RESTORATION IN PROCESS",
        "duration": 5000,
        "bg_fx": "grid",
        "audio_freq": 180,
    },
    {
        "id": "flash_cuts",
        "title": "TACTICAL INTERFERENCE MATRIX",
        "subtitle": "DIMENSIONAL STABILITY: CRITICAL",
        "duration": 4000,
        "bg_fx": "interference",
        "audio_freq": 280,
    },
    {
        "id": "combat",
        "title": "SENTINEL INTERFACE BREACHED",
        "subtitle": "TARGETS ENGAGED - EXTRACTING TELEMETRY",
        "duration": 6000,
        "bg_fx": "vortices",
        "audio_freq": 220,
    },
    {
        "id": "montage",
        "title": "CHRONOS METRIC SYNCING",
        "subtitle": "OISTARIAN CORE OVERLOAD DETECTED",
        "duration": 5000,
        "bg_fx": "matrix",
        "audio_freq": 350,
    },
    {
        "id": "reveal",
        "title": "TACTICAL LEGENDS",
        "subtitle": "RISE OF OISTARIAN",
        "duration": 8000,
        "bg_fx": "glowing_logo",
        "audio_freq": 440,
    },
    {
        "id": "tagline",
        "title": "RE-INITIALIZE SENTINEL PROTOCOLS",
        "subtitle": "PILOT CREDENTIALS LOCKED IN SECTOR 7",
        "duration": 5000,
        "bg_fx": "scanlines",
        "audio_freq": 320,
    }
]

# ==============================================================================
# SOUND SYNTHESIS ENGINE
# ==============================================================================
class SynthEngine:
    def __init__(self):
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=1, buffer=512)
            self.mixer_ready = True
        except Exception as e:
            self.mixer_ready = False
            print(f"Audio device not available: {e}. Running in silent mode.")

    def play_tone(self, frequency, duration_ms, type="sawtooth"):
        if not self.mixer_ready:
            return
        
        sample_rate = 22050
        n_samples = int(sample_rate * (duration_ms / 1000.0))
        buf = bytearray(n_samples * 2) # 16-bit sound
        
        for i in range(n_samples):
            t = i / sample_rate
            if type == "sawtooth":
                # Sawtooth wave
                val = int(24000 * (2.0 * (t * frequency - math.floor(t * frequency + 0.5))))
            else:
                # Sine wave
                val = int(24000 * math.sin(2.0 * math.pi * frequency * t))
            
            # Simple fade-out envelope to remove clicks
            if i > n_samples - 1000:
                val = int(val * ((n_samples - i) / 1000.0))
            if i < 1000:
                val = int(val * (i / 1000.0))

            structval = val & 0xFFFF
            buf[2*i] = structval & 0xFF
            buf[2*i+1] = (structval >> 8) & 0xFF
            
        sound = pygame.mixer.Sound(buffer=buf)
        sound.play()

# ==============================================================================
# GRAPHICS & FX HANDLERS
# ==============================================================================
class ParticleSystem:
    def __init__(self):
        self.particles = []

    def spawn(self, x, y, color, count=5):
        for _ in range(count):
            self.particles.append({
                "x": x,
                "y": y,
                "vx": random.uniform(-4, 4),
                "vy": random.uniform(-4, 4),
                "life": 1.0,
                "decay": random.uniform(0.02, 0.05),
                "color": color,
                "size": random.randint(2, 6)
            })

    def update(self):
        for p in self.particles[:]:
            p["x"] += p["vx"]
            p["y"] += p["vy"]
            p["life"] -= p["decay"]
            if p["life"] <= 0:
                self.particles.remove(p)

    def draw(self, surface):
        for p in self.particles:
            alpha = int(p["life"] * 255)
            # Create surf with alpha path
            color = p["color"]
            r = max(2, int(p["size"] * p["life"]))
            pos = (int(p["x"]), int(p["y"]))
            pygame.draw.circle(surface, color, pos, r)

class VideoPresentation:
    def __init__(self, export_mode=False):
        pygame.init()
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption("TACTICAL LEGENDS - PRESENTATION RUNTIME")
        self.clock = pygame.time.Clock()
        self.synth = SynthEngine()
        self.particles = ParticleSystem()
        self.font_large = pygame.font.SysFont("Courier", 42, bold=True)
        self.font_small = pygame.font.SysFont("Courier", 18, bold=False)
        
        self.export_mode = export_mode
        self.frame_count = 0
        self.export_dir = "presentation_output"
        if self.export_mode:
            os.makedirs(self.export_dir, exist_ok=True)
            print(f"Exporting frames to directory: '{self.export_dir}'")

        # Runtime states
        self.current_scene_idx = 0
        self.scene_start_time = pygame.time.get_ticks()
        self.running = True
        self.glitch_active = False
        self.last_tone_played = -1

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                elif event.key == pygame.K_SPACE:
                    self.next_scene()

    def next_scene(self):
        # Trigger dynamic sound transition feedback
        self.synth.play_tone(600, 150, "sine")
        self.particles.spawn(WIDTH // 2, HEIGHT // 2, COLOR_CYAN, 30)
        
        self.current_scene_idx += 1
        if self.current_scene_idx >= len(SCENES):
            self.running = False
        else:
            self.scene_start_time = pygame.time.get_ticks()
            # Reset gltich
            self.glitch_active = True

    def draw_grid(self, progress):
        spacing = 50
        offset_y = int((progress * 150) % spacing)
        for y in range(-spacing, HEIGHT + spacing, spacing):
            pygame.draw.line(self.screen, COLOR_CYAN_DIM, (0, y + offset_y), (WIDTH, y + offset_y), 1)
        for x in range(0, WIDTH, spacing):
            pygame.draw.line(self.screen, COLOR_CYAN_DIM, (x, 0), (x, HEIGHT), 1)

    def draw_interference(self):
        for _ in range(12):
            y = random.randint(0, HEIGHT)
            h = random.randint(2, 8)
            pygame.draw.rect(self.screen, COLOR_RED_DIM, (0, y, WIDTH, h))
        if random.random() < 0.15:
            # Complete visual blockout glitch line
            pygame.draw.rect(self.screen, COLOR_CYAN, (0, random.randint(100, 600), WIDTH, 24))

    def draw_vortices(self, elapsed):
        cx, cy = WIDTH // 2, HEIGHT // 2
        for r in range(40, 400, 40):
            pulse_r = r + math.sin(elapsed * 0.005 + r) * 15
            pygame.draw.circle(self.screen, COLOR_CYAN_DIM, (cx, cy), int(pulse_r), 1)
        # Vector points rotation
        num_targets = 8
        for i in range(num_targets):
            angle = (elapsed * 0.003) + (i * (2 * math.pi / num_targets))
            tx = int(cx + math.cos(angle) * 180)
            ty = int(cy + math.sin(angle) * 180)
            pygame.draw.circle(self.screen, COLOR_RED, (tx, ty), 6)
            pygame.draw.line(self.screen, COLOR_GREY, (cx, cy), (tx, ty), 1)

    def draw_matrix(self, elapsed):
        for x in range(20, WIDTH, 80):
            speed = (x % 3 + 1) * 0.1
            y = int((elapsed * speed) % (HEIGHT + 100)) - 50
            for k in range(5):
                alpha_char = self.font_small.render(chr(random.randint(33, 126)), True, COLOR_RED_DIM)
                self.screen.blit(alpha_char, (x, y - (k * 18)))

    def draw_glowing_logo(self, elapsed):
        cx, cy = WIDTH // 2, HEIGHT // 2
        pulse = abs(math.sin(elapsed * 0.003)) * 80
        # Shadow glow layers
        for r in range(5, int(pulse), 10):
            pygame.draw.polygon(self.screen, COLOR_CYAN_DIM, [
                (cx, cy - 100 - r),
                (cx + 120 + r, cy + 80 + r),
                (cx - 120 - r, cy + 80 + r)
            ], 1)

    def draw_scanlines(self):
        for y in range(0, HEIGHT, 4):
            pygame.draw.line(self.screen, (0, 0, 0), (0, y), (WIDTH, y), 1)

    def run(self):
        print("\n" + "="*80)
        print("           NEXUS-1 CINEMATIC VIDEO WORKFLOW ACTIVE")
        print("="*80)
        print("  Press SPACE to trigger instantaneous scene transition")
        print("  Press ESCAPE to abort presentation anytime")
        print("-"*80)

        while self.running:
            now = pygame.time.get_ticks()
            elapsed_scene = now - self.scene_start_time
            
            # Retrieve scene info
            scene = SCENES[self.current_scene_idx]
            duration = scene["duration"]
            progress = min(1.0, elapsed_scene / duration)

            # Auto scene advance
            if elapsed_scene >= duration:
                self.next_scene()
                continue

            self.handle_events()
            self.screen.fill(COLOR_BG)

            # Trigger scene frequency tone once
            if self.last_tone_played != self.current_scene_idx:
                self.synth.play_tone(scene["audio_freq"], 350, "sawtooth")
                self.last_tone_played = self.current_scene_idx

            # ------------------------------------------------------------------
            # BG STATIC/DYNAMIC EFFECTS
            # ------------------------------------------------------------------
            bg_fx = scene["bg_fx"]
            if bg_fx == "grid":
                self.draw_grid(progress)
            elif bg_fx == "interference":
                self.draw_interference()
            elif bg_fx == "vortices":
                self.draw_vortices(elapsed_scene)
            elif bg_fx == "matrix":
                self.draw_matrix(elapsed_scene)
            elif bg_fx == "glowing_logo":
                self.draw_glowing_logo(elapsed_scene)
            elif bg_fx == "scanlines":
                self.draw_scanlines()

            # Random overlay particles
            if random.random() < 0.2:
                self.particles.spawn(random.randint(0, WIDTH), random.randint(0, HEIGHT), COLOR_CYAN, 2)

            self.particles.update()
            self.particles.draw(self.screen)

            # ------------------------------------------------------------------
            # CYBERNETIC READOUT & OVERLAY HUD
            # ------------------------------------------------------------------
            # Frame framing box lines
            pygame.draw.rect(self.screen, COLOR_GREY, (30, 30, WIDTH - 60, HEIGHT - 60), 1)
            # HUD details
            hud_scene_cnt = f"SCN_SEQ: 0{self.current_scene_idx + 1} / 0{len(SCENES)}"
            hud_prog = f"TRACKING_METRIC_PROG: {int(progress * 100)}%"
            hud_fps = f"VPU_REFRESH: {int(self.clock.get_fps())} FPS"
            
            surf_cnt = self.font_small.render(hud_scene_cnt, True, COLOR_CYAN)
            surf_prog = self.font_small.render(hud_prog, True, COLOR_CYAN)
            surf_fps = self.font_small.render(hud_fps, True, COLOR_GREY)
            
            self.screen.blit(surf_cnt, (50, 50))
            self.screen.blit(surf_prog, (WIDTH - 50 - surf_prog.get_width(), 50))
            self.screen.blit(surf_fps, (50, HEIGHT - 70))

            # Progress Bar Track rendering
            bar_w = WIDTH - 100
            pygame.draw.rect(self.screen, COLOR_RED_DIM, (50, 90, bar_w, 3))
            pygame.draw.rect(self.screen, COLOR_RED, (50, 90, int(bar_w * progress), 3))

            # ------------------------------------------------------------------
            # TYPOGRAPHY & TITLE TRANSITIONS
            # ------------------------------------------------------------------
            # Simple text glitching implementation
            glitch_disp_x = 0
            if random.random() < 0.08:
                glitch_disp_x = random.randint(-15, 15)

            title_text = scene["title"]
            subtitle_text = scene["subtitle"]

            # Staggered fade in/out alpha animation helper
            alpha = 255
            if progress < 0.15:
                # Fade in
                alpha = int((progress / 0.15) * 255)
            elif progress > 0.85:
                # Fade out
                alpha = int(((1.0 - progress) / 0.15) * 255)
            alpha = max(0, min(255, alpha))

            # Rendering scene texts with shadow layers
            main_color = (max(0, min(COLOR_CYAN[0], alpha)), max(0, min(COLOR_CYAN[1], alpha)), max(0, min(COLOR_CYAN[2], alpha)))
            sub_color = (max(0, min(COLOR_WHITE[0], alpha)), max(0, min(COLOR_WHITE[1], alpha)), max(0, min(COLOR_WHITE[2], alpha)))
            
            surf_title = self.font_large.render(title_text, True, main_color)
            surf_sub = self.font_small.render(subtitle_text, True, sub_color)

            # Center positioning calculation
            tc_x = (WIDTH - surf_title.get_width()) // 2 + glitch_disp_x
            tc_y = (HEIGHT - surf_title.get_height()) // 2 - 20
            sc_x = (WIDTH - surf_sub.get_width()) // 2
            sc_y = (HEIGHT - surf_sub.get_height()) // 2 + 40

            # Render glitch shadow if glitching
            if glitch_disp_x != 0:
                shadow_surf = self.font_large.render(title_text, True, COLOR_RED)
                self.screen.blit(shadow_surf, (tc_x - glitch_disp_x, tc_y))

            self.screen.blit(surf_title, (tc_x, tc_y))
            self.screen.blit(surf_sub, (sc_x, sc_y))

            # ------------------------------------------------------------------
            # RENDER REFRESH OR EXPORT TO FRAME
            # ------------------------------------------------------------------
            pygame.display.flip()
            
            # Frame writing dump block
            if self.export_mode:
                file_path = os.path.join(self.export_dir, f"frame_{self.frame_count:05d}.png")
                pygame.image.save(self.screen, file_path)
                self.frame_count += 1

            self.clock.tick(FPS)

        pygame.quit()
        print("\n" + "="*80)
        print("  PRESENTATION WORKFLOW EXITED CLEANLY.")
        print("="*80)

        # Trigger MP4 build automatically if we have multiple frames and OpenCV is present
        if self.export_mode and HAS_OPENCV:
            self.compile_to_mp4()

    def compile_to_mp4(self):
        print("\n" + "-"*80)
        print("  OPENCV DECODER DETECTED - MASTERING RAW FRAMES INTO H.264 MP4 VIDEO")
        print("-"*80)
        output_file = "tactical_legends_presentation.mp4"
        
        frame_pattern = os.path.join(self.export_dir, "frame_*.png")
        import glob
        files = sorted(glob.glob(frame_pattern))
        
        if not files:
            print("  Error: No captured frames found for serialization!")
            return

        print(f"  Encoding {len(files)} frames at 60 FPS...")
        
        # Read the first frame to get size
        first_frame = cv2.imread(files[0])
        h, w, layers = first_frame.shape
        size = (w, h)
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v') # Universal MP4 container
        out = cv2.VideoWriter(output_file, fourcc, FPS, size)
        
        for idx, filename in enumerate(files):
            frame_img = cv2.imread(filename)
            out.write(frame_img)
            if idx % 100 == 0:
                print(f"    Encoding progress: {idx}/{len(files)} frames written...")
                
        out.release()
        print(f"\n  ✓ Success! Video authored cleanly to: '{output_file}'")
        print("="*80)

# ==============================================================================
# MAIN ENTRY ROUTINE
# ==============================================================================
if __name__ == "__main__":
    export_requested = "--export" in sys.argv
    presentation = VideoPresentation(export_mode=export_requested)
    presentation.run()
