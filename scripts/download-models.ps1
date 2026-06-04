Param()
Set-StrictMode -Version Latest

$modelsDir = Join-Path -Path $PSScriptRoot -ChildPath "..\mobile-app\assets\models"
if (!(Test-Path $modelsDir)) { New-Item -ItemType Directory -Path $modelsDir | Out-Null }

Write-Host "Downloading models to $modelsDir"

$urls = @(
  @{ name = 'mobilefacenet.tflite'; url = 'https://storage.googleapis.com/mediapipe-models/face_recognizer/face_recognizer/float32/1/face_recognizer.tflite' },
  @{ name = 'face_detection_short_range.tflite'; url = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float32/1/blaze_face_short_range.tflite' },
  @{ name = 'face_landmarks.tflite'; url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float32/1/face_landmarker.tflite' }
)

foreach ($m in $urls) {
  $out = Join-Path $modelsDir $($m.name)
  Write-Host "Downloading $($m.name) ..."
  try {
    Invoke-WebRequest -Uri $m.url -OutFile $out -UseBasicParsing -ErrorAction Stop
    Write-Host "Saved $out"
  } catch {
    Write-Host "Failed to download $($m.name): $_"
  }
}

Write-Host "Done."
