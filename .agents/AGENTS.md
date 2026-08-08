# Workspace Agent Rules

## Windows Environment Guardrails

When executing commands or spawning script tasks on Windows systems:
1. **PowerShell Script Execution**: Always run PowerShell files (`.ps1`) with the `-ExecutionPolicy Bypass` flag to avoid system policy blocks:
   `powershell -ExecutionPolicy Bypass -File <path_to_file>`
2. **Batch / Command Wrappers (e.g. npm, npx)**: When launching wrappers via PowerShell's `Start-Process`, execute them through `cmd.exe /c` (e.g., `Start-Process cmd.exe -ArgumentList "/c npm run dev"`) instead of invoking the wrapper script name directly, as they are not native Win32 executables.
3. **Target Work Directories**: Explicitly specify the `-WorkingDirectory` parameter when launching background processes using `Start-Process` to prevent the subprocess from launching in system paths like `C:\Windows\System32`.
