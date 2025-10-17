from enum import Enum, auto

class MorphologyOperation(Enum):
    """
    Morphologische operationen
    """
    ERODE = auto()
    DILATE = auto()
    OPEN = auto()
    CLOSE = auto()
