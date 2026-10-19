#!/bin/sh
# Record the booted simulator until the stop file appears (or a time limit passes).
# usage: rec.sh out.mp4 [max_seconds]
out="$1"; max="${2:-900}"; stop="$(dirname "$0")/../footage/STOP"
rm -f "$stop"
xcrun simctl io booted recordVideo --codec=h264 --force "$out" &
pid=$!
i=0
while [ $i -lt "$max" ] && [ ! -f "$stop" ]; do sleep 1; i=$((i+1)); done
kill -INT $pid
wait $pid
rm -f "$stop"
echo "saved $out after ${i}s"
