"""
PhysicsLab - Python library for physics simulations in the browser
"""

from .world import World
from .bodies import Ball, Platform
from .utils import random

__all__ = ['World', 'Ball', 'Platform', 'random']
