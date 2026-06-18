[CmdletBinding()]
param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Convert-ToSingleQuotedLiteral {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathValue
    )

    return $PathValue -replace "'", "''"
}

function Test-PythonModule {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PythonExe,
        [Parameter(Mandatory = $true)]
        [string]$ModuleName
    )

    try {
        & $PythonExe -c "import $ModuleName" *> $null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Test-HttpOk {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri
    )

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 3
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    } catch {
        return $false
    }
}

function Test-TcpListen {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    return ($null -ne $connection)
}

function Test-BackendInsightApi {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    try {
        $payload = @{
            mode = "overview"
            columns = @("metric")
            rows = @(@{ metric = "10" }, @{ metric = "20" })
        } | ConvertTo-Json -Depth 6
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/api/dataset/insights" -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 4
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
    } catch {
        return $false
    }
}

function Resolve-BackendPort {
    if (Test-BackendInsightApi -Port 8000) {
        return 8000
    }

    if (-not (Test-TcpListen -Port 8000)) {
        return 8000
    }

    foreach ($candidate in 8001..8010) {
        if (-not (Test-TcpListen -Port $candidate)) {
            return $candidate
        }
    }

    throw "Ports 8000-8010 are already in use. Stop an old backend and retry."
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRootItem = Get-Item -LiteralPath $repoRoot
if ($repoRootItem.Target -and $repoRootItem.Target.Count -gt 0) {
    $repoRoot = $repoRootItem.Target[0]
} else {
    $repoRoot = $repoRootItem.FullName
}
$pythonBackendDir = Join-Path $repoRoot "python_backend"
$requirementsFile = Join-Path $pythonBackendDir "requirements.txt"
$pythonEnvFile = Join-Path $pythonBackendDir ".env"
$pythonEnvExample = Join-Path $pythonBackendDir ".env.example"
$rootEnvFile = Join-Path $repoRoot ".env"
$rootEnvExample = Join-Path $repoRoot ".env.example"
$nodeModulesDir = Join-Path $repoRoot "node_modules"
$venvDir = Join-Path $pythonBackendDir ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonBackendDir)) {
    throw "Python backend directory not found: $pythonBackendDir"
}

if (-not (Test-Path -LiteralPath $requirementsFile)) {
    throw "Python requirements file not found: $requirementsFile"
}

if (-not (Test-Path -LiteralPath $rootEnvFile) -and (Test-Path -LiteralPath $rootEnvExample)) {
    Copy-Item -LiteralPath $rootEnvExample -Destination $rootEnvFile
}

if (-not (Test-Path -LiteralPath $pythonEnvFile) -and (Test-Path -LiteralPath $pythonEnvExample)) {
    Copy-Item -LiteralPath $pythonEnvExample -Destination $pythonEnvFile
}

if (-not (Test-Path -LiteralPath $venvPython)) {
    $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if (-not $pyLauncher) {
        throw "Python launcher 'py' was not found. Install Python 3.12 or add it to PATH."
    }

    & $pyLauncher.Source -3.12 -m venv $venvDir
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create Python 3.12 virtual environment at $venvDir"
    }
}

if (-not $SkipInstall) {
    if (-not (Test-PythonModule -PythonExe $venvPython -ModuleName "fastapi")) {
        & $venvPython -m pip install --upgrade pip setuptools wheel
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to upgrade pip tooling."
        }

        & $venvPython -m pip install -r $requirementsFile
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install Python requirements."
        }
    }

    if (-not (Test-Path -LiteralPath $nodeModulesDir)) {
        Push-Location $repoRoot
        try {
            if (Test-Path -LiteralPath (Join-Path $repoRoot "package-lock.json")) {
                npm ci
            } else {
                npm install
            }

            if ($LASTEXITCODE -ne 0) {
                throw "Failed to install Node dependencies."
            }
        } finally {
            Pop-Location
        }
    }
}

$backendStdout = Join-Path $pythonBackendDir "dev_stdout.log"
$backendStderr = Join-Path $pythonBackendDir "dev_stderr.log"
$frontendStdout = Join-Path $repoRoot "dev_stdout.log"
$frontendStderr = Join-Path $repoRoot "dev_stderr.log"

$pythonBackendDirLiteral = Convert-ToSingleQuotedLiteral -PathValue $pythonBackendDir
$repoRootLiteral = Convert-ToSingleQuotedLiteral -PathValue $repoRoot
$venvPythonLiteral = Convert-ToSingleQuotedLiteral -PathValue $venvPython
$backendPort = Resolve-BackendPort
$backendUrl = "http://127.0.0.1:$backendPort"

$backendCommand = "Set-Location -LiteralPath '$pythonBackendDirLiteral'; & '$venvPythonLiteral' -m uvicorn app.main:app --host 127.0.0.1 --port $backendPort --reload"
$frontendCommand = "Set-Location -LiteralPath '$repoRootLiteral'; `$env:PYTHON_API_URL='$backendUrl'; npm run dev"

$backendProcess = $null
$frontendProcess = $null

if (Test-BackendInsightApi -Port $backendPort) {
    Write-Output "Backend already healthy: $backendUrl"
} elseif (Test-TcpListen -Port $backendPort) {
    Write-Output "Backend port $backendPort is already in use. Leaving it untouched."
} else {
    $backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-Command", $backendCommand
    ) -WindowStyle Hidden -RedirectStandardOutput $backendStdout -RedirectStandardError $backendStderr -PassThru
}

if (Test-TcpListen -Port 3000) {
    Write-Output "Frontend already listening: http://localhost:3000"
} else {
    $frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-Command", $frontendCommand
    ) -WindowStyle Hidden -RedirectStandardOutput $frontendStdout -RedirectStandardError $frontendStderr -PassThru
}

Write-Output "Adviso AI dev server status:"
if ($backendProcess) {
    Write-Output "Backend:  $backendUrl  PID $($backendProcess.Id)"
} else {
    Write-Output "Backend:  $backendUrl"
}
if ($frontendProcess) {
    Write-Output "Frontend: http://localhost:3000   PID $($frontendProcess.Id)"
} else {
    Write-Output "Frontend: http://localhost:3000"
}
Write-Output "Backend logs:  $backendStdout"
Write-Output "Frontend logs: $frontendStdout"
if ($backendProcess -or $frontendProcess) {
    $startedIds = @()
    if ($backendProcess) { $startedIds += $backendProcess.Id }
    if ($frontendProcess) { $startedIds += $frontendProcess.Id }
    $startedIds = $startedIds -join ","
    Write-Output "Stop new processes with: Stop-Process -Id $startedIds"
}
