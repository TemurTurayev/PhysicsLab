"""
Bodies - Physical objects (Ball, Platform, etc.)
"""

class Ball:
    """A circular physics body"""

    def __init__(self, x=0, y=0, radius=10, mass=1.0, color="blue", velocity=(0, 0), fixed=False):
        """
        Create a ball

        Args:
            x, y: Initial position
            radius: Ball radius
            mass: Ball mass
            color: Ball color
            velocity: Initial velocity as (vx, vy)
            fixed: Whether the ball is fixed in place
        """
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
        """
        Launch the ball at an angle

        Args:
            angle: Launch angle in degrees
            velocity: Launch speed
        """
        import math
        angle_rad = math.radians(angle)
        self.vx = velocity * math.cos(angle_rad)
        self.vy = velocity * math.sin(angle_rad)
        print(f"Launched ball at {angle}° with velocity {velocity}")


class Platform:
    """A static platform"""

    def __init__(self, x=0, y=0, width=100, height=10, angle=0, friction=0.5, bounciness=0.8):
        """
        Create a platform

        Args:
            x, y: Position (top-left corner)
            width, height: Platform dimensions
            angle: Rotation angle in degrees
            friction: Friction coefficient
            bounciness: Bounciness coefficient
        """
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
        """Check if a point is on the platform"""
        px, py = point if isinstance(point, tuple) else (point.x, point.y)
        return (
            self.x <= px <= self.x + self.width and
            self.y <= py <= self.y + self.height
        )
