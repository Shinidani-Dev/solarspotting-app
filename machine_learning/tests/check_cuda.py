"""
CUDA Performance Diagnose
=========================
Warum ist CUDA so extrem langsam?
"""

import torch
import time
import subprocess

print("=" * 60)
print("CUDA PERFORMANCE DIAGNOSE")
print("=" * 60)

# 1. Check if nvidia-smi works
print("\n[1] NVIDIA-SMI Check:")
try:
    result = subprocess.run(['nvidia-smi', '--query-gpu=name,driver_version,power.draw,temperature.gpu,utilization.gpu',
                            '--format=csv,noheader'],
                           capture_output=True, text=True, timeout=10)
    print(f"    {result.stdout.strip()}")
except Exception as e:
    print(f"    ❌ nvidia-smi failed: {e}")

# 2. PyTorch CUDA Info
print("\n[2] PyTorch CUDA Info:")
print(f"    PyTorch: {torch.__version__}")
print(f"    CUDA compiled: {torch.version.cuda}")
print(f"    cuDNN: {torch.backends.cudnn.version()}")
print(f"    CUDA available: {torch.cuda.is_available()}")
print(f"    Current device: {torch.cuda.current_device()}")

# 3. Check für falsche Environment Variables
print("\n[3] Environment Variables Check:")
import os
problematic_vars = ['CUDA_LAUNCH_BLOCKING', 'CUDA_VISIBLE_DEVICES', 'PYTORCH_CUDA_ALLOC_CONF']
for var in problematic_vars:
    val = os.environ.get(var, 'NOT SET')
    status = "⚠️" if val != 'NOT SET' else "✅"
    print(f"    {status} {var} = {val}")

# 4. CUDA Context Warmup
print("\n[4] CUDA Context Warmup:")
start = time.time()
torch.cuda.init()
dummy = torch.zeros(1, device='cuda')
torch.cuda.synchronize()
print(f"    CUDA init time: {time.time() - start:.3f}s")
del dummy

# 5. Quick benchmark - sollte < 0.1s sein!
print("\n[5] Quick Benchmark (1000x1000 matmul):")

# Warmup
a = torch.randn(100, 100, device='cuda')
b = torch.randn(100, 100, device='cuda')
for _ in range(3):
    _ = torch.matmul(a, b)
torch.cuda.synchronize()
del a, b

# Actual test
x = torch.randn(1000, 1000, device='cuda')
y = torch.randn(1000, 1000, device='cuda')
torch.cuda.synchronize()

start = time.time()
z = torch.matmul(x, y)
torch.cuda.synchronize()
elapsed = time.time() - start

print(f"    Time: {elapsed:.4f}s")
if elapsed > 1.0:
    print(f"    ❌ VIEL ZU LANGSAM! Sollte < 0.01s sein!")
elif elapsed > 0.1:
    print(f"    ⚠️ Etwas langsam, aber OK")
else:
    print(f"    ✅ Normal!")

del x, y, z
torch.cuda.empty_cache()

# 6. Vergleich CPU vs GPU
print("\n[6] CPU vs GPU Vergleich:")

# CPU
x_cpu = torch.randn(500, 500)
y_cpu = torch.randn(500, 500)
start = time.time()
for _ in range(10):
    _ = torch.matmul(x_cpu, y_cpu)
cpu_time = time.time() - start
print(f"    CPU (10x 500x500 matmul): {cpu_time:.3f}s")

# GPU
x_gpu = torch.randn(500, 500, device='cuda')
y_gpu = torch.randn(500, 500, device='cuda')
torch.cuda.synchronize()
start = time.time()
for _ in range(10):
    _ = torch.matmul(x_gpu, y_gpu)
torch.cuda.synchronize()
gpu_time = time.time() - start
print(f"    GPU (10x 500x500 matmul): {gpu_time:.3f}s")

if gpu_time > cpu_time:
    print(f"    ❌ GPU ist LANGSAMER als CPU! Das ist falsch!")
else:
    speedup = cpu_time / gpu_time
    print(f"    ✅ GPU ist {speedup:.1f}x schneller als CPU")

# 7. Check GPU memory and utilization
print("\n[7] GPU Status:")
print(f"    Memory allocated: {torch.cuda.memory_allocated() / 1024**2:.1f} MB")
print(f"    Memory cached: {torch.cuda.memory_reserved() / 1024**2:.1f} MB")
print(f"    Max memory: {torch.cuda.max_memory_allocated() / 1024**2:.1f} MB")

print("\n" + "=" * 60)
print("DIAGNOSE:")
print("=" * 60)
print("""
Wenn GPU langsamer als CPU ist, könnte das Problem sein:

1. CUDA_LAUNCH_BLOCKING=1 ist gesetzt
   → Lösung: Neue Terminal-Session öffnen

2. PyTorch ist falsch installiert (CPU-only version)
   → Lösung: pip uninstall torch && pip install torch --index-url https://download.pytorch.org/whl/cu121

3. GPU Power Management / Throttling
   → Lösung: nvidia-smi -pm 1 (als Admin)

4. Falscher CUDA Driver
   → Lösung: Neuesten NVIDIA Driver installieren

5. WSL2 / Container Problem
   → Lösung: Native Windows verwenden
""")