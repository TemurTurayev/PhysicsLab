import type { PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | null = null;
let isLoading = false;
let loadPromise: Promise<PyodideInterface> | null = null;

// PhysicsLab Python library source code
const physicslabLib = {
  '__init__.py': `"""
PhysicsLab - Python library for physics simulations in the browser
"""

from .world import World
from .bodies import Ball, Platform
from .utils import random

__all__ = ['World', 'Ball', 'Platform', 'random']
`,

  'world.py': `"""
World - Physics world container
"""

class World:
    """Physics world that contains all bodies and runs the simulation"""

    def __init__(self, gravity=9.81, width=800, height=600, boundaries=True):
        self.gravity = gravity
        self.width = width
        self.height = height
        self.boundaries = boundaries
        self.bodies = []
        self.time = 0
        print(f"World created: {width}x{height}, gravity={gravity}")

    def add(self, body):
        self.bodies.append(body)
        print(f"Added {body.__class__.__name__} to world")

    def remove(self, body):
        if body in self.bodies:
            self.bodies.remove(body)

    def run(self):
        print("Simulation started!")
        print(f"Total bodies: {len(self.bodies)}")
        for i, body in enumerate(self.bodies):
            print(f"  Body {i+1}: {body}")

    def run_for(self, seconds):
        print(f"Running simulation for {seconds} seconds...")
        self.run()
`,

  'bodies.py': `"""
Bodies - Physical objects
"""
import math

class Ball:
    def __init__(self, x=0, y=0, radius=10, mass=1.0, color="blue", velocity=(0, 0), fixed=False):
        self.x = x
        self.y = y
        self.radius = radius
        self.mass = mass
        self.color = color
        self.vx, self.vy = velocity
        self.fixed = fixed

    def __repr__(self):
        return f"Ball(x={self.x}, y={self.y}, r={self.radius}, color={self.color})"

    def launch(self, angle, velocity):
        angle_rad = math.radians(angle)
        self.vx = velocity * math.cos(angle_rad)
        self.vy = velocity * math.sin(angle_rad)
        print(f"Launched ball at {angle}° with velocity {velocity}")

class Platform:
    def __init__(self, x=0, y=0, width=100, height=10, angle=0, friction=0.5, bounciness=0.8):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.angle = angle
        self.friction = friction
        self.bounciness = bounciness
        self.fixed = True

    def __repr__(self):
        return f"Platform(x={self.x}, y={self.y}, {self.width}x{self.height})"

    def contains(self, point):
        px, py = point if isinstance(point, tuple) else (point.x, point.y)
        return (self.x <= px <= self.x + self.width and
                self.y <= py <= self.y + self.height)
`,

  'utils.py': `"""
Utils - Helper functions
"""
import random as _random
import math

def random(min_val, max_val):
    return _random.uniform(min_val, max_val)

def distance(point1, point2):
    x1, y1 = point1 if isinstance(point1, tuple) else (point1.x, point1.y)
    x2, y2 = point2 if isinstance(point2, tuple) else (point2.x, point2.y)
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

def to_radians(degrees):
    return math.radians(degrees)

def to_degrees(radians):
    return math.degrees(radians)
`,
};

/**
 * Load Pyodide from CDN
 */
export async function loadPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      console.log('Loading Pyodide...');

      const { loadPyodide: load } = await import('pyodide');

      const pyodide = await load({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/',
      });

      console.log('Pyodide loaded, installing physicslab...');

      // Create physicslab directory and files
      pyodide.FS.mkdirTree('/lib/python3.13/site-packages/physicslab');

      for (const [filename, content] of Object.entries(physicslabLib)) {
        pyodide.FS.writeFile(
          `/lib/python3.13/site-packages/physicslab/${filename}`,
          content
        );
      }

      console.log('✓ PhysicsLab library installed');
      pyodideInstance = pyodide;
      isLoading = false;

      return pyodide;
    } catch (error) {
      isLoading = false;
      loadPromise = null;
      console.error('Failed to load Pyodide:', error);
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Execute Python code
 */
export async function runPythonCode(code: string): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  try {
    const pyodide = await loadPyodide();

    let output = '';
    pyodide.setStdout({
      batched: (msg) => {
        output += msg + '\n';
      },
    });

    try {
      const result = await pyodide.runPythonAsync(code);

      return {
        success: true,
        output: output || String(result || ''),
      };
    } catch (execError: any) {
      return {
        success: false,
        output: output,
        error: execError.message || String(execError),
      };
    }
  } catch (loadError: any) {
    return {
      success: false,
      output: '',
      error: `Failed to load Python runtime: ${loadError.message}`,
    };
  }
}

/**
 * Check if Pyodide is loaded
 */
export function isPyodideLoaded(): boolean {
  return pyodideInstance !== null;
}

/**
 * Get Pyodide instance (if loaded)
 */
export function getPyodide(): PyodideInterface | null {
  return pyodideInstance;
}
