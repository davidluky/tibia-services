[CmdletBinding()]
param(
    [switch]$CheckOnly,
    [switch]$ApproveProduction
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([bool]$CheckOnly -eq [bool]$ApproveProduction) {
    throw "Choose exactly one mode: -CheckOnly or -ApproveProduction."
}

$ExpectedBranch = "master"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SmokeUrl = "https://tibia.davidluky.com"
$VercelVersion = "56.3.0"

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$ArgumentList = @()
    )

    Write-Host (">> {0} {1}" -f $FilePath, ($ArgumentList -join " "))
    & $FilePath @ArgumentList
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Command failed with exit code ${exitCode}: $FilePath $($ArgumentList -join ' ')"
    }
}

function Get-NativeOutput {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [string[]]$ArgumentList = @()
    )

    $output = & $FilePath @ArgumentList
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Command failed with exit code ${exitCode}: $FilePath $($ArgumentList -join ' ')"
    }

    return (($output | Out-String).Trim())
}

function Assert-CleanWorkingTree {
    $status = Get-NativeOutput -FilePath "git" -ArgumentList @(
        "status",
        "--porcelain=v1",
        "--untracked-files=all"
    )

    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw "Production release requires a clean working tree. Commit or remove these changes first:`n$status"
    }
}

function Assert-ExpectedBranch {
    $branch = Get-NativeOutput -FilePath "git" -ArgumentList @(
        "branch",
        "--show-current"
    )

    if ($branch -ne $ExpectedBranch) {
        throw "Expected branch '$ExpectedBranch', but the current branch is '$branch'."
    }
}

function Assert-RequiredNodeVersion {
    $nodeVersion = Get-NativeOutput -FilePath "node.exe" -ArgumentList @(
        "-p",
        "process.versions.node"
    )
    $majorVersion = [int]($nodeVersion.Split(".")[0])
    if ($majorVersion -ne 24) {
        throw "Production release verification requires Node.js 24.x; current version is $nodeVersion."
    }

    Write-Host "Validated Node.js $nodeVersion."
}

function Assert-AtRemoteHead {
    Invoke-NativeCommand -FilePath "git" -ArgumentList @(
        "fetch",
        "--prune",
        "origin",
        $ExpectedBranch
    )

    $localHead = Get-NativeOutput -FilePath "git" -ArgumentList @("rev-parse", "HEAD")
    $remoteHead = Get-NativeOutput -FilePath "git" -ArgumentList @(
        "rev-parse",
        "refs/remotes/origin/$ExpectedBranch"
    )

    if ($localHead -ne $remoteHead) {
        throw "HEAD must exactly match origin/$ExpectedBranch before production deployment."
    }
}

function Invoke-SmokeCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,

        [int]$Attempts = 5
    )

    $lastFailure = "No response received."
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            Write-Host "Smoke attempt $attempt of ${Attempts}: $Url"
            $response = Invoke-WebRequest `
                -Uri $Url `
                -MaximumRedirection 5 `
                -TimeoutSec 20 `
                -UseBasicParsing

            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Host "Smoke check passed with HTTP $($response.StatusCode)."
                return
            }

            $lastFailure = "Unexpected HTTP status $($response.StatusCode)."
        }
        catch {
            $lastFailure = $_.Exception.Message
        }

        if ($attempt -lt $Attempts) {
            Start-Sleep -Seconds (5 * $attempt)
        }
    }

    throw "Production smoke check failed after ${Attempts} attempts: $lastFailure"
}

Push-Location $RepoRoot
try {
    Assert-CleanWorkingTree
    Assert-ExpectedBranch
    Assert-AtRemoteHead

    $projectLink = Join-Path $RepoRoot ".vercel\project.json"
    if (-not (Test-Path -LiteralPath $projectLink -PathType Leaf)) {
        throw "Missing .vercel/project.json. Run the documented one-time Vercel link command first."
    }

    Invoke-NativeCommand -FilePath "git" -ArgumentList @(
        "check-ignore",
        "--quiet",
        "--",
        ".vercel/project.json"
    )

    Assert-RequiredNodeVersion
    Invoke-NativeCommand -FilePath "npm.cmd" -ArgumentList @("ci")
    Invoke-NativeCommand -FilePath "npm.cmd" -ArgumentList @("run", "quality")
    Invoke-NativeCommand -FilePath "npm.cmd" -ArgumentList @("run", "package")
    Invoke-NativeCommand -FilePath "npx.cmd" -ArgumentList @(
        "--yes",
        "vercel@$VercelVersion",
        "whoami"
    )

    Assert-CleanWorkingTree
    Assert-ExpectedBranch
    Assert-AtRemoteHead

    if ($ApproveProduction) {
        Invoke-NativeCommand -FilePath "npx.cmd" -ArgumentList @(
            "--yes",
            "vercel@$VercelVersion",
            "deploy",
            "--prod",
            "--yes"
        )
    }
    else {
        Write-Host "Check-only mode: production deployment was not run."
    }

    Invoke-SmokeCheck -Url $SmokeUrl
    Write-Host "Release workflow completed successfully."
}
finally {
    Pop-Location
}
