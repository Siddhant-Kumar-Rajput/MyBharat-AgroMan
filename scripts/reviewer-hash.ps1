param([Parameter(Mandatory = $true)][string]$Uid)
# Computes a hash only. It does not grant a role or update an existing secret.
$reviewerUid = $Uid.Trim()
if (-not $reviewerUid -or $reviewerUid.Length -gt 128) { throw 'Paste the exact UID from Firebase Authentication.' }
$reviewerHasher = [System.Security.Cryptography.SHA256]::Create()
try {
    $reviewerBytes = [System.Text.Encoding]::UTF8.GetBytes($reviewerUid)
    ([System.BitConverter]::ToString($reviewerHasher.ComputeHash($reviewerBytes))).Replace('-', '').ToLowerInvariant()
} finally { $reviewerHasher.Dispose() }
