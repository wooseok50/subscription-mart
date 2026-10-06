# 아이콘·OG 이미지 재생성. Edge 헤드리스 스크린샷 사용
# 실행: powershell -ExecutionPolicy Bypass -File scripts/build-brand.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$brand = Join-Path $root 'scripts\brand'
$out = Join-Path $root 'public'
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edge)) { throw "Edge 미설치: $edge" }

New-Item -ItemType Directory -Force (Join-Path $out 'icons') | Out-Null

function Shot($src, $dest, $w, $h) {
  $uri = ([System.Uri](Join-Path $brand $src)).AbsoluteUri
  # Edge가 진행 메시지를 stderr로 출력하므로 해당 호출만 오류 중단 해제
  $ErrorActionPreference = 'Continue'
  & $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
    --default-background-color=00000000 --virtual-time-budget=3000 `
    "--window-size=$w,$h" "--screenshot=$dest" $uri 2>&1 | Out-Null
  $ErrorActionPreference = 'Stop'
  if (-not (Test-Path $dest)) { throw "생성 실패: $dest" }
  Write-Output "생성: $dest"
}

Shot 'icon.svg' (Join-Path $out 'icons\icon-192.png') 192 192
Shot 'icon.svg' (Join-Path $out 'icons\icon-512.png') 512 512
Shot 'icon.svg' (Join-Path $out 'icons\apple-touch-icon.png') 180 180
Shot 'icon-maskable.svg' (Join-Path $out 'icons\icon-maskable-512.png') 512 512
Shot 'og.html' (Join-Path $out 'og.png') 1200 630
Copy-Item (Join-Path $brand 'icon.svg') (Join-Path $out 'favicon.svg') -Force
