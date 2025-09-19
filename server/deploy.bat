@echo off
if "%1"=="" (
    echo Usage: deploy.bat ^<version^>
    exit /b 1
)

set VERSION=%1

docker build -t phyoe085/roll-call-server:%VERSION% .
docker push phyoe085/roll-call-server:%VERSION%
docker tag phyoe085/roll-call-server:%VERSION% phyoe085/roll-call-server:latest
docker push phyoe085/roll-call-server:latest