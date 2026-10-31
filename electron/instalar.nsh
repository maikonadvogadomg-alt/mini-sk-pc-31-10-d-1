; Mini SK — antes de instalar/atualizar, fecha sozinho o Mini SK antigo (e tudo o que o terminal dele ligou),
; em vez de parar no meio dizendo que o programa "está sendo usado".
!macro customCheckAppRunning
  nsExec::Exec 'taskkill /F /T /IM "Mini-SK.exe"'
  Pop $0
  Sleep 1500
!macroend
