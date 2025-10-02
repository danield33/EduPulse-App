Call hume generation from the command line.
Notice that this requires python to be installed. And Hume_API_Key need to be provided.

1. Edit humeAPI.py with desired text and voice.

2. commands in Bash 
    export HUME_API_KEY= "#your Hume_API_Key#"     //your Hume API Key can be find in https://platform.hume.ai/settings/keys
    py humeAPI.py mp3  out.mp3                      // out.mp3 or (whatever file name).mp3 
                                                    // audit file will be generated under same folder.
