param(
  [string]$ProjectId = "advisoai-497313",
  [string]$Region = "asia-south1",
  [string]$ServiceName = "adviso-backend",
  [string]$Repository = "cloud-run-source-deploy",
  [string]$EnvFile = "deploy/cloud-run.backend.env.yaml"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root $EnvFile
$backendPath = Join-Path $root "python_backend"
$image = "${Region}-docker.pkg.dev/${ProjectId}/${Repository}/${ServiceName}"

if (!(Test-Path -LiteralPath $envPath)) {
  throw "Missing Cloud Run env file: $envPath. Create it from deploy/cloud-run.backend.env.example.yaml or regenerate it from your local .env."
}

Write-Output "Building backend image: $image"
gcloud builds submit $backendPath --tag $image --project $ProjectId

Write-Output "Deploying Cloud Run service: $ServiceName"
gcloud run deploy $ServiceName `
  --image $image `
  --project $ProjectId `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --env-vars-file $envPath

Write-Output "Backend deploy complete."
