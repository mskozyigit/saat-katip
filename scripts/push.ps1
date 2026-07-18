Set-Location c:\Users\mskoz\projects\saat-katip
$env:Path = "C:\Program Files\nodejs;" + $env:Path
git add -A
git commit -m "fix: timezone, serverTime, CSS, lint, type-safety"
git push
Write-Host "DONE" -ForegroundColor Green
