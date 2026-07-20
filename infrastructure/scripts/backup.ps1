param(
  [Parameter(Mandatory = $true)][string]$OutputDirectory
)

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
if (-not (Test-Path -LiteralPath $resolvedOutput)) {
  New-Item -ItemType Directory -Path $resolvedOutput | Out-Null
}
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$databaseFile = Join-Path $resolvedOutput "postgres-$timestamp.dump"
$manifestFile = Join-Path $resolvedOutput "manifest-$timestamp.json"

docker compose exec -T postgres pg_dump --format=custom --no-owner --no-acl --username "${env:POSTGRES_USER}" --dbname "${env:POSTGRES_DB}" --file /tmp/backup.dump
docker compose cp postgres:/tmp/backup.dump $databaseFile
docker compose exec -T postgres rm -f /tmp/backup.dump

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $databaseFile).Hash.ToLowerInvariant()
@{
  createdAt = (Get-Date).ToUniversalTime().ToString('o')
  databaseFile = (Split-Path -Leaf $databaseFile)
  sha256 = $hash
  appVersion = $env:APP_VERSION
} | ConvertTo-Json | Set-Content -LiteralPath $manifestFile -Encoding utf8NoBOM

Write-Output "Backup created at $databaseFile. Copy object storage separately with the client-owned storage replication policy."
