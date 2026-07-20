param(
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [Parameter(Mandatory = $true)][string]$ExpectedSha256,
  [switch]$ConfirmRestore
)

if (-not $ConfirmRestore) { throw 'Restore is destructive. Re-run with -ConfirmRestore after verifying the target environment.' }
$resolvedBackup = [System.IO.Path]::GetFullPath($BackupFile)
if (-not (Test-Path -LiteralPath $resolvedBackup -PathType Leaf)) { throw "Backup file not found: $resolvedBackup" }
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedBackup).Hash.ToLowerInvariant()
if ($actualHash -ne $ExpectedSha256.ToLowerInvariant()) { throw 'Backup checksum does not match.' }

docker compose cp $resolvedBackup postgres:/tmp/restore.dump
docker compose exec -T postgres pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error --username "${env:POSTGRES_USER}" --dbname "${env:POSTGRES_DB}" /tmp/restore.dump
docker compose exec -T postgres rm -f /tmp/restore.dump
Write-Output 'Database restore completed. Run readiness checks and a reconciliation audit before reopening traffic.'
