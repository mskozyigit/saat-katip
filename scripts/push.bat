@echo off
cd /d c:\Users\mskoz\projects\saat-katip
set PATH=C:\Program Files\nodejs;%PATH%
git add -A
git commit -m "fix: timezone, serverTime, CSS, lint, type-safety"
git push
echo DONE
