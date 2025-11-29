"""
World - Physics world container
"""

class World:
    """Physics world that contains all bodies and runs the simulation"""

    def __init__(self, gravity=9.81, width=800, height=600, boundaries=True):
        """
        Initialize a physics world

        Args:
            gravity: Acceleration due to gravity (m/s²)
            width: World width in pixels
            height: World height in pixels
            boundaries: Whether to create boundaries at edges
        """
        self.gravity = gravity
        self.width = width
        self.height = height
        self.boundaries = boundaries
        self.bodies = []
        self.time = 0

        print(f"World created: {width}x{height}, gravity={gravity}")

    def add(self, body):
        """Add a body to the world"""
        self.bodies.append(body)
        print(f"Added {body.__class__.__name__} to world")

    def remove(self, body):
        """Remove a body from the world"""
        if body in self.bodies:
            self.bodies.remove(body)

    def run(self):
        """Run the simulation (placeholder for now)"""
        print("Simulation started!")
        print(f"Total bodies: {len(self.bodies)}")

        # Print info about all bodies
        for i, body in enumerate(self.bodies):
            print(f"  Body {i+1}: {body}")

    def run_for(self, seconds):
        """Run simulation for specified number of seconds"""
        print(f"Running simulation for {seconds} seconds...")
        self.run()
