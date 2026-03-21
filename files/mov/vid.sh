#!/bin/bash

# Create an output folder to keep things organized
mkdir -p optimized_portfolio

for file in *.{mov,mp4,m4v}; do
    # Skip if no files match the pattern
    [ -e "$file" ] || continue

    filename="${file%.*}"
    echo "Processing: $file"

    # 1. Generate WebM (VP9 + Opus)
    # -crf 30 for high quality/low size ratio
    # -b:a 192k to maintain professional audio fidelity
    ffmpeg -i "$file" -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus -b:a 192k "optimized_portfolio/${filename}.webm"

    # 2. Generate MP4 (H.264 + AAC)
    # Adding -vf scale=-2:720 to match resolution for grid performance
    # -pix_fmt yuv420p ensures maximum browser compatibility
    ffmpeg -i "$file" -c:v libx264 -crf 23 -vf "scale=-2:720" -pix_fmt yuv420p -c:a aac -b:a 192k "optimized_portfolio/${filename}.mp4"

done

echo "Batch processing complete. Files are in the 'optimized_portfolio' folder."
