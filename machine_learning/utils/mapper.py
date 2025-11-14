import numpy as np


def to_native(obj):
    """Recursively convert numpy types into native Python types."""

    # scalar numpy types → native python
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, (np.bool_)):
        return bool(obj)

    # numpy arrays → list
    if isinstance(obj, np.ndarray):
        return obj.tolist()

    # dict → recursively convert values
    if isinstance(obj, dict):
        return {k: to_native(v) for k, v in obj.items()}

    # list / tuple → recursively convert items
    if isinstance(obj, (list, tuple)):
        return [to_native(i) for i in obj]

    # everything else stays the same
    return obj
