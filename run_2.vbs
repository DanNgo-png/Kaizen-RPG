Set WshShell = CreateObject("WScript.Shell") 
WshShell.Run chr(34) & "run_2.bat" & chr(34), 0
Set WshShell = Nothing