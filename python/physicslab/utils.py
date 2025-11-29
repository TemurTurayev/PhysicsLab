"""
Utils - Helper functions
"""

import random as _random


def random(min_val, max_val):
    """Generate a random number between min_val and max_val"""
    return _random.uniform(min_val, max_val)


def distance(point1, point2):
    """Calculate distance between two points"""
    import math
    x1, y1 = point1 if isinstance(point1, tuple) else (point1.x, point1.y)
    x2, y2 = point2 if isinstance(point2, tuple) else (point2.x, point2.y)
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def to_radians(degrees):
    """Convert degrees to radians"""
    import math
    return math.radians(degrees)


def to_degrees(radians):
    """Convert radians to degrees"""
    import math
    return math.degrees(radians)
