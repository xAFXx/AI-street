$destinationFile = ".\package.json"


$sourceFile = "..\..\package.json"
Compare-File -sourceFile $sourceFile -destinationFile $destinationFile


$sourceFile = "..\axilla-shared\package.json"
Compare-File -sourceFile $sourceFile -destinationFile $destinationFile


$sourceFile = "..\axilla-shared-dto\package.json"
Compare-File -sourceFile $sourceFile -destinationFile $destinationFile


npm i
