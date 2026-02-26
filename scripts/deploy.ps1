Param(
  [Parameter(Mandatory=$true)]
  [string]$SecretKey
)

Set-Location -Path "$PSScriptRoot\..\contract"
rustup target add wasm32-unknown-unknown | Out-Null
cargo build --target wasm32-unknown-unknown --release

$wasmPath = "target\wasm32-unknown-unknown\release\auction.wasm"
if (!(Test-Path $wasmPath)) { throw "WASM not built: $wasmPath" }

$deploy = & stellar contract deploy --wasm $wasmPath --source $SecretKey --network testnet
if ($LASTEXITCODE -ne 0) { throw "Deployment failed" }

$idLine = $deploy | Select-String -Pattern "Contract ID: (.*)"
if (-not $idLine) { throw "Cannot parse contract id" }
$contractId = $idLine.Matches[0].Groups[1].Value.Trim()

$envRoot = Join-Path (Join-Path $PSScriptRoot "..") ".env"
$envFrontend = Join-Path (Join-Path $PSScriptRoot "..") "frontend\.env"
$content = "VITE_CONTRACT_ID=$contractId`nVITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org`nVITE_STELLAR_NETWORK=TESTNET`nVITE_HORIZON_URL=https://horizon-testnet.stellar.org`n"
Set-Content -Path $envRoot -Value $content
Set-Content -Path $envFrontend -Value $content
Write-Host "Deployed Contract ID: $contractId"
Write-Host "Wrote $envRoot and $envFrontend"
