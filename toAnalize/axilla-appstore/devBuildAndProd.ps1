. ..\..\Manage-LocalNPM.ps1
.\updateSubPackages.ps1
$gotoNext = $false

$runCheck = $true;
do {

  npm i
  npm run check


  do {
    $inputLetter = Read-Host "Press enter to update or (r)etry, (n)o update or (y)es to update)"
  } while ( $inputLetter -ne "n" -and $inputLetter -ne "y" -and $inputLetter -ne "r" -and $inputLetter -ne "s" -and $inputLetter -notlike '')

	if ($inputLetter -like '') {
	$inputLetter = 'y'
	}

  if ($inputLetter -eq "y") {
    .\deploy.ps1
  } elseif( $inputLetter -eq "s" ) {
    $runCheck = $false;
    break;
  } elseif( $inputLetter -eq "r" ) {
    $runCheck = $true;
  }

  if ($inputLetter -ne "r") {
	  do {
		$inputLetter = Read-Host "Do you want to retry?"
	  } while ($inputLetter -ne "n" -and $inputLetter -ne "y")
	} else {
		$runCheck = $true;
	}

  if ($inputLetter -eq "n" ) {
    $runCheck = $false;
  }

  $inputLetter = $false
} while ($runCheck)



do {
  $inputLetter = Read-Host "Do you want to go to the next library ((n)o / (y)es / (p)rocess_next?"
} while ($inputLetter -ne "n" -and $inputLetter -ne "y" -and $inputLetter -ne "p")

if ($inputLetter -eq "y") {
  .\nextFolder.ps1
}

if ($inputLetter -eq "p") {
  .\nextFolder.ps1
  .\devBuildAndProd.ps1
}


. ..\..\Manage-LocalNPM.ps1
.\updateSubPackages.ps1
$gotoNext = $false

$runCheck = $true;
do {

  npm i
  Set-PackageJson

  npm run check


  do {
    $inputLetter = Read-Host "Press enter to update or (n)o update or (y)es to update)"
  } while ( $inputLetter -ne "n" -and $inputLetter -ne "y" -and $inputLetter -ne "s" -and $inputLetter -ne "")

  if ($inputLetter -eq "n" -or $inputLetter -eq "") {
    # Nothing to do
  } elseif ($inputLetter -eq "y") {
    .\deploy.ps1
  } elseif( $inputLetter -eq "s" ) {
    exit
    break;
  }

  do {
    $inputLetter1 = Read-Host "Do you want to retry ((n)o) / (y)es / (p)rocess_next)?"
  } while ($inputLetter1 -ne "n" -and $inputLetter -ne "y" -and $inputLetter -ne "" -and $inputLetter -ne "p")

  if ($inputLetter1 -eq "n" -or $inputLetter1 -eq "" -or $inputLetter1 -eq "p" ) {
    $runCheck = $false;
  }
  else {
    write-host Rerunning
  }
  $inputLetter = $false
} while ($runCheck)

if ($inputLetter1 -ne "p") {
  do {
    $inputLetter = Read-Host "Do you want to go to the next library ((p)rocess_next / (n)o / (y)es ?"
  } while ($inputLetter -ne "n" -and $inputLetter -ne "y" -and $inputLetter -ne "p" -and $inputLetter -ne "")
}

if ($inputLetter -eq "y") {
  .\nextFolder.ps1
}

if ($inputLetter -eq "p"  -or $inputLetter1 -eq "p") {
  .\nextFolder.ps1
  .\devBuildAndProd.ps1     
}
