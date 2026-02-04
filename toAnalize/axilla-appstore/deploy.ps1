$currentFolder = get-location
npm run build
# Make sure the folder exists before changing location
$targetPath = $currentFolder.Path.replace("projects\","libs\")
if (-Not (Test-Path -Path $targetPath)) {
  # Create the folder instead of throwing an error:
  New-Item -Path $targetPath -ItemType Directory | Out-Null

}
set-location $targetPath
copy-item ..\..\.npmrc .

$data = Get-content package.json | convertfrom-json
$data.scripts = $null
$data | convertTo-json -depth 99 | set-content package.json
npm publish
set-location $currentFolder.Path





