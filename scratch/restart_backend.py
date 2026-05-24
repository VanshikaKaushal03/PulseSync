import os
import signal
import subprocess
import sys
import psutil

def kill_and_restart():
    current_pid = os.getpid()
    print(f"Current script PID: {current_pid}")
    
    # Find active simulator PID
    simulator_pid = None
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmd = proc.info['cmdline']
            if cmd and 'simulate_traffic.py' in ' '.join(cmd):
                simulator_pid = proc.info['pid']
                print(f"Found simulator PID: {simulator_pid}")
        except Exception:
            pass
            
    # Terminate other uvicorn and python processes
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            pid = proc.info['pid']
            name = proc.info['name']
            cmd = proc.info['cmdline']
            
            if pid in [current_pid, simulator_pid]:
                continue
                
            if 'python' in name.lower() or 'uvicorn' in name.lower():
                # Make sure it's not a system/unrelated process
                cmd_str = ' '.join(cmd) if cmd else ''
                if 'atypicsl' in cmd_str or 'uvicorn' in cmd_str:
                    print(f"Terminating duplicate process {pid}: {cmd_str}")
                    proc.terminate()
        except Exception as e:
            pass
            
    # Start uvicorn cleanly
    print("Starting FastAPI Backend cleanly on port 8000...")
    cmd_args = [
        "powershell", "-NoExit", "-Command",
        "cd c:\\Van\\atypicsl; .\\venv\\Scripts\\Activate.ps1; uvicorn backend.main:app --reload --port 8000"
    ]
    subprocess.Popen(cmd_args, creationflags=subprocess.CREATE_NEW_CONSOLE)
    print("Backend started in a new terminal window.")

if __name__ == "__main__":
    kill_and_restart()
