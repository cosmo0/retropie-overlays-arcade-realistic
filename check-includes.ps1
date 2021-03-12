# check all rom configs
gci "overlays/roms" | ? {
    $_.Name.EndsWith('.cfg')
} | % {
    $content = get-content $_ | Out-String

    # echo $content.IndexOf('#include')
    # echo $content.IndexOf('video_shader')
    # echo $content.IndexOf('video_fullscreen_x')

    # check if it doesn't have the include and config is not written directly
    if (($content.IndexOf('#include') -lt 0)) {
        # check that I have both shader and resolution
        if ((($content.IndexOf('video_shader') -lt 0) -and ($content.IndexOf('video_fullscreen_x') -gt 0)) `
            -or (($content.IndexOf('video_shader') -gt 0) -and ($content.IndexOf('video_fullscreen_x') -lt 0))) {

            echo "$_ doesn't have the include, and is missing shader or resolution"
            read-host
        }
        elseif (($content.IndexOf('video_shader') -lt 0) -and ($content.IndexOf('video_fullscreen_x') -lt 0)) {
            echo "$_ doesn't have the include"

            # get orientation
            if ($content -match 'custom_viewport_width\s?=\s?\"?(\d+)\"?') {
                $width = $matches[1]
            }
            if ($content -match 'custom_viewport_height\s?=\s?\"?(\d+)\"?') {
                $height = $matches[1]
            }
            
            if ($width -gt $height) {
                $orientation = "horizontal"
            }
            else {
                $orientation = "vertical"
            }
    
            # add #include
            $content = "#include `"/opt/retropie/configs/all/retroarch/overlay/arcade-realistic/common/$orientation.cfg`"`n`n$content"
            $content | out-file $_
        }
    }
}