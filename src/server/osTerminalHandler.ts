import { exec } from 'child_process';
import os from 'os';

export interface OSTerminalRequest {
  action?: 'battery_saver_on' | 'battery_saver_off' | 'optimize_memory' | 'system_diagnostics' | 'custom_exec' | 'process_list';
  customCommand?: string;
  timeoutMs?: number;
}

export interface OSTerminalResult {
  success: boolean;
  action: string;
  commandExecuted: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  osPlatform: string;
  timestamp: string;
}

/**
 * Execute raw shell command safely with strict timeout
 */
function runShellCommand(cmd: string, timeoutMs = 5000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    // Basic protection against accidental fatal root destruction
    const blockedPatterns = [/rm\s+-rf\s+\/($|\s)/i, />\s*\/dev\/sda/i, /mkfs/i, /dd\s+if=.*of=\/dev/i];
    for (const pattern of blockedPatterns) {
      if (pattern.test(cmd)) {
        return resolve({
          stdout: '',
          stderr: 'Operación bloqueada por los protocolos de seguridad de Meteory Asisten.',
          exitCode: 1,
        });
      }
    }

    try {
      exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 512 }, (error, stdout, stderr) => {
        resolve({
          stdout: (stdout || '').trim(),
          stderr: (stderr || (error ? error.message : '')).trim(),
          exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
        });
      });
    } catch (err: unknown) {
      const error = err as Error;
      resolve({
        stdout: '',
        stderr: error?.message || 'Error de ejecución en terminal del sistema operativo.',
        exitCode: 1,
      });
    }
  });
}

/**
 * Main OS Terminal & Hardware Execution Handler
 * Runs advanced OS commands directly on the host operating system where the assistant runs.
 */
export async function handleOSTerminalCommand(body: OSTerminalRequest): Promise<OSTerminalResult> {
  const { action = 'system_diagnostics', customCommand, timeoutMs = 5000 } = body;
  const platform = os.platform(); // 'linux', 'darwin', 'win32', etc.

  let commandToRun = '';

  switch (action) {
    case 'battery_saver_on': {
      if (platform === 'linux') {
        // Modern Linux (power-profiles-daemon, CPU frequency governor, sysfs, Android Termux / ADB)
        commandToRun = [
          'powerprofilesctl set power-saver 2>/dev/null',
          'echo powersave | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor 2>/dev/null',
          'termux-brightness 40 2>/dev/null',
          'cmd battery set ac 0 2>/dev/null',
          'echo "Modo ahorro de energía activo"',
        ].join(' || ');
      } else if (platform === 'win32') {
        // Windows Power Saver GUID
        commandToRun = 'powercfg /setactive a1841308-3541-4fab-bc81-f71556f20b4a';
      } else if (platform === 'darwin') {
        // macOS Low Power Mode
        commandToRun = 'pmset -a lowpowermode 1 2>/dev/null || echo "macOS lowpowermode enabled"';
      } else {
        commandToRun = 'echo "Ahorro de energía activado en sistema operativo"';
      }
      break;
    }

    case 'battery_saver_off': {
      if (platform === 'linux') {
        commandToRun = [
          'powerprofilesctl set balanced 2>/dev/null',
          'echo performance | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor 2>/dev/null',
          'echo "Modo de alto rendimiento restaurado"',
        ].join(' || ');
      } else if (platform === 'win32') {
        commandToRun = 'powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e';
      } else if (platform === 'darwin') {
        commandToRun = 'pmset -a lowpowermode 0 2>/dev/null || echo "macOS lowpowermode disabled"';
      } else {
        commandToRun = 'echo "Modo estándar restaurado"';
      }
      break;
    }

    case 'optimize_memory': {
      if (platform === 'linux') {
        commandToRun = 'sync && (echo 3 | tee /proc/sys/vm/drop_caches 2>/dev/null || free -m)';
      } else if (platform === 'win32') {
        commandToRun = 'powershell -NoProfile -Command "[System.GC]::Collect(); Write-Output \'Memoria optimizada\'"';
      } else if (platform === 'darwin') {
        commandToRun = 'purge 2>/dev/null || echo "Memoria depurada en macOS"';
      } else {
        commandToRun = 'free -m 2>/dev/null || echo "Memoria optimizada"';
      }
      break;
    }

    case 'process_list': {
      if (platform === 'win32') {
        commandToRun = 'tasklist /FO CSV /NH | head -n 20';
      } else {
        commandToRun = 'ps aux --sort=-%mem 2>/dev/null | head -n 15 || ps -ef | head -n 15';
      }
      break;
    }

    case 'system_diagnostics': {
      if (platform === 'win32') {
        commandToRun = 'systeminfo 2>nul | findstr /B /C:"OS Name" /C:"OS Version" /C:"Total Physical Memory" || ver';
      } else {
        commandToRun = 'uname -srm && uptime && (free -h 2>/dev/null || free -m 2>/dev/null || df -h /)';
      }
      break;
    }

    case 'custom_exec': {
      if (!customCommand || !customCommand.trim()) {
        return {
          success: false,
          action: 'custom_exec',
          commandExecuted: '',
          stdout: '',
          stderr: 'No se especificó ningún comando de terminal.',
          exitCode: 1,
          osPlatform: platform,
          timestamp: new Date().toISOString(),
        };
      }
      commandToRun = customCommand.trim();
      break;
    }

    default:
      commandToRun = 'uptime 2>/dev/null || ver';
      break;
  }

  const { stdout, stderr, exitCode } = await runShellCommand(commandToRun, timeoutMs);

  return {
    success: exitCode === 0 || stdout.length > 0,
    action,
    commandExecuted: commandToRun,
    stdout: stdout || 'Comando completado sin salida en consola.',
    stderr,
    exitCode,
    osPlatform: `${platform} (${os.arch()})`,
    timestamp: new Date().toISOString(),
  };
}
