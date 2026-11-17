#!/usr/bin/env bash
# One CI log line on how loaded this runner's CPUs were over the last minutes:
# the kernel's CPU pressure (share of time a runnable task waited for a CPU)
# and the load average, against the CPU count and model. Worker counts change
# only on this evidence. Prints nothing where Linux pressure data is missing.
[ -r /proc/pressure/cpu ] || exit 0
model="$(sed -n 's/^model name[[:space:]]*: //p' /proc/cpuinfo | head -n 1)"
echo "CI CPU after ${1:-step}: $(nproc) x ${model}; load $(cut -d' ' -f1-3 /proc/loadavg); pressure $(head -n 1 /proc/pressure/cpu)"
