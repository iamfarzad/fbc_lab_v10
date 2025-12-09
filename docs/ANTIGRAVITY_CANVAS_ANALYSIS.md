# AntigravityCanvas - Complete Animation & Feature Analysis

## Overview
The AntigravityCanvas is a particle-based visualization system that renders dynamic, interactive animations based on the current visual state. It uses a canvas-based particle system with 4000+ particles that respond to audio, mouse interaction, and various visual modes.

---

## Core Particle System

### Particle Class Properties
- **Position**: `x`, `y` (canvas coordinates)
- **Velocity**: `vx`, `vy` (pixel movement per frame)
- **Size**: `baseRad`, `rad` (base and current radius)
- **Opacity**: `baseAlpha`, `targetAlpha` (base and target alpha)
- **Index**: `index`, `totalParticles` (particle ID and total count)
- **Scale**: `scale` (Z-depth scale for 3D effect)

### Particle Initialization
- Particles spawn near center (within 200px radius)
- Random angle distribution (0-2π)
- Base radius: 0.1-0.5px (micro-particles)
- Base alpha: 0.2-0.8
- Initial velocity: 0 (stationary start)

---

## Physics & Forces

### Core Physics
1. **Spring Force**: Pulls particles toward target positions
   - Configurable per shape (0.0-1.0)
   - Standard: 0.15

2. **Friction**: Velocity damping
   - Configurable per shape (0.0-1.0)
   - Standard: 0.92
   - Adjusted by reasoning complexity

3. **Noise**: Random movement factor
   - Configurable per shape
   - Standard: 0.02
   - Increases with reasoning complexity

4. **Orbit Boost**: Circular motion for orb/planet/atom shapes
   - Speed: 0.05 (speaking) or 0.01 (idle)
   - Applies tangential force based on distance from center

### Interactive Forces
1. **Mouse Repulsion**
   - Active within 100px of mouse
   - Force: 0.5 at center, decreases with distance
   - Works on mouse and touch events

2. **Audio Reactivity**
   - **Speaking Mode**: Particles grow by 40% of audio level
   - **Listening Mode**: Particles grow by 20% of smoothed audio
   - **Face Mode**: Particles shrink to 60% of base size
   - Smooth interpolation: 0.2 factor

3. **Reasoning Complexity Effects**
   - Higher complexity → more noise (up to 50% increase)
   - Higher complexity → less friction (up to 20% decrease)
   - Creates more chaotic movement for complex reasoning

---

## Visual Shapes (35 Total)

### Geometric / Core Shapes (12)
1. **orb** - Circular particle cloud, orbit motion
2. **rect** - Rectangular formation
3. **grid** - Grid pattern layout
4. **shield** - Shield-like protective shape
5. **hourglass** - Hourglass/sand timer shape
6. **clock** - Clock face with time display (HH:MM)
7. **code** - Code-like structure
8. **text** - Dynamic text rendering (bitmap font) - Used for client name welcome messages
9. **scanner** - Scanning/search pattern
10. **vortex** - Spiral vortex effect
11. **fireworks** - Explosive particle bursts
12. **lightning** - Lightning bolt pattern

### Organic / Nature Shapes (5)
13. **wave** - Wave motion pattern (Voice visualizer - audio-reactive waveform)
14. **dna** - DNA double helix
15. **heart** - Heart shape
16. **brain** - Brain-like neural network
17. **face** - Face mesh (MediaPipe landmarks - Real-time face tracking with 468 points)

### Data Visualization Shapes (2)
18. **chart** - Chart/graph visualization with grid
19. **map** - Geographic map with location pins

### Cosmic / Space Shapes (5)
20. **planet** - Planet with zoom animation (Milky Way → Solar System)
21. **atom** - Atomic structure with orbiting electrons
22. **star** - Star formation
23. **globe** - 3D Earth globe with continent map
24. **constellation** - Constellation with connecting lines

### Complex Shapes (2)
25. **weather** - Weather visualization (sunny/cloudy/rainy/snowy/stormy)
26. **map** - Map with location data

### Agent Shapes (9)
27. **discovery** - Expanding spiral search pattern
28. **scoring** - Vertical bars visualization
29. **workshop** - Connected node clusters
30. **consulting** - Rotating geometric squares
31. **closer** - Closing/deal visualization
32. **summary** - Summary/document visualization
33. **proposal** - Proposal presentation visualization
34. **admin** - Admin panel visualization
35. **retargeting** - Retargeting campaign visualization

### Special States
- **idle** - Idle state (only for 'orb' shape when inactive)

---

## Special Animations & Effects

### 1. Constellation Lines
- **Trigger**: `shape === 'constellation'`
- 6 animated nodes
- Nodes move in circular patterns with time-based animation
- Lines connect all nodes to each other
- Opacity: 0.05 (dark) / 0.03 (light)

### 2. Chart Grid Lines
- **Trigger**: `shape === 'chart'`
- Background grid overlay
- 5 vertical lines, 4 horizontal lines
- Opacity: 0.05
- Graph area: 60% width, 200px height

### 3. Research Scanner Effect
- **Trigger**: `researchActive && shape === 'scanner'`
- Scanning line sweeps vertically (sine wave motion)
- Speed: `time * 0.003`
- Orange color: `rgba(255, 165, 0, 0.3)` (dark) / `rgba(255, 140, 0, 0.4)` (light)
- Pulsing circles at citation points
- Circle count = citation count
- Circles arranged in circular pattern around center
- Pulse animation: `0.5 + sin(time * 0.005 + i) * 0.5`

### 4. Planet Zoom Animation
- **Trigger**: `shape === 'planet'`
- 12-second cycle:
  - **Phase 1 (0-3s)**: Milky Way view (50x scale)
  - **Phase 2 (1-4s)**: Arrow appears pointing to solar system
  - **Phase 3 (4-8s)**: Zooming in (smooth easing)
  - **Phase 4 (8-12s)**: Solar System view (1x scale)
- Arrow uses 15% of particles
- Arrow pulses with visibility
- Smooth cubic easing for zoom

### 5. Clock Time Display
- **Trigger**: `shape === 'clock'`
- Updates every 1 second
- Format: HH:MM (24-hour)
- Passed to particle context as `localTime`

### 6. Text Rendering
- **Trigger**: `shape === 'text'` + `textContent` in visualState
- Bitmap font system (5x5 pixels per character)
- Supports: A-Z, 0-9, symbols (: - + . , ° $ % / ?)
- Dynamic layout calculation
- Particles per character: 250 (default)
- Scale: 18px (default)
- Jitter: 0.5 (default)

---

## DOM Overlays

### 1. Weather Condition Label
- **Trigger**: `shape === 'weather' && weatherData?.condition`
- Position: Top 60%
- Shows condition text (sunny/cloudy/rainy/snowy/stormy)
- Styled with backdrop blur, rounded, border
- Font: 10px mono, uppercase, letter-spacing

### 2. Chart Label
- **Trigger**: `shape === 'chart' && chartData?.value`
- Position: Top 160px
- Shows "Current Value" label
- Font: 10px mono, uppercase

### 3. Map Title
- **Trigger**: `shape === 'map' && mapData?.title`
- Position: Top 60%
- Shows map title and "Location Pinned" subtitle
- Title: 20px semibold
- Subtitle: 10px mono, uppercase

### 4. Source Badge
- **Trigger**: `sourceCount !== undefined && sourceCount > 0`
- Position: Top-right (top-6 right-6)
- Shows citation/source count
- Icon: Link/chain SVG
- Color: Orange theme
- Backdrop blur, rounded, shadow

### 5. Research Badge
- **Trigger**: `researchActive === true`
- Position: Top-left (top-6 left-6)
- Shows "Research" label
- Icon: Search/magnifying glass SVG (pulsing)
- Color: Blue theme
- Backdrop blur, rounded, shadow

### 6. Reasoning Complexity Indicator
- **Trigger**: `reasoningComplexity > 0.3`
- Position: Bottom-right (bottom-6 right-6)
- Shows complexity level:
  - < 0.5: "Thinking"
  - < 0.8: "Deep Analysis"
  - >= 0.8: "Complex Reasoning"
- Icon: Lightbulb SVG
- Color: Purple theme
- Backdrop blur, rounded, shadow

---

## Rendering System

### Canvas Setup
- Full viewport size (`window.innerWidth` x `window.innerHeight`)
- Context: 2D with alpha channel
- Desynchronized rendering for performance
- Transparent background

### Clear Strategy
- Trail effect using semi-transparent fill
- Base opacity: 0.25
- Reduced opacity (0.18) for: dna, grid, globe, brain, constellation, face, weather, chart, map, clock, code
- Increased opacity (0.3) for speaking mode
- Dark mode: `rgba(0, 0, 0, opacity)`
- Light mode: `rgba(248, 249, 250, opacity)`

### Particle Rendering
- Particles drawn as small rectangles
- Size: `max(0.8, rad * 2)`
- Dark mode: `rgba(220, 220, 230, alpha * 0.8)`
- Light mode: `rgba(20, 20, 20, alpha)`
- Skips rendering if `rad < 0.05` or `targetAlpha < 0.05`

### Animation Loop
- Uses `requestAnimationFrame`
- Smooth audio interpolation: `0.3` factor
- 60 FPS target
- Time-based animations use `time` parameter

---

## Particle Count System

### Base Count
- **Default**: 4000 particles

### Dynamic Scaling
- **Citation-based**: Increases with citation count
- Formula: `baseCount * (1 + citationCount * 0.1)`
- Maximum: 2x base count (8000 particles)
- Example: 10 citations = 5000 particles

### Reinitialization
- Particles recreated on:
  - Window resize
  - Initial mount
  - Visual state changes (implicit)

---

## Interaction System

### Mouse Tracking
- Tracks mouse position via `onMouseMove`
- Default position: `(-1000, -1000)` (off-screen)
- Used for repulsion force

### Touch Support
- `onTouchMove` and `onTouchStart` handlers
- Uses first touch point
- `onTouchEnd` resets to off-screen position

### Pointer Events
- Canvas has `pointer-events-auto`
- Container has `touch-none` to prevent scrolling

---

## State Management

### Refs Used
- `canvasRef` - Canvas element
- `visualStateRef` - Current visual state (updated via effect)
- `isDarkModeRef` - Dark mode state
- `smoothedAudioRef` - Smoothed audio level
- `requestRef` - Animation frame ID
- `mouseRef` - Mouse position
- `particlesRef` - Particle array
- `currentTimeRef` - Clock time string
- `timerRef` - Clock update interval

### Effects
1. **Dark Mode Sync**: Updates `isDarkModeRef` when prop changes
2. **Visual State Sync**: Updates `visualStateRef` and manages clock timer
3. **Animation Setup**: Initializes canvas, particles, and animation loop

---

## Performance Optimizations

1. **Desynchronized Rendering**: Canvas context uses `desynchronized: true`
2. **Alpha Channel**: Only when needed
3. **Particle Culling**: Skips rendering tiny/invisible particles
4. **Smooth Interpolation**: Audio and scale use interpolation factors
5. **Efficient Math**: Pre-calculated values, cached references
6. **Event Cleanup**: Proper cleanup of timers and event listeners

---

## Color Schemes

### Dark Mode
- Background clear: `rgba(0, 0, 0, opacity)`
- Particles: `rgba(220, 220, 230, alpha * 0.8)`
- Overlay text: White with opacity
- Borders: White with low opacity

### Light Mode
- Background clear: `rgba(248, 249, 250, opacity)`
- Particles: `rgba(20, 20, 20, alpha)`
- Overlay text: Black with opacity
- Borders: Black with low opacity

---

## Audio Integration

### Audio Levels
- `audioLevel`: Raw instantaneous audio (0.0-1.0)
- `smoothedAudio`: Interpolated audio (0.3 factor)
- Used for particle size modulation

### Modes
- **Speaking**: Particles grow with audio (40% multiplier)
  - Auto-switches to `wave` shape for voice visualization
- **Listening**: Particles grow with smoothed audio (20% multiplier)
  - Auto-switches to `orb` shape
- **Thinking**: Particles show subtle pulsing
  - Auto-switches to `brain` shape
- **Face**: Particles shrink (60% of base)
  - Auto-switches to `face` shape when webcam active

---

## Special Features

### Teleportation
- Some shapes (weather effects) use teleportation
- Particles instantly move to new position with new velocity
- Used for rain/snow effects

### Scale/Z-Depth
- Particles can have different scales (1.0 = default)
- Creates 3D depth effect
- Smoothly interpolated (0.15 factor)

### Alpha Modulation
- Target alpha can be set per shape
- Smoothly interpolated toward target
- Used for visibility effects

---

## Advanced Real-Time Features

### 1. Face Mesh Visualization (MediaPipe Integration)

**Location**: `utils/visuals/complexShapes.ts` - `face` shape

**How It Works**:
- Uses MediaPipe Face Mesh (468 landmark points)
- Real-time face tracking via `FaceLandmarkStore` (updated 60fps)
- Particles map to specific facial landmarks
- Audio-reactive: More particles focus on mouth/eyes when speaking

**Features**:
- **468 Landmark Points**: Full face mesh coverage
- **Region-Based Weighting**: Eyes, mouth, nose, eyebrows prioritized
- **Audio Reactivity**: 
  - Speaking mode: Particles shift to mouth/eyes (30% audio weight)
  - Mouth pulses with audio (sin wave + audio modulation)
  - Eyes glow with audio (0.7-1.0 alpha)
- **Depth Perception**: Z-coordinate mapping for 3D effect
- **Scanner Effect**: Dual-pass scanning lines highlight features
- **Breathing Animation**: Subtle breathing effect (0.0008 speed)
- **Feature Highlighting**:
  - Eyes: 0.7-1.0 alpha (audio-reactive)
  - Mouth: 0.8-1.0 alpha (highly audio-reactive)
  - Nose: 0.6 alpha
  - Face oval: 0.4 alpha

**Fallback Mode**: If no face detected, shows "Neural Audio Ring" (5 concentric rings with audio-reactive expansion)

**Data Source**: `components/chat/WebcamPreview.tsx` → MediaPipe → `FaceLandmarkStore.update()`

---

### 2. Voice Visualizer (Audio Waveform)

**Location**: `utils/visuals/geometricShapes.ts` - `wave` shape

**How It Works**:
- Multi-layer sine wave visualization
- 3 layers with different frequencies and phases
- Audio-reactive amplitude modulation
- Real-time audio analysis from `geminiLiveService`

**Features**:
- **3 Wave Layers**:
  - Layer 0: Primary wave (fundamental frequency) + harmonic
  - Layer 1: Secondary wave (1.6x frequency, phase-shifted)
  - Layer 2: Tertiary wave (2.5x frequency, subtle)
- **Audio Reactivity**:
  - Base amplitude: 25px
  - Active amplitude: 200px × audio level
  - Total amplitude: (base + active) × envelope
- **Mode Awareness**:
  - Speaking: Uses `rawAudio` (instantaneous)
  - Listening: Uses `smoothedAudio` (interpolated)
- **Envelope**: Smooth fade in/out (sin^1.8 curve)
- **Modulation**: Audio-reactive cosine modulation (35px × audio)
- **Frequency**: 0.022 base frequency with harmonics
- **Alpha by Layer**: 0.7 (primary), 0.45 (secondary), 0.35 (tertiary)

**Audio Source**: `services/geminiLiveService.ts` → `startAnalysisLoop()` → RMS calculation → `onVolumeChange()` → `visualState.audioLevel`

**Auto-Activation**: Automatically switches to `wave` shape when `mode === 'speaking'`

---

### 3. Client Name Morph Animation (Text Particle System)

**Location**: `utils/visuals/geometricShapes.ts` - `text` shape + `calculatePixelText()`

**How It Works**:
- Bitmap font system (5x5 pixels per character)
- Particles morph to form text characters
- Used for welcome messages, client names, dynamic text
- Set via `visualState.textContent`

**Features**:
- **Bitmap Font**: 5x5 pixel grid per character
- **Supported Characters**: A-Z, 0-9, symbols (: - + . , ° $ % / ?)
- **Dynamic Scaling**: Auto-scales based on text length
  - Default: 20px scale
  - Max 12 chars before scaling down
- **Particles Per Character**: 250 (default)
- **Jitter**: 0.4 (organic movement)
- **Audio Enhancement**:
  - Speaking: Alpha boost (+20% audio level)
  - Thinking: Pulsing alpha (sin wave)
- **Orbiting Particles**: Excess particles orbit around text
  - Base radius: 280px
  - Audio-reactive expansion: +30px × audio
  - Low alpha: 0.15-0.25

**Usage**:
- Welcome messages: Set `textContent` to client name
- Dynamic text: Any string can be rendered
- Tool calls: `update_dashboard` tool can set text
- Text detection: `detectVisualIntent()` can trigger text shape

**Example Flow**:
```
User enters name → WelcomeScreen → onComplete(name) 
→ setVisualState({ shape: 'text', textContent: `Hello, ${name}!` })
→ Particles morph into text
```

**Data Source**: `visualState.textContent` (set via tool calls or programmatically)

---

## Shape-Specific Behaviors

### Orbit Shapes (orb, planet, atom)
- Additional orbital force applied
- Speed varies by mode (speaking vs idle)

### Face Shape
- Uses MediaPipe face landmarks (468 points)
- Real-time face tracking via WebcamPreview
- Face regions: eyes, nose, mouth, eyebrows, face oval
- Particles map to specific facial landmarks
- Audio-reactive: More particles on mouth/eyes when speaking
- Fallback: Neural audio ring if no face detected
- See "Advanced Real-Time Features" section for full details

### Weather Shape
- Condition-based particle patterns
- Temperature affects particle count/arrangement
- Rain/snow use teleportation

### Map Shape
- Uses lat/lng coordinates
- 3D sphere projection
- Continent map data (64x32 bitmask)
- Location pins

### Globe Shape
- 3D Earth projection
- Continent rendering
- Rotation animation

---

## Animation Timing

### Clock Updates
- Interval: 1000ms (1 second)
- Format: HH:MM

### Planet Zoom
- Cycle: 12000ms (12 seconds)
- Phases: 0-3s, 1-4s, 4-8s, 8-12s

### Constellation
- Node speed: `time * 0.0005`
- Node movement: Sine/cosine based

### Scanner
- Scan speed: `time * 0.003`
- Pulse speed: `time * 0.005`

---

## Morphing & Transitions

### Automatic Shape Morphing
**YES - All shapes morph smoothly between each other!**

The system uses **spring physics** to create natural morphing transitions:

1. **How It Works**:
   - When shape changes, particles immediately get new target positions (tx, ty) from the new shape
   - Spring force pulls particles toward new targets: `vx += dx * spring`
   - Friction dampens movement: `vx *= friction`
   - Result: Smooth, organic morphing between ANY two shapes

2. **Morphing Speed** (controlled by spring/friction):
   - **Fast morphing**: High spring (0.15), low friction (0.80-0.85)
   - **Slow morphing**: Low spring (0.04-0.08), high friction (0.92-0.94)
   - **Standard**: Spring 0.08-0.15, Friction 0.85-0.92

3. **Shape-Specific Physics**:
   - Each shape defines its own `spring` and `friction` values
   - This affects how quickly particles morph TO that shape
   - Example: `orb` uses `StandardSpring: 0.08`, `friction: 0.88`

### Internal Shape Animations

Some shapes have **built-in morphing animations**:

1. **Planet Shape** - Zoom Morph:
   - Morphs between Milky Way (50x scale) → Solar System (1x scale)
   - 12-second cycle with smooth easing
   - Uses interpolation: `zoomProgress * zoomProgress * (3 - 2 * zoomProgress)`

2. **Weather Shape** - Condition Morphing:
   - Particles morph between different weather patterns
   - Rain/snow use teleportation for instant repositioning
   - Temperature affects particle arrangement

3. **Text Shape** - Character Morphing:
   - Particles morph to form bitmap font characters
   - Smooth transitions when text content changes
   - Jitter parameter adds organic movement

4. **Face Shape** - Real-time Morphing:
   - Particles continuously morph to match face landmarks
   - Smooth interpolation between landmark positions
   - Audio-reactive adjustments

5. **Map Shape** - Route Morphing:
   - Particles morph along route trajectory
   - Arch animation with audio-reactive height
   - Smooth interpolation along path

### Morphing Characteristics by Category

#### Geometric/Core Shapes (12)
- **orb**: Logarithmic spiral, audio-reactive expansion
- **rect**: Sharp corners, snappy spring (0.15)
- **grid**: Structured layout, standard physics
- **shield**: Curved edges, smooth morphing
- **hourglass**: Time-based particle flow
- **clock**: Time display with smooth updates
- **code**: Structured patterns
- **text**: Character morphing with jitter
- **scanner**: Scanning motion, research mode effects
- **vortex**: Spiral morphing
- **fireworks**: Explosive particle bursts
- **lightning**: Sharp, fast transitions

#### Organic/Nature Shapes (5)
- **wave**: Smooth sine wave morphing
- **dna**: Double helix with continuous rotation
- **heart**: Curved, organic morphing
- **brain**: Neural network patterns
- **face**: Real-time landmark morphing

#### Data Visualization Shapes (2)
- **chart**: Grid-based, structured morphing
- **map**: 3D globe with route morphing

#### Cosmic/Space Shapes (5)
- **planet**: Complex zoom morph (Milky Way → Solar System)
- **atom**: Orbital morphing with electron paths
- **star**: Radial morphing patterns
- **globe**: 3D rotation with continent morphing
- **constellation**: Node-based morphing with connecting lines

#### Agent Shapes (9)
- **discovery**: Expanding spiral morph
- **scoring**: Bar chart morphing
- **workshop**: Cluster morphing
- **consulting**: Rotating square morphing
- **closer**: Deal-closing animation
- **summary**: Document morphing
- **proposal**: Presentation morphing
- **admin**: Admin panel patterns
- **retargeting**: Campaign visualization

#### Complex Shapes (2)
- **weather**: Condition-based morphing (sunny/cloudy/rainy/snowy/stormy)
- **map**: Geographic morphing with routes

### Morphing Parameters

Each shape can control morphing via:

1. **Spring** (0.0-1.0): How strongly particles are pulled to targets
   - Higher = faster morphing
   - Lower = slower, more organic

2. **Friction** (0.0-1.0): Velocity damping
   - Higher = smoother, less bouncy
   - Lower = more dynamic, bouncy

3. **Noise** (0.0+): Random movement
   - Adds organic, non-linear morphing
   - Higher = more chaotic transitions

4. **Scale**: Z-depth morphing
   - Smoothly interpolated (0.15 factor)
   - Creates 3D depth transitions

5. **Alpha**: Opacity morphing
   - Smooth fade in/out between shapes
   - Some shapes use different alpha values

### Morphing Examples

**Fast Morph**: `orb` → `rect`
- Particles quickly snap from spiral to rectangle
- Spring: 0.15, Friction: 0.85

**Slow Morph**: `brain` → `heart`
- Organic, flowing transition
- Spring: 0.08, Friction: 0.92

**Complex Morph**: `planet` (Milky Way) → `planet` (Solar System)
- Multi-phase zoom with interpolation
- 12-second cycle with easing

**Instant Morph**: Weather teleportation
- Rain/snow particles instantly reposition
- Used for particle effects, not shape transitions

## Summary Statistics

- **Total Shapes**: 35
- **Base Particles**: 4000
- **Max Particles**: 8000 (with citations)
- **Animation FPS**: 60 (target)
- **Particle Size Range**: 0.1-0.5px base
- **Clear Opacity Range**: 0.18-0.3
- **DOM Overlays**: 6 types
- **Special Effects**: 6 types
- **Physics Parameters**: 4 (spring, friction, noise, scale)
- **Morphing**: Automatic between ALL shapes via spring physics
- **Internal Animations**: 5 shapes with built-in morphing cycles

