#!/bin/sh
#
# Wait for a command to be successful.
#

# Check if at least two arguments are given
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <number_of_seconds> <command> [command arguments]"
    exit 1
fi

# Assign the first argument to SLEEP_DURATION and the rest to COMMAND
SLEEP_DURATION=$1
shift
COMMAND="$*"

# Run the command repeatedly until successful
while true; do
    echo "Executing command: $COMMAND"
    if $COMMAND; then
        echo "Command was successful. Exiting."
        break
    else
        echo "Command failed. Retrying in $SLEEP_DURATION seconds..."
        sleep $SLEEP_DURATION
    fi
done
