$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $projectRoot

try {
  Write-Host "[1/5] Checking toolchain..."
  node --version | Out-Null
  pnpm --version | Out-Null

  if (-not (Test-Path ".env")) {
    throw "Missing .env file in project root. Copy .env.example to .env and fill values first."
  }

  Write-Host "[2/5] Validating required .env keys..."
  $requiredVars = @(
    "NEXT_PUBLIC_APP_URL",
    "FRONTEND_URL",
    "DATABASE_URL",
    "DIRECT_URL",
    "BETTER_AUTH_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET"
  )

  $envMap = @{}
  foreach ($line in Get-Content ".env") {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -match "^\s*#") { continue }
    if ($line -notmatch "^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$") { continue }

    $key = $matches[1]
    $value = $matches[2].Trim()

    if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $envMap[$key] = $value
  }

  $missing = @()
  foreach ($key in $requiredVars) {
    if (-not $envMap.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envMap[$key])) {
      $missing += $key
    }
  }

  if ($missing.Count -gt 0) {
    throw "Missing required values in .env: $($missing -join ', ')"
  }

  Write-Host "[3/5] Running lint..."
  pnpm lint

  Write-Host "[4/5] Running typecheck..."
  pnpm typecheck

  Write-Host "[5/5] Running production build..."
  pnpm build

  Write-Host "Predeployment checks passed."
}
finally {
  Pop-Location
}
