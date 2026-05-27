param(
  [string]$ProjectId = "advisoai-497313",
  [string]$Region = "asia-south1",
  [string]$WorkerPoolName = "adviso-celery-worker",
  [string]$BackendImageName = "adviso-backend",
  [string]$Repository = "cloud-run-source-deploy",
  [string]$EnvFile = "deploy/cloud-run.backend.env.yaml",
  [int]$Instances = 1,
  [string]$Cpu = "1",
  [string]$Memory = "1Gi"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root $EnvFile
$image = "${Region}-docker.pkg.dev/${ProjectId}/${Repository}/${BackendImageName}"

if (!(Test-Path -LiteralPath $envPath)) {
  throw "Missing Cloud Run env file: $envPath. Generate deploy/cloud-run.backend.env.yaml before deploying workers."
}

Write-Output "Deploying Cloud Run worker pool: $WorkerPoolName"
gcloud run worker-pools deploy $WorkerPoolName `
  --image $image `
  --project $ProjectId `
  --region $Region `
  --instances $Instances `
  --cpu $Cpu `
  --memory $Memory `
  '--command=python' `
  '--args=-m,app.workers.run_celery' `
  --env-vars-file $envPath

Write-Output "Worker pool deploy complete."
