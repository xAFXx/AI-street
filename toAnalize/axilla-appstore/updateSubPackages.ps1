$thisFile = "package.json"


$axillaSharedFile = "../axilla-shared/package.json"


$content = Get-Content $thisFile
$line = $content  | Select-String "axilla-shared""" | Select-Object -ExpandProperty Line

$version = Get-PackageVersion -package """version""" -file $axillaSharedFile

(Get-Content $thisFile -raw ).Replace($line,"$($line.split(":")[0]): ""$($version.Version)"",") | Set-Content $thisFile

