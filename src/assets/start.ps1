write-host 'The variable of envLApiUrl is: '+$env:ApiUrl
if (-not [string]::IsNullOrEmpty($env:ApiUrl)) {
    $sApi = '{{connectapi}}';
    write-host 'Changing url api: '+$sApi
    $sUi = '{{ui}}';
    $file = 'C:\inetpub\wwwroot\assets\appconfig.production.json';
    $content = Get-Content $file;
    $content -replace $sApi, $env:ApiUrl -replace $sUi, $env:UiUrl | Set-Content $file;
    write-host (Get-Content $file)
}

if (-not [string]::IsNullOrEmpty($env:MetaEnvironmentName)) {
    $sName = '{{MetaEnvironmentName}}';
    write-host 'Changing url api: '+$sName
    $sDescription = '{{MetaEnvironmentDescription}}';
    $file = 'C:\inetpub\wwwroot\index.html';
    $content = Get-Content $file;
    $content -replace $sName, $env:MetaEnvironmentName -replace $sDescription, $env:MetaEnvironmentDescription | Set-Content $file;
    write-host (Get-Content $file)
}

C:\ServiceMonitor.exe w3svc
