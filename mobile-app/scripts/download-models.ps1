param(
  [string]$MobileFaceNetUrl = '',
  [string]$FaceDetectorUrl = ''
)

$outDir = Join-Path -Path $PSScriptRoot -ChildPath "..\assets\models"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

function Download-File($url, $dest) {
  if ([string]::IsNullOrEmpty($url)) {
    Write-Host "No URL provided for $dest, skipping."
    return
  }
  try {
    Write-Host "Downloading $url -> $dest"
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -ErrorAction Stop
    Write-Host "Downloaded: $dest"
  } catch {
    Write-Error "Failed to download $url : $_"
  }
}

$mfDest = Join-Path $outDir 'mobilefacenet.tflite'
$fdDest = Join-Path $outDir 'face_detection_short_range.tflite'

Download-File -url $MobileFaceNetUrl -dest $mfDest
Download-File -url $FaceDetectorUrl -dest $fdDest

Write-Host "Model download script finished. Verify files in: $outDir"
