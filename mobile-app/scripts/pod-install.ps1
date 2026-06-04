try {
  $root = Split-Path -Parent $PSScriptRoot
  $ios = Join-Path $root 'ios'

  if (-not (Get-Command pod -ErrorAction SilentlyContinue)) {
    Write-Host 'CocoaPods (pod) not found in PATH. On macOS install with: sudo gem install cocoapods' -ForegroundColor Yellow
    exit 1
  }

  Write-Host "Running pod install in: $ios"
  Push-Location $ios
  & pod install --repo-update
  Pop-Location
  Write-Host 'pod install completed.' -ForegroundColor Green
} catch {
  Write-Error "pod install failed: $_"
  exit 1
}
